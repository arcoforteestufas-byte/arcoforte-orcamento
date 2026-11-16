import { createClient } from "@/utils/supabase/client"
import { prepararUploadAsset, uploadAssetServidor } from "@/app/actions/configuracoes"

function lerComoDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Falha ao converter arquivo para Base64."))
      }
    }
    reader.onerror = () => reject(new Error("Erro ao ler arquivo."))
    reader.readAsDataURL(blob)
  })
}

function redimensionarCanvasParaJpeg(
  source: HTMLImageElement | HTMLCanvasElement,
  larguraOrig: number,
  alturaOrig: number,
  nomeBase: string
): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      const MAX_W = 1240
      const MAX_H = 1754
      let w = larguraOrig || 1240
      let h = alturaOrig || 1754
      const ratio = Math.min(MAX_W / w, MAX_H / h, 1)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)

      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(null)

      // Fundo branco para imagens com transparência
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(source, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null)
          resolve(new File([blob], `${nomeBase}.jpg`, { type: "image/jpeg" }))
        },
        "image/jpeg",
        0.85
      )
    } catch {
      resolve(null)
    }
  })
}

async function converterImagemParaJpegOtimizado(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      const baseName = file.name.replace(/\.[^.]+$/, "")
      const convertido = await redimensionarCanvasParaJpeg(
        img,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        baseName
      )
      URL.revokeObjectURL(url)
      resolve(convertido || file)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

async function converterPdfPrimeiraPaginaParaJpeg(file: File): Promise<File> {
  try {
    const importDinamico = new Function("url", "return import(url)")
    const pdfjsLib: any = await importDinamico(
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs"
    )
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
    }

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(1)

    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext("2d")
    if (!context) return file

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise

    const baseName = file.name.replace(/\.[^.]+$/, "")
    const convertido = await redimensionarCanvasParaJpeg(
      canvas,
      canvas.width,
      canvas.height,
      baseName
    )
    return convertido || file
  } catch (err) {
    console.warn("Não foi possível rasterizar o PDF no navegador, mantendo arquivo original:", err)
    return file
  }
}

export async function prepararArquivoVisualProposta(file: File): Promise<File> {
  const ext = (file.name.split(".").pop() || "").toLowerCase()
  const isPdf = file.type === "application/pdf" || ext === "pdf"
  const isImagem = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)

  if (isPdf) {
    return await converterPdfPrimeiraPaginaParaJpeg(file)
  }
  if (isImagem) {
    return await converterImagemParaJpegOtimizado(file)
  }
  return file
}

export async function uploadArquivoParaAssets(
  arquivo: File | Blob,
  filename: string,
  permitirFallbackDataUrl = true
): Promise<string> {
  const erros: string[] = []
  const contentType = arquivo.type || "application/octet-stream"

  // 1) Tenta via URL assinada gerada no servidor com service_role
  try {
    const prep = await prepararUploadAsset(filename)
    if (prep.sucesso && prep.signedUrl && prep.publicUrl) {
      const putRes = await fetch(prep.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: arquivo,
      })
      if (putRes.ok) {
        return prep.publicUrl
      }
      const errTxt = await putRes.text().catch(() => "")
      erros.push(`Signed PUT (${putRes.status}): ${errTxt}`)
    } else if (prep.erro) {
      erros.push(`Preparar upload: ${prep.erro}`)
    }
  } catch (err: any) {
    erros.push(`Signed URL: ${err?.message || "erro"}`)
  }

  // 2) Se o arquivo tem até ~4.2 MB, tenta upload direto via Server Action
  if (arquivo.size <= 4.2 * 1024 * 1024) {
    try {
      const fd = new FormData()
      const fileObj =
        arquivo instanceof File
          ? arquivo
          : new File([arquivo], filename, { type: contentType })
      fd.append("file", fileObj)
      fd.append("filename", filename)

      const srvRes = await uploadAssetServidor(fd)
      if (srvRes.sucesso && srvRes.publicUrl) {
        return srvRes.publicUrl
      }
      if (srvRes.erro) {
        erros.push(`Upload servidor: ${srvRes.erro}`)
      }
    } catch (err: any) {
      erros.push(`Server Action: ${err?.message || "erro"}`)
    }
  }

  // 3) Tenta upload pelo cliente Supabase do navegador (bucket 'assets' e fallback bucket 'croquis')
  try {
    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filename, arquivo, {
        contentType,
        upsert: true,
      })

    if (!uploadError) {
      const { data } = supabase.storage.from("assets").getPublicUrl(filename)
      if (data?.publicUrl) {
        return data.publicUrl
      }
    } else {
      erros.push(`Storage assets: ${uploadError.message}`)
    }

    // Tenta no bucket 'croquis' caso 'assets' não exista na produção e o arquivo seja imagem
    if (contentType.startsWith("image/")) {
      const caminhoCroquis = `uploads/${filename}`
      const { error: croquiErr } = await supabase.storage
        .from("croquis")
        .upload(caminhoCroquis, arquivo, {
          contentType,
          upsert: true,
        })
      if (!croquiErr) {
        const { data } = supabase.storage.from("croquis").getPublicUrl(caminhoCroquis)
        if (data?.publicUrl) {
          return data.publicUrl
        }
      }
    }
  } catch (err: any) {
    erros.push(`Browser client: ${err?.message || "erro"}`)
  }

  // 4) Fallback final: salva como Data URL (Base64) diretamente no banco de dados
  if (permitirFallbackDataUrl && arquivo.size <= 6 * 1024 * 1024) {
    try {
      return await lerComoDataUrl(arquivo)
    } catch (err: any) {
      erros.push(`DataURL: ${err?.message || "erro"}`)
    }
  }

  throw new Error(erros.join(" | ") || "Não foi possível enviar o arquivo.")
}
