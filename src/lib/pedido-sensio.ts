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
  itens: { codigo: string | null; descricao: string; unidade: string | null; quantidade: number; obs: string | null }[]
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
