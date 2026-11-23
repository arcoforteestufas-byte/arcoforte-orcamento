"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Check, Layers, PackageCheck, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { finalizarSeparacaoLote, iniciarSeparacaoLote, marcarSeparacaoLote } from "@/app/actions/expedicao"
import { MOTIVOS_FALTA, STATUS_SEPARACAO, chavesDosItens, type EntregaExpedicao, type SepItem } from "@/lib/entregas-types"

const laranja = "bg-[#d97021] hover:bg-[#c3631b] text-white"
const qtd = (n: number | null | undefined) => (n == null ? "—" : String(Math.round(n * 1000) / 1000).replace(".", ","))
const lerNumero = (t: string) => { const n = Number(t.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : null }
function dataBr(iso: string | null | undefined) {
  if (!iso) return ""
  const [a, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${a}`
}

type Parte = { entregaId: string; destinatario: string; chave: string; quantidade: number; obs: string | null; pedido: string | null }
type Grupo = { id: string; codigo: string | null; descricao: string; unidade: string | null; total: number; partes: Parte[] }

export function LoteClient({ entregas }: { entregas: EntregaExpedicao[] }) {
  const router = useRouter()
  // só entram no lote as que ainda não terminaram a separação
  const doLote = useMemo(() => entregas.filter(e => !e.separacao || e.separacao.status === "separando"), [entregas])
  const fora = entregas.filter(e => !doLote.includes(e))
  const pendentes = doLote.filter(e => !e.separacao)
  const ativas = doLote.filter(e => e.separacao?.status === "separando")

  const [marcas, setMarcas] = useState<Record<string, SepItem[]>>(() => Object.fromEntries(doLote.map(e => [e.id, e.separacao?.itens || []])))
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [formPartes, setFormPartes] = useState<Record<string, string>>({})
  const [formTotal, setFormTotal] = useState("")
  const [formMotivo, setFormMotivo] = useState("")
  const [formOutro, setFormOutro] = useState("")
  const [obs, setObs] = useState("")
  const [esconderFeitos, setEsconderFeitos] = useState(false)

  // produtos iguais (mesmo código e unidade) somados
  const grupos = useMemo(() => {
    const m = new Map<string, Grupo>()
    for (const e of doLote) {
      const chaves = chavesDosItens(e.itens)
      e.itens.forEach((it, k) => {
        const id = `${it.codigo || it.descricao.toLowerCase()}|${(it.unidade || "").toUpperCase()}`
        const g = m.get(id) || { id, codigo: it.codigo, descricao: it.descricao, unidade: it.unidade, total: 0, partes: [] }
        g.total += Number(it.quantidade) || 0
        g.partes.push({ entregaId: e.id, destinatario: e.destinatario, chave: chaves[k], quantidade: Number(it.quantidade) || 0, obs: it.obs || null, pedido: it.pedido })
        m.set(id, g)
      })
    }
    return Array.from(m.values()).sort((a, b) => (a.codigo || a.descricao).localeCompare(b.codigo || b.descricao, "pt-BR", { numeric: true }))
  }, [doLote])

  const marcaDe = (p: Parte) => (marcas[p.entregaId] || []).find(i => i.chave === p.chave)
  const grupoFeito = (g: Grupo) => g.partes.every(p => marcaDe(p)?.separada != null)
  const feitos = grupos.filter(grupoFeito).length
  const iniciado = pendentes.length === 0

  const gravar = async (grupoId: string, lista: { entregaId: string; chave: string; separada: number | null; motivo: string | null }[]) => {
    setOcupado(grupoId)
    const r = await marcarSeparacaoLote(lista)
    setOcupado(null)
    if (!r.ok) { toast.error(r.erro); return }
    setMarcas(m => ({ ...m, ...r.dados }))
    setAberto(null)
  }

  const abrirForm = (g: Grupo) => {
    setAberto(g.id)
    setFormPartes(Object.fromEntries(g.partes.map(p => { const s = marcaDe(p)?.separada; return [p.chave + p.entregaId, s == null ? "" : qtd(s)] })))
    setFormTotal("")
    const motivo = g.partes.map(p => marcaDe(p)?.motivo).find(Boolean) || ""
    const conhecido = (MOTIVOS_FALTA as readonly string[]).includes(motivo)
    setFormMotivo(motivo ? (conhecido ? motivo : "Outro") : "")
    setFormOutro(motivo && !conhecido ? motivo : "")
  }

  /** "tenho X no total": distribui na ordem das entregas (a que sai primeiro recebe primeiro) */
  const distribuir = (g: Grupo, texto: string) => {
    setFormTotal(texto)
    let resto = lerNumero(texto || "0") ?? 0
    const novo: Record<string, string> = {}
    for (const p of g.partes) {
      const v = Math.min(p.quantidade, resto)
      resto = Math.max(0, resto - v)
      novo[p.chave + p.entregaId] = qtd(v)
    }
    setFormPartes(novo)
  }

  const finalizar = async () => {
    setOcupado("fim")
    const r = await finalizarSeparacaoLote(ativas.map(e => e.id), obs)
    setOcupado(null)
    if (!r.ok) return toast.error(r.erro)
    const erros = r.dados?.erros || []
    if (erros.length) {
      const nome = (id: string) => entregas.find(e => e.id === id)?.destinatario || "Entrega"
      toast.error(erros.map(x => `${nome(x.id)}: ${x.erro}`).join("\n"), { duration: 10000 })
    } else {
      toast.success(`Separação de ${ativas.length} entrega(s) finalizada. Agora outra pessoa confere cada uma.`)
    }
    router.push("/expedicao")
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-28">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/expedicao" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Expedição</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Printer className="h-4 w-4" /> Imprimir lista</button>
      </div>

      <header className="rounded-xl border bg-background p-4 shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Layers className="h-5 w-5 text-[#d97021]" /> Separação em lote · {doLote.length} entrega(s)</h1>
        <p className="text-sm text-muted-foreground">Os produtos iguais estão somados. Separe o total e, se faltar, diga quanto vai para cada entrega.</p>
        <ul className="mt-2 divide-y rounded-lg border text-sm">
          {doLote.map(e => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0">
                <b>{e.destinatario}</b>
                <span className="text-muted-foreground">{[e.pedido_erp && ` · Pedido ${e.pedido_erp}`, ` · ${e.itens.length} produto(s)`, e.viagem && ` · sai ${dataBr(e.viagem.saida_prevista)}`].filter(Boolean).join("")}</span>
              </span>
              <Link href={`/expedicao/${e.id}`} className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 hover:underline ${STATUS_SEPARACAO[e.separacao?.status || "pendente"].classe}`}>
                {STATUS_SEPARACAO[e.separacao?.status || "pendente"].rotulo}
              </Link>
            </li>
          ))}
        </ul>
        {!!fora.length && (
          <p className="mt-2 text-xs text-amber-800">Fora do lote (separação já finalizada): {fora.map(e => e.destinatario).join(", ")}</p>
        )}
      </header>

      {!iniciado && (
        <Button className={`h-12 w-full text-base ${laranja} print:hidden`} disabled={!!ocupado} onClick={async () => {
          setOcupado("ini")
          const r = await iniciarSeparacaoLote(pendentes.map(e => e.id))
          setOcupado(null)
          if (!r.ok) return toast.error(r.erro)
          if (r.dados?.erros.length) toast.error(r.dados.erros.map(x => x.erro).join("\n"))
          else toast.success("Separação começou")
          router.refresh()
        }}>
          <PackageCheck className="h-5 w-5" /> Começar separação {pendentes.length > 1 ? `das ${pendentes.length} entregas` : ""}
        </Button>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="font-semibold">{grupos.length} produto(s) diferentes {iniciado ? `· ${feitos} marcados` : ""}</h2>
          {iniciado && (
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input type="checkbox" checked={esconderFeitos} onChange={x => setEsconderFeitos(x.target.checked)} /> esconder os já marcados
            </label>
          )}
        </div>
        <ul className="space-y-2">
          {grupos.map(g => {
            if (esconderFeitos && grupoFeito(g) && aberto !== g.id) return null
            const ms = g.partes.map(marcaDe)
            const todosOk = g.partes.every((p, i) => ms[i]?.separada === p.quantidade)
            const algumMarcado = ms.some(m => m?.separada != null)
            const falta = grupoFeito(g) && !todosOk
            const separadoTotal = ms.reduce((s, m) => s + (m?.separada || 0), 0)
            const cor = falta ? "border-amber-300 bg-amber-50" : grupoFeito(g) ? "border-emerald-300 bg-emerald-50" : "bg-background"
            const carregando = ocupado === g.id
            return (
              <li key={g.id} className={`rounded-xl border p-3 shadow-sm ${cor} ${carregando ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="w-20 shrink-0 text-right">
                    <div className="text-xl font-bold leading-tight">{qtd(g.total)}</div>
                    <div className="text-xs text-muted-foreground">{g.unidade || ""}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug">{g.descricao}</div>
                    {g.codigo && <div className="text-xs text-muted-foreground">Cód. {g.codigo}</div>}
                    {/* quanto vai para cada entrega */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {g.partes.map((p, i) => (
                        <span key={p.entregaId + p.chave} className={`rounded border px-1.5 py-0.5 text-xs ${ms[i]?.separada != null && ms[i]!.separada !== p.quantidade ? "border-amber-400 bg-amber-100" : "bg-background"}`}>
                          <b>{qtd(p.quantidade)}</b> → {p.destinatario}
                          {ms[i]?.separada != null && ms[i]!.separada !== p.quantidade ? ` (separado ${qtd(ms[i]!.separada)}${ms[i]!.motivo ? ` · ${ms[i]!.motivo}` : ""})` : ""}
                        </span>
                      ))}
                    </div>
                    {g.partes.filter(p => p.obs).map(p => (
                      <div key={"o" + p.entregaId + p.chave} className="mt-0.5 text-xs text-amber-800">{p.destinatario}: {p.obs}</div>
                    ))}
                    {grupoFeito(g) && (
                      <div className={`mt-1 text-sm ${falta ? "font-semibold text-amber-800" : "text-emerald-700"}`}>
                        {falta ? `Separado ${qtd(separadoTotal)} de ${qtd(g.total)}` : `✓ ${qtd(separadoTotal)} separado(s)`}
                      </div>
                    )}
                    {!grupoFeito(g) && algumMarcado && <div className="mt-1 text-xs text-muted-foreground">Marcado em parte das entregas</div>}
                  </div>
                </div>

                {iniciado && aberto !== g.id && (
                  <div className="mt-2 flex gap-2 print:hidden">
                    {!grupoFeito(g) ? (
                      <>
                        <Button className="h-11 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={carregando}
                          onClick={() => gravar(g.id, g.partes.map(p => ({ entregaId: p.entregaId, chave: p.chave, separada: p.quantidade, motivo: null })))}>
                          <Check className="h-4 w-4" /> Separei {qtd(g.total)}
                        </Button>
                        <Button variant="outline" className="h-11 flex-1 border-amber-400 text-amber-800" disabled={carregando} onClick={() => abrirForm(g)}>Faltou</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" disabled={carregando} onClick={() => abrirForm(g)}>Alterar</Button>
                        <Button variant="ghost" size="sm" disabled={carregando}
                          onClick={() => gravar(g.id, g.partes.map(p => ({ entregaId: p.entregaId, chave: p.chave, separada: null, motivo: null })))}>Desfazer</Button>
                      </>
                    )}
                  </div>
                )}
                {iniciado && aberto === g.id && (
                  <div className="mt-2 space-y-2 rounded-lg border bg-background p-2 print:hidden">
                    {g.partes.length > 1 && (
                      <label className="flex flex-wrap items-center gap-2 text-sm">
                        Quanto tem no total:
                        <input className="h-10 w-24 rounded border px-2 text-right text-base" inputMode="decimal" autoFocus value={formTotal}
                          onChange={x => distribuir(g, x.target.value)} placeholder="0" />
                        <span className="text-xs text-muted-foreground">(divide na ordem abaixo; ajuste se quiser)</span>
                      </label>
                    )}
                    {g.partes.map(p => (
                      <label key={p.entregaId + p.chave} className="flex items-center gap-2 text-sm">
                        <input className="h-10 w-24 rounded border px-2 text-right text-base" inputMode="decimal" autoFocus={g.partes.length === 1}
                          value={formPartes[p.chave + p.entregaId] ?? ""} placeholder="0"
                          onChange={x => setFormPartes(f => ({ ...f, [p.chave + p.entregaId]: x.target.value }))} />
                        <span>de {qtd(p.quantidade)} → <b>{p.destinatario}</b></span>
                      </label>
                    ))}
                    <div className="flex flex-wrap gap-1.5">
                      {MOTIVOS_FALTA.map(mo => (
                        <button key={mo} type="button" onClick={() => setFormMotivo(mo)}
                          className={`rounded-full border px-3 py-1.5 text-sm ${formMotivo === mo ? "border-amber-500 bg-amber-100 font-semibold text-amber-900" : "bg-background"}`}>{mo}</button>
                      ))}
                    </div>
                    {formMotivo === "Outro" && <input className="h-10 w-full rounded border px-2" placeholder="Qual o motivo?" value={formOutro} onChange={x => setFormOutro(x.target.value)} />}
                    <div className="flex gap-2">
                      <Button className={`flex-1 ${laranja}`} disabled={carregando} onClick={() => {
                        const motivo = formMotivo === "Outro" ? formOutro.trim() : formMotivo
                        const lista = []
                        for (const p of g.partes) {
                          const n = lerNumero(formPartes[p.chave + p.entregaId] || "0")
                          if (n == null) return toast.error(`Quantidade inválida para ${p.destinatario}.`)
                          if (n !== p.quantidade && !motivo) return toast.error("Escolha o motivo da diferença.")
                          lista.push({ entregaId: p.entregaId, chave: p.chave, separada: n, motivo: n === p.quantidade ? null : motivo })
                        }
                        gravar(g.id, lista)
                      }}>Salvar</Button>
                      <Button variant="ghost" onClick={() => setAberto(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {iniciado && !!ativas.length && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur print:hidden md:left-72">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {feitos === grupos.length && (
              <Textarea rows={1} className="min-h-9" placeholder="Observação da separação (opcional, vale para todas)" value={obs} onChange={x => setObs(x.target.value)} />
            )}
            <Button className={`h-12 w-full text-base ${laranja}`} disabled={!!ocupado || feitos < grupos.length} onClick={finalizar}>
              {feitos < grupos.length ? `Faltam ${grupos.length - feitos} produto(s) para marcar` : `Finalizar separação das ${ativas.length} entrega(s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
