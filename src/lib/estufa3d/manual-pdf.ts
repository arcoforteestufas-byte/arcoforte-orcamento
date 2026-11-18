import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { LOGO_ARCOFORTE_WEBP } from "./logo-data"

// Manual de montagem em PDF, gerado a partir do 3D (imagens) e dos itens do orçamento.
// Texto só com caracteres Latin-1 (fonte padrão do jsPDF): sem travessão longo, setas ou símbolos especiais.

export type ItemManual = { codigo: string; descricao: string; quantidade: number; unidade: string; grupo: string }

export type DadosManual = {
  numero: string
  cliente: string
  vendedor?: string
  cfg: Record<string, any>
  /** passos[i] = uma imagem por passo da etapa i (opcional; sem ela usa a imagem da etapa) */
  imagens: { etapas: string[]; final: string; passos?: (string[] | undefined)[] }
  itens: ItemManual[]
}

type RGB = [number, number, number]
const VERDE: RGB = [11, 57, 48]
const VERDE_M: RGB = [24, 92, 76]
const VERDE_C: RGB = [168, 205, 192]
const LARANJA: RGB = [248, 97, 26]
const LARANJA_C: RGB = [255, 241, 232]
const TEXTO: RGB = [33, 40, 38]
const CINZA: RGB = [104, 113, 111]
const CLARO: RGB = [244, 246, 245]
const LINHA: RGB = [222, 227, 225]

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

async function carregar(src: string) {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

async function logoPng(): Promise<{ src: string; asp: number } | null> {
  try {
    const img = await carregar(LOGO_ARCOFORTE_WEBP)
    const c = document.createElement("canvas")
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext("2d")!.drawImage(img, 0, 0)
    return { src: c.toDataURL("image/png"), asp: img.naturalWidth / img.naturalHeight }
  } catch {
    return null
  }
}

async function aspecto(src: string) {
  const img = await carregar(src)
  return img.naturalWidth / img.naturalHeight
}

export async function gerarManualMontagemPdf(d: DadosManual): Promise<jsPDF> {
  // ---------- Dados da estufa ----------
  const c = d.cfg || {}
  const nM = Number(c.nM) || 1, nV = Number(c.nV) || 1, vao = Number(c.vao) || 3, PD = Number(c.PD) || 4
  const larguras: number[] = c.adv && Array.isArray(c.mods) && c.mods.length
    ? c.mods.slice(0, nM).map((m: any) => Number(m?.L) || Number(c.Lm) || 8)
    : Array.from({ length: nM }, () => Number(c.Lm) || 8)
  const L = larguras.reduce((a, b) => a + b, 0)
  const C = nV * vao
  const altura = PD + (ACRESCIMO_ARCO[Math.max(...larguras)] ?? 1.8)
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
  const arco = String(c.adv ? "conforme cada módulo" : c.arco || "duplo")
  const larg = larguras.map(x => br(x) + " m").join(" + ")

  // ---------- Conteúdo das etapas ----------
  const etapas: { titulo: string; curto: string; resumo: string; passos: string[]; atencao: string }[] = [
    {
      titulo: "Marcação e postes", curto: "Postes",
      resumo: "Marcação da área pelos 4 cantos, conferência do esquadro e colocação de todos os postes no prumo e na altura.",
      passos: [
        `Limpe e nivele a área onde a estufa de ${br(L)} × ${br(C)} m vai ficar.`,
        `Marque e fure primeiro os 4 cantos, no lugar certo: ${br(L)} m de largura por ${br(C)} m de comprimento.`,
        `Coloque os 4 pilares de canto nos furos, no prumo e com ${br(PD)} m livres acima do chão${chumb ? ` (${br(chumb)} m enterrados)` : ""}.`,
        `Passe a linha bem esticada nos 4 pilares de canto e confira o esquadro: as duas diagonais têm que dar a mesma medida (aprox. ${br(diagonal)} m). Se não der, ajuste os cantos antes de continuar.`,
        `Com o esquadro certo, fure os locais dos outros postes alinhados com a linha, um a cada ${br(vao)} m: ${postesLinha} postes por linha.`,
        nM > 1
          ? `Faça o mesmo nas linhas de divisa entre os módulos (${linhas} linhas no total, nas medidas ${larguras.map(x => br(x) + " m").join(", ")}), conferindo a distância a partir da linha de canto.`
          : "Confira de novo a distância entre os furos antes de colocar os postes.",
        `Coloque os demais postes (${totalPostes} no total, contando os cantos) no prumo, encostados na linha e todos na mesma altura. Confira com o nível antes de concretar.`,
        topoArco ? `Na frente e no fundo de cada módulo, coloque os postes topo de arco (${topoArco} no total), no meio de cada arco frontal.` : "Confira o alinhamento das cabeceiras (frente e fundo).",
        "Concrete os postes e aguarde a cura antes de subir calhas e arcos.",
      ],
      atencao: "Só fure os outros postes depois de conferir o esquadro nos 4 cantos: esquadro errado no começo entorta a estufa inteira. E todos os postes na mesma altura, para as calhas e os arcos ficarem alinhados.",
    },
    {
      titulo: "Laterais, calhas e suportes", curto: "Calhas",
      resumo: "Peças do topo dos postes: esperas de arco, suportes, laterais e calhas com caimento para a saída de água.",
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
      titulo: "Arcos, dorsal e contraventos", curto: "Arcos",
      resumo: "Montagem da cobertura metálica: arcos frontais, arcos internos, dorsal no topo e contraventos nas cabeceiras.",
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
      titulo: "Cabos de aço e travamento", curto: "Cabos",
      resumo: "Ancoragem da estrutura no solo e travamento em X para resistir ao vento.",
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
      titulo: "Cobertura", curto: "Cobertura",
      resumo: "Perfis de fixação e instalação da cobertura, sempre em dia sem vento.",
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
      titulo: "Fechamento, portas e acabamento", curto: "Fechamento",
      resumo: "Fechamento das laterais, frente e fundo, portas, antecâmaras e acabamentos finais.",
      passos: [
        fech === "nao" ? "Estufa sem fechamento lateral: confira apenas os acabamentos das cabeceiras." : `Faça a base do fechamento (${c.inf === "enterrada" ? "tela/filme enterrado no solo" : "mureta com perfil"}).`,
        fech === "nao" ? "Instale as portas, se houver." : `Instale o fechamento em ${fech === "filme" ? "filme" : "tela"} nas laterais, frente e fundo, preso com perfil e mola.`,
        "Nos cantos e postes de divisa, use o perfil duplo para fixar o fechamento.",
        portas.length ? `Monte as portas (${portas.length}) nos locais indicados${portas.some(p => p.a) ? " e as antecâmaras" : ""}, conferindo prumo e abertura.` : "Confira os acabamentos das cabeceiras.",
        c.cort ? "Instale a cortina móvel nas laterais e teste a abertura e o fechamento." : "Retire sobras de material e limpe a área.",
      ],
      atencao: "Ao final, faça a conferência geral antes de entregar a estufa.",
    },
  ]

  // ---------- Desenho ----------
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  const W = 210, H = 297, M = 16, CW = W - 2 * M
  const logo = await logoPng()
  const GS = (op: number) => new (doc as any).GState({ opacity: op })
  const fonte = (estilo: "normal" | "bold", tam: number, cor: RGB) => { doc.setFont("helvetica", estilo); doc.setFontSize(tam); doc.setTextColor(...cor) }
  const paginaEtapa: number[] = []
  const refPagina: { x: number; y: number }[] = []

  const cabecalho = (etapaAtual?: number) => {
    doc.setFillColor(...VERDE); doc.rect(0, 0, W, 13, "F")
    doc.setFillColor(...LARANJA); doc.rect(0, 13, W, 0.8, "F")
    if (logo) { doc.setFillColor(255, 255, 255); doc.roundedRect(M - 2, 2.2, 8.6 * logo.asp + 4, 8.6, 1.5, 1.5, "F"); doc.addImage(logo.src, "PNG", M, 2.6, 7.8 * logo.asp, 7.8) }
    fonte("bold", 8, [255, 255, 255])
    doc.text("MANUAL DE MONTAGEM", W - M, 6.4, { align: "right", charSpace: 0.3 })
    fonte("normal", 7.5, VERDE_C)
    doc.text(`Estufa ${br(L)} × ${br(C)} m  ·  Orçamento #${d.numero}`, W - M, 10.3, { align: "right" })
    let y = 22
    if (etapaAtual) {
      // linha de progresso das 6 etapas
      const x0 = M + 4, x1 = W - M - 4, passo = (x1 - x0) / (etapas.length - 1)
      doc.setDrawColor(...LINHA); doc.setLineWidth(0.8); doc.line(x0, y, x1, y)
      doc.setDrawColor(...VERDE_M); doc.line(x0, y, x0 + passo * (etapaAtual - 1), y)
      doc.setLineWidth(0.2)
      etapas.forEach((e, i) => {
        const x = x0 + passo * i, n = i + 1
        const cor: RGB = n === etapaAtual ? LARANJA : n < etapaAtual ? VERDE_M : [210, 216, 214]
        doc.setFillColor(...cor); doc.circle(x, y, n === etapaAtual ? 3 : 2.3, "F")
        fonte("bold", n === etapaAtual ? 8 : 7, [255, 255, 255]); doc.text(String(n), x, y + 1.1, { align: "center" })
        fonte(n === etapaAtual ? "bold" : "normal", 6.8, n === etapaAtual ? LARANJA : CINZA); doc.text(e.curto, x, y + 6.8, { align: "center" })
      })
      y += 13
    }
    return y
  }
  const rodape = (i: number, total: number) => {
    doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.line(M, H - 13, W - M, H - 13)
    fonte("bold", 7.5, VERDE); doc.text("ArcoForte Estufas Agrícolas", M, H - 8.5)
    fonte("normal", 7.5, CINZA); doc.text("arcoforte.com", M + 38, H - 8.5)
    doc.text("Guia de montagem. Em caso de dúvida, siga a orientação da equipe técnica.", W / 2 + 12, H - 8.5, { align: "center" })
    fonte("bold", 7.5, VERDE); doc.text(`${i} / ${total}`, W - M, H - 8.5, { align: "right" })
  }
  const novaPagina = (etapaAtual?: number) => { doc.addPage(); return cabecalho(etapaAtual) }
  const titulo = (sobre: string, texto: string, y: number, resumo?: string) => {
    fonte("bold", 8, LARANJA); doc.text(sobre.toUpperCase(), M, y, { charSpace: 0.6 })
    fonte("bold", 19, VERDE); doc.text(texto, M, y + 8)
    let yy = y + 11
    if (resumo) { fonte("normal", 9.5, CINZA); const l = doc.splitTextToSize(resumo, CW); doc.text(l, M, yy + 4); yy += 4 + l.length * 4.3 }
    doc.setFillColor(...LARANJA); doc.rect(M, yy + 1.5, 14, 0.9, "F")
    return yy + 8
  }
  const foto = async (src: string, x: number, y: number, w: number, maxH = 999) => {
    if (!src) return y
    const asp = await aspecto(src)
    let iw = w, ih = w / asp
    if (ih > maxH) { ih = maxH; iw = ih * asp }
    const ix = x + (w - iw) / 2
    doc.addImage(src, "JPEG", ix, y, iw, ih)
    doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.roundedRect(ix, y, iw, ih, 1.2, 1.2, "S")
    return y + ih
  }
  const selo = (n: number | string, x: number, y: number, r = 3.2, cor: RGB = LARANJA) => {
    doc.setFillColor(...cor); doc.circle(x, y, r, "F")
    fonte("bold", r > 3 ? 9 : 7.5, [255, 255, 255]); doc.text(String(n), x, y + (r > 3 ? 1.2 : 1), { align: "center" })
  }
  const aviso = (texto: string, y: number, etapaAtual?: number) => {
    fonte("bold", 9.2, [150, 55, 10])
    const l = doc.splitTextToSize(texto, CW - 22)
    const h = Math.max(13, l.length * 4.2 + 7)
    if (y + h > H - 18) y = novaPagina(etapaAtual)
    doc.setFillColor(...LARANJA_C); doc.roundedRect(M, y, CW, h, 2, 2, "F")
    doc.setFillColor(...LARANJA); doc.rect(M, y, 1.6, h, "F")
    doc.circle(M + 9, y + h / 2, 3.4, "F")
    fonte("bold", 11, [255, 255, 255]); doc.text("!", M + 9, y + h / 2 + 1.5, { align: "center" })
    fonte("bold", 9.2, [150, 55, 10]); doc.text(l, M + 16, y + (h - l.length * 4.2) / 2 + 3.2)
    return y + h + 6
  }
  const secao = (texto: string, y: number) => {
    fonte("bold", 10.5, VERDE); doc.text(texto, M, y)
    doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.line(M + doc.getTextWidth(texto) + 3, y - 1.2, W - M, y - 1.2)
    return y + 5
  }
  const materiais = (etapa: number, y: number) => {
    const itens = d.itens.filter(i => etapaDoGrupo(i.grupo) === etapa)
    // tabela curta não se divide: se não couber inteira, vai para a próxima página
    const alturaTabela = 14 + Math.max(1, itens.length) * 7.2
    if (y > H - 45 || (itens.length <= 12 && y + alturaTabela > H - 18)) y = novaPagina(etapa)
    y = secao("Materiais desta etapa", y)
    if (!itens.length) { fonte("normal", 9, CINZA); doc.text("Conforme a lista de materiais do orçamento.", M, y + 2); return y + 8 }
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: 40, bottom: 18 },
      head: [["Código", "Descrição", "Qtd.", "Un."]],
      body: itens.map(i => [i.codigo, i.descricao, br(i.quantidade), i.unidade]),
      theme: "plain",
      styles: { fontSize: 8.6, cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 }, textColor: TEXTO, lineColor: LINHA },
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: CLARO },
      columnStyles: { 0: { cellWidth: 22, fontStyle: "bold", textColor: VERDE }, 2: { cellWidth: 20, halign: "right", fontStyle: "bold" }, 3: { cellWidth: 14, textColor: CINZA } },
      didDrawPage: (h: any) => { if (h.pageNumber > 1) cabecalho(etapa) },
    })
    return ((doc as any).lastAutoTable?.finalY || y) + 6
  }

  // ---------- Capa ----------
  {
    const asp = d.imagens.final ? await aspecto(d.imagens.final) : 1.6
    const ih = 168
    if (d.imagens.final) doc.addImage(d.imagens.final, "JPEG", (W - ih * asp) / 2, 0, ih * asp, ih)
    // faixa escura no topo para o logo
    doc.setGState(GS(0.55)); doc.setFillColor(...VERDE); doc.rect(0, 0, W, 24, "F"); doc.setGState(GS(1))
    if (logo) { doc.setFillColor(255, 255, 255); doc.roundedRect(M - 3, 6, 12 * logo.asp + 6, 13, 2, 2, "F"); doc.addImage(logo.src, "PNG", M, 7, 11 * logo.asp, 11) }
    fonte("bold", 8, [255, 255, 255]); doc.text("ESTUFAS AGRÍCOLAS", W - M, 14, { align: "right", charSpace: 0.8 })
    // bloco verde
    const yb = ih
    doc.setFillColor(...VERDE); doc.rect(0, yb, W, H - yb, "F")
    doc.setFillColor(...LARANJA); doc.rect(0, yb, W, 2.2, "F")
    let y = yb + 17
    fonte("bold", 9, LARANJA); doc.text("MANUAL DE MONTAGEM", M, y, { charSpace: 1.2 })
    fonte("bold", 30, [255, 255, 255]); doc.text(`Estufa ${br(L)} × ${br(C)} m`, M, y + 13)
    fonte("normal", 11, VERDE_C)
    doc.text(`${nM} módulo(s) de ${larg}  ·  ${nV} vãos de ${br(vao)} m  ·  pé-direito ${br(PD)} m${nEstufas > 1 ? `  ·  ${nEstufas} estufas` : ""}`, M, y + 21)
    y += 32
    const info: [string, string][] = [
      ["CLIENTE", d.cliente || "-"],
      ["ORÇAMENTO", "#" + d.numero],
      ["ÁREA", `${br(L * C * nEstufas, 0)} m`],
      ["DATA", new Date().toLocaleDateString("pt-BR")],
    ]
    const cw = (CW - 9) / 4
    info.forEach(([k, v], i) => {
      const x = M + i * (cw + 3)
      doc.setFillColor(...VERDE_M); doc.roundedRect(x, y, cw, 17, 2, 2, "F")
      fonte("bold", 6.8, VERDE_C); doc.text(k, x + 3.5, y + 6, { charSpace: 0.5 })
      fonte("bold", 10, [255, 255, 255]); const vv = doc.splitTextToSize(v, cw - 7)[0]; doc.text(vv, x + 3.5, y + 12.5)
      if (k === "ÁREA") { const xw = x + 3.5 + doc.getTextWidth(vv) + 0.3; doc.setFontSize(6.5); doc.text("2", xw, y + 10.2) }
    })
    fonte("normal", 8, VERDE_C)
    doc.text(`ArcoForte Estufas Agrícolas  ·  arcoforte.com${d.vendedor ? `  ·  Vendedor: ${d.vendedor}` : ""}`, M, H - 12)
  }

  // ---------- Visão geral ----------
  let y = novaPagina()
  y = titulo("Visão geral", "Sua estufa e as etapas da montagem", y)
  const ficha: [string, string][] = [
    ["Dimensões", `${br(L)} × ${br(C)} m`],
    ["Módulos", `${nM} × ${larg}`],
    ["Vãos", `${nV} vãos de ${br(vao)} m`],
    ["Pé-direito / topo", `${br(PD)} m / ${br(altura)} m`],
    ["Arco", arco.charAt(0).toUpperCase() + arco.slice(1)],
    ["Postes", `${totalPostes}${topoArco ? ` + ${topoArco} topo de arco` : ""}`],
    ["Cobertura", temCob ? (c.cobm === "tela" ? "Tela" : "Filme plástico") : "Sem cobertura"],
    ["Fechamento", fech === "nao" ? "Sem fechamento" : fech === "filme" ? "Filme plástico" : "Tela"],
    ["Portas", portas.length ? `${portas.length}${portas.some(p => p.a) ? ", com antecâmara" : ""}` : "Nenhuma"],
    ["Estufas", nEstufas > 1 ? `${nEstufas} iguais` : "1"],
  ]
  const fw = (CW - 6) / 3, fh = 14
  ficha.slice(0, 9).forEach(([k, v], i) => {
    const x = M + (i % 3) * (fw + 3), yy = y + Math.floor(i / 3) * (fh + 3)
    doc.setFillColor(...CLARO); doc.roundedRect(x, yy, fw, fh, 1.8, 1.8, "F")
    fonte("bold", 6.8, CINZA); doc.text(k.toUpperCase(), x + 3.5, yy + 5, { charSpace: 0.3 })
    fonte("bold", 9.6, VERDE); doc.text(doc.splitTextToSize(v, fw - 7)[0], x + 3.5, yy + 10.6)
  })
  y += 3 * (fh + 3) + 6
  y = secao("As 6 etapas", y)
  const tw = (CW - 8) / 3
  for (let i = 0; i < etapas.length; i++) {
    const x = M + (i % 3) * (tw + 4), yy = y + Math.floor(i / 3) * (tw / 1.6 + 17)
    const fim = await foto(d.imagens.etapas[i] || "", x, yy, tw)
    selo(i + 1, x + 5, yy + 5, 3.4)
    fonte("bold", 9, VERDE); doc.text(etapas[i].titulo, x, fim + 5)
    refPagina[i] = { x, y: fim + 9.2 }
  }

  // ---------- Antes de começar ----------
  y = novaPagina()
  y = titulo("Antes de começar", "Segurança, ferramentas e material", y)
  const coluna = (cab: string, itens: string[], x: number, yy: number, w: number, cor: RGB) => {
    fonte("bold", 10.5, VERDE); doc.text(cab, x, yy)
    yy += 6
    itens.forEach(t => {
      const l = doc.splitTextToSize(t, w - 8)
      doc.setFillColor(...cor); doc.circle(x + 1.8, yy - 1.2, 1.4, "F")
      fonte("normal", 9.2, TEXTO); doc.text(l, x + 6, yy)
      yy += l.length * 4.2 + 2.5
    })
    return yy
  }
  const cw2 = (CW - 8) / 2
  const y1 = coluna("Segurança", [
    "EPIs em todas as etapas: capacete, luvas, óculos, botina e cinto de segurança com talabarte para trabalho em altura.",
    "Trabalho acima de 2 m exige equipe treinada (NR-35), andaime ou escada firme e uma pessoa de apoio no chão.",
    "Não monte arcos nem instale filme ou tela com vento forte, chuva ou risco de raio.",
    "Isole a área e não deixe pessoas embaixo de peças sendo içadas.",
  ], M, y, cw2, LARANJA)
  const y2 = coluna("Ferramentas", [
    "Trena de 50 m, linha de pedreiro, estacas, esquadro e nível (mangueira ou laser).",
    "Cavadeira ou perfuratriz, betoneira ou masseira, prumo.",
    "Furadeira/parafusadeira, jogo de chaves, alicate, arco de serra ou esmerilhadeira.",
    "Escadas, andaime e esticador ou catraca para os cabos de aço.",
  ], M + cw2 + 8, y, cw2, VERDE_M)
  y = Math.max(y1, y2) + 4
  y = aviso("Confira todo o material pela lista do orçamento antes de começar e separe as peças por etapa. Peça faltando ou danificada: avise a ArcoForte antes de montar.", y)
  y = secao("Como usar este manual", y)
  fonte("normal", 9.2, TEXTO)
  doc.text(doc.splitTextToSize("Siga as etapas na ordem. Cada etapa mostra a estufa como ela deve ficar ao final, o passo a passo e os materiais que serão usados. A barra no topo das páginas mostra em que etapa você está.", CW), M, y + 1)

  // ---------- Etapas ----------
  for (let i = 0; i < etapas.length; i++) {
    const e = etapas[i], n = i + 1
    y = novaPagina(n)
    paginaEtapa[i] = doc.getNumberOfPages()
    y = titulo(`Etapa ${n} de ${etapas.length}`, e.titulo, y, e.resumo)
    const fotos = d.imagens.passos?.[i]
    if (fotos && fotos.length === e.passos.length && fotos.every(Boolean)) {
      // passo a passo ilustrado: imagem à esquerda, texto à direita
      const iw = 92
      for (let j = 0; j < e.passos.length; j++) {
        const asp = await aspecto(fotos[j])
        const ih = iw / asp
        fonte("normal", 9.8, TEXTO)
        const l = doc.splitTextToSize(e.passos[j], CW - iw - 16)
        const alto = Math.max(ih, l.length * 4.6 + 10)
        if (y + alto > H - 18) y = novaPagina(n)
        await foto(fotos[j], M, y, iw)
        const tx = M + iw + 7
        fonte("bold", 7.5, LARANJA); doc.text(`PASSO ${j + 1}`, tx + 8, y + 4.2, { charSpace: 0.5 })
        selo(j + 1, tx + 3, y + 3.2)
        fonte("normal", 9.8, TEXTO); doc.text(l, tx, y + 11)
        y += alto + 5
      }
    } else {
      y = await foto(d.imagens.etapas[i] || "", M, y, CW, 95) + 7
      y = secao("Passo a passo", y)
      e.passos.forEach((t, j) => {
        fonte("normal", 9.6, TEXTO)
        const l = doc.splitTextToSize(t, CW - 10)
        if (y + l.length * 4.4 > H - 20) y = novaPagina(n)
        selo(j + 1, M + 3, y - 1.1, 2.8)
        fonte("normal", 9.6, TEXTO); doc.text(l, M + 9, y)
        y += l.length * 4.4 + 2.8
      })
      y += 2
    }
    y = aviso(e.atencao, y, n)
    materiais(n, y)
  }

  // ---------- Conferência final ----------
  y = novaPagina()
  y = titulo("Entrega", "Conferência final", y)
  y = await foto(d.imagens.final, M, y, CW, 85) + 8
  const check = [
    "Postes no prumo e com a mesma altura; concreto curado.",
    "Calhas alinhadas, com caimento e sem vazamento nas emendas.",
    "Todos os arcos alinhados, dorsal contínua e parafusos reapertados.",
    "Cabos de aço esticados por igual e chumbadores firmes.",
    "Cobertura esticada, sem rugas, furos ou partes soltas.",
    "Fechamento preso em todo o perímetro; portas abrindo e fechando bem.",
    "Área limpa, sobras recolhidas e cliente orientado sobre uso e manutenção.",
  ]
  doc.setFillColor(...CLARO); doc.roundedRect(M, y - 5, CW, check.length * 7.4 + 6, 2, 2, "F")
  check.forEach(t => {
    doc.setDrawColor(...VERDE_M); doc.setLineWidth(0.5); doc.roundedRect(M + 5, y - 3.4, 4.2, 4.2, 0.8, 0.8, "S")
    fonte("normal", 9.6, TEXTO); doc.text(t, M + 13, y)
    y += 7.4
  })
  y += 12
  doc.setDrawColor(...CINZA); doc.setLineWidth(0.3)
  const ass = (rot: string, x: number, w: number) => { doc.line(x, y, x + w, y); fonte("normal", 8, CINZA); doc.text(rot, x, y + 4.5) }
  ass("Responsável pela montagem", M, 80); ass("Cliente", M + 92, 50); ass("Data", M + 150, CW - 150)

  // ---------- Página de cada etapa na visão geral ----------
  doc.setPage(2)
  refPagina.forEach((r, i) => { fonte("normal", 7.5, CINZA); doc.text(`Página ${paginaEtapa[i]}`, r.x, r.y) })

  // ---------- Rodapé e numeração ----------
  const total = doc.getNumberOfPages()
  for (let i = 2; i <= total; i++) { doc.setPage(i); rodape(i, total) }
  return doc
}
