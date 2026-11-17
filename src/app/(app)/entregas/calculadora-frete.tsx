"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Calculator, CheckCircle2, Info, Loader2, Route, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { aplicarFreteNoOrcamento, calcularFrete, pesoDoOrcamento } from "@/app/actions/entregas"
import { formatarDuracao, formatarKm, type CalculoFrete } from "@/lib/entregas-types"
import { CidadeSelect } from "./cidade-select"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const inp = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

function numeroBR(s: string) {
  let t = String(s ?? "").trim().replace(/[R$\s]/g, "")
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".")
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

export type OrcamentoParaFrete = { id: string; rotulo: string; frete?: number | null }

/**
 * Calculadora de frete (origem → cidade de destino).
 * - modo "crm": escolhe o orçamento do lead e grava o frete nele
 * - modo "formulario": devolve o valor para o formulário do orçamento (onAplicar)
 */
export function CalculadoraFrete({
  uf: ufInicial, cidade: cidadeInicial, orcamentos = [], orcamentoFixo, viagemDisponivel, leadId, onAplicar, onAplicado, compacto = false,
}: {
  uf?: string | null
  cidade?: string | null
  orcamentos?: OrcamentoParaFrete[]
  /** orçamento já definido (tela do orçamento) */
  orcamentoFixo?: string | null
  /** texto da viagem programada para a região (habilita "aproveitar viagem") */
  viagemDisponivel?: string | null
  leadId?: string | null
  /** modo formulário: recebe o valor em vez de gravar */
  onAplicar?: (valor: number, descricao: string) => void
  onAplicado?: () => void
  compacto?: boolean
}) {
  const [uf, setUf] = useState<string | null>(ufInicial || null)
  const [cidade, setCidade] = useState<{ nome: string; ibge: number | null } | null>(cidadeInicial ? { nome: cidadeInicial, ibge: null } : null)
  const [orcId, setOrcId] = useState<string>(orcamentoFixo || orcamentos[0]?.id || "")
  const [peso, setPeso] = useState("")
  const [carregandoPeso, setCarregandoPeso] = useState(false)
  const [aproveitar, setAproveitar] = useState(false)
  const [calc, setCalc] = useState<CalculoFrete | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [erro, setErro] = useState("")
  const [valorFinal, setValorFinal] = useState("")
  const [descricao, setDescricao] = useState("")
  const [aplicando, setAplicando] = useState(false)
  const seq = useRef(0)

  // peso do orçamento escolhido
  useEffect(() => {
    if (!orcId) return
    let vivo = true
    setCarregandoPeso(true)
    pesoDoOrcamento(orcId).then(p => {
      if (!vivo) return
      setPeso(p ? String(p).replace(".", ",") : "")
      setCarregandoPeso(false)
    })
    return () => { vivo = false }
  }, [orcId])

  // recalcula sozinho quando muda destino, peso ou "aproveitar viagem"
  useEffect(() => {
    if (!uf || !cidade) { setCalc(null); return }
    const n = ++seq.current
    const t = setTimeout(async () => {
      setCalculando(true)
      setErro("")
      const r = await calcularFrete({ uf, cidade: cidade.nome, cidade_ibge: cidade.ibge, pesoKg: numeroBR(peso), aproveitarViagem: aproveitar })
      if (n !== seq.current) return
      setCalculando(false)
      if (!r.ok) { setErro(r.erro); setCalc(null); return }
      setCalc(r.dados!)
      setValorFinal(r.dados!.valor.toFixed(2).replace(".", ","))
      setDescricao(r.dados!.descricao)
    }, 400)
    return () => clearTimeout(t)
  }, [uf, cidade, peso, aproveitar])

  const aplicar = async () => {
    const v = numeroBR(valorFinal)
    if (onAplicar) { onAplicar(v, descricao); toast.success(`Frete ${brl.format(v)} colocado no orçamento — lembre de salvar`); return }
    if (!orcId) return toast.error("Escolha o orçamento.")
    setAplicando(true)
    const r = await aplicarFreteNoOrcamento(orcId, v, descricao, leadId)
    setAplicando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success(`Frete ${brl.format(v)} aplicado no orçamento`)
    onAplicado?.()
  }

  const orcAtual = orcamentos.find(o => o.id === orcId)

  return (
    <div className={`grid gap-4 ${compacto ? "" : "lg:grid-cols-[1fr_1fr]"}`}>
      {/* Entradas */}
      <div className="space-y-3">
        <div className="grid gap-1.5">
          <Label>Cidade de entrega</Label>
          <CidadeSelect uf={uf} cidade={cidade?.nome} onChange={(c, u) => { setUf(u); setCidade(c ? { nome: c.nome, ibge: c.ibge } : null) }} />
        </div>
        {!orcamentoFixo && orcamentos.length > 0 && (
          <div className="grid gap-1.5">
            <Label>Orçamento</Label>
            <select className={inp} value={orcId} onChange={e => setOrcId(e.target.value)}>
              {orcamentos.map(o => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
            </select>
            {orcAtual?.frete ? <p className="text-xs text-muted-foreground">Frete atual neste orçamento: <b>{brl.format(Number(orcAtual.frete))}</b></p> : null}
          </div>
        )}
        <div className="grid gap-1.5">
          <Label className="flex items-center gap-1.5">Peso da carga (kg) {carregandoPeso && <Loader2 className="h-3 w-3 animate-spin" />}</Label>
          <input className={inp} inputMode="decimal" value={peso} onChange={e => setPeso(e.target.value)} placeholder="calculado pelos produtos do orçamento" />
        </div>
        {viagemDisponivel && (
          <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors ${aproveitar ? "border-blue-400 bg-blue-50" : "hover:bg-muted/40"}`}>
            <input type="checkbox" className="mt-0.5 accent-blue-600" checked={aproveitar} onChange={e => setAproveitar(e.target.checked)} />
            <span>
              <span className="flex items-center gap-1 font-medium"><Truck className="h-4 w-4 text-blue-600" /> Aproveitar viagem programada</span>
              <span className="text-xs text-muted-foreground">{viagemDisponivel}{calc ? ` · desconto de ${calc.tabela.frete_desconto_viagem}%` : ""}</span>
            </span>
          </label>
        )}
      </div>

      {/* Resultado */}
      <div className="rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm">
        {!uf || !cidade ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-white/60">
            <Calculator className="h-8 w-8 opacity-50" /> Escolha a cidade de entrega para calcular.
          </div>
        ) : calculando && !calc ? (
          <div className="flex h-full min-h-40 items-center justify-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" /> Calculando rota...</div>
        ) : erro ? (
          <p className="text-sm text-red-300">{erro}</p>
        ) : calc && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-white/50">Frete sugerido</div>
                <div className="text-3xl font-bold tabular-nums">{brl.format(calc.valor)}</div>
              </div>
              {calculando && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
              <Route className="h-4 w-4 text-orange-300" />
              <span>{calc.origem} → <b>{calc.destino}</b></span>
            </div>
            <div className="space-y-1 text-xs text-white/75">
              <div className="flex justify-between"><span>Distância (ida)</span><span>{formatarKm(calc.kmIda)}{calc.minutos ? ` · ${formatarDuracao(calc.minutos)}` : ""}{calc.estimada ? " (estimada)" : ""}</span></div>
              <div className="flex justify-between"><span>{formatarKm(calc.kmCobrados)} cobrados{calc.tabela.frete_cobrar_volta ? " (ida e volta)" : ""} × {brl.format(calc.tabela.frete_valor_km)}/km</span><span>{brl.format(calc.valorKm)}</span></div>
              {calc.tabela.frete_valor_kg > 0 && <div className="flex justify-between"><span>{calc.pesoKg.toLocaleString("pt-BR")} kg × {brl.format(calc.tabela.frete_valor_kg)}/kg</span><span>{brl.format(calc.valorPeso)}</span></div>}
              {calc.desconto > 0 && <div className="flex justify-between text-emerald-300"><span>Desconto aproveitando viagem</span><span>− {brl.format(calc.desconto)}</span></div>}
              {calc.minimoAplicado && <div className="flex justify-between text-amber-300"><span>Frete mínimo aplicado</span><span>{brl.format(calc.tabela.frete_minimo)}</span></div>}
            </div>
            <div className="grid gap-1.5 border-t border-white/10 pt-3">
              <label className="text-xs text-white/60">Valor do frete no orçamento (pode ajustar)</label>
              <div className="flex gap-2">
                <input className="h-9 w-full rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white outline-none focus:border-orange-300"
                  inputMode="decimal" value={valorFinal} onChange={e => setValorFinal(e.target.value)} />
                <Button onClick={aplicar} disabled={aplicando || (!onAplicar && !orcId)} className="shrink-0 gap-1 bg-orange-500 hover:bg-orange-600">
                  <CheckCircle2 className="h-4 w-4" /> {aplicando ? "Aplicando..." : onAplicar ? "Usar no orçamento" : "Aplicar no orçamento"}
                </Button>
              </div>
              <input className="h-8 w-full rounded-md border border-white/10 bg-transparent px-2 text-[11px] text-white/70 outline-none focus:border-white/30"
                value={descricao} onChange={e => setDescricao(e.target.value)} title="Texto que vai no campo 'Tipo de frete' do orçamento" />
              <p className="flex items-center gap-1 text-[11px] text-white/45"><Info className="h-3 w-3" /> O frete entra no total do orçamento e na proposta.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
