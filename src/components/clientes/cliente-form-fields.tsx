"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ClienteFormData {
  nome: string
  tipo_documento: "CNPJ" | "CPF" | ""
  documento: string
  telefone: string
  email: string
  cidade_uf: string
  endereco: string
  contato: string
  contato_telefone: string
  nome_fantasia: string
}

export const CLIENTE_FORM_DATA_VAZIO: ClienteFormData = {
  nome: "",
  tipo_documento: "",
  documento: "",
  telefone: "",
  email: "",
  cidade_uf: "",
  endereco: "",
  contato: "",
  contato_telefone: "",
  nome_fantasia: "",
}

// Tenta descobrir CPF x CNPJ pelo tamanho do documento já salvo,
// pra clientes antigos que ainda não tinham esse campo.
export function inferirTipoDocumento(documento?: string | null): "CNPJ" | "CPF" | "" {
  const digitos = (documento || "").replace(/\D/g, "")
  if (digitos.length === 14) return "CNPJ"
  if (digitos.length === 11) return "CPF"
  return ""
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
      {children}
    </h3>
  )
}

export function ClienteFormFields({
  formData,
  setFormData,
}: {
  formData: ClienteFormData
  setFormData: (data: ClienteFormData) => void
}) {
  const isCNPJ = formData.tipo_documento === "CNPJ"
  const isCPF = formData.tipo_documento === "CPF"

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label>Tipo de Documento *</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "justify-center",
              isCNPJ && "border-[#d97021] bg-orange-50 text-[#d97021] hover:bg-orange-50"
            )}
            onClick={() => setFormData({ ...formData, tipo_documento: "CNPJ" })}
          >
            CNPJ (Empresa)
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "justify-center",
              isCPF && "border-[#d97021] bg-orange-50 text-[#d97021] hover:bg-orange-50"
            )}
            onClick={() => setFormData({ ...formData, tipo_documento: "CPF" })}
          >
            CPF (Pessoa Física)
          </Button>
        </div>
      </div>

      {/* Sem tipo escolhido ainda: só o nome, pra não travar o cadastro */}
      {!isCNPJ && !isCPF && (
        <div className="grid gap-2">
          <Label htmlFor="cf-nome">Nome / Razão Social *</Label>
          <Input
            id="cf-nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Selecione o tipo de documento acima"
          />
        </div>
      )}

      {/* CNPJ: bloco da empresa bem separado do bloco de quem negocia */}
      {isCNPJ && (
        <>
          <div className="rounded-lg border bg-slate-50/70 p-4">
            <SecaoTitulo>Dados da Empresa</SecaoTitulo>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cf-nome">Razão Social / Nome da Empresa *</Label>
                <Input
                  id="cf-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Estufas Silva Ltda"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cf-documento">CNPJ</Label>
                  <Input
                    id="cf-documento"
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                    placeholder="Somente números"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cf-telefone">Telefone da Empresa</Label>
                  <Input
                    id="cf-telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cf-email">Email</Label>
                  <Input
                    id="cf-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cf-cidade">Cidade / UF</Label>
                  <Input
                    id="cf-cidade"
                    value={formData.cidade_uf}
                    onChange={(e) => setFormData({ ...formData, cidade_uf: e.target.value })}
                    placeholder="Ex: Holambra / SP"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cf-endereco">Endereço Completo</Label>
                <Input
                  id="cf-endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Número, Bairro"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#d97021]/30 bg-orange-50/50 p-4">
            <SecaoTitulo>Pessoa de Contato (quem negocia pela empresa)</SecaoTitulo>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cf-contato">Nome do Contato</Label>
                <Input
                  id="cf-contato"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  placeholder="Ex: João, do setor de compras"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cf-contato-telefone">Telefone do Contato</Label>
                <Input
                  id="cf-contato-telefone"
                  value={formData.contato_telefone}
                  onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* CPF: bloco da pessoa separado do bloco do negócio informal */}
      {isCPF && (
        <>
          <div className="rounded-lg border bg-slate-50/70 p-4">
            <SecaoTitulo>Dados da Pessoa</SecaoTitulo>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cf-nome">Nome da Pessoa (dona do CPF) *</Label>
                <Input
                  id="cf-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cf-documento">CPF</Label>
                  <Input
                    id="cf-documento"
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                    placeholder="Somente números"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cf-telefone">Telefone / WhatsApp</Label>
                  <Input
                    id="cf-telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cf-email">Email</Label>
                  <Input
                    id="cf-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cf-cidade">Cidade / UF</Label>
                  <Input
                    id="cf-cidade"
                    value={formData.cidade_uf}
                    onChange={(e) => setFormData({ ...formData, cidade_uf: e.target.value })}
                    placeholder="Ex: Holambra / SP"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cf-endereco">Endereço Completo</Label>
                <Input
                  id="cf-endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Número, Bairro"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-4">
            <SecaoTitulo>Negócio Informal (opcional, sem CNPJ)</SecaoTitulo>
            <div className="grid gap-2">
              <Label htmlFor="cf-nome-fantasia">Nome Fantasia do Negócio</Label>
              <p className="-mt-1 text-xs text-muted-foreground">
                Pra clientes sem CNPJ que ainda assim têm um nome de sítio, fazenda ou comércio.
              </p>
              <Input
                id="cf-nome-fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                placeholder="Ex: Sítio Boa Vista"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
