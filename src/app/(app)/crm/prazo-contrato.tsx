"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CalendarClock, FileWarning, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { alterarPrazoContratual, linkAnexoPrazo, linkEnvioAnexoPrazo } from "@/app/actions/prazo-contratual"
import type { PrazoAlteracao } from "@/lib/entregas-types"
import { hojeISO } from "@/lib/crm-types"
import { dataHora, formatarData, inputClasse } from "./crm-utils"

const LIMITE_ANEXO = 10 * 1024 * 1024

/** Cartão do prazo contratual de uma venda fechada: situação, mudanças registradas e botão de alterar */
export function PrazoContrato({ leadId, prazo, situacao, isAdmin, historico, onMudou }: {
  leadId: string
  prazo: string | null
  situacao: { texto: string; classe: string } | null
  isAdmin: boolean
  historico: PrazoAlteracao[]
  onMudou: () => void
}) {
  const [aberto, setAberto] = useState(false)

  const abrirAnexo = async (id: string) => {
    const r = await linkAnexoPrazo(id)
    if (!r.ok) return toast.error(r.erro)
    window.open(r.url, "_blank", "noopener")
  }

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-[#d97021]" />Prazo do contrato</h3>
        {isAdmin && <Button size="sm" variant="outline" onClick={() => setAberto(true)}>Alterar prazo</Button>}
      </header>
      <div className="space-y-3 p-4">
        <div>
          <div className="text-2xl font-bold tracking-tight">{prazo ? formatarData(prazo) : "—"}</div>
          {situacao && <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${situacao.classe}`}>{situacao.texto}</span>}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Data prometida no contrato. Atrasar dá multa. {isAdmin ? "Se o cliente pedir outra data, registre aqui com o motivo e, se tiver, o print do \"ok\" dele." : "Só o administrador altera, registrando o motivo."}
          </p>
        </div>
        {historico.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mudanças registradas ({historico.length})</div>
            {historico.map(h => (
              <div key={h.id} className="rounded-lg border bg-muted/30 p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 font-medium">
                  <span className="line-through text-muted-foreground">{h.prazo_anterior ? formatarData(h.prazo_anterior) : "sem prazo"}</span>
                  <span>→ {formatarData(h.prazo_novo)}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${h.pedido_por === "cliente" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"}`}>
                    pedido {h.pedido_por === "cliente" ? "do cliente" : "da empresa"}
                  </span>
                </div>
                <div className="mt-1 whitespace-pre-wrap">{h.motivo}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-muted-foreground">
                  <span>{dataHora.format(new Date(h.criado_em))}{h.criado_por_nome ? ` · ${h.criado_por_nome}` : ""}</span>
                  {h.tem_anexo && (
                    <button className="inline-flex items-center gap-1 text-[#d97021] hover:underline" onClick={() => abrirAnexo(h.id)}>
                      <Paperclip className="h-3 w-3" />{h.anexo_nome || "anexo"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {aberto && <AlterarPrazoDialog leadId={leadId} prazoAtual={prazo} onFechar={() => setAberto(false)} onSalvo={() => { setAberto(false); onMudou() }} />}
    </section>
  )
}

function AlterarPrazoDialog({ leadId, prazoAtual, onFechar, onSalvo }: {
  leadId: string
  prazoAtual: string | null
  onFechar: () => void
  onSalvo: () => void
}) {
  const [novo, setNovo] = useState("")
  const [pedidoPor, setPedidoPor] = useState<"cliente" | "empresa">("cliente")
  const [motivo, setMotivo] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const salvar = async () => {
    setErro("")
    if (!novo) return setErro("Escolha a nova data.")
    if (motivo.trim().length < 5) return setErro("Escreva o motivo (fica registrado como prova).")
    if (arquivo && arquivo.size > LIMITE_ANEXO) return setErro("Anexo muito grande (máximo 10 MB).")
    setSalvando(true)
    try {
      let anexoCaminho: string | null = null
      if (arquivo) {
        const l = await linkEnvioAnexoPrazo(leadId, arquivo.name)
        if (!l.ok) { setErro(l.erro); return }
        const { createClient } = await import("@/utils/supabase/client")
        const { error } = await createClient().storage.from("contratos").uploadToSignedUrl(l.caminho, l.token, arquivo, { contentType: arquivo.type || undefined })
        if (error) { setErro(`Falha ao enviar o anexo: ${error.message}`); return }
        anexoCaminho = l.caminho
      }
      const r = await alterarPrazoContratual({ leadId, prazoNovo: novo, motivo, pedidoPor, anexoCaminho, anexoNome: arquivo?.name || null })
      if (!r.ok) { setErro(r.erro); return }
      toast.success("Prazo alterado e registrado")
      onSalvo()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o && !salvando) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar prazo do contrato</DialogTitle>
          <DialogDescription>
            Prazo atual: <b>{prazoAtual ? formatarData(prazoAtual) : "sem prazo"}</b>. A mudança fica registrada no lead com o motivo e o anexo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm"><span className="font-medium">Nova data de entrega *</span>
            <input type="date" className={inputClasse} min={hojeISO()} value={novo} onChange={e => setNovo(e.target.value)} />
          </label>
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">Quem pediu a mudança?</span>
            <div className="flex gap-2">
              {([["cliente", "O cliente"], ["empresa", "A empresa"]] as const).map(([v, r]) => (
                <button key={v} type="button" onClick={() => setPedidoPor(v)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium ${pedidoPor === v ? "border-[#d97021] bg-orange-50 text-[#d97021]" : "text-muted-foreground hover:bg-muted"}`}>
                  {r}
                </button>
              ))}
            </div>
            {pedidoPor === "empresa" && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-[11px] text-amber-900">
                <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Mudança pedida pela empresa: combine com o cliente por escrito, senão o prazo do contrato continua valendo para a multa.
              </p>
            )}
          </div>
          <label className="grid gap-1.5 text-sm"><span className="font-medium">Motivo *</span>
            <Textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder={pedidoPor === "cliente" ? "Ex.: cliente pediu para entregar depois porque a obra do terreno atrasou. Combinado por WhatsApp em 20/11." : "Ex.: atraso do fornecedor de tubos; cliente concordou por e-mail."} />
          </label>
          <label className="grid gap-1.5 text-sm"><span className="font-medium">Anexo (opcional)</span>
            <input type="file" accept="image/*,application/pdf" className="text-xs file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1 file:text-xs"
              onChange={e => setArquivo(e.target.files?.[0] || null)} />
            <span className="text-[11px] text-muted-foreground">Print da conversa, e-mail ou aditivo assinado (imagem ou PDF, até 10 MB).</span>
          </label>
          {erro && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={salvando} onClick={onFechar}>Cancelar</Button>
          <Button className="bg-[#d97021] hover:bg-[#c3631b]" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Alterar prazo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
