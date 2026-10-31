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

async function lerArquivoManual(caminho: string, nomeStorage: string, fallbackTitulo: string): Promise<DadosItemManual> {
  // 1. Tenta ler do disco local
  try {
    const conteudo = await fs.readFile(caminho, "utf-8")
    const versaoMatch = conteudo.match(/\*\*Versão[^\n\r:]*:\*\*\s*([^\n\r]+)/i)
    const versao = versaoMatch ? versaoMatch[1].trim() : "1.0"
    
    const stats = await fs.stat(caminho)
    const atualizadoEm = stats.mtime.toLocaleDateString("pt-BR") + " às " + stats.mtime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

    return { conteudo, versao, atualizadoEm }
  } catch (errLocal) {
    // 2. Tenta baixar do Supabase Storage
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.storage.from("assets").download(nomeStorage)

      if (data && !error) {
        const conteudo = await data.text()
        const versaoMatch = conteudo.match(/\*\*Versão[^\n\r:]*:\*\*\s*([^\n\r]+)/i)
        const versao = versaoMatch ? versaoMatch[1].trim() : "1.0"

        return {
          conteudo,
          versao,
          atualizadoEm: new Date().toLocaleDateString("pt-BR")
        }
      }
    } catch {
      // Ignora erro de storage e vai para fallback
    }

    return {
      conteudo: `# ${fallbackTitulo}\n\nNenhuma documentação cadastrada ainda.`,
      versao: "1.0",
      atualizadoEm: new Date().toLocaleDateString("pt-BR")
    }
  }
}

export async function obterManuaisOficiais(): Promise<DadosManuaisOficiais> {
  try {
    const [humano, tecnico] = await Promise.all([
      lerArquivoManual(PATH_MANUAL_HUMANO, "manual-humano.md", "Manual de Regras e Orçamento (Linguagem Simples)"),
      lerArquivoManual(PATH_MANUAL_TECNICO, "manual-tecnico-claude.md", "Manual Técnico de Regras, Variáveis e Fórmulas (Claude & IA)")
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

  // Fallback para arquivo legado se houver
  const legado = await lerArquivoManual(PATH_DOC_OFICIAL_LEGACY, "documentacao-oficial.md", "Documentação Oficial ArcoForte")
  return {
    ...legado,
    sucesso: true
  }
}

export async function salvarManualOficial(
  tipo: "humano" | "tecnico",
  conteudo: string,
  versao?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Você precisa estar autenticado para salvar a documentação oficial.")
    }

    const cargo = user.user_metadata?.cargo
    if (cargo !== "Administrador") {
      throw new Error("Apenas usuários com cargo de Administrador podem editar a documentação oficial.")
    }

    const caminhoArquivo = tipo === "humano" ? PATH_MANUAL_HUMANO : PATH_MANUAL_TECNICO
    const nomeStorage = tipo === "humano" ? "manual-humano.md" : "manual-tecnico-claude.md"
    const labelVersao = tipo === "humano" ? "**Versão Oficial:**" : "**Versão Técnica:**"

    // Atualiza a versão no cabeçalho se informada
    let conteudoFinal = conteudo
    if (versao && versao.trim()) {
      const versaoRegex = /(\*\*(?:Versão Oficial|Versão Técnica|Versão):\*\*\s*)([^\n\r]+)/i
      if (versaoRegex.test(conteudoFinal)) {
        conteudoFinal = conteudoFinal.replace(versaoRegex, `$1${versao.trim()}`)
      }
    }

    // Atualiza a data no cabeçalho
    const dataHoje = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())
    const dataRegex = /(\*\*(?:Última Atualização|Data de Atualização):\*\*\s*)([^\n\r]+)/i
    if (dataRegex.test(conteudoFinal)) {
      conteudoFinal = conteudoFinal.replace(dataRegex, `$1${dataHoje}`)
    }

    // 1. Grava no disco local
    await fs.mkdir(path.dirname(caminhoArquivo), { recursive: true })
    await fs.writeFile(caminhoArquivo, conteudoFinal, "utf-8")

    // Também atualiza o documentacao-oficial.md legado se for o técnico
    if (tipo === "tecnico") {
      try {
        await fs.writeFile(PATH_DOC_OFICIAL_LEGACY, conteudoFinal, "utf-8")
      } catch (legacyErr) {
        // Ignora se der erro
      }
    }

    // 2. Faz backup no Supabase Storage (bucket 'assets')
    try {
      const adminClient = await createAdminClient()
      const blob = new Blob([conteudoFinal], { type: "text/markdown;charset=utf-8" })
      await adminClient.storage.from("assets").upload(nomeStorage, blob, {
        upsert: true
      })
      if (tipo === "tecnico") {
        await adminClient.storage.from("assets").upload("documentacao-oficial.md", blob, {
          upsert: true
        })
      }
    } catch (storageError) {
      console.warn(`Aviso: Não foi possível sincronizar o backup de ${nomeStorage} no Supabase Storage:`, storageError)
    }

    revalidatePath("/admin/configuracoes")

    const nomeManual = tipo === "humano" ? "Manual em Linguagem Natural" : "Manual Técnico (Claude/IA)"
    return {
      success: true,
      message: `${nomeManual} atualizado com sucesso!`
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
