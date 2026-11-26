import { NextRequest, NextResponse } from "next/server"
import { obterUsuario } from "@/utils/supabase/server"
import { lerPedidoSensioPdf } from "@/lib/pedido-sensio"

const LIMITE = 4 * 1024 * 1024 // a Vercel aceita até ~4,5 MB por requisição

/** Lê o PDF do pedido do Sensio e devolve os produtos (para a entrega) */
export async function POST(req: NextRequest) {
  try {
    const user = await obterUsuario()
    if (!user) return NextResponse.json({ erro: "Faça login novamente." }, { status: 401 })

    const form = await req.formData()
    const arquivo = form.get("file") as File | null
    if (!arquivo) return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 })
    if (arquivo.size > LIMITE) return NextResponse.json({ erro: "PDF muito grande (máximo 4 MB)." }, { status: 400 })

    // pdf-parse v2 (fica fora do bundle: serverExternalPackages no next.config)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse") as { PDFParse: new (o: { data: Buffer }) => { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } }
    const parser = new PDFParse({ data: Buffer.from(await arquivo.arrayBuffer()) })
    let texto = ""
    try {
      texto = (await parser.getText()).text || ""
    } finally {
      await parser.destroy().catch(() => {})
    }
    if (!texto.trim()) return NextResponse.json({ erro: "O PDF não tem texto (parece escaneado). Use o PDF gerado pelo Sensio ou o Excel." }, { status: 400 })

    const pedidos = lerPedidoSensioPdf(texto, arquivo.name)
    return NextResponse.json({ pedidos })
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Não consegui ler o PDF." }, { status: 400 })
  }
}
