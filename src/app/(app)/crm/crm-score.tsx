"use client"

import { Flame, Snowflake, ThermometerSun } from "lucide-react"
import {
  TEMPERATURA_INFO, calcularScore, campoNoFunil, pontosDoCampo, pontosMaximos, temperatura,
  type CrmCampo, type CrmConfig,
} from "@/lib/crm-types"
import { inputClasse } from "./crm-utils"

type CfgScore = Pick<CrmConfig, "score_morno" | "score_quente">

const ICONE = { frio: Snowflake, morno: ThermometerSun, quente: Flame }

/** Selo pequeno: "🔥 Quente · 72" */
export function ScoreBadge({ score, config, compacto = false }: { score: number; config: CfgScore; compacto?: boolean }) {
  const t = temperatura(score, config)
  const info = TEMPERATURA_INFO[t]
  const Icone = ICONE[t]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${info.classe}`}
      title={`Score ${score} — ${info.rotulo}`}>
      <Icone className="h-3 w-3" />
      {compacto ? score : `${info.rotulo} · ${score}`}
    </span>
  )
}

/** Barra com as três faixas e o ponteiro do score */
export function ScoreBarra({ score, maximo, config }: { score: number; maximo: number; config: CfgScore }) {
  const max = Math.max(maximo, config.score_quente + 10, 1)
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`
  const t = temperatura(score, config)
  const info = TEMPERATURA_INFO[t]
  const Icone = ICONE[t]
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: info.cor }}>
            <Icone className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Score do lead</div>
            <div className="text-lg font-bold leading-tight" style={{ color: info.cor }}>{info.rotulo} · {score} pts</div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">máx. {maximo}</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-sky-100">
        <div className="absolute inset-y-0 bg-amber-100" style={{ left: pct(config.score_morno), right: 0 }} />
        <div className="absolute inset-y-0 bg-red-100" style={{ left: pct(config.score_quente), right: 0 }} />
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: pct(score), backgroundColor: info.cor }} />
      </div>
      <div className="relative h-4 text-[10px] text-muted-foreground">
        <span className="absolute left-0">Frio</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(config.score_morno) }}>Morno {config.score_morno}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(config.score_quente) }}>Quente {config.score_quente}</span>
      </div>
    </div>
  )
}

/** Formulário dos campos personalizados de qualificação */
export function CamposQualificacao({
  campos, funilId, valores, onChange, config, desabilitado = false, mostrarScore = true,
}: {
  campos: CrmCampo[]
  funilId: string
  valores: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
  config: CfgScore
  desabilitado?: boolean
  mostrarScore?: boolean
}) {
  const ativos = campos.filter(c => c.ativo)
  // Campos deste funil + campos de outros funis que já foram preenchidos
  const visiveis = ativos.filter(c => campoNoFunil(c, funilId) || (valores[c.id] !== undefined && valores[c.id] !== ""))
  const score = calcularScore(ativos, valores)
  const maximo = ativos.reduce((s, c) => s + pontosMaximos(c), 0)
  const set = (id: string, v: unknown) => onChange({ ...valores, [id]: v })

  if (!visiveis.length) {
    return <p className="text-sm text-muted-foreground">Nenhum campo de qualificação configurado. O administrador cria em Configurações → CRM.</p>
  }

  return (
    <div className="space-y-4">
      {mostrarScore && <ScoreBarra score={score} maximo={maximo} config={config} />}
      <div className="grid sm:grid-cols-2 gap-3">
        {visiveis.map(c => {
          const v = valores[c.id]
          const pts = pontosDoCampo(c, v)
          const max = pontosMaximos(c)
          return (
            <div key={c.id} className="rounded-lg border bg-background p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <label className="text-sm font-medium leading-tight">{c.nome}</label>
                {max > 0 && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${pts ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {pts}/{max} pts
                  </span>
                )}
              </div>
              {c.ajuda && <p className="text-xs text-muted-foreground -mt-0.5">{c.ajuda}</p>}

              {c.tipo === "sim_nao" && (
                <div className="grid grid-cols-2 gap-1.5">
                  {(["sim", "nao"] as const).map(op => (
                    <button key={op} type="button" disabled={desabilitado}
                      onClick={() => set(c.id, v === op ? "" : op)}
                      className={`h-8 rounded-md border text-sm transition-colors ${v === op
                        ? op === "sim" ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-medium" : "border-slate-400 bg-slate-100 font-medium"
                        : "hover:bg-muted"}`}>
                      {op === "sim" ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
              )}
              {c.tipo === "selecao" && (
                <select className={inputClasse} disabled={desabilitado} value={String(v ?? "")} onChange={e => set(c.id, e.target.value)}>
                  <option value="">—</option>
                  {c.opcoes.map(o => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
                </select>
              )}
              {c.tipo === "numero" && (
                <input className={inputClasse} disabled={desabilitado} inputMode="decimal" value={String(v ?? "")} onChange={e => set(c.id, e.target.value)} />
              )}
              {c.tipo === "texto" && (
                <input className={inputClasse} disabled={desabilitado} value={String(v ?? "")} onChange={e => set(c.id, e.target.value)} />
              )}
              {c.tipo === "data" && (
                <input className={inputClasse} disabled={desabilitado} type="date" value={String(v ?? "")} onChange={e => set(c.id, e.target.value)} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
