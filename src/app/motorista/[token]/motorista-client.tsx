"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, MapPin, Navigation, Phone, Radio, RefreshCw, Truck } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export type Roteiro = {
  id: string
  titulo: string | null
  status: string
  saida_prevista: string
  retorno_previsto: string | null
  veiculo: { placa: string; descricao: string | null } | null
  motorista: string | null
  entregas: {
    id: string; ordem: number; destinatario: string; telefone: string | null; endereco: string | null
    cidade: string | null; uf: string | null; lat: number | null; lng: number | null
    chegada_prevista: string | null; status: string; entregue_em: string | null
    descricao_carga: string | null; peso_kg: number | null; observacoes: string | null
    itens?: { codigo: string | null; descricao: string; unidade: string | null; quantidade: number }[] | null
    pedido_erp?: string | null
  }[]
}

function data(iso: string | null) {
  if (!iso) return ""
  const [a, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${a}`
}

export function MotoristaClient({ token, inicial }: { token: string; inicial: Roteiro }) {
  const supabase = useRef(createClient()).current
  const [roteiro, setRoteiro] = useState(inicial)
  const [compartilhando, setCompartilhando] = useState(false)
  const [ultimoEnvio, setUltimoEnvio] = useState<Date | null>(null)
  const [erroGps, setErroGps] = useState("")
  const watchRef = useRef<number | null>(null)
  const ultimoEnvioRef = useRef(0)
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null)
  const encerrada = roteiro.status === "concluida" || roteiro.status === "cancelada"

  const recarregar = async () => {
    const { data: r } = await supabase.rpc("ent_motorista_roteiro", { p_token: token })
    if (r) setRoteiro(r as Roteiro)
  }

  const enviar = async (pos: GeolocationPosition) => {
    const agora = Date.now()
    if (agora - ultimoEnvioRef.current < 20000) return // no máximo a cada 20 s
    ultimoEnvioRef.current = agora
    const { data: erro, error } = await supabase.rpc("ent_motorista_posicao", {
      p_token: token, p_lat: pos.coords.latitude, p_lng: pos.coords.longitude,
      p_precisao: pos.coords.accuracy ?? null, p_velocidade: pos.coords.speed ?? null,
    })
    if (error || erro) { setErroGps(String(erro || error?.message)); return }
    setErroGps("")
    setUltimoEnvio(new Date())
  }

  const iniciar = async () => {
    if (!("geolocation" in navigator)) return toast.error("Este celular não permite localização pelo navegador.")
    setErroGps("")
    watchRef.current = navigator.geolocation.watchPosition(
      p => { setCompartilhando(true); enviar(p) },
      err => {
        setErroGps(err.code === err.PERMISSION_DENIED
          ? "Localização bloqueada. Libere a localização para este site nas configurações do navegador."
          : "Não consegui pegar a localização. Verifique se o GPS está ligado.")
        setCompartilhando(false)
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
    )
    setCompartilhando(true)
    // tenta manter a tela ligada (o envio para se a tela apagar em alguns celulares)
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }
      wakeRef.current = (await nav.wakeLock?.request("screen")) || null
    } catch { /* sem suporte */ }
  }

  const parar = () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
    wakeRef.current?.release().catch(() => {})
    wakeRef.current = null
    setCompartilhando(false)
  }

  useEffect(() => () => parar(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const marcarEntregue = async (id: string, nome: string) => {
    const obs = prompt(`Confirmar entrega para ${nome}?\n\nObservação (opcional, ex.: quem recebeu):`)
    if (obs === null) return
    const { data: erro, error } = await supabase.rpc("ent_motorista_entregue", { p_token: token, p_entrega: id, p_obs: obs })
    if (error || erro) return toast.error(String(erro || error?.message))
    toast.success("Entrega confirmada")
    recarregar()
  }

  const pendentes = roteiro.entregas.filter(e => e.status !== "entregue")
  const proxima = pendentes[0]

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4 pb-16">
      <header className="rounded-2xl bg-[#d97021] p-4 text-white shadow">
        <div className="flex items-center gap-2 text-sm opacity-90"><Truck className="h-4 w-4" /> ArcoForte · Roteiro de entrega</div>
        <h1 className="mt-1 text-xl font-bold">{roteiro.titulo || "Viagem"}</h1>
        <div className="mt-1 text-sm opacity-90">
          Saída {data(roteiro.saida_prevista)}{roteiro.veiculo ? ` · ${roteiro.veiculo.placa}` : ""}{roteiro.motorista ? ` · ${roteiro.motorista}` : ""}
        </div>
        <div className="mt-2 text-sm font-medium">{roteiro.entregas.length - pendentes.length} de {roteiro.entregas.length} entregas feitas</div>
      </header>

      {encerrada ? (
        <div className="rounded-xl border bg-white p-4 text-center text-sm text-slate-600">Esta viagem já foi encerrada. Obrigado!</div>
      ) : (
        <section className={`rounded-xl border p-4 shadow-sm ${compartilhando ? "border-blue-300 bg-blue-50" : "bg-white"}`}>
          <div className="flex items-center gap-2 font-semibold">
            <Radio className={`h-5 w-5 ${compartilhando ? "text-blue-600 animate-pulse" : "text-slate-400"}`} />
            {compartilhando ? "Localização ligada" : "Localização desligada"}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {compartilhando
              ? `A ArcoForte está vendo onde o caminhão está.${ultimoEnvio ? ` Último envio: ${ultimoEnvio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` : ""} Deixe esta página aberta durante a viagem.`
              : "Ligue para a equipe acompanhar o caminhão no mapa durante a viagem."}
          </p>
          {erroGps && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{erroGps}</p>}
          <button onClick={compartilhando ? parar : iniciar}
            className={`mt-3 w-full rounded-lg py-3 text-base font-semibold text-white ${compartilhando ? "bg-slate-500" : "bg-blue-600"}`}>
            {compartilhando ? "Parar de enviar localização" : "Ligar localização"}
          </button>
        </section>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Entregas</h2>
        <button onClick={recarregar} className="inline-flex items-center gap-1 text-sm text-slate-500"><RefreshCw className="h-4 w-4" /> atualizar</button>
      </div>

      <ol className="space-y-3">
        {roteiro.entregas.map((e, i) => {
          const feita = e.status === "entregue"
          const destino = e.lat != null && e.lng != null
            ? `${e.lat},${e.lng}`
            : encodeURIComponent([e.endereco, e.cidade, e.uf].filter(Boolean).join(", "))
          const ehProxima = proxima?.id === e.id
          return (
            <li key={e.id} className={`rounded-xl border bg-white p-4 shadow-sm ${feita ? "opacity-60" : ""} ${ehProxima ? "ring-2 ring-[#d97021]" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${feita ? "bg-emerald-600" : "bg-[#d97021]"}`}>
                  {feita ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {ehProxima && <div className="text-xs font-semibold uppercase text-[#d97021]">Próxima entrega</div>}
                  <div className="font-semibold">{e.destinatario}</div>
                  <div className="text-sm text-slate-600">{[e.endereco, [e.cidade, e.uf].filter(Boolean).join(" - ")].filter(Boolean).join(", ")}</div>
                  {e.chegada_prevista && <div className="text-sm text-slate-500">Chegada prevista: {data(e.chegada_prevista)}</div>}
                  {e.descricao_carga && <div className="text-sm text-slate-500">Carga: {e.descricao_carga}</div>}
                  {!!e.itens?.length && (
                    <details className="mt-1 text-sm">
                      <summary className="cursor-pointer select-none font-medium text-[#d97021]">
                        Conferir {e.itens.length} produto(s){e.pedido_erp ? ` · pedido ${e.pedido_erp}` : ""}
                      </summary>
                      <ul className="mt-1 divide-y rounded border bg-white">
                        {e.itens.map((it, k) => (
                          <li key={k} className="flex gap-2 px-2 py-1.5">
                            <span className="w-16 shrink-0 text-right font-semibold">{String(it.quantidade).replace(".", ",")} {it.unidade || ""}</span>
                            <span className="min-w-0 flex-1">{it.descricao}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {e.observacoes && <div className="mt-1 rounded bg-amber-50 p-2 text-sm text-amber-900">{e.observacoes}</div>}
                  {feita && e.entregue_em && <div className="mt-1 text-sm text-emerald-700">Entregue em {new Date(e.entregue_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>}
                </div>
              </div>
              {!feita && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${destino}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded-lg border py-2.5 text-sm font-medium"><Navigation className="h-4 w-4" /> Google Maps</a>
                  <a href={e.lat != null ? `https://waze.com/ul?ll=${e.lat},${e.lng}&navigate=yes` : `https://waze.com/ul?q=${destino}&navigate=yes`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded-lg border py-2.5 text-sm font-medium"><MapPin className="h-4 w-4" /> Waze</a>
                  {e.telefone && (
                    <a href={`tel:${e.telefone}`} className="flex items-center justify-center gap-1 rounded-lg border py-2.5 text-sm font-medium"><Phone className="h-4 w-4" /> Ligar</a>
                  )}
                  {!encerrada && (
                    <button onClick={() => marcarEntregue(e.id, e.destinatario)}
                      className={`flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white ${e.telefone ? "" : "col-span-2"}`}>
                      <CheckCircle2 className="h-4 w-4" /> Entreguei
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {roteiro.entregas.length === 0 && <p className="text-center text-sm text-slate-500">Nenhuma entrega nesta viagem ainda.</p>}
    </main>
  )
}
