"use client"

// Cartão "Entregas na região" da ficha do lead: mapa com a cidade do lead e as entregas em aberto
// por perto, para o vendedor ver se dá para aproveitar uma viagem (frete mais barato / prazo menor).

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarClock, Loader2, MapPin } from "lucide-react"
import { entregasNaRegiao } from "@/app/actions/entregas"
import { STATUS_ENTREGA, situacaoPrazoEntrega, type RegiaoDoLead } from "@/lib/entregas-types"
import { hojeISO } from "@/lib/crm-types"
import { Mapa, escaparHtml, type PontoMapa } from "../entregas/mapa"
import { formatarData } from "./crm-utils"

const RAIOS = [100, 200, 300, 500]
const COR_LEAD = "#d97021"

export function EntregasNaRegiao({ leadId, cidade, uf }: { leadId: string; cidade: string | null; uf: string | null }) {
  const [raio, setRaio] = useState(200)
  const [dados, setDados] = useState<RegiaoDoLead | null>(null)
  const [carregando, setCarregando] = useState(false)
  const temLocal = !!cidade && !!uf

  useEffect(() => {
    if (!temLocal) { setDados(null); return }
    let ativo = true
    setCarregando(true)
    entregasNaRegiao(cidade, uf, raio, leadId)
      .then(r => { if (ativo) setDados(r) })
      .catch(() => { if (ativo) setDados({ centro: null, itens: [] }) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [cidade, uf, raio, leadId, temLocal])

  const [hoje] = useState(() => hojeISO())
  const pontos = useMemo<PontoMapa[]>(() => {
    if (!dados?.centro) return []
    const lista: PontoMapa[] = dados.itens.map(en => {
      const pz = situacaoPrazoEntrega(en.prazo_entrega, hoje, en.status)
      return {
      id: en.id,
      lat: en.lat,
      lng: en.lng,
      cor: STATUS_ENTREGA[en.status]?.cor || "#64748b",
      popupHtml:
        `<b>${escaparHtml([en.cidade, en.uf].filter(Boolean).join(" - ") || en.destinatario)}</b><br>` +
        `${escaparHtml(STATUS_ENTREGA[en.status]?.rotulo || en.status)} · ~${en.distancia_km} km do lead` +
        (pz ? `<br><b style="color:${pz.cor}">${escaparHtml(pz.texto)}</b>` : "<br>Sem prazo de contrato") +
        (en.viagem ? `<br>Saída ${escaparHtml(formatarData(en.viagem.saida_prevista))}${en.veiculo ? ` · ${escaparHtml(en.veiculo)}` : ""}` : "<br>Ainda sem viagem"),
      }
    })
    lista.push({
      id: "lead",
      lat: dados.centro.lat,
      lng: dados.centro.lng,
      cor: COR_LEAD,
      destaque: true,
      popupHtml: `<b>Lead: ${escaparHtml(dados.centro.nome)} - ${escaparHtml(dados.centro.uf)}</b>`,
    })
    return lista
  }, [dados, hoje])

  if (!temLocal) {
    return (
      <p className="text-sm text-muted-foreground">
        Informe a cidade e o estado do lead para ver as entregas que já estão indo para a região.
      </p>
    )
  }

  const comViagem = dados?.itens.filter(i => i.viagem).length || 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {carregando
            ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Procurando entregas...</span>
            : !dados?.centro
              ? <>Não achei a cidade <b>{cidade} - {uf}</b> na lista do IBGE. Confira o nome da cidade no lead.</>
              : dados.itens.length === 0
                ? <>Nenhuma entrega em aberto a até {raio} km de <b>{dados.centro.nome}</b>.</>
                : <><b className="text-foreground">{dados.itens.length}</b> entrega(s) a até {raio} km de <b>{dados.centro.nome}</b>{comViagem ? <>, {comViagem} já com viagem marcada</> : null}.</>}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Raio
          <select value={raio} onChange={e => setRaio(Number(e.target.value))}
            className="h-7 rounded-md border bg-background px-1.5 text-xs text-foreground">
            {RAIOS.map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
        </label>
      </div>

      {dados?.centro && (
        <Mapa pontos={pontos} altura={300} estiloMapa="ruas" />
      )}

      {dados?.centro && dados.itens.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_LEAD }} /> Lead</span>
          {(["em_rota", "programada", "a_programar"] as const).map(s => (
            <span key={s} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_ENTREGA[s].cor }} /> {STATUS_ENTREGA[s].rotulo}</span>
          ))}
        </div>
      )}

      {dados?.itens.length ? (
        <ul className="divide-y rounded-lg border">
          {dados.itens.map(en => {
            const pz = situacaoPrazoEntrega(en.prazo_entrega, hoje, en.status)
            return (
            <li key={en.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_ENTREGA[en.status]?.classe || ""}`}>
                {STATUS_ENTREGA[en.status]?.rotulo || en.status}
              </span>
              <span className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 font-medium"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{[en.cidade, en.uf].filter(Boolean).join(" - ") || en.destinatario}</span>
                <span className="text-muted-foreground"> · ~{en.distancia_km} km</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {pz ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${pz.classe}`} title="Prazo final de entrega previsto no contrato">
                      <CalendarClock className="h-3 w-3" /> {pz.texto}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Sem prazo de contrato</span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {en.viagem
                    ? <>Saída {formatarData(en.viagem.saida_prevista)}{en.veiculo ? ` · ${en.veiculo}` : ""}{en.viagem.titulo ? ` · ${en.viagem.titulo}` : ""}</>
                    : "Ainda sem viagem — pode entrar na mesma programação"}
                </span>
              </span>
              {en.viagem && (
                <Link href={`/entregas/viagem/${en.viagem.id}`} className="text-xs font-medium text-[#d97021] hover:underline">ver viagem</Link>
              )}
            </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
