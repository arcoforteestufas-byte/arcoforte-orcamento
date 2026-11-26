"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowRight, CheckCircle2, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { enviarLeadParaFunil, marcarGanho, marcarPerdido, obterFichaLead } from "@/app/actions/crm"
import { hojeISO, type CrmConfig, type CrmFunil, type CrmItemLista, type CrmOrcamentoResumo, type CrmUsuario } from "@/lib/crm-types"
import { brlCentavos, formatarData, inputClasse } from "./crm-utils"

export type AlvoEtapa = { leadId: string; etapaId: string } | null

export function GanhoDialog({ alvo, onFechar, onFeito }: {
  alvo: AlvoEtapa
  onFechar: () => void
  onFeito: () => void
}) {
  const [orcamentos, setOrcamentos] = useState<CrmOrcamentoResumo[] | null>(null)
  const [titulo, setTitulo] = useState("")
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const [prazo, setPrazo] = useState("")
  const [tentou, setTentou] = useState(false) // mostra os avisos dos campos depois da 1ª tentativa
  const [salvando, setSalvando] = useState(false)
  // onFechar muda a cada render de quem chama; em ref para não recarregar a janela à toa
  const onFecharRef = useRef(onFechar)
  onFecharRef.current = onFechar

  useEffect(() => {
    if (!alvo) return
    setOrcamentos(null); setEscolhidos([]); setPrazo(""); setTentou(false)
    obterFichaLead(alvo.leadId).then(r => {
      if (!r.ok) { toast.error(r.erro); return onFecharRef.current() }
      const orcs = r.dados!.orcamentos.filter(o => o.status !== "Perdido")
      setTitulo(r.dados!.lead.titulo)
      setPrazo(r.dados!.lead.prazo_entrega || "")
      setOrcamentos(orcs)
      if (orcs.length === 1) setEscolhidos([orcs[0].id])
    })
  }, [alvo])

  const alternar = (id: string) => setEscolhidos(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id])
  const soma = (orcamentos || []).filter(o => escolhidos.includes(o.id)).reduce((s, o) => s + (Number(o.valor_total) || 0), 0)

  // validação de cada campo, com a mensagem no lugar certo
  const hoje = hojeISO()
  const erroPrazo = !prazo ? "Escolha a data de entrega prometida ao cliente." : prazo < hoje ? "Essa data já passou. Escolha uma data a partir de hoje." : ""
  const erroOrc = orcamentos && !orcamentos.length
    ? "Este lead não tem orçamento. Faça o orçamento antes de marcar como Ganho."
    : !escolhidos.length ? "Marque o orçamento que o cliente fechou." : ""

  const confirmar = async () => {
    if (!alvo) return
    setTentou(true)
    if (erroOrc || erroPrazo) return toast.error(erroOrc || erroPrazo)
    setSalvando(true)
    const r = await marcarGanho(alvo.leadId, alvo.etapaId, escolhidos, prazo)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Venda ganha! 🎉 A entrega foi para a logística programar.")
    if (r.dados?.aviso) toast.warning(r.dados.aviso, { duration: 10000 })
    onFeito()
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="text-emerald-600" /> Marcar como ganho</DialogTitle>
        </DialogHeader>
        {!orcamentos ? <p className="text-sm text-muted-foreground py-4">Carregando...</p> : (
          <div className="space-y-4">
            <p className="text-sm"><b>{titulo}</b></p>

            {/* 1. Orçamento fechado */}
            <div className="space-y-2">
              <div>
                <Label>1. Qual orçamento o cliente fechou? *</Label>
                <p className="text-xs text-muted-foreground">O valor da venda é a soma dos orçamentos marcados. Pode marcar mais de um.</p>
              </div>
              {orcamentos.map(o => {
                const marcado = escolhidos.includes(o.id)
                return (
                  <label key={o.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${marcado ? "border-emerald-600 bg-emerald-50" : "hover:bg-muted/50"}`}>
                    <input type="checkbox" checked={marcado} onChange={() => alternar(o.id)} className="h-4 w-4 accent-emerald-600" />
                    <span className="flex-1">{o.numero_pedido || o.id.slice(0, 8).toUpperCase()} · {formatarData(o.criado_em)} · {o.status}</span>
                    <b>{brlCentavos.format(o.valor_total)}</b>
                  </label>
                )
              })}
              {escolhidos.length > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-emerald-600/10 px-3 py-2 text-sm">
                  <span>Valor da venda ({escolhidos.length} orçamento{escolhidos.length > 1 ? "s" : ""} → <b>Aprovado</b>)</span>
                  <b className="text-emerald-700">{brlCentavos.format(soma)}</b>
                </div>
              )}
              {erroOrc && (tentou || !orcamentos.length) && <p className="text-xs font-medium text-red-600">{erroOrc}</p>}
            </div>

            {/* 2. Prazo de entrega contratual */}
            <div className={`grid gap-1.5 rounded-lg border p-3 ${tentou && erroPrazo ? "border-red-300 bg-red-50" : prazo ? "bg-muted/30" : "border-amber-300 bg-amber-50"}`}>
              <Label>2. Prazo de entrega (vai para o contrato) *</Label>
              <input type="date" className={inputClasse} value={prazo} min={hoje} onChange={e => setPrazo(e.target.value)} />
              {tentou && erroPrazo
                ? <p className="text-xs font-medium text-red-600">{erroPrazo}</p>
                : <p className="text-xs text-muted-foreground">Data prometida ao cliente — atraso gera multa. Depois do ganho, só o administrador altera. A venda vai para Entregas com esta data.</p>}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || !orcamentos || !orcamentos.length} className="bg-emerald-600 hover:bg-emerald-700">
            {salvando ? "Salvando..." : "Confirmar ganho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MOTIVOS_FALLBACK: CrmItemLista[] = [
  { id: "fallback:Preço", nome: "Preço", ordem: 0, ativo: true },
  { id: "fallback:Prazo de entrega", nome: "Prazo de entrega", ordem: 1, ativo: true },
  { id: "fallback:Fechou com concorrente", nome: "Fechou com concorrente", ordem: 2, ativo: true },
  { id: "fallback:Desistiu do projeto", nome: "Desistiu do projeto", ordem: 3, ativo: true },
  { id: "fallback:Sem crédito / financiamento negado", nome: "Sem crédito / financiamento negado", ordem: 4, ativo: true },
  { id: "fallback:Sem retorno do cliente", nome: "Sem retorno do cliente", ordem: 5, ativo: true },
]

export function PerdidoDialog({ alvo, motivos, config, onFechar, onFeito }: {
  alvo: AlvoEtapa
  motivos: CrmItemLista[]
  config: CrmConfig
  onFechar: () => void
  onFeito: (motivoId?: string | null, foiParaNutricao?: boolean) => void
}) {
  const [motivo, setMotivo] = useState("")
  const [foraDoPerfil, setForaDoPerfil] = useState(false)
  const [obs, setObs] = useState("")
  const [perderOrcs, setPerderOrcs] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroMotivo, setErroMotivo] = useState(false)
  useEffect(() => {
    if (alvo) {
      setMotivo("")
      setObs("")
      setPerderOrcs(true)
      setErroMotivo(false)
      setForaDoPerfil(false)
    }
  }, [alvo])
  const obrigatorio = config.motivo_perda_obrigatorio && !foraDoPerfil
  const ativos = motivos.filter(m => m.ativo)
  const opcoesMotivo = ativos.length > 0 ? ativos : MOTIVOS_FALLBACK

  const escolherMotivo = (valor: string) => {
    setMotivo(valor)
    if (valor) setErroMotivo(false)
  }

  const confirmar = async () => {
    if (!alvo) return
    if (obrigatorio && !motivo) {
      setErroMotivo(true)
      toast.error("Motivo da perda é obrigatório")
      return
    }
    setSalvando(true)
    const r = await marcarPerdido(alvo.leadId, alvo.etapaId, motivo || null, obs, perderOrcs, foraDoPerfil)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    const nutricao = r.dados?.nutricao || null
    if (foraDoPerfil) toast.success("Lead descartado: fora do perfil, não vai para o Marketing")
    else if (nutricao) toast.success(`Perda registrada. O lead foi para o funil ${nutricao} para nutrição.`)
    else toast.success("Lead marcado como perdido (não há funil de Marketing para nutrir)")
    onFeito(motivo || null, !!nutricao)
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><XCircle className="text-red-600" /> Marcar como perdido</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2" role="radiogroup" aria-label="Tipo de perda">
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${!foraDoPerfil ? "border-[#d97021] bg-orange-50/60" : "hover:bg-muted"}`}>
              <input type="radio" name="tipo-perda" className="mt-0.5 accent-[#d97021]" checked={!foraDoPerfil} onChange={() => setForaDoPerfil(false)} />
              <span>
                <span className="font-medium">Está no nosso perfil de cliente</span>
                <span className="block text-xs text-muted-foreground">A perda fica registrada e o lead vai para o Marketing continuar aquecendo.</span>
              </span>
            </label>
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${foraDoPerfil ? "border-red-600 bg-red-50" : "hover:bg-muted"}`}>
              <input type="radio" name="tipo-perda" className="mt-0.5 accent-red-600" checked={foraDoPerfil} onChange={() => { setForaDoPerfil(true); setErroMotivo(false) }} />
              <span>
                <span className="font-medium">Fora do perfil (entrou por engano)</span>
                <span className="block text-xs text-muted-foreground">Não tem nada a ver com nossos clientes. Fica descartado e não vai para o Marketing.</span>
              </span>
            </label>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="motivo-perda">Motivo da perda{obrigatorio ? " *" : ""}</Label>
            <select
              id="motivo-perda"
              aria-label="Motivo da perda"
              aria-invalid={obrigatorio && !motivo ? true : undefined}
              className={`${inputClasse} bg-background ${erroMotivo && !motivo ? "border-red-500 ring-1 ring-red-500" : ""}`}
              value={motivo}
              onChange={e => escolherMotivo(e.target.value)}
            >
              <option value="">Selecione o motivo...</option>
              {opcoesMotivo.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {opcoesMotivo.map(m => (
                <button key={m.id} type="button" onClick={() => escolherMotivo(motivo === m.id ? "" : m.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${motivo === m.id ? "border-red-600 bg-red-50 text-red-700 font-medium" : "hover:bg-muted"}`}>
                  {m.nome}
                </button>
              ))}
            </div>
            {obrigatorio && !motivo && (
              <p role="alert" className={`text-xs text-red-600 ${erroMotivo ? "font-semibold" : "font-medium"}`}>
                Motivo da perda é obrigatório
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="detalhes-perda">Detalhes (opcional)</Label>
            <Textarea id="detalhes-perda" rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: fechou com concorrente por R$ 10 mil a menos" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={perderOrcs} onChange={e => setPerderOrcs(e.target.checked)} className="accent-red-600" />
            Marcar os orçamentos em aberto deste lead como Perdido
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={salvando}>
            {salvando ? "Salvando..." : "Confirmar perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Envia o lead para outro funil (Marketing → SDR → Vendedores) */
export function EnviarFunilDialog({ alvo, funis, usuarios, onFechar, onFeito }: {
  alvo: { leadId: string; titulo: string; funilAtualId: string; vendedorId: string } | null
  funis: CrmFunil[]
  usuarios: CrmUsuario[]
  onFechar: () => void
  onFeito: (funilId: string) => void
}) {
  const [destino, setDestino] = useState("")
  const [vendedor, setVendedor] = useState("")
  const [salvando, setSalvando] = useState(false)
  const outros = funis.filter(f => f.id !== alvo?.funilAtualId)
  const atual = funis.find(f => f.id === alvo?.funilAtualId)
  const funilDestino = funis.find(f => f.id === destino)
  // Quem pode receber: usuários do funil de destino (lista vazia = todos)
  const temLista = !!funilDestino?.usuarios?.length
  const candidatos = temLista ? usuarios.filter(u => funilDestino!.usuarios!.includes(u.id)) : usuarios
  // O responsável atual não trabalha no destino: precisa escolher (senão o lead some para a equipe)
  const atualFicaFora = temLista && !funilDestino!.usuarios!.includes(alvo?.vendedorId || "")
  const rodizio = !!funilDestino?.distribuicao_automatica && temLista
  const RODIZIO = "__rodizio__"
  const faltaResponsavel = atualFicaFora && !rodizio && !vendedor

  useEffect(() => {
    if (!alvo) return
    const proximo = atual?.proximo_funil_id && outros.some(f => f.id === atual.proximo_funil_id) ? atual.proximo_funil_id : outros[0]?.id || ""
    setDestino(proximo)
    setVendedor("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo])

  const confirmar = async () => {
    if (!alvo || !destino) return
    setSalvando(true)
    const r = await enviarLeadParaFunil(alvo.leadId, destino, vendedor && vendedor !== RODIZIO ? vendedor : null)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success(`Lead enviado para ${funilDestino?.nome}`)
    onFeito(destino)
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-[#d97021]" /> Enviar para outro funil</DialogTitle>
          <DialogDescription>{alvo?.titulo}</DialogDescription>
        </DialogHeader>
        {outros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Não há outro funil disponível. O administrador cria funis em Configurações → CRM.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-full px-3 py-1 text-white font-medium" style={{ backgroundColor: atual?.cor }}>{atual?.nome}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="rounded-full px-3 py-1 text-white font-medium" style={{ backgroundColor: funilDestino?.cor || "#94a3b8" }}>{funilDestino?.nome || "?"}</span>
            </div>
            <div className="grid gap-1.5">
              <Label>Funil de destino</Label>
              <div className="grid gap-1.5">
                {outros.map(f => (
                  <label key={f.id} className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${destino === f.id ? "border-[#d97021] bg-orange-50" : "hover:bg-muted/50"}`}>
                    <input type="radio" checked={destino === f.id} onChange={() => { setDestino(f.id); setVendedor("") }} className="accent-[#d97021]" />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.cor }} />
                    <span className="flex-1 font-medium">{f.nome}</span>
                    {atual?.proximo_funil_id === f.id && <span className="text-xs text-[#d97021]">próximo passo</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Responsável no novo funil{atualFicaFora && !rodizio ? " *" : ""}</Label>
              <select className={`${inputClasse} ${faltaResponsavel ? "border-amber-400 ring-2 ring-amber-200" : ""}`} value={vendedor} onChange={e => setVendedor(e.target.value)}>
                {rodizio
                  ? <option value="">Rodízio automático (próximo da fila do {funilDestino?.nome})</option>
                  : atualFicaFora
                    ? <option value="">Escolha quem vai atender...</option>
                    : <option value="">Manter o responsável atual ({usuarios.find(u => u.id === alvo?.vendedorId)?.nome || "—"})</option>}
                {candidatos.filter(u => u.id !== alvo?.vendedorId || !atualFicaFora).map(u => (
                  <option key={u.id} value={u.id}>{u.nome}{u.id === alvo?.vendedorId ? " (atual)" : ""}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {faltaResponsavel
                  ? `O responsável atual não trabalha no funil ${funilDestino?.nome}. Escolha quem vai atender, senão a equipe não vê o lead.`
                  : "O lead entra na primeira etapa do funil escolhido. Se trocar o responsável, o cadastro do cliente também passa para ele."}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || !destino || faltaResponsavel} className="bg-[#d97021] hover:bg-[#c3631b] gap-1">
            <Send className="h-4 w-4" /> {salvando ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
