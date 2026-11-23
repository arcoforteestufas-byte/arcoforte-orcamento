"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ClipboardCheck, Layers, PackageCheck, RefreshCw, Truck } from "lucide-react"
import { NOMES_UF, STATUS_SEPARACAO, agruparPorLocal, chavesDosItens, type EntregaExpedicao, type StatusSeparacao } from "@/lib/entregas-types"

function dataBr(iso: string | null | undefined) {
  if (!iso) return ""
  const [a, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${a}`
}

function statusSep(e: EntregaExpedicao): StatusSeparacao {
  return e.separacao?.status || "pendente"
}

/** quantos produtos já foram marcados na etapa atual */
function progresso(e: EntregaExpedicao) {
  const chaves = chavesDosItens(e.itens)
  const s = e.separacao
  if (!s) return { feitos: 0, total: chaves.length }
  const por = new Map(s.itens.map(i => [i.chave, i]))
  const feitos = chaves.filter(k => {
    const i = por.get(k)
    return s.status === "conferindo" || s.status === "conferida" ? i?.conferida != null : i?.separada != null
  }).length
  return { feitos, total: chaves.length }
}

type Filtro = StatusSeparacao | "todas"
const ABAS: { id: Filtro; rotulo: string }[] = [
  { id: "pendente", rotulo: "A separar" },
  { id: "separando", rotulo: "Separando" },
  { id: "separada", rotulo: "A conferir" },
  { id: "conferindo", rotulo: "Conferindo" },
  { id: "conferida", rotulo: "Conferidas" },
  { id: "todas", rotulo: "Todas" },
]

export function ExpedicaoClient({ entregas, erro }: { entregas: EntregaExpedicao[]; erro: string | null }) {
  const router = useRouter()
  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: entregas.length }
    for (const e of entregas) c[statusSep(e)] = (c[statusSep(e)] || 0) + 1
    return c
  }, [entregas])
  // abre na primeira aba que tem trabalho
  const [filtro, setFiltro] = useState<Filtro>(() => (["separando", "conferindo", "separada", "pendente"] as Filtro[]).find(f => contagem[f]) || "todas")
  const lista = filtro === "todas" ? entregas : entregas.filter(e => statusSep(e) === filtro)
  const [amanha] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  // separação em lote: só entregas que ainda não terminaram a separação
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [agrupar, setAgrupar] = useState(true)
  const podeLote = (e: EntregaExpedicao) => statusSep(e) === "pendente" || statusSep(e) === "separando"
  const selValidas = selecionadas.filter(id => entregas.some(e => e.id === id && podeLote(e)))
  const alternar = (id: string) => setSelecionadas(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selecionaveisNaLista = lista.filter(podeLote)

  // atualiza sozinho a cada minuto (outra pessoa pode ter mexido)
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60000)
    return () => clearInterval(t)
  }, [router])

  const cartao = (e: EntregaExpedicao) => {
    const st = statusSep(e)
    const p = progresso(e)
    const saida = e.viagem?.saida_prevista
    const urgente = st !== "conferida" && !!saida && saida.slice(0, 10) <= amanha
    return (
      <li key={e.id} className="flex items-stretch gap-2">
        {podeLote(e) ? (
          <label className={`flex w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border ${selValidas.includes(e.id) ? "border-[#d97021] bg-[#d97021]/10" : "bg-background"}`}
            title="Separar junto com outras">
            <input type="checkbox" className="h-5 w-5 accent-[#d97021]" checked={selValidas.includes(e.id)} onChange={() => alternar(e.id)} />
          </label>
        ) : selecionaveisNaLista.length > 0 && <span className="w-11 shrink-0" />}
        <Link href={`/expedicao/${e.id}`} className="block min-w-0 flex-1 rounded-xl border bg-background p-4 shadow-sm transition hover:border-[#d97021]/60 hover:shadow">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold">{e.destinatario}</div>
              <div className="text-sm text-muted-foreground">
                {[e.cidade && `${e.cidade}${e.uf ? ` - ${e.uf}` : ""}`, e.pedido_erp && `Pedido ${e.pedido_erp}`, `${e.itens.length} produto(s)`].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_SEPARACAO[st].classe}`}>{STATUS_SEPARACAO[st].rotulo}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className={`inline-flex items-center gap-1 ${urgente ? "font-semibold text-red-600" : ""}`}>
              <Truck className="h-3.5 w-3.5" />
              {saida ? `Sai ${dataBr(saida)}${e.viagem?.titulo ? ` · ${e.viagem.titulo}` : ""}` : "Sem viagem marcada"}
              {e.status === "em_rota" && " · já saiu sem conferir"}
            </span>
            {(st === "separando" || st === "conferindo") && <span>{p.feitos} de {p.total} marcados</span>}
            {e.separacao?.separado_por_nome && <span>Separou: {e.separacao.separado_por_nome}</span>}
            {e.separacao?.conferido_por_nome && <span>Conferiu: {e.separacao.conferido_por_nome}</span>}
            {e.separacao?.divergencia && <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> com falta</span>}
          </div>
          {(st === "separando" || st === "conferindo") && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-[#d97021]" style={{ width: `${p.total ? (p.feitos / p.total) * 100 : 0}%` }} />
            </div>
          )}
        </Link>
      </li>
    )
  }

  // marca/desmarca todas as que podem ir para o lote dentro de um grupo
  const marcarGrupo = (grupo: EntregaExpedicao[]) => {
    const ids = grupo.filter(podeLote).map(e => e.id)
    const todas = ids.every(id => selValidas.includes(id))
    setSelecionadas(todas ? selValidas.filter(id => !ids.includes(id)) : Array.from(new Set([...selValidas, ...ids])))
  }

  const cabecalho = (nivel: 1 | 2 | 3, titulo: string, itens: EntregaExpedicao[]) => {
    const ids = itens.filter(podeLote).map(e => e.id)
    const marcadas = ids.filter(id => selValidas.includes(id)).length
    const produtos = itens.reduce((s, e) => s + e.itens.length, 0)
    const peso = itens.reduce((s, e) => s + (Number(e.peso_kg) || 0), 0)
    return (
      <div className={`flex items-center gap-2 ${nivel === 1 ? "rounded-lg bg-[#d97021]/10 px-3 py-2" : "px-1"}`}>
        {ids.length > 0 && (
          <input type="checkbox" className="h-4 w-4 accent-[#d97021]" title="Marcar todas deste grupo para separar juntas"
            checked={marcadas === ids.length} ref={el => { if (el) el.indeterminate = marcadas > 0 && marcadas < ids.length }}
            onChange={() => marcarGrupo(itens)} />
        )}
        <span className={nivel === 1 ? "text-base font-bold" : nivel === 2 ? "text-sm font-bold" : "text-sm font-semibold"}>{titulo}</span>
        <span className="text-xs text-muted-foreground">
          {itens.length} entrega(s) · {produtos} produto(s){peso > 0 ? ` · ${peso.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg` : ""}
        </span>
      </div>
    )
  }


  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardCheck className="h-6 w-6 text-[#d97021]" /> Expedição</h1>
          <p className="text-sm text-muted-foreground">Separação e conferência da carga de cada entrega. Uma pessoa separa, outra confere.</p>
        </div>
        <button onClick={() => router.refresh()} className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {erro ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erro}</div>
      ) : (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {ABAS.map(a => (
              <button key={a.id} onClick={() => setFiltro(a.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${filtro === a.id ? "border-[#d97021] bg-[#d97021] text-white" : "bg-background hover:bg-muted"}`}>
                {a.rotulo}{contagem[a.id] ? ` (${contagem[a.id]})` : ""}
              </button>
            ))}
          </div>

          {!lista.length ? (
            <div className="rounded-xl border bg-background p-10 text-center text-sm text-muted-foreground">
              <PackageCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {entregas.length ? "Nada nesta etapa." : "Nenhuma entrega com produtos para separar. Os produtos entram ao importar o pedido do Sensio na entrega."}
            </div>
          ) : (
            <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" className="accent-[#d97021]" checked={agrupar} onChange={x => setAgrupar(x.target.checked)} /> Agrupar por região, estado e cidade
              </label>
              {selecionaveisNaLista.length > 1 && (
                <span>
                  Marque para separar juntas ·{" "}
                  <button className="font-medium text-[#d97021] hover:underline" onClick={() => marcarGrupo(selecionaveisNaLista)}>
                    {selecionaveisNaLista.every(e => selValidas.includes(e.id)) ? "desmarcar todas" : "marcar todas"}
                  </button>
                </span>
              )}
            </div>
            {!agrupar ? (
              <ul className="space-y-2">{lista.map(cartao)}</ul>
            ) : (
              <div className="space-y-4">
                {agruparPorLocal(lista, e => ({ uf: e.uf, cidade: e.cidade })).map(r => (
                  <section key={r.regiao} className="space-y-2">
                    {cabecalho(1, r.regiao, r.itens)}
                    {r.estados.map(es => (
                      <div key={es.uf} className="space-y-2 border-l-2 border-[#d97021]/20 pl-3">
                        {r.estados.length > 1 || es.cidades.length > 1 ? cabecalho(2, es.uf === "—" ? "Sem estado" : `${NOMES_UF[es.uf] || es.uf} (${es.uf})`, es.itens) : null}
                        {es.cidades.map(c => (
                          <div key={c.cidade} className="space-y-2">
                            {cabecalho(3, `${c.cidade}${es.uf !== "—" ? ` - ${es.uf}` : ""}`, c.itens)}
                            <ul className="space-y-2">{c.itens.map(cartao)}</ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
            </>
          )}
        </>
      )}

      {selValidas.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:left-72">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setSelecionadas([])}>Limpar</button>
            <Link href={`/expedicao/lote?ids=${selValidas.join(",")}`}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[#d97021] text-base font-semibold text-white hover:bg-[#c3631b]">
              <Layers className="h-5 w-5" />
              {selValidas.length === 1 ? "Separar 1 entrega" : `Separar ${selValidas.length} entregas juntas`}
              <span className="text-sm font-normal opacity-90">· {entregas.filter(e => selValidas.includes(e.id)).reduce((s, e) => s + e.itens.length, 0)} itens</span>
            </Link>
          </div>
        </div>
      )}
      {selValidas.length > 0 && <div className="h-20" />}
    </div>
  )
}
