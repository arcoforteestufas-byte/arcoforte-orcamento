import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"

// Preenche um modelo .docx (com tags tipo {cliente_nome} e loops {#itens}...{/itens})
// com os dados da proposta, e devolve o arquivo Word já preenchido como Blob.
export function preencherDocxTemplate(templateArrayBuffer: ArrayBuffer, variaveis: Record<string, any>): Blob {
  const zip = new PizZip(templateArrayBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  try {
    doc.render(variaveis)
  } catch (error: any) {
    // Docxtemplater lança um MultiError com detalhes de cada tag problemática
    // (tag sem fechar, nome errado, loop mal formado etc.) — junta tudo numa
    // mensagem legível em vez do erro genérico do JS.
    const detalhes = error?.properties?.errors
      ?.map((e: any) => e?.properties?.explanation || e?.message)
      .filter(Boolean)
      .join('; ')
    throw new Error(
      detalhes
        ? `Erro no modelo Word: ${detalhes}`
        : `Erro ao preencher o modelo Word: ${error?.message || 'erro desconhecido'}`
    )
  }

  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
}
