// Leitura do pedido exportado do Sensio (ERP de emissão de nota) em .xls/.xlsx.
// Formato: uma linha de cabeçalho ("Código", "Status", "Data", "Cliente", "Endereço", "Vendedor",
// "Código Item", "Item", "UN", "Valor Unitário", "Quantidade", "Valor Total", "Obs do item"),
// uma linha com os dados do pedido e depois uma linha por produto.
// Um arquivo pode ter mais de um pedido (cada um começa com uma linha com o "Código").

export interface PedidoSensio {
  numero: string
  status: string | null
  data: string | null
  cliente: string | null
  endereco: string | null
  uf: string | null
  vendedor: string | null
  itens: {
    codigo: string | null; descricao: string; unidade: string | null; quantidade: number; obs: string | null
    /** peso bruto unitário informado pelo Sensio (só no PDF) */
    peso_unit_kg?: number | null
  }[]
}

/**
 * Lê o texto do PDF do pedido do Sensio ("ORÇAMENTO ... Número do pedido: 7111 ...").
 * Cada item vem numa linha: "1 - 3013 - ARCO FRONTAL ... UN R$390,91 12 R$4.690,92",
 * seguida de "Peso Bruto: 194.400 kg. ..." (total do item) e, às vezes, "Obs: ...".
 * `nomeArquivo` ajuda a achar o cliente ("Pedido_7111_Cliente_Fulano_de_Tal.pdf").
 */
export function lerPedidoSensioPdf(texto: string, nomeArquivo = ""): PedidoSensio[] {
  const linhas = texto.split(/\r?\n/).map(l => l.replace(/[\t\u00a0]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean)
  const lixo = (l: string) => /^(ITEM UN VALOR|ARCO FORTE ESTUFA|CNPJ |Página \d|-- \d+ of \d+ --)/i.test(l)
  const reItem = /^(\d+) - (\S+) - (.+?) ([A-Za-z]{1,4}) R\$ ?[\d.,]+ ([\d.,]+) R\$ ?[\d.,]+$/
  const inicioItem = /^\d+ - \S+ - /
  // quantidade e peso no PDF usam ponto decimal ("45.5", "194.400 kg")
  const num = (s: string) => { const n = Number(s.replace(/,/g, ".")); return Number.isFinite(n) ? n : 0 }

  const numero = texto.match(/N[úu]mero do pedido:\s*(\d+)/i)?.[1] || nomeArquivo.match(/pedido[_\s-]*(\d+)/i)?.[1] || ""
  const data = texto.match(/Data de emiss[ãa]o:\s*([\d/]+)/i)?.[1] || null
  let cliente: string | null = null
  const iEmissao = linhas.findIndex(l => /^Data de emiss[ãa]o:/i.test(l))
  if (iEmissao >= 0 && linhas[iEmissao + 1] && !/:/.test(linhas[iEmissao + 1])) cliente = linhas[iEmissao + 1]
  if (!cliente) {
    const m = nomeArquivo.replace(/\.pdf$/i, "").replace(/\s*\(\d+\)$/, "").match(/Cliente[_\s-]+(.+)$/i)
    if (m) cliente = m[1].replace(/_/g, " ").trim()
  }
  const status = (() => { const i = linhas.findIndex(l => /N[úu]mero do pedido:/i.test(l)); return i >= 0 && linhas[i + 1] && !/:/.test(linhas[i + 1]) ? linhas[i + 1] : null })()

  const itens: PedidoSensio["itens"] = []
  let ultimo: PedidoSensio["itens"][number] | null = null
  let lendoObs = false
  for (let i = 0; i < linhas.length; i++) {
    let l = linhas[i]
    if (lixo(l)) { lendoObs = false; continue }
    if (inicioItem.test(l)) {
      // descrição longa pode quebrar em duas linhas
      let m = l.match(reItem)
      if (!m && linhas[i + 1] && !inicioItem.test(linhas[i + 1])) { l = `${l} ${linhas[i + 1]}`; m = l.match(reItem); if (m) i++ }
      if (m) {
        ultimo = { codigo: m[2], descricao: m[3].trim(), unidade: m[4].toUpperCase(), quantidade: num(m[5]), obs: null, peso_unit_kg: null }
        if (ultimo.quantidade > 0) itens.push(ultimo)
        lendoObs = false
        continue
      }
    }
    const peso = l.match(/^Peso Bruto:\s*([\d.,]+)\s*kg/i)
    if (peso && ultimo) {
      const total = num(peso[1])
      ultimo.peso_unit_kg = total > 0 && ultimo.quantidade > 0 ? Math.round((total / ultimo.quantidade) * 10000) / 10000 : null
      lendoObs = false
      continue
    }
    if (/^Peso Bruto \(kg\)|^Informa[çc][õo]es de Transporte/i.test(l)) { ultimo = null; lendoObs = false; continue }
    const obs = l.match(/^Obs:\s*(.*)$/i)
    if (obs && ultimo) { ultimo.obs = obs[1]; lendoObs = true; continue }
    if (lendoObs && ultimo) ultimo.obs = `${ultimo.obs} / ${l}`
  }
  if (!itens.length) throw new Error("Não achei produtos neste PDF. Ele precisa ser o PDF do pedido gerado pelo Sensio (com texto, não escaneado).")
  return [{ numero, status, data, cliente, endereco: null, uf: null, vendedor: null, itens }]
}

const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
const txt = (v: unknown) => { const s = String(v ?? "").replace(/\s+/g, " ").trim(); return s || null }

function numero(v: unknown): number {
  if (typeof v === "number") return v
  let s = String(v ?? "").trim()
  if (!s) return 0
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** Lê as linhas da planilha (sheet_to_json com header: 1) e devolve os pedidos encontrados */
export function lerPedidoSensio(linhas: unknown[][]): PedidoSensio[] {
  // cabeçalho: linha que tem "Item" e "Quantidade"
  const iCab = linhas.findIndex(l => {
    const n = l.map(norm)
    return n.includes("item") && n.some(c => c.startsWith("quantidade"))
  })
  if (iCab < 0) throw new Error("Não reconheci o arquivo: falta a linha de títulos com \"Item\" e \"Quantidade\". Exporte o pedido do Sensio em Excel.")
  const cab = linhas[iCab].map(norm)
  const col = (...nomes: string[]) => cab.findIndex(c => nomes.includes(c))
  const c = {
    pedido: col("codigo", "pedido", "numero", "n pedido", "nº pedido"),
    status: col("status", "situacao"),
    data: col("data", "emissao", "data emissao"),
    cliente: col("cliente", "razao social", "nome"),
    endereco: col("endereco"),
    vendedor: col("vendedor"),
    codItem: col("codigo item", "cod item", "codigo produto", "cod. item", "referencia"),
    item: col("item", "produto", "descricao"),
    un: col("un", "unidade", "und"),
    qtd: cab.findIndex(x => x.startsWith("quantidade") || x === "qtd" || x === "qtde"),
    obs: col("obs do item", "observacao", "obs"),
  }
  if (c.item < 0 || c.qtd < 0) throw new Error("Não achei as colunas \"Item\" e \"Quantidade\" no arquivo.")

  const pedidos: PedidoSensio[] = []
  let atual: PedidoSensio | null = null
  for (const l of linhas.slice(iCab + 1)) {
    const numPed = c.pedido >= 0 ? txt(l[c.pedido]) : null
    const desc = txt(l[c.item])
    if (numPed) {
      const endereco = c.endereco >= 0 ? txt(l[c.endereco]) : null
      const uf = endereco?.match(/(?:^|[\s-/])([A-Z]{2})\s*$/)?.[1] ?? null
      atual = {
        numero: numPed,
        status: c.status >= 0 ? txt(l[c.status]) : null,
        data: c.data >= 0 ? txt(l[c.data]) : null,
        cliente: c.cliente >= 0 ? txt(l[c.cliente]) : null,
        endereco, uf,
        vendedor: c.vendedor >= 0 ? txt(l[c.vendedor]) : null,
        itens: [],
      }
      pedidos.push(atual)
    }
    if (!desc) continue
    const qtd = numero(l[c.qtd])
    if (!qtd) continue
    if (!atual) { atual = { numero: "", status: null, data: null, cliente: null, endereco: null, uf: null, vendedor: null, itens: [] }; pedidos.push(atual) }
    atual.itens.push({
      codigo: c.codItem >= 0 ? txt(l[c.codItem]) : null,
      descricao: desc,
      unidade: c.un >= 0 ? txt(l[c.un]) : null,
      quantidade: qtd,
      obs: c.obs >= 0 ? txt(l[c.obs]) : null,
    })
  }
  const comItens = pedidos.filter(p => p.itens.length)
  if (!comItens.length) throw new Error("O arquivo não tem nenhum produto com quantidade.")
  return comItens
}
