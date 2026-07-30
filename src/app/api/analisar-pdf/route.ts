import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF text
    const parsed = await PDFParse(buffer);
    const pdfText = parsed.text;

    if (!pdfText || pdfText.trim() === "") {
      return NextResponse.json({ error: "O PDF parece estar vazio ou é apenas uma imagem (scaneada). O Claude precisa de texto digital." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "A chave ANTHROPIC_API_KEY não está configurada no servidor (.env)." }, { status: 500 });
    }

    const anthropic = new Anthropic({
      apiKey,
    });

    const prompt = `Você é um assistente de engenharia para orçamento de estufas. 
Eu vou te passar o texto extraído de um PDF de um orçamento/pedido de estufa agrícola.
Seu trabalho é extrair a lista de materiais.
Retorne um objeto JSON contendo APENAS uma propriedade chamada "itens" que é um array.
Cada item deve ter:
- "codigo" (se existir, senão null)
- "descricao" (o nome do item, ex: "Poste", "Arco Simples")
- "quantidade" (numero)
- "unidade" (texto, ex: "un", "m", "kg")

E uma propriedade "parametros_estufa" contendo um objeto com as medidas se você encontrar no texto:
- n_vaos (numero)
- n_modulos (numero)
- pe_direito (numero em metros)
- largura_modulo (numero em metros)
Se não achar algum deles, não invente.

Texto do PDF:
${pdfText}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      system: "Responda apenas com o JSON bruto, sem formatacao Markdown ou crases ao redor.",
    });

    const resultText = (response.content[0] as any).text;
    
    let json;
    try {
      json = JSON.parse(resultText);
    } catch (e) {
      // Tentar limpar caso o Claude tenha enviado markdown json
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      json = JSON.parse(cleaned);
    }

    return NextResponse.json(json);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
