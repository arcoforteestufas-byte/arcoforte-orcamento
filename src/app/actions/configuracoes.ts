"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

const BUCKET_ASSETS = "assets"
const ARQUIVO_CONFIG_JSON = "configuracoes_sistema.json"
const LIMITE_50MB = 52428800 // 50 MB
const ID_PADRAO_CONFIG = "00000000-0000-0000-0000-000000000000"

function empacotarEstiloPdf(dados: Record<string, any>): string {
  return JSON.stringify({
    __arcoforte_ext: 1,
    estilo_pdf:
      typeof dados.estilo_pdf === "string" && !dados.estilo_pdf.trim().startsWith("{")
        ? dados.estilo_pdf
        : "padrao",
    proposta_topicos: dados.proposta_topicos,
    instagram: dados.instagram,
    email: dados.email,
    endereco: dados.endereco,
    capa_pdf_url: dados.capa_pdf_url,
    fundo_pdf_url: dados.fundo_pdf_url,
    frase_final: dados.frase_final,
    modelo_word_url: dados.modelo_word_url,
  })
}

function desempacotarLinhaConfiguracoes(row: Record<string, any> | null): Record<string, any> | null {
  if (!row) return null
  const resultado: Record<string, any> = { ...row }

  if (typeof row.estilo_pdf === "string" && row.estilo_pdf.trim().startsWith("{")) {
    try {
      const extra = JSON.parse(row.estilo_pdf)
      if (extra && typeof extra === "object") {
        resultado.estilo_pdf = extra.estilo_pdf || "padrao"
        const camposExtras = [
          "proposta_topicos",
          "instagram",
          "email",
          "endereco",
          "capa_pdf_url",
          "fundo_pdf_url",
          "frase_final",
          "modelo_word_url",
        ]
        for (const campo of camposExtras) {
          if (extra[campo] !== undefined) {
            resultado[campo] = extra[campo]
          }
        }
      }
    } catch {
      // Se não for JSON válido, mantém o valor original
    }
  }

  return resultado
}

async function garantirBucketAssets(adminClient: any): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { error: updateErr } = await adminClient.storage.updateBucket(BUCKET_ASSETS, {
      public: true,
      file_size_limit: LIMITE_50MB,
      allowed_mime_types: null,
    })

    if (!updateErr) {
      return { ok: true }
    }

    const msg = (updateErr.message || "").toLowerCase()
    const naoEncontrado =
      msg.includes("not found") ||
      msg.includes("does not exist") ||
      (updateErr as any).status === 404 ||
      (updateErr as any).statusCode === "404"

    if (naoEncontrado) {
      const { error: createErr } = await adminClient.storage.createBucket(BUCKET_ASSETS, {
        public: true,
        file_size_limit: LIMITE_50MB,
        allowed_mime_types: null,
      })
      if (createErr && !(createErr.message || "").toLowerCase().includes("already exists")) {
        return { ok: false, erro: createErr.message }
      }
      return { ok: true }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, erro: err?.message || "Erro ao verificar bucket assets" }
  }
}

async function lerConfigJsonStorage(adminClient: any): Promise<Record<string, any> | null> {
  try {
    let { data, error } = await adminClient.storage
      .from(BUCKET_ASSETS)
      .download(ARQUIVO_CONFIG_JSON)
    if (error || !data) {
      const sessionClient = await createClient()
      const retry = await sessionClient.storage
        .from(BUCKET_ASSETS)
        .download(ARQUIVO_CONFIG_JSON)
      data = retry.data
      error = retry.error
    }
    if (error || !data) return null
    const texto = await data.text()
    return JSON.parse(texto)
  } catch {
    return null
  }
}

async function gravarConfigJsonStorage(
  adminClient: any,
  dados: Record<string, any>
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await garantirBucketAssets(adminClient)
    const buffer = Buffer.from(JSON.stringify(dados, null, 2), "utf-8")
    let { error } = await adminClient.storage
      .from(BUCKET_ASSETS)
      .upload(ARQUIVO_CONFIG_JSON, buffer, {
        contentType: "application/json;charset=utf-8",
        cacheControl: "0",
        upsert: true,
      })

    if (error) {
      const sessionClient = await createClient()
      const retry = await sessionClient.storage
        .from(BUCKET_ASSETS)
        .upload(ARQUIVO_CONFIG_JSON, buffer, {
          contentType: "application/json;charset=utf-8",
          cacheControl: "0",
          upsert: true,
        })
      error = retry.error
    }

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, erro: err?.message || "Erro ao salvar JSON de configurações" }
  }
}

export async function prepararUploadAsset(filename: string): Promise<{
  sucesso: boolean
  signedUrl?: string
  token?: string
  publicUrl?: string
  erro?: string
}> {
  try {
    const adminClient = await createAdminClient()
    await garantirBucketAssets(adminClient)

    const { data, error } = await adminClient.storage
      .from(BUCKET_ASSETS)
      .createSignedUploadUrl(filename, { upsert: true })

    if (error || !data?.signedUrl) {
      return {
        sucesso: false,
        erro: error?.message || "Não foi possível gerar URL assinada de upload.",
      }
    }

    const { data: pub } = adminClient.storage.from(BUCKET_ASSETS).getPublicUrl(filename)

    return {
      sucesso: true,
      signedUrl: data.signedUrl,
      token: data.token,
      publicUrl: pub?.publicUrl,
    }
  } catch (err: any) {
    return {
      sucesso: false,
      erro: err?.message || "Erro interno ao preparar upload.",
    }
  }
}

export async function uploadAssetServidor(formData: FormData): Promise<{
  sucesso: boolean
  publicUrl?: string
  erro?: string
}> {
  try {
    const file = formData.get("file") as File | null
    const filename = (formData.get("filename") as string) || `arquivo_${Date.now()}`

    if (!file) {
      return { sucesso: false, erro: "Nenhum arquivo recebido no servidor." }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = file.type || "application/octet-stream"

    const adminClient = await createAdminClient()
    await garantirBucketAssets(adminClient)

    let { error: upErr } = await adminClient.storage
      .from(BUCKET_ASSETS)
      .upload(filename, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      })

    if (upErr) {
      const sessionClient = await createClient()
      const retry = await sessionClient.storage
        .from(BUCKET_ASSETS)
        .upload(filename, buffer, {
          contentType,
          cacheControl: "3600",
          upsert: true,
        })
      upErr = retry.error
    }

    if (upErr) {
      return { sucesso: false, erro: upErr.message }
    }

    const { data: pub } = adminClient.storage.from(BUCKET_ASSETS).getPublicUrl(filename)
    if (!pub?.publicUrl) {
      return { sucesso: false, erro: "Upload concluído, mas não foi possível obter a URL pública." }
    }

    return { sucesso: true, publicUrl: pub.publicUrl }
  } catch (err: any) {
    return { sucesso: false, erro: err?.message || "Erro ao fazer upload pelo servidor." }
  }
}

export async function carregarConfiguracoesServidor(): Promise<{
  sucesso: boolean
  dados?: Record<string, any> | null
  erro?: string
}> {
  try {
    const sessionClient = await createClient()
    const adminClient = await createAdminClient()
    let dadosTabela: Record<string, any> | null = null

    const { data: sData, error: sErr } = await sessionClient
      .from("configuracoes")
      .select("*")
      .limit(1)
      .maybeSingle()

    if (!sErr && sData) {
      dadosTabela = desempacotarLinhaConfiguracoes(sData)
    } else {
      const { data: aData, error: aErr } = await adminClient
        .from("configuracoes")
        .select("*")
        .limit(1)
        .maybeSingle()
      if (!aErr && aData) {
        dadosTabela = desempacotarLinhaConfiguracoes(aData)
      }
    }

    const dadosStorage = await lerConfigJsonStorage(adminClient)

    if (!dadosTabela && !dadosStorage) {
      return { sucesso: true, dados: null }
    }

    const mesclado: Record<string, any> = { ...(dadosTabela || {}) }
    if (dadosStorage) {
      for (const [chave, valor] of Object.entries(dadosStorage)) {
        if (valor !== undefined && (mesclado[chave] === undefined || mesclado[chave] === null)) {
          mesclado[chave] = valor
        }
      }
    }

    return { sucesso: true, dados: mesclado }
  } catch (err: any) {
    return { sucesso: false, erro: err?.message || "Erro ao carregar configurações." }
  }
}

async function gravarLinhaConfiguracoes(client: any, payload: Record<string, any>) {
  const { data: existente } = await client
    .from("configuracoes")
    .select("*")
    .limit(1)
    .maybeSingle()

  const existenteDesempacotado = desempacotarLinhaConfiguracoes(existente) || {}
  const mescladoCompleto = {
    ...existenteDesempacotado,
    ...payload,
  }

  const idAlvo = existente?.id || ID_PADRAO_CONFIG
  const dadosParaGravar: Record<string, any> = {
    ...mescladoCompleto,
    // Empacota todas as configurações extras dentro da coluna texto estilo_pdf (que sempre existe na tabela configuracoes)
    estilo_pdf: empacotarEstiloPdf(mescladoCompleto),
    updated_at: new Date().toISOString(),
  }
  delete dadosParaGravar.id

  const executar = async (campos: Record<string, any>) => {
    if (existente?.id) {
      const res = await client
        .from("configuracoes")
        .update(campos)
        .eq("id", idAlvo)
        .select("id")
      if (!res.error && (!res.data || res.data.length === 0)) {
        return await client
          .from("configuracoes")
          .upsert({ id: idAlvo, ...campos })
          .select("id")
      }
      return res
    }
    return await client
      .from("configuracoes")
      .upsert({ id: idAlvo, ...campos })
      .select("id")
  }

  let { data: gravado, error } = await executar(dadosParaGravar)

  // Se colunas novas não existirem na tabela do banco de produção, remove-as uma a uma e grava as colunas existentes (incluindo estilo_pdf com o JSON completo)
  let tentativas = 0
  const copiaCampos: Record<string, any> = { ...dadosParaGravar }
  while (error && tentativas < 25) {
    const matchCol =
      error.message?.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation/i) ||
      error.message?.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)
    if (matchCol && matchCol[1] && matchCol[1] in copiaCampos) {
      delete copiaCampos[matchCol[1]]
      if (Object.keys(copiaCampos).length === 0) {
        break
      }
      const res = await executar(copiaCampos)
      gravado = res.data
      error = res.error
      tentativas++
    } else {
      break
    }
  }

  if (!error && (!gravado || gravado.length === 0)) {
    return { error: { message: "Nenhuma linha foi atualizada na tabela configuracoes (verifique permissões RLS)." } }
  }

  return { error }
}

export async function salvarConfiguracoesServidor(
  novosDados: Record<string, any>
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    // 1) Tenta primeiro com o cliente autenticado da sessão do usuário logado (Administrador)
    const sessionClient = await createClient()
    let { error } = await gravarLinhaConfiguracoes(sessionClient, novosDados)

    // 2) Se falhar, tenta com o adminClient (service_role)
    const adminClient = await createAdminClient()
    if (error) {
      const retry = await gravarLinhaConfiguracoes(adminClient, novosDados)
      error = retry.error
    }

    // 3) Também tenta salvar espelho no Storage se disponível
    const atualStorage = (await lerConfigJsonStorage(adminClient)) || {}
    await gravarConfigJsonStorage(adminClient, {
      ...atualStorage,
      ...novosDados,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      return { sucesso: false, erro: error.message }
    }

    revalidatePath("/admin/configuracoes")
    return { sucesso: true }
  } catch (err: any) {
    return { sucesso: false, erro: err?.message || "Erro ao salvar configurações." }
  }
}
