import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { LOGO_ARCOFORTE_WEBP } from "./logo-data"

// Manual de montagem em PDF, gerado a partir do 3D (imagens por etapa) e dos itens do orçamento.
// Texto só com caracteres Latin-1 (fonte padrão do jsPDF): sem travessão, setas ou "≈".

export type ItemManual = { codigo: string; descricao: string; quantidade: number; unidade: string; grupo: string }

export type DadosManual = {
  numero: string
  cliente: string
  vendedor?: string
  cfg: Record<string, any>
  imagens: { etapas: string[]; final: string }
  itens: ItemManual[]
}

const VERDE: [number, number, number] = [11, 57, 48]
const LARANJA: [number, number, number] = [248, 97, 26]
const CINZA: [number, number, number] = [93, 102, 100]

const ACRESCIMO_ARCO: Record<number, number> = { 3: 0.8, 4: 1, 5: 1.2, 6: 1.4, 7: 1.6, 8: 1.8, 9: 1.9, 10: 2 }
const CABO_COMPRIMENTO: Record<number, number> = { 2: 3.6, 2.5: 4, 3: 4.4, 4: 5.2, 5: 6 }
const CHUMBAMENTO: Record<number, number> = { 3: 0.6, 4: 0.8, 5: 1.0 }

const br = (n: number, casas = 2) => (Math.round(n * 10 ** casas) / 10 ** casas).toLocaleString("pt-BR")

/** Em qual etapa entra cada grupo de material do orçamento. */
export function etapaDoGrupo(grupo: string): number {
  const g = (grupo || "").toUpperCase()
  if (/FECHAMENTO|PORTA|CORTINA|TELA/.test(g)) return 6
  if (/POSTE/.test(g)) return 1
  if (/CABO/.test(g)) return 4
  if (/COBERTURA|FILME|MOLA/.test(g)) return 5
  if (/LATERAL|CALHA|EMENDA|SUPORTE/.test(g)) return 2
  if (/ARCO|DORSAL|CONTRAVENTO|ENCAIXE|PARAFUSO/.test(g)) return 3
  return 6
}

async function logoPng(): Promise<string | null> {
  try {
    const img = new Image()
    img.src = LOGO_ARCOFORTE_WEBP
    await img.decode()
    const c = document.createElement("canvas")
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext("2d")!.drawImage(img, 0, 0)
    return c.toDataURL("image/png")
  } catch {
    return null
  }
}

async function tamanhoImagem(src: string): Promise<{ w: number; h: number }> {
  const img = new Image()
  img.src = src
  await img.decode()
  return { w: img.naturalWidth, h: img.naturalHeight }
}

export async function gerarManualMontagemPdf(d: DadosManual): Promise<jsPDF> {
  const c = d.cfg || {}
  const nM = Number(c.nM) || 1, nV = Number(c.nV) || 1, vao = Number(c.vao) || 3, PD = Number(c.PD) || 4
  const larguras: number[] = c.adv && Array.isArray(c.mods) && c.mods.length
    ? c.mods.slice(0, nM).map((m: any) => Number(m?.L) || Number(c.Lm) || 8)
    : Array.from({ length: nM }, () => Number(c.Lm) || 8)
  const L = larguras.reduce((a, b) => a + b, 0)
  const C = nV * vao
  const maiorArco = Math.max(...larguras)
  const altura = PD + (ACRESCIMO_ARCO[maiorArco] ?? 1.8)
  const postesLinha = nV + 1
  const linhas = nM + 1
  const totalPostes = postesLinha * linhas
  const fv = Number(c.fv) || 3
  const topoArco = Math.max(0, fv - 1) * 2 * nM
  const diagonal = Math.sqrt(L * L + C * C)
  const chumb = CHUMBAMENTO[PD]
  const cabo = CABO_COMPRIMENTO[PD] ?? 5.2
  const distAnc = Math.sqrt(Math.max(1, cabo * cabo - PD * PD))
  const nEstufas = (Number(c.rX) || 1) * (Number(c.rZ) || 1)
  const temCob = c.cob !== false
  const fech = String(c.fech || "tela")
  const portas: any[] = Array.isArray(c.doors) ? c.doors : []

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const W = 210, H = 297, M = 15
  const logo = await logoPng()

  const cabecalho = (titulo: string) => {
    doc.setFillColor(...VERDE)
    doc.rect(0, 0, W, 18, "F")
    doc.setFillColor(...LARANJA)
    doc.rect(0, 18, W, 1.2, "F")
    if (logo) doc.addImage(logo, "PNG", M, 3.5, 24, 11)
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("MANUAL DE MONTAGEM", W - M, 8.5, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.text(`Estufa ${br(L)} × ${br(C)} m · Orçamento #${d.numero}`, W - M, 13.5, { align: "right" })
    doc.setTextColor(...VERDE)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(titulo, M, 30)
    return 37
  }
  const rodape = () => {
    doc.setDrawColor(220, 224, 222)
    doc.line(M, H - 12, W - M, H - 12)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...CINZA)
    doc.text("ArcoForte Estufas · Este manual é um guia de montagem. Em caso de dúvida, siga a orientação da equipe técnica da ArcoForte.", M, H - 7.5)
  }
  const paragrafo = (texto: string, y: number, tam = 9.5, cor = CINZA) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(tam)
    doc.setTextColor(...cor)
    const linhasTxt = doc.splitTextToSize(texto, W - 2 * M)
    doc.text(linhasTxt, M, y)
    return y + linhasTxt.length * tam * 0.42 + 2
  }
  const lista = (itens: string[], y: number) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9.5)
    doc.setTextColor(40, 46, 44)
    itens.forEach((t, i) => {
      const l = doc.splitTextToSize(t, W - 2 * M - 8)
      if (y + l.length * 4.2 > H - 20) { doc.addPage(); y = cabecalho("(continuação)") }
      doc.setFillColor(...LARANJA)
      doc.circle(M + 2.2, y - 1.2, 1.6, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.text(String(i + 1), M + 2.2, y - 0.2, { align: "center" })
      doc.setTextColor(40, 46, 44)
      doc.setFontSize(9.5)
      doc.text(l, M + 7, y)
      y += l.length * 4.2 + 1.6
    })
    return y + 1
  }
  const atencao = (texto: string, y: number) => {
    const l = doc.splitTextToSize(texto, W - 2 * M - 10)
    const h = l.length * 4.2 + 6
    if (y + h > H - 20) { doc.addPage(); y = cabecalho("(continuação)") }
    doc.setFillColor(255, 243, 235)
    doc.setDrawColor(...LARANJA)
    doc.roundedRect(M, y, W - 2 * M, h, 2, 2, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(178, 66, 12)
    doc.text(l, M + 5, y + 5.5)
    return y + h + 4
  }
  const imagem = async (src: string, y: number, maxH: number) => {
    if (!src) return y
    const t = await tamanhoImagem(src)
    let w = W - 2 * M, h = (w * t.h) / t.w
    if (h > maxH) { h = maxH; w = (h * t.w) / t.h }
    doc.addImage(src, "JPEG", (W - w) / 2, y, w, h)
    return y + h + 5
  }
  const tabelaMateriais = (etapa: number, y: number) => {
    const itens = d.itens.filter(i => etapaDoGrupo(i.grupo) === etapa)
    if (!itens.length) return paragrafo("Materiais desta etapa: conforme lista do orçamento.", y, 9)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10.5)
    doc.setTextColor(...VERDE)
    doc.text("Materiais desta etapa", M, y)
    autoTable(doc, {
      startY: y + 2,
      margin: { left: M, right: M, top: 26, bottom: 18 },
      head: [["Código", "Descrição", "Qtd.", "Un."]],
      body: itens.map(i => [i.codigo, i.descricao, br(i.quantidade), i.unidade]),
      styles: { fontSize: 8.5, cellPadding: 1.6 },
      headStyles: { fillColor: VERDE, textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 246] },
      columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 18, halign: "right" }, 3: { cellWidth: 14 } },
    })
    return ((doc as any).lastAutoTable?.finalY || y) + 6
  }

  // ---------- Capa ----------
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, W, 70, "F")
  doc.setFillColor(...LARANJA)
  doc.rect(0, 70, W, 2, "F")
  if (logo) doc.addImage(logo, "PNG", M, 14, 46, 21)
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(26)
  doc.text("MANUAL DE MONTAGEM", M, 50)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(13)
  doc.text(`Estufa agrícola ${br(L)} × ${br(C)} m · pé-direito ${br(PD)} m${nEstufas > 1 ? ` · ${nEstufas} estufas` : ""}`, M, 60)
  let y = await imagem(d.imagens.final, 82, 120)
  doc.setTextColor(...VERDE)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(d.cliente || "Cliente", M, y + 4)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.setTextColor(...CINZA)
  doc.text(`Orçamento #${d.numero} · ${new Date().toLocaleDateString("pt-BR")}${d.vendedor ? ` · Vendedor: ${d.vendedor}` : ""}`, M, y + 10)

  // ---------- Resumo e segurança ----------
  doc.addPage()
  y = cabecalho("Resumo da estufa e antes de começar")
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 1.8 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 62, fillColor: [245, 247, 246] } },
    body: [
      ["Dimensões", `${br(L)} m de largura × ${br(C)} m de comprimento`],
      ["Módulos (largura)", `${nM} módulo(s): ${larguras.map(x => br(x) + " m").join(" + ")}`],
      ["Vãos (comprimento)", `${nV} vãos de ${br(vao)} m`],
      ["Pé-direito / altura total", `${br(PD)} m / ${br(altura)} m no topo do arco`],
      ["Tipo de arco", String(c.adv ? "conforme cada módulo" : c.arco || "duplo")],
      ["Postes", `${linhas} linhas × ${postesLinha} postes = ${totalPostes} postes${topoArco ? ` + ${topoArco} postes topo de arco` : ""}`],
      ["Cobertura", temCob ? (c.cobm === "tela" ? "tela" : "filme plástico") : "sem cobertura"],
      ["Fechamento lateral", fech === "nao" ? "sem fechamento" : fech === "filme" ? "filme plástico" : "tela"],
      ["Portas", portas.length ? `${portas.length} porta(s)${portas.some(p => p.a) ? ", com antecâmara" : ""}` : "nenhuma"],
      ...(nEstufas > 1 ? [["Quantidade de estufas", `${nEstufas} estufas iguais: repita as etapas em cada uma`]] : []),
    ],
  })
  y = ((doc as any).lastAutoTable?.finalY || y) + 8
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...VERDE)
  doc.text("Segurança", M, y); y += 5
  y = lista([
    "Use EPIs em todas as etapas: capacete, luvas, óculos, botina e cinto de segurança com talabarte para trabalho em altura.",
    "Trabalho acima de 2 m exige equipe treinada (NR-35), andaime ou escada firme e sempre uma pessoa de apoio no chão.",
    "Não monte arcos nem instale filme ou tela com vento forte, chuva ou risco de raio.",
    "Mantenha a área isolada e sem pessoas embaixo de peças sendo içadas.",
  ], y)
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...VERDE)
  doc.text("Ferramentas recomendadas", M, y); y += 5
  y = lista([
    "Trena de 50 m, linha de pedreiro, estacas, esquadro e nível (mangueira de nível ou nível a laser).",
    "Cavadeira ou perfuratriz, betoneira ou masseira, prumo.",
    "Furadeira/parafusadeira, jogo de chaves, alicate, arco de serra ou esmerilhadeira, escadas e andaime.",
    "Esticador ou catraca para os cabos de aço.",
  ], y)
  y = atencao("Confira todo o material pela lista do orçamento antes de começar e separe as peças por etapa. Peça faltando ou danificada: avise a ArcoForte antes de montar.", y)

  // ---------- Etapas ----------
  const etapas: { titulo: string; passos: string[]; atencao: string }[] = [
    {
      titulo: "Etapa 1 · Marcação e postes",
      passos: [
        `Limpe e nivele a área. Marque o retângulo de ${br(L)} × ${br(C)} m com estacas e linha.`,
        `Confira o esquadro medindo as duas diagonais: devem ter a mesma medida (aprox. ${br(diagonal)} m).`,
        `Marque ${linhas} linhas de postes no sentido do comprimento, nas divisas dos módulos (${larguras.map(x => br(x) + " m").join(", ")}).`,
        `Em cada linha, marque um poste a cada ${br(vao)} m: ${postesLinha} postes por linha, ${totalPostes} no total.`,
        chumb
          ? `Abra os buracos e chumbe os postes com ${br(chumb)} m enterrados, deixando ${br(PD)} m livres acima do chão.`
          : `Abra os buracos e chumbe os postes na profundidade indicada pela ArcoForte, deixando ${br(PD)} m livres acima do chão.`,
        "Coloque cada poste no prumo nas duas direções e alinhado pela linha. Confira a altura de todos com o nível antes de concretar.",
        topoArco ? `Na frente e no fundo de cada módulo, chumbe os postes topo de arco (${topoArco} no total), no meio de cada arco frontal.` : "Confira o alinhamento das cabeceiras (frente e fundo).",
        "Aguarde a cura do concreto antes de subir calhas e arcos.",
      ],
      atencao: "A altura igual de todos os postes é o que garante calhas com caimento certo e arcos alinhados. Confira antes do concreto endurecer.",
    },
    {
      titulo: "Etapa 2 · Laterais, calhas e suportes",
      passos: [
        "Fixe no topo dos postes as esperas de arco e os suportes de calha, conforme a posição de cada poste (canto, lateral ou divisa).",
        "Instale as laterais (perfil simples ou duplo) ou as calhas nas duas laterais da estufa.",
        nM > 1 ? `Instale as calhas centrais entre os módulos (${nM - 1} linha(s)), com entrada de água na frente e saída no fundo.` : "Nos postes de canto, instale as peças de entrada e saída de água, se a estufa tiver calha.",
        "Una as barras com as emendas próprias e vede as emendas de calha com PU selante.",
        "Confira o alinhamento e o caimento das calhas para o lado da saída de água.",
      ],
      atencao: "Calha sem caimento acumula água e peso. Teste com água antes de cobrir a estufa.",
    },
    {
      titulo: "Etapa 3 · Arcos, dorsal e contraventos",
      passos: [
        "Comece pelos arcos frontais (frente e fundo de cada módulo). Coloque no prumo e fixe com os parafusos de 3 polegadas.",
        `Suba os arcos internos, um a cada ${br(vao)} m, encaixando nas esperas e suportes do topo dos postes.`,
        "Instale a dorsal no ponto mais alto, presa a cada arco interno pelo encaixe central, unindo as barras com as emendas.",
        "Fixe os contraventos nas cabeceiras (2 na frente e 2 no fundo de cada módulo) e prenda os postes topo de arco aos arcos frontais.",
        c.arco === "lanternim" ? "Nos módulos com lanternim, instale as laterais extras no lugar da dorsal." : "Confira se todos os arcos estão na mesma altura e alinhados pela dorsal.",
        "Reaperte todos os parafusos ao final da etapa.",
      ],
      atencao: "Não deixe arcos soltos de um dia para o outro: termine cada vão com dorsal e parafusos apertados.",
    },
    {
      titulo: "Etapa 4 · Cabos de aço e travamento",
      passos: [
        `Instale os chumbadores de ancoragem dos cabos laterais a cerca de ${br(distAnc, 1)} m para fora da linha dos postes.`,
        fv > 1 ? "Na frente e no fundo, os cabos do topo dos arcos vão mais longe: siga a posição indicada pela ArcoForte." : "Na frente e no fundo, ancore os cabos frontais da mesma forma.",
        "Prenda os cabos no topo dos postes e nos chumbadores com grampos e esticadores.",
        c.cabo !== false ? `Monte o travamento em X nas pontas das linhas de postes (${Number(c.nX) || 2} X por linha).` : "Instale os cabos internos de poste a poste, se previstos no orçamento.",
        "Estique todos os cabos por igual, sem entortar postes ou arcos. Confira o prumo de novo depois de esticar.",
      ],
      atencao: "Deixe livre a faixa dos cabos de ancoragem: não passe máquinas nem abra ruas por cima deles.",
    },
    {
      titulo: "Etapa 5 · Cobertura",
      passos: [
        "Confira se não há rebarbas ou pontas que possam furar o filme. Proteja os pontos de atrito.",
        "Instale os perfis de fixação nas laterais, calhas e arcos frontais.",
        temCob && c.cobm !== "tela"
          ? "Estenda o filme num dia sem vento, de preferência no começo da manhã ou no fim da tarde, respeitando a face indicada pelo fabricante."
          : "Estenda a tela de cobertura num dia sem vento.",
        "Prenda com a mola em zigue-zague nos perfis, começando pelo meio e indo para as pontas, esticando sem deixar rugas.",
        "Feche as cabeceiras e as divisas do filme conforme o projeto.",
      ],
      atencao: "Nunca instale a cobertura com vento: o filme vira vela e pode machucar a equipe e danificar a estrutura.",
    },
    {
      titulo: "Etapa 6 · Fechamento, portas e acabamento",
      passos: [
        fech === "nao" ? "Estufa sem fechamento lateral: confira apenas os acabamentos das cabeceiras." : `Faça a base do fechamento (${c.inf === "enterrada" ? "tela/filme enterrado no solo" : "mureta com perfil"}).`,
        fech === "nao" ? "Instale as portas, se houver." : `Instale o fechamento em ${fech === "filme" ? "filme" : "tela"} nas laterais, frente e fundo, preso com perfil e mola.`,
        "Nos cantos e postes de divisa, use o perfil duplo para fixar o fechamento.",
        portas.length ? `Monte as portas (${portas.length}) nos locais indicados${portas.some(p => p.a) ? " e as antecâmaras" : ""}, conferindo prumo e abertura.` : "Confira os acabamentos das cabeceiras.",
        c.cort ? "Instale a cortina móvel nas laterais e teste a abertura e o fechamento." : "Retire sobras de material e limpe a área.",
      ],
      atencao: "Ao final, faça a conferência geral da próxima página antes de entregar a estufa.",
    },
  ]

  for (let i = 0; i < etapas.length; i++) {
    const e = etapas[i]
    doc.addPage()
    y = cabecalho(e.titulo)
    y = await imagem(d.imagens.etapas[i] || "", y, 92)
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...VERDE)
    doc.text("O que fazer", M, y); y += 5
    y = lista(e.passos, y)
    y = atencao(e.atencao, y)
    if (y > H - 50) { doc.addPage(); y = cabecalho(e.titulo + " (materiais)") }
    tabelaMateriais(i + 1, y)
  }

  // ---------- Conferência final ----------
  doc.addPage()
  y = cabecalho("Conferência final")
  y = await imagem(d.imagens.final, y, 90)
  const check = [
    "Postes no prumo e com a mesma altura; concreto curado.",
    "Calhas alinhadas, com caimento e sem vazamento nas emendas.",
    "Todos os arcos alinhados, dorsal contínua e parafusos reapertados.",
    "Cabos de aço esticados por igual e chumbadores firmes.",
    "Cobertura esticada, sem rugas, furos ou partes soltas.",
    "Fechamento preso em todo o perímetro; portas abrindo e fechando bem.",
    "Área limpa, sobras recolhidas e cliente orientado sobre uso e manutenção.",
  ]
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 46, 44)
  check.forEach(t => {
    doc.setDrawColor(...VERDE)
    doc.rect(M, y - 3.6, 4.5, 4.5)
    doc.text(doc.splitTextToSize(t, W - 2 * M - 10), M + 8, y)
    y += 8
  })
  y += 4
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...CINZA)
  doc.text("Responsável pela montagem: ____________________________   Data: ____/____/______", M, y)
  y += 9
  doc.text("Assinatura do cliente: ________________________________", M, y)

  // Rodapé e numeração em todas as páginas (inclusive as que a tabela criou sozinha)
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    rodape()
    doc.text(`${i} / ${total}`, W - M, H - 7.5, { align: "right" })
  }
  return doc
}
