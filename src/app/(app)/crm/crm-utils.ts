export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
export const brlCentavos = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export const dataCurta = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
export const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

export function diasDesde(iso: string | null | undefined) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

export function formatarData(iso: string | null | undefined) {
  if (!iso) return ""
  // datas "AAAA-MM-DD" sem hora: evita voltar um dia por causa do fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m, d] = iso.split("-")
    return `${d}/${m}/${a}`
  }
  return dataCurta.format(new Date(iso))
}

export function linkWhatsApp(telefone: string | null | undefined) {
  if (!telefone) return null
  let n = telefone.replace(/\D/g, "")
  if (!n) return null
  if (n.length <= 11) n = "55" + n
  return `https://wa.me/${n}`
}

export const inputClasse =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"

export function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?"
}
