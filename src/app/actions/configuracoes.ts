"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

const BUCKET_ASSETS = "assets"
const ARQUIVO_CONFIG_JSON = "configuracoes_sistema.json"
const LIMITE_50MB = 52428800 // 50 MB
const ID_PADRAO_CONFIG = "00000000-0000-0000-0000-000000000000"

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
    const adminClient = await createAdminClient()
    let dadosTabela: Record<string, any> | null = null

    const { data, error } = await adminClient
      .from("configuracoes")
      .select("*")
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      dadosTabela = data
    } else {
      const sessionClient = await createClient()
      const retry = await sessionClient
        .from("configuracoes")
        .select("*")
        .limit(1)
        .maybeSingle()
      if (!retry.error && retry.data) {
        dadosTabela = retry.data
      }
    }

    // Lê também o JSON completo salvo no Storage (garante funcionamento mesmo se faltarem colunas na tabela de produção)
    const dadosStorage = await lerConfigJsonStorage(adminClient)

    if (!dadosTabela && !dadosStorage) {
      return { sucesso: true, dados: null }
    }

    const mesclado: Record<string, any> = { ...(dadosTabela || {}) }
    if (dadosStorage) {
      for (const [chave, valor] of Object.entries(dadosStorage)) {
        if (valor !== undefined) {
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
    .select("id")
    .limit(1)
    .maybeSingle()

  const idAlvo = existente?.id || ID_PADRAO_CONFIG
  const dadosParaGravar = { ...payload, updated_at: new Date().toISOString() }

  const executar = async (campos: Record<string, any>) => {
    if (existente?.id) {
      return await client.from("configuracoes").update(campos).eq("id", idAlvo)
    }
    return await client.from("configuracoes").upsert({ id: idAlvo, ...campos })
  }

  let { error } = await executar(dadosParaGravar)

  // Se colunas novas não existirem na tabela do banco de produção, remove-as uma a uma e grava as que existem
  let tentativas = 0
  const copiaCampos: Record<string, any> = { ...dadosParaGravar }
  while (error && tentativas < 25) {
    const matchCol =
      error.message?.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation/i) ||
      error.message?.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)
    if (matchCol && matchCol[1] && matchCol[1] in copiaCampos) {
      delete copiaCampos[matchCol[1]]
      if (Object.keys(copiaCampos).length <= 1) {
        error = null
        break
      }
      const res = await executar(copiaCampos)
      error = res.error
      tentativas++
    } else {
      break
    }
  }

  return { error }
}

export async function salvarConfiguracoesServidor(
  novosDados: Record<string, any>
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const adminClient = await createAdminClient()

    // 1) Sempre salva o JSON completo no Storage (suporta todos os campos mesmo sem migration no banco de produção)
    const atualStorage = (await lerConfigJsonStorage(adminClient)) || {}
    const jsonCompleto = {
      ...atualStorage,
      ...novosDados,
      updated_at: new Date().toISOString(),
    }
    const resStorage = await gravarConfigJsonStorage(adminClient, jsonCompleto)

    // 2) Atualiza na tabela configuracoes todas as colunas que existirem no banco
    let { error } = await gravarLinhaConfiguracoes(adminClient, novosDados)

    if (error) {
      const sessionClient = await createClient()
      const retry = await gravarLinhaConfiguracoes(sessionClient, novosDados)
      error = retry.error
    }

    if (error && !resStorage.ok) {
      return { sucesso: false, erro: error.message }
    }

    revalidatePath("/admin/configuracoes")
    return { sucesso: true }
  } catch (err: any) {
    return { sucesso: false, erro: err?.message || "Erro ao salvar configurações." }
  }
}
