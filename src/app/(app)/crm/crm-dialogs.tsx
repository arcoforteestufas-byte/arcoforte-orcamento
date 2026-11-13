"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowRight, CheckCircle2, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { enviarLeadParaFunil, marcarGanho, marcarPerdido, obterFichaLead } from "@/app/actions/crm"
import type { CrmConfig, CrmFunil, CrmItemLista, CrmOrcamentoResumo, CrmUsuario } from "@/lib/crm-types"
import { brlCentavos, formatarData, inputClasse } from "./crm-utils"

export type AlvoEtapa = { leadId: string; etapaId: string } | null

export function GanhoDialog({ alvo, onFechar, onFeito }: {
  alvo: AlvoEtapa
  onFechar: () => void
  onFeito: () => void
}) {
  const [orcamentos, setOrcamentos] = useState<CrmOrcamentoResumo[] | null>(null)
  const [titulo, setTitulo] = useState("")
  const [escolhido, setEscolhido] = useState("")
  const [valor, setValor] = useState("")
  const [salvando, setSalvando] = useState(false)
  // onFechar muda a cada render de quem chama; em ref para não recarregar a janela à toa
  const onFecharRef = useRef(onFechar)
  onFecharRef.current = onFechar

  useEffect(() => {
    if (!alvo) return
    setOrcamentos(null); setEscolhido(""); setValor("")
    obterFichaLead(alvo.leadId).then(r => {
      if (!r.ok) { toast.error(r.erro); return onFecharRef.current() }
      const orcs = r.dados!.orcamentos.filter(o => o.status !== "Perdido")
      setTitulo(r.dados!.lead.titulo)
      setOrcamentos(orcs)
      if (orcs.length === 1) setEscolhido(orcs[0].id)
      else if (!orcs.length) setValor(r.dados!.lead.valor_estimado ? String(r.dados!.lead.valor_estimado).replace(".", ",") : "")
    })
  }, [alvo])

  const confirmar = async () => {
    if (!alvo) return
    setSalvando(true)
    const v = valor ? Number(valor.replace(/\./g, "").replace(",", ".")) : null
    const r = await marcarGanho(alvo.leadId, alvo.etapaId, escolhido || null, escolhido ? null : v)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Venda ganha! 🎉")
    onFeito()
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="text-emerald-600" /> Marcar como ganho</DialogTitle>
        </DialogHeader>
        {!orcamentos ? <p className="text-sm text-muted-foreground py-4">Carregando...</p> : (
          <div className="space-y-3">
            <p className="text-sm"><b>{titulo}</b></p>
            {orcamentos.length > 0 ? (
              <>
                <Label>Qual orçamento foi fechado?</Label>
                <div className="space-y-2">
                  {orcamentos.map(o => (
                    <label key={o.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${escolhido === o.id ? "border-emerald-600 bg-emerald-50" : "hover:bg-muted/50"}`}>
                      <input type="radio" name="orc" checked={escolhido === o.id} onChange={() => setEscolhido(o.id)} className="accent-emerald-600" />
                      <span className="flex-1">{o.numero_pedido || o.id.slice(0, 8).toUpperCase()} · {formatarData(o.criado_em)} · {o.status}</span>
                      <b>{brlCentavos.format(o.valor_total)}</b>
                    </label>
                  ))}
                  <label className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${escolhido === "" ? "border-emerald-600 bg-emerald-50" : "hover:bg-muted/50"}`}>
                    <input type="radio" name="orc" checked={escolhido === ""} onChange={() => setEscolhido("")} className="accent-emerald-600" />
                    Fechou sem um destes orçamentos
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">O orçamento escolhido passa para o status <b>Aprovado</b>.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Este lead não tem orçamento ligado.</p>
            )}
            {escolhido === "" && (
              <div className="grid gap-1.5">
                <Label>Valor fechado (R$)</Label>
                <input className={inputClasse} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || !orcamentos} className="bg-emerald-600 hover:bg-emerald-700">
            {salvando ? "Salvando..." : "Confirmar ganho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PerdidoDialog({ alvo, motivos, config, onFechar, onFeito }: {
  alvo: AlvoEtapa
  motivos: CrmItemLista[]
  config: CrmConfig
  onFechar: () => void
  onFeito: () => void
}) {
  const [motivo, setMotivo] = useState("")
  const [obs, setObs] = useState("")
  const [perderOrcs, setPerderOrcs] = useState(true)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { if (alvo) { setMotivo(""); setObs(""); setPerderOrcs(true) } }, [alvo])
  const obrigatorio = config.motivo_perda_obrigatorio

  const confirmar = async () => {
    if (!alvo) return
    setSalvando(true)
    const r = await marcarPerdido(alvo.leadId, alvo.etapaId, motivo || null, obs, perderOrcs)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast("Lead marcado como perdido")
    onFeito()
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><XCircle className="text-red-600" /> Marcar como perdido</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Motivo da perda{obrigatorio ? " *" : ""}</Label>
            <div className="flex flex-wrap gap-1.5">
              {motivos.filter(m => m.ativo).map(m => (
                <button key={m.id} type="button" onClick={() => setMotivo(motivo === m.id ? "" : m.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${motivo === m.id ? "border-red-600 bg-red-50 text-red-700 font-medium" : "hover:bg-muted"}`}>
                  {m.nome}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Detalhes (opcional)</Label>
            <Textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: fechou com concorrente por R$ 10 mil a menos" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={perderOrcs} onChange={e => setPerderOrcs(e.target.checked)} className="accent-red-600" />
            Marcar os orçamentos em aberto deste lead como Perdido
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={salvando || (obrigatorio && !motivo)}>
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
