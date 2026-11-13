"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UFS, type CrmItemLista, type CrmUsuario } from "@/lib/crm-types"
import { inputClasse } from "./crm-utils"

export type LeadFormValores = {
  titulo: string
  contato_nome: string
  telefone: string
  email: string
  cidade: string
  uf: string
  origem_id: string
  cultura: string
  area_m2: string
  valor_estimado: string
  vendedor_id: string
  proxima_acao_em: string
  observacoes: string
}

export const LEAD_VAZIO: LeadFormValores = {
  titulo: "", contato_nome: "", telefone: "", email: "", cidade: "", uf: "",
  origem_id: "", cultura: "", area_m2: "", valor_estimado: "", vendedor_id: "",
  proxima_acao_em: "", observacoes: "",
}

export function LeadCampos({
  valores,
  onChange,
  origens,
  usuarios,
  podeTrocarVendedor,
}: {
  valores: LeadFormValores
  onChange: (v: LeadFormValores) => void
  origens: CrmItemLista[]
  usuarios: CrmUsuario[]
  podeTrocarVendedor: boolean
}) {
  const set = (campo: keyof LeadFormValores) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ ...valores, [campo]: e.target.value })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
      <div className="sm:col-span-6 grid gap-1.5">
        <Label>Nome do lead / cliente *</Label>
        <input className={inputClasse} value={valores.titulo} onChange={set("titulo")} placeholder="Ex.: Sítio Boa Vista — João Silva" autoFocus />
      </div>
      <div className="sm:col-span-3 grid gap-1.5">
        <Label>Contato</Label>
        <input className={inputClasse} value={valores.contato_nome} onChange={set("contato_nome")} />
      </div>
      <div className="sm:col-span-3 grid gap-1.5">
        <Label>Telefone / WhatsApp</Label>
        <input className={inputClasse} value={valores.telefone} onChange={set("telefone")} placeholder="(00) 00000-0000" />
      </div>
      <div className="sm:col-span-3 grid gap-1.5">
        <Label>E-mail</Label>
        <input className={inputClasse} type="email" value={valores.email} onChange={set("email")} />
      </div>
      <div className="sm:col-span-2 grid gap-1.5">
        <Label>Cidade</Label>
        <input className={inputClasse} value={valores.cidade} onChange={set("cidade")} />
      </div>
      <div className="sm:col-span-1 grid gap-1.5">
        <Label>UF</Label>
        <select className={inputClasse} value={valores.uf} onChange={set("uf")}>
          <option value="">—</option>
          {UFS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 grid gap-1.5">
        <Label>Origem</Label>
        <select className={inputClasse} value={valores.origem_id} onChange={set("origem_id")}>
          <option value="">—</option>
          {origens.filter(o => o.ativo || o.id === valores.origem_id).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 grid gap-1.5">
        <Label>Cultura</Label>
        <input className={inputClasse} value={valores.cultura} onChange={set("cultura")} placeholder="Ex.: tomate, morango" />
      </div>
      <div className="sm:col-span-2 grid gap-1.5">
        <Label>Área desejada (m²)</Label>
        <input className={inputClasse} inputMode="decimal" value={valores.area_m2} onChange={set("area_m2")} />
      </div>
      <div className="sm:col-span-3 grid gap-1.5">
        <Label>Valor estimado (R$)</Label>
        <input className={inputClasse} inputMode="decimal" value={valores.valor_estimado} onChange={set("valor_estimado")} placeholder="Usa o maior orçamento se ficar vazio" />
      </div>
      <div className="sm:col-span-3 grid gap-1.5">
        <Label>Próximo contato</Label>
        <input className={inputClasse} type="date" value={valores.proxima_acao_em} onChange={set("proxima_acao_em")} />
      </div>
      {podeTrocarVendedor && (
        <div className="sm:col-span-6 grid gap-1.5">
          <Label>Vendedor responsável</Label>
          <select className={inputClasse} value={valores.vendedor_id} onChange={set("vendedor_id")}>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
      )}
      <div className="sm:col-span-6 grid gap-1.5">
        <Label>Observações</Label>
        <Textarea rows={3} value={valores.observacoes} onChange={set("observacoes")} />
      </div>
    </div>
  )
}

export function leadParaValores(l: Record<string, unknown>): LeadFormValores {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v))
  return {
    titulo: s(l.titulo), contato_nome: s(l.contato_nome), telefone: s(l.telefone), email: s(l.email),
    cidade: s(l.cidade), uf: s(l.uf), origem_id: s(l.origem_id), cultura: s(l.cultura),
    area_m2: s(l.area_m2), valor_estimado: Number(l.valor_estimado) ? s(l.valor_estimado) : "",
    vendedor_id: s(l.vendedor_id), proxima_acao_em: s(l.proxima_acao_em), observacoes: s(l.observacoes),
  }
}
