/**
 * Explicações das regras de cálculo (texto simples mostrado ao vendedor no ícone "i"
 * de cada item da lista de materiais).
 *
 * O texto fica no Pacote de Regras (campo "explicacao" de cada regra). O pacote aplicado
 * é guardado no Storage (bucket privado "pacote-regras", arquivo atual.json) junto com o
 * mapa código R → id da regra no banco. Aqui lemos esse arquivo e anexamos a explicação
 * em cada regra pelo id. Não precisa de coluna nova no banco.
 * Só pode ser usado no servidor (precisa do cliente admin).
 */
type RegraComId = { id: string; explicacao?: string | null }

export async function anexarExplicacoes<T extends RegraComId>(admin: any, regras: T[] | null | undefined): Promise<T[]> {
  const lista = regras || []
  try {
    const { data, error } = await admin.storage.from("pacote-regras").download("atual.json")
    if (error || !data) return lista
    const registro = JSON.parse(await data.text())
    const mapa: Record<string, string> = registro?.mapa || {}
    const porId = new Map<string, string>()
    for (const r of registro?.pacote?.regras || []) {
      const idBanco = mapa[r.id]
      if (idBanco && typeof r.explicacao === "string" && r.explicacao.trim()) porId.set(idBanco, r.explicacao)
    }
    return lista.map(r => (porId.has(r.id) ? { ...r, explicacao: porId.get(r.id) } : r))
  } catch {
    return lista
  }
}
