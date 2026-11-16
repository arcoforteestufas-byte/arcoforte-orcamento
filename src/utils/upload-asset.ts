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

async function converterWebpParaPng(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          URL.revokeObjectURL(url)
          return resolve(file)
        }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (!blob) return resolve(file)
          const baseName = file.name.replace(/\.[^.]+$/, "")
          resolve(new File([blob], `${baseName}.png`, { type: "image/png" }))
        }, "image/png")
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

async function converterPdfPrimeiraPaginaParaPng(file: File): Promise<File> {
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

    const viewport = page.getViewport({ scale: 2.5 })
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext("2d")
    if (!context) return file

    await page.render({ canvasContext: context, viewport }).promise

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    )
    if (!blob) return file

    const baseName = file.name.replace(/\.[^.]+$/, "")
    return new File([blob], `${baseName}.png`, { type: "image/png" })
  } catch (err) {
    console.warn("Não foi possível rasterizar o PDF no navegador, mantendo arquivo original:", err)
    return file
  }
}

export async function prepararArquivoVisualProposta(file: File): Promise<File> {
  const ext = (file.name.split(".").pop() || "").toLowerCase()
  const isPdf = file.type === "application/pdf" || ext === "pdf"
  const isWebp = file.type === "image/webp" || ext === "webp"

  if (isPdf) {
    return await converterPdfPrimeiraPaginaParaPng(file)
  }
  if (isWebp) {
    return await converterWebpParaPng(file)
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

  // 1) Tenta via URL assinada gerada no servidor com service_role (cria o bucket automaticamente se não existir)
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

  // 3) Tenta upload pelo cliente Supabase do navegador
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
      erros.push(`Storage client: ${uploadError.message}`)
    }
  } catch (err: any) {
    erros.push(`Browser client: ${err?.message || "erro"}`)
  }

  // 4) Fallback final: se o bucket não estiver acessível no ambiente de produção, salva como Data URL (Base64)
  if (permitirFallbackDataUrl && arquivo.size <= 6 * 1024 * 1024) {
    try {
      return await lerComoDataUrl(arquivo)
    } catch (err: any) {
      erros.push(`DataURL: ${err?.message || "erro"}`)
    }
  }

  throw new Error(erros.join(" | ") || "Não foi possível enviar o arquivo.")
}
