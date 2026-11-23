"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ClipboardCheck, PackageCheck, RefreshCw, Truck } from "lucide-react"
import { STATUS_SEPARACAO, chavesDosItens, type EntregaExpedicao, type StatusSeparacao } from "@/lib/entregas-types"

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

  // atualiza sozinho a cada minuto (outra pessoa pode ter mexido)
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60000)
    return () => clearInterval(t)
  }, [router])

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
            <ul className="space-y-2">
              {lista.map(e => {
                const st = statusSep(e)
                const p = progresso(e)
                const saida = e.viagem?.saida_prevista
                const urgente = st !== "conferida" && !!saida && saida.slice(0, 10) <= amanha
                return (
                  <li key={e.id}>
                    <Link href={`/expedicao/${e.id}`} className="block rounded-xl border bg-background p-4 shadow-sm transition hover:border-[#d97021]/60 hover:shadow">
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
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
