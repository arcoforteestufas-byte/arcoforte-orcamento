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
  const limpo = (nome || "").replace(/\([^)]*\)/g, "").trim()
  const partes = limpo.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || []
  if (partes.length >= 2) return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?"
  if (partes.length === 1) return (partes[0] || "").slice(0, 2).toUpperCase() || "?"
  return "?"
}

/** Valida data opcional "AAAA-MM-DD" (vazio é permitido; bloqueia anos inválidos como 61120-02-20). */
export function validarDataOpcional(valor: string | null | undefined, badInput?: boolean): string | null {
  if (badInput) return "Data inválida. Informe uma data válida (AAAA-MM-DD) ou limpe o campo."
  const v = (valor || "").trim()
  if (!v) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return "Data inválida. Use o formato AAAA-MM-DD com ano de 4 dígitos."
  }
  const [ano, mes, dia] = v.split("-").map(Number)
  if (ano < 2000 || ano > 2100) {
    return "Data inválida. O ano deve estar entre 2000 e 2100."
  }
  const dt = new Date(Date.UTC(ano, mes - 1, dia))
  if (
    dt.getUTCFullYear() !== ano ||
    dt.getUTCMonth() + 1 !== mes ||
    dt.getUTCDate() !== dia
  ) {
    return "Data inválida no calendário."
  }
  return null
}
