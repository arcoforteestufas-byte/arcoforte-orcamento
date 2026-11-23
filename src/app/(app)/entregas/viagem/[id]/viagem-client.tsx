"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowDown, ArrowLeft, ArrowUp, Building2, CheckCircle2, Copy, ExternalLink, MapPin, MessageCircle, Navigation,
  Pencil, Play, Plus, Radio, RotateCcw, Route, Sparkles, Square, Trash2, Truck, Undo2, UserRound, XCircle,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  alterarStatusViagem, excluirViagem, marcarEntregue, ordenarPorProximidade, programarEntrega, recalcularRotaViagem, reordenarEntregas,
} from "@/app/actions/entregas"
import { STATUS_ENTREGA, STATUS_VIAGEM, formatarDuracao, formatarKm, posicaoRecente, type EntEntrega, type EntPainel, type EntViagem } from "@/lib/entregas-types"
import { cn } from "@/lib/utils"
import { brlCentavos, formatarData, inputClasse, linkWhatsApp } from "../../../crm/crm-utils"
import { Mapa, escaparHtml, type PontoMapa } from "../../mapa"
import { EntregaDialog, ViagemDialog, type EntregaInicial } from "../../entregas-dialogs"

export function ViagemClient({ painel, viagem, trilha }: {
  painel: EntPainel
  viagem: EntViagem
  trilha: { lat: number; lng: number; registrado_em: string }[]
}) {
  const router = useRouter()
  const [editViagem, setEditViagem] = useState(false)
  const [entregaEdit, setEntregaEdit] = useState<EntregaInicial | null>(null)
  const [linkMotorista, setLinkMotorista] = useState("")
  const gerente = painel.podeGerenciar

  useEffect(() => { setLinkMotorista(`${window.location.origin}/motorista/${viagem.token_motorista}`) }, [viagem.token_motorista])
  // posição ao vivo: atualiza a cada 20 s enquanto em rota
  useEffect(() => {
    if (viagem.status !== "em_rota") return
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh() }, 20000)
    return () => clearInterval(t)
  }, [viagem.status, router])

  const ve = painel.veiculos.find(x => x.id === viagem.veiculo_id)
  const mo = painel.motoristas.find(x => x.id === viagem.motorista_id)
  const tr = painel.transportadoras.find(x => x.id === viagem.transportadora_id)
  const paradas = painel.entregas.filter(e => e.viagem_id === viagem.id && e.status !== "cancelada").sort((a, b) => a.ordem - b.ordem)
  const aProgramar = painel.entregas.filter(e => e.status === "a_programar")
  const peso = paradas.reduce((s, e) => s + (Number(e.peso_kg) || 0), 0)
  const cap = Number(ve?.capacidade_kg) || 0
  const st = STATUS_VIAGEM[viagem.status]
  const cor = ve?.cor || "#d97021"
  const aoVivo = posicaoRecente(viagem.ultima_posicao_em)

  const executar = async (p: Promise<{ ok: boolean; erro?: string }>, msg?: string) => {
    const r = await p
    if (!r.ok) { toast.error(r.erro); return false }
    if (msg) toast.success(msg)
    router.refresh()
    return true
  }

  const mover = (i: number, dir: -1 | 1) => {
    const ids = paradas.map(p => p.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    executar(reordenarEntregas(viagem.id, ids))
  }

  const pontos: PontoMapa[] = paradas.filter(e => e.lat != null && e.lng != null).map((e, i) => ({
    id: e.id, lat: e.lat!, lng: e.lng!,
    cor: e.status === "entregue" ? STATUS_ENTREGA.entregue.cor : cor,
    rotulo: e.status === "entregue" ? "✓" : String(paradas.indexOf(e) + 1 || i + 1),
    popupHtml: `<div style="font:13px system-ui"><b>${paradas.indexOf(e) + 1}. ${escaparHtml(e.destinatario)}</b><br/>${escaparHtml([e.endereco, e.cidade, e.uf].filter(Boolean).join(", "))}<br/>${e.chegada_prevista ? "Chegada: " + escaparHtml(formatarData(e.chegada_prevista)) : ""}</div>`,
  }))
  const origem = { lat: painel.config.origem_lat, lng: painel.config.origem_lng, nome: painel.config.origem_nome }
  const rota = [[origem.lat, origem.lng] as [number, number], ...paradas.filter(e => e.lat != null).map(e => [e.lat!, e.lng!] as [number, number])]
  // km de cada trecho: trechos[0] = origem → 1ª parada (só paradas com local no mapa)
  const comLocal = paradas.filter(e => e.lat != null)
  const trechoDe = (e: EntEntrega) => { const i = comLocal.indexOf(e); return i >= 0 && viagem.trechos ? viagem.trechos[i] ?? null : null }
  const caminhoes = viagem.ultima_lat != null && viagem.ultima_lng != null && viagem.status !== "cancelada"
    ? [{ id: viagem.id, lat: viagem.ultima_lat, lng: viagem.ultima_lng!, cor, placa: ve?.placa || "Caminhão", recente: aoVivo }]
    : []

  // texto do roteiro para mandar ao motorista
  const roteiroTexto = [
    `*Roteiro ArcoForte* — saída ${formatarData(viagem.saida_prevista)}${ve ? ` · ${ve.placa}` : ""}`,
    ...paradas.map((e, i) => {
      const local = [e.endereco, [e.cidade, e.uf].filter(Boolean).join("/")].filter(Boolean).join(", ")
      const mapa = e.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}` : ""
      const produtos = e.itens?.length
        ? `\nProdutos:\n${e.itens.map(it => `- ${String(it.quantidade).replace(".", ",")} ${it.unidade || ""} ${it.descricao}`.replace(/\s+/g, " ")).join("\n")}`
        : ""
      return `\n${i + 1}. *${e.destinatario}*${e.telefone ? ` (${e.telefone})` : ""}\n${local}${e.chegada_prevista ? `\nChegada: ${formatarData(e.chegada_prevista)}` : ""}${e.descricao_carga ? `\nCarga: ${e.descricao_carga}` : ""}${produtos}${mapa ? `\n${mapa}` : ""}`
    }),
    `\nAbra este link durante a viagem (mostra o roteiro e envia sua localização):\n${linkMotorista}`,
  ].join("\n")
  const whatsMotorista = linkWhatsApp(mo?.telefone)

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Cabeçalho */}
      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="h-1.5" style={{ background: cor }} />
        <div className="p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link href="/entregas?aba=agenda" className={buttonVariants({ variant: "outline", size: "icon", className: "shrink-0 mt-1" })}><ArrowLeft className="h-4 w-4" /></Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset ${st.classe}`}>{st.rotulo}</span>
                {viagem.terceirizada && <span className="rounded-full bg-violet-50 px-2.5 py-0.5 font-medium text-violet-700 ring-1 ring-inset ring-violet-200">Terceirizada</span>}
                {aoVivo && <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 font-medium text-white"><Radio className="h-3 w-3" /> Ao vivo</span>}
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">{viagem.titulo || "Viagem"}</h1>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Saída <b className="text-foreground">{formatarData(viagem.saida_prevista)}</b>{viagem.saida_real ? ` (saiu ${new Date(viagem.saida_real).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })})` : ""}</span>
                {viagem.retorno_previsto && <span>Retorno <b className="text-foreground">{formatarData(viagem.retorno_previsto)}</b></span>}
                <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{ve ? `${ve.placa}${ve.descricao ? ` · ${ve.descricao}` : ""}` : "sem caminhão"}</span>
                <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{mo ? `${mo.nome}${mo.telefone ? ` · ${mo.telefone}` : ""}` : "sem motorista"}</span>
                {tr && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{tr.nome}</span>}
                {viagem.custo_frete ? <span>Frete {brlCentavos.format(Number(viagem.custo_frete))}</span> : null}
                {viagem.distancia_total_km != null && (
                  <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5" />
                    <b className="text-foreground">{formatarKm(viagem.distancia_ida_km)}</b> de ida · {formatarKm(viagem.distancia_total_km)} com a volta{viagem.duracao_total_min ? ` · ~${formatarDuracao(viagem.duracao_total_min)} dirigindo` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
          {gerente && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" className="gap-1" onClick={() => setEditViagem(true)}><Pencil className="h-4 w-4" /> Editar</Button>
              {viagem.status === "planejada" && (
                <Button className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => executar(alterarStatusViagem(viagem.id, "em_rota"), "Viagem iniciada")}><Play className="h-4 w-4" /> Iniciar viagem</Button>
              )}
              {viagem.status === "em_rota" && (
                <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                  const faltam = paradas.filter(p => p.status !== "entregue").length
                  if (faltam && !confirm(`Ainda há ${faltam} entrega(s) não marcadas como entregues. Concluir a viagem mesmo assim?`)) return
                  executar(alterarStatusViagem(viagem.id, "concluida"), "Viagem concluída")
                }}><Square className="h-4 w-4" /> Concluir viagem</Button>
              )}
              {(viagem.status === "concluida" || viagem.status === "cancelada") && (
                <Button variant="outline" className="gap-1" onClick={() => executar(alterarStatusViagem(viagem.id, "planejada"), "Viagem reaberta")}><RotateCcw className="h-4 w-4" /> Reabrir</Button>
              )}
              {viagem.status !== "cancelada" && viagem.status !== "concluida" && (
                <Button variant="ghost" className="gap-1 text-red-600" onClick={() => {
                  if (!confirm("Cancelar esta viagem? As entregas não feitas voltam para \"a programar\".")) return
                  executar(alterarStatusViagem(viagem.id, "cancelada"), "Viagem cancelada")
                }}><XCircle className="h-4 w-4" /> Cancelar</Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Mapa pontos={pontos} caminhoes={caminhoes} altura={460} origem={origem}
            linhas={[
              ...(viagem.rota?.length ? [{ pontos: viagem.rota, cor, espessura: 4 }] : rota.length > 1 ? [{ pontos: rota, cor, tracejada: true }] : []),
              ...(trilha.length > 1 ? [{ pontos: trilha.map(t => [t.lat, t.lng] as [number, number]), cor: "#2563eb" }] : []),
            ]} />
          <p className="-mt-3 text-xs text-muted-foreground">
            {viagem.rota?.length ? "Linha colorida: rota por estrada" : "Tracejado: ordem das paradas"} · Linha azul: caminho feito pelo caminhão{viagem.ultima_posicao_em ? ` · última posição ${new Date(viagem.ultima_posicao_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}
          </p>

          {/* Paradas */}
          <section className="rounded-xl border bg-background shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-[#d97021]" /> Entregas desta viagem ({paradas.length})</h3>
              {gerente && viagem.status !== "concluida" && viagem.status !== "cancelada" && (
                <div className="flex flex-wrap gap-2">
                  {paradas.length > 1 && (
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" title={`Começa em ${origem.nome} e vai sempre para a entrega mais perto`}
                      onClick={() => executar(ordenarPorProximidade(viagem.id), "Paradas ordenadas pela mais próxima")}>
                      <Sparkles className="h-3.5 w-3.5" /> Ordenar pela mais próxima
                    </Button>
                  )}
                  {paradas.length > 0 && (
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => executar(recalcularRotaViagem(viagem.id), "Rota recalculada")}>
                      <Route className="h-3.5 w-3.5" /> Recalcular rota
                    </Button>
                  )}
                  {aProgramar.length > 0 && (
                    <select className={cn(inputClasse, "h-8 w-56 text-xs")} value="" onChange={e => { if (e.target.value) executar(programarEntrega(e.target.value, viagem.id), "Entrega adicionada") }}>
                      <option value="">+ Adicionar das &quot;a programar&quot; ({aProgramar.length})</option>
                      {aProgramar.map(a => <option key={a.id} value={a.id}>{a.destinatario}{a.cidade ? ` · ${a.cidade}` : ""}</option>)}
                    </select>
                  )}
                  <Button size="sm" className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={() => setEntregaEdit({ viagem_id: viagem.id, chegada_prevista: viagem.saida_prevista })}>
                    <Plus className="h-3.5 w-3.5" /> Nova entrega
                  </Button>
                </div>
              )}
            </header>
            {paradas.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma entrega nesta viagem ainda.</p>}
            <ol className="divide-y">
              {paradas.map((e, i) => <Parada key={e.id} e={e} i={i} total={paradas.length} gerente={gerente} cor={cor} trechoKm={trechoDe(e)} origemNome={origem.nome}
                onSubir={() => mover(i, -1)} onDescer={() => mover(i, 1)} onEditar={() => setEntregaEdit(e)}
                onEntregue={(v) => executar(marcarEntregue(e.id, v), v ? "Marcada como entregue" : "Desmarcada")}
                onTirar={() => { if (confirm(`Tirar "${e.destinatario}" desta viagem? Ela volta para "a programar".`)) executar(programarEntrega(e.id, null), "Entrega voltou para a programar") }} />)}
            </ol>
          </section>
        </div>

        {/* Lateral */}
        <div className="space-y-5">
          <section className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold">Carga</h3>
            <div className="text-2xl font-bold">{peso.toLocaleString("pt-BR")} kg</div>
            {cap > 0 ? (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${peso > cap ? "bg-red-500" : "bg-[#d97021]"}`} style={{ width: `${Math.min(100, (peso / cap) * 100)}%` }} />
                </div>
                <p className={`text-xs ${peso > cap ? "font-medium text-red-600" : "text-muted-foreground"}`}>
                  {Math.round((peso / cap) * 100)}% da capacidade ({cap.toLocaleString("pt-BR")} kg){peso > cap ? " — acima do limite!" : ""}
                </p>
              </>
            ) : <p className="text-xs text-muted-foreground">Cadastre a capacidade do caminhão para comparar.</p>}
          </section>

          <section className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Navigation className="h-4 w-4 text-[#d97021]" /> Link do motorista</h3>
            <p className="text-xs text-muted-foreground">
              O motorista abre no celular (sem senha): vê o roteiro, abre cada endereço no Google Maps/Waze, marca as entregas e
              compartilha a localização ao vivo do caminhão.
            </p>
            <div className="flex gap-2">
              <input readOnly className={cn(inputClasse, "text-xs")} value={linkMotorista} onFocus={e => e.target.select()} />
              <Button size="icon" variant="outline" title="Copiar link" onClick={() => { navigator.clipboard.writeText(linkMotorista); toast.success("Link copiado") }}><Copy className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {whatsMotorista ? (
                <a href={`${whatsMotorista}?text=${encodeURIComponent(roteiroTexto)}`} target="_blank" rel="noreferrer"
                  className={buttonVariants({ size: "sm", className: "gap-1 bg-emerald-600 hover:bg-emerald-700" })}>
                  <MessageCircle className="h-4 w-4" /> Enviar roteiro por WhatsApp
                </a>
              ) : (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => { navigator.clipboard.writeText(roteiroTexto); toast.success("Roteiro copiado — cole no WhatsApp do motorista") }}>
                  <Copy className="h-4 w-4" /> Copiar roteiro
                </Button>
              )}
              <a href={linkMotorista} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline", className: "gap-1" })}>
                <ExternalLink className="h-4 w-4" /> Ver como motorista
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground">Quem tiver o link vê o roteiro desta viagem. Não compartilhe fora da equipe.</p>
          </section>

          {viagem.observacoes && (
            <section className="rounded-xl border bg-background p-4 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold">Observações</h3>
              <p className="whitespace-pre-wrap text-sm">{viagem.observacoes}</p>
            </section>
          )}

          {gerente && (
            <Button variant="ghost" className="w-full gap-1 text-red-600" onClick={() => {
              if (!confirm("Excluir esta viagem? As entregas não feitas voltam para \"a programar\".")) return
              excluirViagem(viagem.id).then(r => { if (!r.ok) return toast.error(r.erro); toast.success("Viagem excluída"); router.push("/entregas?aba=agenda") })
            }}><Trash2 className="h-4 w-4" /> Excluir viagem</Button>
          )}
        </div>
      </div>

      <ViagemDialog aberto={editViagem} inicial={viagem} cadastros={painel} entregas={painel.entregas} onFechar={() => setEditViagem(false)} onSalvo={() => { setEditViagem(false); router.refresh() }} />
      <EntregaDialog aberto={!!entregaEdit} inicial={entregaEdit} viagens={painel.viagens} podeGerenciar={gerente} config={painel.config}
        onFechar={() => setEntregaEdit(null)} onSalvo={() => { setEntregaEdit(null); router.refresh() }} />
    </div>
  )
}

function Parada({ e, i, total, gerente, cor, trechoKm, origemNome, onSubir, onDescer, onEditar, onEntregue, onTirar }: {
  e: EntEntrega; i: number; total: number; gerente: boolean; cor: string; trechoKm: number | null; origemNome: string
  onSubir: () => void; onDescer: () => void; onEditar: () => void; onEntregue: (v: boolean) => void; onTirar: () => void
}) {
  const st = STATUS_ENTREGA[e.status]
  const entregue = e.status === "entregue"
  return (
    <li className={`flex gap-3 px-4 py-3 ${entregue ? "bg-emerald-50/40" : ""}`}>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: entregue ? STATUS_ENTREGA.entregue.cor : cor }}>
        {entregue ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{e.destinatario}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st.classe}`}>{st.rotulo}</span>
          {e.lead_id && <Link href={`/crm/lead/${e.lead_id}`} className="text-xs text-[#d97021] hover:underline">lead</Link>}
          {e.orcamento_id && <Link href={`/orcamentos/${e.orcamento_id}`} className="text-xs text-[#d97021] hover:underline">pedido</Link>}
        </div>
        <div className="text-xs text-muted-foreground">{[e.endereco, [e.cidade, e.uf].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "sem endereço"}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {trechoKm != null && <span className="font-medium text-foreground">↳ {formatarKm(trechoKm)} {i === 0 ? `de ${origemNome}` : "da parada anterior"}</span>}
          {e.distancia_km != null && i > 0 && <span>{formatarKm(e.distancia_km)} de {origemNome}</span>}
          {e.chegada_prevista && <span>Chegada {formatarData(e.chegada_prevista)}</span>}
          {e.entregue_em && <span className="text-emerald-700">Entregue {new Date(e.entregue_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
          {e.peso_kg ? <span>{Number(e.peso_kg).toLocaleString("pt-BR")} kg</span> : null}
          {e.descricao_carga && <span>{e.descricao_carga}</span>}
          {e.lat == null && <span className="text-amber-700">sem local no mapa</span>}
        </div>
        {!!e.itens?.length && (
          <details className="mt-1 text-xs">
            <summary className="cursor-pointer select-none font-medium text-[#d97021]">
              {e.itens.length} produto(s){e.pedido_erp ? ` · pedido ${e.pedido_erp}` : ""}
            </summary>
            <ul className="mt-1 divide-y rounded border bg-background">
              {e.itens.map((it, k) => (
                <li key={k} className="flex gap-2 px-2 py-1">
                  <span className="w-16 shrink-0 text-right font-medium">{String(it.quantidade).replace(".", ",")} {it.unidade || ""}</span>
                  <span className="min-w-0 flex-1">{it.descricao}</span>
                  {it.codigo && <span className="shrink-0 font-mono text-muted-foreground">{it.codigo}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
        {e.obs_motorista && <div className="mt-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">Motorista: {e.obs_motorista}</div>}
      </div>
      {gerente && (
        <div className="flex shrink-0 items-start gap-0.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={onSubir} title="Subir"><ArrowUp className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === total - 1} onClick={onDescer} title="Descer"><ArrowDown className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className={`h-7 w-7 ${entregue ? "text-muted-foreground" : "text-emerald-600"}`} onClick={() => onEntregue(!entregue)} title={entregue ? "Desmarcar entregue" : "Marcar entregue"}>
            {entregue ? <Undo2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditar} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
          {!entregue && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={onTirar} title="Tirar da viagem"><XCircle className="h-3.5 w-3.5" /></Button>}
        </div>
      )}
    </li>
  )
}
