"use server"

import { createAdminClient, obterUsuario } from "@/utils/supabase/server"

const BUCKET = "assets"
const LIMITE = 2 * 1024 * 1024 // a foto já chega reduzida pelo navegador (~50 KB)

/** Envia a foto de perfil (usuário ou motorista) e devolve a URL pública */
export async function enviarFoto(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  try {
    const user = await obterUsuario()
    if (!user) return { ok: false, erro: "Faça login novamente." }

    const arquivo = formData.get("file") as File | null
    const tipo = formData.get("tipo") === "motorista" ? "motoristas" : "usuarios"
    if (!arquivo) return { ok: false, erro: "Nenhuma imagem recebida." }
    if (!arquivo.type.startsWith("image/")) return { ok: false, erro: "O arquivo precisa ser uma imagem." }
    if (arquivo.size > LIMITE) return { ok: false, erro: "Imagem muito grande (máximo 2 MB)." }

    const caminho = `fotos/${tipo}/${crypto.randomUUID()}.jpg`
    const admin = await createAdminClient()
    const { error } = await admin.storage.from(BUCKET).upload(caminho, Buffer.from(await arquivo.arrayBuffer()), {
      contentType: arquivo.type, cacheControl: "31536000", upsert: false,
    })
    if (error) return { ok: false, erro: error.message }
    const { data } = admin.storage.from(BUCKET).getPublicUrl(caminho)
    return { ok: true, url: data.publicUrl }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao enviar a foto." }
  }
}
