"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

const BUCKET_ASSETS = "assets"
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
      // Tenta com o cliente autenticado da sessão caso a service_role não esteja definida
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
    const { data, error } = await adminClient
      .from("configuracoes")
      .select("*")
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      return { sucesso: true, dados: data }
    }

    const sessionClient = await createClient()
    const retry = await sessionClient
      .from("configuracoes")
      .select("*")
      .limit(1)
      .maybeSingle()

    if (retry.error) {
      return { sucesso: false, erro: retry.error.message }
    }

    return { sucesso: true, dados: retry.data }
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

  // Se já existe linha, faz update; senão faz insert
  const executar = async (campos: Record<string, any>) => {
    if (existente?.id) {
      return await client.from("configuracoes").update(campos).eq("id", idAlvo)
    }
    return await client.from("configuracoes").upsert({ id: idAlvo, ...campos })
  }

  let { error } = await executar(dadosParaGravar)

  // Se alguma coluna opcional ainda não existir no banco de produção, remove-a e tenta novamente
  let tentativas = 0
  const copiaCampos: Record<string, any> = { ...dadosParaGravar }
  while (error && tentativas < 5) {
    const matchCol =
      error.message?.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation/i) ||
      error.message?.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)
    if (matchCol && matchCol[1] && matchCol[1] in copiaCampos) {
      delete copiaCampos[matchCol[1]]
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
    let { error } = await gravarLinhaConfiguracoes(adminClient, novosDados)

    if (error) {
      const sessionClient = await createClient()
      const retry = await gravarLinhaConfiguracoes(sessionClient, novosDados)
      error = retry.error
    }

    if (error) {
      return { sucesso: false, erro: error.message }
    }

    revalidatePath("/admin/configuracoes")
    return { sucesso: true }
  } catch (err: any) {
    return { sucesso: false, erro: err?.message || "Erro ao salvar configurações." }
  }
}
