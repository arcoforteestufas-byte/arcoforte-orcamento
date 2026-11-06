"use server"

import fs from "fs/promises"
import path from "path"
import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

const PATH_MANUAL_HUMANO = path.join(process.cwd(), "docs", "manual-humano.md")
const PATH_MANUAL_TECNICO = path.join(process.cwd(), "docs", "manual-tecnico-claude.md")
const PATH_DOC_OFICIAL_LEGACY = path.join(process.cwd(), "docs", "documentacao-oficial.md")

export interface DadosItemManual {
  conteudo: string
  versao: string
  atualizadoEm: string
  atualizadoPor?: string
  slug?: string
  titulo?: string
}

export interface VersaoHistoricoManual {
  id: string
  documentacao_slug: string
  versao: string
  conteudo_markdown: string
  alterado_em: string
  alterado_por?: string
  autor_nome?: string
  resumo_alteracao?: string
}

export interface DadosManuaisOficiais {
  humano: DadosItemManual
  tecnico: DadosItemManual
  sucesso: boolean
  erro?: string
}

export interface DadosDocumentacaoOficial extends DadosItemManual {
  sucesso: boolean
  erro?: string
}

function extrairVersao(conteudo: string): string {
  const match = conteudo.match(/\*\*(?:Versão Oficial|Versão Técnica|Versão)[^\n\r:]*:\*\*\s*([^\n\r]+)/i)
  return match ? match[1].trim() : "1.0"
}

function extrairData(conteudo: string): string | null {
  const match = conteudo.match(/\*\*(?:Última Atualização|Data de Atualização)[^\n\r:]*:\*\*\s*([^\n\r]+)/i)
  return match ? match[1].trim() : null
}

async function lerManual(
  slug: "humano" | "tecnico",
  caminhoLocal: string,
  nomeArquivoStorage: string,
  tituloPadrao: string
): Promise<DadosItemManual> {
  // 1. Tenta carregar da tabela 'documentacao' no Supabase (se a migration tiver sido executada)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("documentacao")
      .select("*, usuarios(nome)")
      .eq("slug", slug)
      .maybeSingle()

    if (!error && data && data.conteudo_markdown) {
      const dataFormatada = data.atualizado_em
        ? new Date(data.atualizado_em).toLocaleDateString("pt-BR") +
          " às " +
          new Date(data.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleDateString("pt-BR")

      return {
        conteudo: data.conteudo_markdown,
        versao: data.versao || extrairVersao(data.conteudo_markdown),
        atualizadoEm: dataFormatada,
        atualizadoPor: data.usuarios?.nome || undefined,
        slug,
        titulo: data.titulo || tituloPadrao
      }
    }
  } catch (dbErr) {
    // Tabela pode ainda não existir antes da migração
  }

  // 2. Busca do Supabase Storage com bypass rigoroso de cache
  // Tenta primeiramente no bucket 'documentacao', depois no bucket 'assets'
  const adminClient = await createAdminClient()
  const bucketsParaTentar = ["documentacao", "assets"]

  for (const bucketName of bucketsParaTentar) {
    try {
      const { data: urlData } = adminClient.storage
        .from(bucketName)
        .getPublicUrl(nomeArquivoStorage)

      if (urlData?.publicUrl) {
        const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" }
        })

        if (res.ok) {
          const conteudo = await res.text()
          if (
            conteudo &&
            conteudo.trim().length > 0 &&
            !conteudo.startsWith('{"statusCode":') &&
            !conteudo.startsWith('{"error":')
          ) {
            const versao = extrairVersao(conteudo)
            const dataDoc = extrairData(conteudo) || new Date().toLocaleDateString("pt-BR")

            return {
              conteudo,
              versao,
              atualizadoEm: dataDoc,
              slug,
              titulo: tituloPadrao
            }
          }
        }
      }

      // Fallback: download direto pelo SDK do Storage
      const { data: fileData, error: dlErr } = await adminClient.storage
        .from(bucketName)
        .download(nomeArquivoStorage)

      if (!dlErr && fileData) {
        const conteudo = await fileData.text()
        if (conteudo && conteudo.trim().length > 0 && !conteudo.startsWith('{"statusCode":')) {
          const versao = extrairVersao(conteudo)
          const dataDoc = extrairData(conteudo) || new Date().toLocaleDateString("pt-BR")

          return {
            conteudo,
            versao,
            atualizadoEm: dataDoc,
            slug,
            titulo: tituloPadrao
          }
        }
      }
    } catch (storageErr) {
      console.warn(`[documentacao] Aviso ao ler do bucket ${bucketName} (${slug}):`, storageErr)
    }
  }

  // 3. Fallback: Ler do disco local (se existir)
  try {
    const conteudo = await fs.readFile(caminhoLocal, "utf-8")
    const versao = extrairVersao(conteudo)
    let atualizadoEm = new Date().toLocaleDateString("pt-BR")

    try {
      const stats = await fs.stat(caminhoLocal)
      atualizadoEm =
        stats.mtime.toLocaleDateString("pt-BR") +
        " às " +
        stats.mtime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    } catch {
      // Ignora erro de stat
    }

    return {
      conteudo,
      versao,
      atualizadoEm,
      slug,
      titulo: tituloPadrao
    }
  } catch (fsErr) {
    console.warn(`[documentacao] Aviso ao ler arquivo local (${slug}):`, fsErr)
  }

  // 4. Fallback final caso nada exista
  return {
    conteudo: `# ${tituloPadrao}\n\nNenhuma documentação cadastrada ainda.`,
    versao: "1.0",
    atualizadoEm: new Date().toLocaleDateString("pt-BR"),
    slug,
    titulo: tituloPadrao
  }
}

export async function obterManuaisOficiais(): Promise<DadosManuaisOficiais> {
  try {
    const [humano, tecnico] = await Promise.all([
      lerManual("humano", PATH_MANUAL_HUMANO, "manual-humano.md", "Manual de Regras e Orçamento (Linguagem Simples)"),
      lerManual("tecnico", PATH_MANUAL_TECNICO, "manual-tecnico-claude.md", "Manual Técnico de Regras, Variáveis e Fórmulas (Claude & IA)")
    ])

    return {
      humano,
      tecnico,
      sucesso: true
    }
  } catch (error: any) {
    console.error("Erro ao obter manuais oficiais:", error)
    return {
      humano: { conteudo: "", versao: "1.0", atualizadoEm: "" },
      tecnico: { conteudo: "", versao: "1.0", atualizadoEm: "" },
      sucesso: false,
      erro: error.message
    }
  }
}

// Mantido para compatibilidade retroativa
export async function obterDocumentacaoOficial(): Promise<DadosDocumentacaoOficial> {
  const manuais = await obterManuaisOficiais()
  if (manuais.sucesso && manuais.tecnico.conteudo) {
    return {
      conteudo: manuais.tecnico.conteudo,
      versao: manuais.tecnico.versao,
      atualizadoEm: manuais.tecnico.atualizadoEm,
      sucesso: true
    }
  }

  const legado = await lerManual("tecnico", PATH_DOC_OFICIAL_LEGACY, "documentacao-oficial.md", "Documentação Oficial ArcoForte")
  return {
    ...legado,
    sucesso: true
  }
}

async function garantirBucketEGravar(
  adminClient: any,
  bucketName: string,
  fileName: string,
  buffer: Buffer
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Tentar upload
    const { error: upErr } = await adminClient.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: "text/markdown;charset=utf-8",
        cacheControl: "0",
        upsert: true
      })

    if (!upErr) return { success: true }

    // 2. Se o bucket não existe no projeto Supabase, cria automaticamente!
    const msg = upErr.message?.toLowerCase() || ""
    const isBucketNotFound =
      msg.includes("bucket not found") ||
      (upErr as any).statusCode === "404" ||
      (upErr as any).status === 404

    if (isBucketNotFound) {
      console.log(`[documentacao] Bucket '${bucketName}' não encontrado no projeto Supabase. Criando automaticamente...`)
      const { error: createErr } = await adminClient.storage.createBucket(bucketName, { public: true })

      if (createErr && !createErr.message?.toLowerCase().includes("already exists")) {
        console.error(`[documentacao] Falha ao criar bucket '${bucketName}':`, createErr)
        return { success: false, error: `Falha ao criar bucket '${bucketName}': ${createErr.message}` }
      }

      // 3. Tentar o upload novamente após criar o bucket
      const { error: retryErr } = await adminClient.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: "text/markdown;charset=utf-8",
          cacheControl: "0",
          upsert: true
        })

      if (!retryErr) return { success: true }
      return { success: false, error: retryErr.message }
    }

    return { success: false, error: upErr.message }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function salvarManualOficial(
  tipo: "humano" | "tecnico",
  conteudo: string,
  versao?: string,
  resumoAlteracao?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Você precisa estar autenticado para salvar a documentação oficial.")
    }

    const cargo = user.user_metadata?.cargo
    const perfil = user.user_metadata?.perfil
    if (cargo !== "Administrador" && perfil !== "admin") {
      const { data: usuarioDb } = await supabase
        .from("usuarios")
        .select("perfil")
        .eq("id", user.id)
        .maybeSingle()

      if (usuarioDb?.perfil !== "admin") {
        throw new Error("Apenas usuários com cargo de Administrador podem editar a documentação oficial.")
      }
    }

    const caminhoArquivo = tipo === "humano" ? PATH_MANUAL_HUMANO : PATH_MANUAL_TECNICO
    const nomeStorage = tipo === "humano" ? "manual-humano.md" : "manual-tecnico-claude.md"
    const tituloManual = tipo === "humano"
      ? "Manual de Regras e Orçamento (Linguagem Simples)"
      : "Manual Técnico de Regras, Variáveis e Fórmulas (Claude & IA)"

    // 1. Atualiza cabeçalho com Versão e Data
    let conteudoFinal = conteudo
    const versaoFinal = versao && versao.trim() ? versao.trim() : extrairVersao(conteudoFinal)

    const versaoRegex = /(\*\*(?:Versão Oficial|Versão Técnica|Versão):\*\*\s*)([^\n\r]+)/i
    if (versaoRegex.test(conteudoFinal)) {
      conteudoFinal = conteudoFinal.replace(versaoRegex, `$1${versaoFinal}`)
    }

    const dataHoje = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())
    const dataRegex = /(\*\*(?:Última Atualização|Data de Atualização):\*\*\s*)([^\n\r]+)/i
    if (dataRegex.test(conteudoFinal)) {
      conteudoFinal = conteudoFinal.replace(dataRegex, `$1${dataHoje}`)
    }

    // 2. Grava no disco local se o filesystem permitir (desenvolvimento / build local)
    // Se estiver em runtime Vercel serverless (EROFS), captura e ignora para não travar
    try {
      await fs.mkdir(path.dirname(caminhoArquivo), { recursive: true })
      await fs.writeFile(caminhoArquivo, conteudoFinal, "utf-8")
      if (tipo === "tecnico") {
        try {
          await fs.writeFile(PATH_DOC_OFICIAL_LEGACY, conteudoFinal, "utf-8")
        } catch {}
      }
    } catch (fsErr: any) {
      console.warn(`[documentacao] Sistema de arquivos somente leitura (${fsErr?.code || fsErr?.message}). Persistindo no Supabase.`)
    }

    const adminClient = await createAdminClient()
    const agoraIso = new Date().toISOString()
    const buffer = Buffer.from(conteudoFinal, "utf-8")

    let gravouPrincipal = false
    const errosGravacao: string[] = []

    // 3.1 Upload no bucket 'documentacao' com auto-criação se faltar
    const resDoc = await garantirBucketEGravar(adminClient, "documentacao", nomeStorage, buffer)
    if (resDoc.success) {
      gravouPrincipal = true
    } else {
      errosGravacao.push(`Bucket 'documentacao': ${resDoc.error}`)
    }

    // 3.2 Upload redundante no bucket 'assets' com auto-criação se faltar
    const resAssets = await garantirBucketEGravar(adminClient, "assets", nomeStorage, buffer)
    if (resAssets.success) {
      gravouPrincipal = true
    } else {
      errosGravacao.push(`Bucket 'assets': ${resAssets.error}`)
    }

    if (tipo === "tecnico") {
      await garantirBucketEGravar(adminClient, "assets", "documentacao-oficial.md", buffer).catch(() => {})
    }

    // CRÍTICO: Se NENHUM dos buckets gravou com sucesso, FALHE com erro explícito!
    if (!gravouPrincipal) {
      throw new Error(`Falha ao persistir manual no Supabase: ${errosGravacao.join("; ")}`)
    }

    // 3.3 Gravação do snapshot de versão no Histórico (com auto-criação de pasta/bucket se necessário)
    const snapshotName = `${tipo}-v${versaoFinal.replace(/[^a-zA-Z0-9._-]/g, "_")}-${Date.now()}.md`
    await garantirBucketEGravar(adminClient, "documentacao", `versoes/${snapshotName}`, buffer).catch(() => {})
    await garantirBucketEGravar(adminClient, "assets", `versoes-documentacao/${snapshotName}`, buffer).catch(() => {})

    // 4. Se a tabela 'documentacao' existir no Supabase, faz upsert nela também
    let gravouTabela = false
    try {
      const { error: dbError } = await adminClient
        .from("documentacao")
        .upsert(
          {
            slug: tipo,
            titulo: tituloManual,
            conteudo_markdown: conteudoFinal,
            versao: versaoFinal,
            atualizado_em: agoraIso,
            atualizado_por: user.id
          },
          { onConflict: "slug" }
        )

      if (!dbError) {
        gravouTabela = true
      }
    } catch (dbErr) {
      // Tabela não existe ainda antes da migration
    }

    // 5. Se a tabela 'documentacao_versoes' existir, grava snapshot nela
    try {
      await adminClient.from("documentacao_versoes").insert({
        documentacao_slug: tipo,
        versao: versaoFinal,
        conteudo_markdown: conteudoFinal,
        alterado_em: agoraIso,
        alterado_por: user.id,
        resumo_alteracao: resumoAlteracao || `Versão ${versaoFinal} atualizada`
      })
    } catch (verErr) {
      // Tabela não existe ainda antes da migration
    }

    // 6. Invalidação imediata de cache no Next.js
    revalidatePath("/admin/configuracoes", "page")
    revalidatePath("/admin/configuracoes")
    revalidatePath("/documentacao", "page")
    revalidatePath("/documentacao")

    const nomeManual = tipo === "humano" ? "Manual em Linguagem Natural" : "Manual Técnico (Claude/IA)"
    return {
      success: true,
      message: `${nomeManual} (v${versaoFinal}) salvo com sucesso no Supabase!`,
      versao: versaoFinal,
      conteudo: conteudoFinal,
      gravouTabela
    }
  } catch (error: any) {
    console.error(`Erro ao salvar manual (${tipo}):`, error)
    return {
      success: false,
      error: error.message || "Erro desconhecido ao salvar manual."
    }
  }
}

// Mantido para compatibilidade retroativa
export async function salvarDocumentacaoOficial(conteudo: string, versao?: string) {
  return salvarManualOficial("tecnico", conteudo, versao)
}

// Obter histórico de versões de um manual
export async function obterHistoricoDocumentacao(tipo: "humano" | "tecnico"): Promise<{
  success: boolean
  versoes: VersaoHistoricoManual[]
  error?: string
}> {
  try {
    const adminClient = await createAdminClient()

    // 1. Tenta carregar da tabela documentacao_versoes
    try {
      const { data, error } = await adminClient
        .from("documentacao_versoes")
        .select("id, documentacao_slug, versao, conteudo_markdown, alterado_em, alterado_por, resumo_alteracao, usuarios(nome)")
        .eq("documentacao_slug", tipo)
        .order("alterado_em", { ascending: false })
        .limit(30)

      if (!error && data && data.length > 0) {
        const formatadas: VersaoHistoricoManual[] = data.map((item: any) => ({
          id: item.id,
          documentacao_slug: item.documentacao_slug,
          versao: item.versao,
          conteudo_markdown: item.conteudo_markdown,
          alterado_em: item.alterado_em,
          alterado_por: item.alterado_por,
          autor_nome: item.usuarios?.nome || undefined,
          resumo_alteracao: item.resumo_alteracao
        }))
        return { success: true, versoes: formatadas }
      }
    } catch {}

    // 2. Fallback: listar snapshots do Storage em ambos os buckets
    const arquivosEncontrados = new Map<string, { bucket: string; path: string; file: any }>()

    // Busca no bucket 'documentacao/versoes'
    try {
      const { data: filesDoc } = await adminClient.storage
        .from("documentacao")
        .list("versoes", { sortBy: { column: "created_at", order: "desc" } })

      if (filesDoc) {
        for (const f of filesDoc) {
          if (f.name.startsWith(`${tipo}-`)) {
            arquivosEncontrados.set(f.name, { bucket: "documentacao", path: `versoes/${f.name}`, file: f })
          }
        }
      }
    } catch {}

    // Busca no bucket 'assets/versoes-documentacao'
    try {
      const { data: filesAssets } = await adminClient.storage
        .from("assets")
        .list("versoes-documentacao", { sortBy: { column: "created_at", order: "desc" } })

      if (filesAssets) {
        for (const f of filesAssets) {
          if (f.name.startsWith(`${tipo}-`) && !arquivosEncontrados.has(f.name)) {
            arquivosEncontrados.set(f.name, { bucket: "assets", path: `versoes-documentacao/${f.name}`, file: f })
          }
        }
      }
    } catch {}

    if (arquivosEncontrados.size > 0) {
      const versoesStorage: VersaoHistoricoManual[] = []

      for (const [name, info] of Array.from(arquivosEncontrados.entries()).slice(0, 30)) {
        const matchV = name.match(new RegExp(`^${tipo}-v([^_\\-]+)`))
        const versao = matchV ? matchV[1] : "1.0"

        let conteudo = ""
        try {
          const { data: urlData } = adminClient.storage.from(info.bucket).getPublicUrl(info.path)
          if (urlData?.publicUrl) {
            const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`, { cache: "no-store" })
            if (res.ok) {
              conteudo = await res.text()
            }
          }

          if (!conteudo) {
            const { data: fileData } = await adminClient.storage.from(info.bucket).download(info.path)
            if (fileData) {
              conteudo = await fileData.text()
            }
          }
        } catch {}

        versoesStorage.push({
          id: info.file.id || name,
          documentacao_slug: tipo,
          versao,
          conteudo_markdown: conteudo,
          alterado_em: info.file.created_at || info.file.updated_at || new Date().toISOString(),
          resumo_alteracao: `Snapshot arquivado (${name})`
        })
      }

      versoesStorage.sort((a, b) => new Date(b.alterado_em).getTime() - new Date(a.alterado_em).getTime())

      return { success: true, versoes: versoesStorage }
    }

    return { success: true, versoes: [] }
  } catch (err: any) {
    console.error("Erro ao obter histórico de documentação:", err)
    return { success: false, versoes: [], error: err.message }
  }
}
