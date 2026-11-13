"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertCircle, Building2, CheckCircle2, ClipboardList, Pencil, Search, Unlink, User, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ClienteFormFields, CLIENTE_FORM_DATA_VAZIO, inferirTipoDocumento, type ClienteFormData } from "@/components/clientes/cliente-form-fields"
import { CAMPOS_OBRIGATORIOS_CLIENTE } from "@/utils/proposta-requisitos"
import {
  atualizarClienteDoLead, cadastrarClienteParaLead, desligarClienteDoLead, ligarClienteAoLead, listarClientesParaLead,
} from "@/app/actions/crm"
import type { CrmCliente, CrmLead } from "@/lib/crm-types"
import { inputClasse } from "./crm-utils"

export type ModoCliente = null | "buscar" | "simples" | "completo" | "editar"

function dadosDoLead(lead: CrmLead): ClienteFormData {
  return {
    ...CLIENTE_FORM_DATA_VAZIO,
    nome: lead.titulo || "",
    telefone: lead.telefone || "",
    email: lead.email || "",
    cidade_uf: [lead.cidade, lead.uf].filter(Boolean).join(" / "),
    contato: lead.contato_nome || "",
  }
}

function dadosDoCliente(c: CrmCliente): ClienteFormData {
  return {
    nome: c.nome || "",
    tipo_documento: c.tipo_documento || inferirTipoDocumento(c.documento),
    documento: c.documento || "",
    telefone: c.telefone || "",
    email: c.email || "",
    cidade_uf: c.cidade_uf || "",
    endereco: c.endereco || "",
    contato: c.contato || "",
    contato_telefone: c.contato_telefone || "",
    nome_fantasia: c.nome_fantasia || "",
  }
}

export function ClienteDoLead({ lead, cliente, podeEditar, modo, setModo, onMudou, depoisDeLigar }: {
  lead: CrmLead
  cliente: CrmCliente | null
  podeEditar: boolean
  modo: ModoCliente
  setModo: (m: ModoCliente) => void
  onMudou: () => void
  /** chamado depois que um cliente foi ligado/cadastrado (ex.: seguir para o orçamento) */
  depoisDeLigar?: (clienteId: string) => void
}) {
  const faltando = cliente
    ? CAMPOS_OBRIGATORIOS_CLIENTE.filter(({ campo }) => !String((cliente as unknown as Record<string, unknown>)[campo] ?? "").trim())
    : []

  const concluir = (clienteId: string) => {
    setModo(null)
    onMudou()
    depoisDeLigar?.(clienteId)
  }

  return (
    <>
      {cliente ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d97021]/10 text-[#d97021]">
              {cliente.tipo_documento === "CNPJ" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{cliente.nome}</div>
              <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                {cliente.tipo_documento && <span>{cliente.tipo_documento}{cliente.documento ? ` ${cliente.documento}` : ""}</span>}
                {cliente.cidade_uf && <span>{cliente.cidade_uf}</span>}
                {cliente.telefone && <span>{cliente.telefone}</span>}
              </div>
            </div>
          </div>
          {faltando.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Para a proposta faltam: {faltando.map(f => f.label).join(", ")}.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Cadastro completo para proposta
            </div>
          )}
          {podeEditar && (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setModo("editar")}>
                <Pencil className="h-3.5 w-3.5" /> {faltando.length ? "Completar cadastro" : "Editar cadastro"}
              </Button>
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => setModo("buscar")}>
                <Users className="h-3.5 w-3.5" /> Trocar
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={async () => {
                if (!confirm("Desligar este cliente do lead? O cadastro do cliente não é apagado.")) return
                const r = await desligarClienteDoLead(lead.id)
                if (!r.ok) return toast.error(r.erro)
                onMudou()
              }}>
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Este lead ainda não tem cliente. Escolha um já cadastrado ou cadastre agora.</p>
          {podeEditar && (
            <div className="grid gap-1.5">
              <Button variant="outline" className="justify-start gap-2" onClick={() => setModo("buscar")}>
                <Search className="h-4 w-4" /> Selecionar cliente cadastrado
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => setModo("simples")}>
                <UserPlus className="h-4 w-4" /> Cadastro simples <span className="text-xs text-muted-foreground">(nome, telefone, cidade)</span>
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => setModo("completo")}>
                <ClipboardList className="h-4 w-4" /> Cadastro completo <span className="text-xs text-muted-foreground">(CPF/CNPJ, endereço...)</span>
              </Button>
            </div>
          )}
        </div>
      )}

      <BuscarClienteDialog aberto={modo === "buscar"} lead={lead} onFechar={() => setModo(null)} onLigado={concluir} />
      <CadastroSimplesDialog aberto={modo === "simples"} lead={lead} onFechar={() => setModo(null)} onCompleto={() => setModo("completo")} onCriado={concluir} />
      <CadastroCompletoDialog
        aberto={modo === "completo" || modo === "editar"}
        lead={lead}
        cliente={modo === "editar" ? cliente : null}
        onFechar={() => setModo(null)}
        onSalvo={concluir}
      />
    </>
  )
}

function BuscarClienteDialog({ aberto, lead, onFechar, onLigado }: {
  aberto: boolean
  lead: CrmLead
  onFechar: () => void
  onLigado: (clienteId: string) => void
}) {
  const [lista, setLista] = useState<Awaited<ReturnType<typeof listarClientesParaLead>> | null>(null)
  const [busca, setBusca] = useState("")
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setBusca(lead.titulo.split(/[—-]/)[0].trim().split(" ")[0] || "")
    listarClientesParaLead().then(setLista)
  }, [aberto, lead.titulo])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const digitos = t.replace(/\D/g, "")
    return (lista || []).filter(c => !t
      || c.nome.toLowerCase().includes(t)
      || (c.cidade_uf || "").toLowerCase().includes(t)
      || (digitos.length >= 3 && ((c.documento || "").replace(/\D/g, "").includes(digitos) || (c.telefone || "").replace(/\D/g, "").includes(digitos)))
    ).slice(0, 50)
  }, [lista, busca])

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar cliente cadastrado</DialogTitle>
          <DialogDescription>Busque por nome, cidade, CPF/CNPJ ou telefone.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input autoFocus className={`${inputClasse} pl-8`} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..." />
        </div>
        <div className="max-h-80 overflow-y-auto divide-y rounded-lg border">
          {!lista ? <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
            : filtrados.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            : filtrados.map(c => (
              <button key={c.id} disabled={!!salvando} className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-orange-50 disabled:opacity-50"
                onClick={async () => {
                  setSalvando(c.id)
                  const r = await ligarClienteAoLead(lead.id, c.id)
                  setSalvando(null)
                  if (!r.ok) return toast.error(r.erro)
                  toast.success("Cliente ligado ao lead")
                  onLigado(c.id)
                }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{c.nome[0]?.toUpperCase()}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{c.nome}</span>
                  <span className="block text-xs text-muted-foreground truncate">{[c.cidade_uf, c.documento, c.telefone].filter(Boolean).join(" · ") || "—"}</span>
                </span>
                {salvando === c.id && <span className="text-xs text-muted-foreground">ligando...</span>}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CadastroSimplesDialog({ aberto, lead, onFechar, onCompleto, onCriado }: {
  aberto: boolean
  lead: CrmLead
  onFechar: () => void
  onCompleto: () => void
  onCriado: (clienteId: string) => void
}) {
  const [d, setD] = useState({ nome: "", telefone: "", cidade_uf: "", email: "" })
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (!aberto) return
    const base = dadosDoLead(lead)
    setD({ nome: base.nome, telefone: base.telefone, cidade_uf: base.cidade_uf, email: base.email })
  }, [aberto, lead])

  const salvar = async () => {
    setSalvando(true)
    const r = await cadastrarClienteParaLead(lead.id, { ...d, contato: lead.contato_nome || "" })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Cliente cadastrado")
    onCriado(r.dados!.clienteId)
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro simples</DialogTitle>
          <DialogDescription>O básico para começar. Dá para completar depois (CPF/CNPJ e endereço são pedidos na proposta).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Nome *</Label><input className={inputClasse} value={d.nome} onChange={e => setD({ ...d, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Telefone / WhatsApp</Label><input className={inputClasse} value={d.telefone} onChange={e => setD({ ...d, telefone: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Cidade / UF</Label><input className={inputClasse} value={d.cidade_uf} onChange={e => setD({ ...d, cidade_uf: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label>E-mail</Label><input className={inputClasse} type="email" value={d.email} onChange={e => setD({ ...d, email: e.target.value })} /></div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="link" className="px-0 text-[#d97021]" onClick={onCompleto}>Prefiro o cadastro completo</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !d.nome.trim()} className="bg-[#d97021] hover:bg-[#c3631b]">
              {salvando ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CadastroCompletoDialog({ aberto, lead, cliente, onFechar, onSalvo }: {
  aberto: boolean
  lead: CrmLead
  cliente: CrmCliente | null // preenchido = editar / completar
  onFechar: () => void
  onSalvo: (clienteId: string) => void
}) {
  const [form, setForm] = useState<ClienteFormData>(CLIENTE_FORM_DATA_VAZIO)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (aberto) setForm(cliente ? dadosDoCliente(cliente) : dadosDoLead(lead))
  }, [aberto, cliente, lead])

  const salvar = async () => {
    if (!form.tipo_documento) return toast.error("Selecione se o cliente é CNPJ ou CPF.")
    if (!form.nome.trim()) return toast.error("Informe o nome do cliente.")
    setSalvando(true)
    const r = cliente
      ? await atualizarClienteDoLead(lead.id, cliente.id, { ...form })
      : await cadastrarClienteParaLead(lead.id, { ...form })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success(cliente ? "Cadastro atualizado" : "Cliente cadastrado")
    const id = cliente ? cliente.id : (r as { dados?: { clienteId: string } }).dados!.clienteId
    onSalvo(id)
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? "Cadastro do cliente" : "Cadastro completo do cliente"}</DialogTitle>
          <DialogDescription>Com estes dados a proposta já sai completa.</DialogDescription>
        </DialogHeader>
        <ClienteFormFields formData={form} setFormData={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} className="bg-[#d97021] hover:bg-[#c3631b]">
            {salvando ? "Salvando..." : "Salvar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
