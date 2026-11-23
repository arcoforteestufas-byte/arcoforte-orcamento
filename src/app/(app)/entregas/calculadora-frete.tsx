"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Calculator, CheckCircle2, Info, Loader2, Route, Sparkles, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { aplicarFreteNoOrcamento, calcularFrete, listarTabelasFrete, listarVeiculosFrete, pesoDoOrcamento } from "@/app/actions/entregas"
import { formatarDuracao, formatarKm, nomeVeiculo, type CalculoFrete, type VeiculoFrete } from "@/lib/entregas-types"
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
/** Cidade para onde o frete foi calculado (vira a cidade de entrega da venda) */
export type DestinoFrete = { cidade: string | null; uf: string | null; ibge: number | null }

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
  onAplicar?: (valor: number, descricao: string, destino: DestinoFrete) => void
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
  const [veiculos, setVeiculos] = useState<VeiculoFrete[]>([])
  const [veiculoId, setVeiculoId] = useState("")
  const [escolhaManual, setEscolhaManual] = useState(false)
  // tabela de frete: segue a do veículo até o vendedor escolher outra
  const [tabelas, setTabelas] = useState<{ id: string; nome: string }[]>([])
  const [tabelaManual, setTabelaManual] = useState<string | null>(null)
  const seq = useRef(0)

  useEffect(() => { listarVeiculosFrete().then(setVeiculos); listarTabelasFrete().then(setTabelas) }, [])

  // sugere o menor veículo que comporta o peso (até o usuário escolher outro).
  // Peso é opcional: sem peso, não sugere veículo (usa a tabela geral ou o que o vendedor escolher).
  const kgInformado = numeroBR(peso)
  const sugerido = (() => {
    const kg = kgInformado
    if (!kg) return ""
    const comCap = veiculos.filter(v => v.capacidade_kg)
    if (!comCap.length) return veiculos[0]?.id || ""
    const cabe = comCap.filter(v => (v.capacidade_kg || 0) >= kg).sort((a, b) => (a.capacidade_kg || 0) - (b.capacidade_kg || 0))
    return (cabe[0] || comCap.sort((a, b) => (b.capacidade_kg || 0) - (a.capacidade_kg || 0))[0]).id
  })()
  useEffect(() => { if (!escolhaManual) setVeiculoId(sugerido) }, [sugerido, escolhaManual])
  // tabela usada: a escolhida pelo vendedor; senão a do veículo; senão a geral
  const veiculoDaTabela = veiculos.find(v => v.id === veiculoId)?.tabela_frete_id || null
  const tabelaId = tabelaManual || (veiculoDaTabela && tabelas.some(t => t.id === veiculoDaTabela) ? veiculoDaTabela : "geral")

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
      const r = await calcularFrete({ uf, cidade: cidade.nome, cidade_ibge: cidade.ibge, pesoKg: numeroBR(peso), aproveitarViagem: aproveitar, veiculoId: veiculoId || null, tabelaId })
      if (n !== seq.current) return
      setCalculando(false)
      if (!r.ok) { setErro(r.erro); setCalc(null); return }
      setCalc(r.dados!)
      setValorFinal(r.dados!.valor.toFixed(2).replace(".", ","))
      setDescricao(r.dados!.descricao)
    }, 400)
    return () => clearTimeout(t)
  }, [uf, cidade, peso, aproveitar, veiculoId, tabelaId])

  const aplicar = async () => {
    const v = numeroBR(valorFinal)
    const destino: DestinoFrete = { cidade: cidade?.nome || null, uf: uf || null, ibge: cidade?.ibge ?? null }
    if (onAplicar) { onAplicar(v, descricao, destino); toast.success(`Frete ${brl.format(v)} colocado no orçamento — lembre de salvar`); return }
    if (!orcId) return toast.error("Escolha o orçamento.")
    setAplicando(true)
    const r = await aplicarFreteNoOrcamento(orcId, v, descricao, leadId, destino)
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
          <Label className="flex items-center gap-1.5">
            Peso da carga (kg) <span className="font-normal text-muted-foreground">— opcional</span>
            {carregandoPeso && <Loader2 className="h-3 w-3 animate-spin" />}
          </Label>
          <input className={inp} inputMode="decimal" value={peso} onChange={e => setPeso(e.target.value)}
            placeholder={orcId ? "vem dos produtos do orçamento, se tiverem peso" : "deixe vazio se não souber"} />
          {!kgInformado && <p className="text-[11px] text-muted-foreground">Sem peso, o frete é calculado só pela distância. Escolha o veículo abaixo, se quiser.</p>}
        </div>
        {veiculos.length > 0 && (
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1.5">
              Veículo
              {!escolhaManual && veiculoId && <span className="inline-flex items-center gap-0.5 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-[#a8541a]"><Sparkles className="h-3 w-3" /> sugerido pelo peso</span>}
            </Label>
            <select className={inp} value={veiculoId} onChange={e => { setVeiculoId(e.target.value); setEscolhaManual(true) }}>
              <option value="">Tabela geral (sem escolher veículo)</option>
              {veiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {nomeVeiculo(v)}{v.capacidade_kg ? ` · até ${v.capacidade_kg.toLocaleString("pt-BR")} kg` : ""}{v.frete_valor_km != null ? ` · ${brl.format(v.frete_valor_km)}/km` : " · tabela geral"}
                </option>
              ))}
            </select>
            {escolhaManual && !!kgInformado && <button type="button" className="justify-self-start text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setEscolhaManual(false)}>voltar para o sugerido pelo peso</button>}
          </div>
        )}
        {tabelas.length > 0 && (
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1.5">
              Tabela de frete
              {!tabelaManual && veiculoDaTabela && <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-[#a8541a]">a do veículo</span>}
            </Label>
            <select className={inp} value={tabelaId} onChange={e => setTabelaManual(e.target.value)}>
              <option value="geral">Tabela geral</option>
              {tabelas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            {tabelaManual && <button type="button" className="justify-self-start text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setTabelaManual(null)}>voltar para a tabela do veículo</button>}
          </div>
        )}
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
            {calc.tabelaUsada?.id && (
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Route className="h-3.5 w-3.5 text-orange-300" />
                <span>Tabela: <b className="text-white/90">{calc.tabelaUsada.nome}</b></span>
              </div>
            )}
            {calc.veiculo && (
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Truck className="h-3.5 w-3.5 text-orange-300" />
                <span>{calc.veiculo.nome}{calc.veiculo.valorProprio ? "" : " · usando a tabela geral"}</span>
              </div>
            )}
            {calc.acimaCapacidade && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" /> A carga ({calc.pesoKg.toLocaleString("pt-BR")} kg) passa da capacidade deste veículo ({calc.veiculo!.capacidade_kg!.toLocaleString("pt-BR")} kg).
              </div>
            )}
            <div className="space-y-1 text-xs text-white/75">
              <div className="flex justify-between"><span>Distância (ida)</span><span>{formatarKm(calc.kmIda)}{calc.minutos ? ` · ${formatarDuracao(calc.minutos)}` : ""}{calc.estimada ? " (estimada)" : ""}</span></div>
              <div className="flex justify-between"><span>{formatarKm(calc.kmCobrados)} cobrados{calc.tabela.frete_cobrar_volta ? " (ida e volta)" : ""} × {brl.format(calc.tabela.frete_valor_km)}/km</span><span>{brl.format(calc.valorKm)}</span></div>
              {calc.tabela.frete_valor_kg > 0 && calc.pesoKg > 0 && <div className="flex justify-between"><span>{calc.pesoKg.toLocaleString("pt-BR")} kg × {brl.format(calc.tabela.frete_valor_kg)}/kg</span><span>{brl.format(calc.valorPeso)}</span></div>}
              {calc.desconto > 0 && <div className="flex justify-between text-emerald-300"><span>Desconto aproveitando viagem</span><span>− {brl.format(calc.desconto)}</span></div>}
              {calc.minimoAplicado && <div className="flex justify-between text-amber-300"><span>Frete mínimo aplicado</span><span>{brl.format(calc.tabela.frete_minimo)}</span></div>}
            </div>
            {!onAplicar && !orcId ? (
              <p className="flex items-start gap-1.5 border-t border-white/10 pt-3 text-xs text-white/60">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Estimativa para passar ao cliente. Para gravar o frete, faça um orçamento neste lead.
              </p>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}
