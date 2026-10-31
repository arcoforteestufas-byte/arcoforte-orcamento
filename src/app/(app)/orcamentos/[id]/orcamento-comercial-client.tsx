"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, Loader2 } from "lucide-react"
import { CroquiPicker } from "./croqui-picker"
import { CulturaSelect } from "./cultura-select"

// Helpers de data em horário local, pra não sofrer o desvio de fuso
// que "new Date('YYYY-MM-DD')" (interpretado como UTC) costuma causar.
function formatISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addDaysISO(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return formatISO(d)
}

function diffDiasDeHoje(dataISO: string) {
  const [y, m, d] = dataISO.split("-").map(Number)
  if (!y || !m || !d) return null
  const alvo = new Date(y, m - 1, d)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  alvo.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDataBR(dataISO: string) {
  const [y, m, d] = dataISO.split("-").map(Number)
  if (!y || !m || !d) return ""
  return new Intl.DateTimeFormat("pt-BR").format(new Date(y, m - 1, d))
}

// Endereço completo já cadastrado no cliente, pronto pra copiar como entrega
function enderecoDoCliente(orcamento: any) {
  return [orcamento.clientes?.endereco, orcamento.clientes?.cidade_uf].filter(Boolean).join(', ')
}

export function OrcamentoComercial({ orcamento }: { orcamento: any }) {
  const router = useRouter()
  const clienteEndereco = enderecoDoCliente(orcamento)

  // Se já existe um endereço de entrega salvo e ele é diferente do endereço do
  // cliente, entende que foi um endereço customizado. Senão, parte do endereço
  // do cliente por padrão (se ele tiver um cadastrado).
  const enderecoJaCustomizado = !!orcamento.endereco_entrega && orcamento.endereco_entrega !== clienteEndereco
  const [usarEnderecoCliente, setUsarEnderecoCliente] = useState<boolean>(
    !enderecoJaCustomizado && !!clienteEndereco
  )
  const [enderecoCustom, setEnderecoCustom] = useState(enderecoJaCustomizado ? orcamento.endereco_entrega : '')

  const [formData, setFormData] = useState({
    desconto: orcamento.desconto || 0,
    frete: orcamento.frete || 0,
    outras_despesas: orcamento.outras_despesas || 0,
    forma_pagamento: orcamento.forma_pagamento || "",
    tipo_frete: orcamento.tipo_frete || "",
    endereco_entrega: !enderecoJaCustomizado && clienteEndereco ? clienteEndereco : (orcamento.endereco_entrega || ""),
    data_validade: orcamento.data_validade || "",
    descricao_proposta: orcamento.descricao_proposta || "",
    cultura: orcamento.cultura || "",
    prazo_entrega: orcamento.prazo_entrega || "",
    numero_pedido: orcamento.numero_pedido || ""
  })

  const handleUsarEnderecoClienteChange = (usar: boolean) => {
    setUsarEnderecoCliente(usar)
    if (usar) {
      setFormData(prev => ({ ...prev, endereco_entrega: clienteEndereco }))
    } else {
      setFormData(prev => ({ ...prev, endereco_entrega: enderecoCustom }))
    }
  }
  // Quantidade de dias exibida no campo (string pra aceitar input vazio enquanto digita)
  const [validadeDias, setValidadeDias] = useState<string>(
    orcamento.data_validade ? String(diffDiasDeHoje(orcamento.data_validade) ?? "") : ""
  )
  const [isSaving, setIsSaving] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)

  // Se esse orçamento ainda não tem validade definida, puxa o último valor
  // de "dias de validade" que esse vendedor usou, pra já vir preenchido.
  useEffect(() => {
    const preencherPadraoDoVendedor = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUsuarioId(user.id)

      if (orcamento.data_validade) return // já tem validade definida, não sobrescreve

      const { data: usuarioRow } = await supabase
        .from('usuarios')
        .select('dias_validade_padrao')
        .eq('id', user.id)
        .single()

      const padrao = usuarioRow?.dias_validade_padrao
      if (padrao) {
        setValidadeDias(String(padrao))
        setFormData(prev => ({ ...prev, data_validade: addDaysISO(padrao) }))
      }
    }
    preencherPadraoDoVendedor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDiasChange = (valor: string) => {
    setValidadeDias(valor)
    const dias = parseInt(valor, 10)
    if (!isNaN(dias)) {
      setFormData(prev => ({ ...prev, data_validade: addDaysISO(dias) }))
    } else {
      setFormData(prev => ({ ...prev, data_validade: "" }))
    }
  }

  const totalItens = orcamento.valor_total || 0
  const subtotal = totalItens
  const totalLiquido = subtotal - Number(formData.desconto) + Number(formData.frete) + Number(formData.outras_despesas)

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('orcamentos')
      .update({
        desconto: formData.desconto,
        frete: formData.frete,
        outras_despesas: formData.outras_despesas,
        forma_pagamento: formData.forma_pagamento,
        tipo_frete: formData.tipo_frete,
        endereco_entrega: formData.endereco_entrega,
        data_validade: formData.data_validade || null,
        descricao_proposta: formData.descricao_proposta,
        cultura: formData.cultura,
        prazo_entrega: formData.prazo_entrega,
        numero_pedido: formData.numero_pedido || null
      })
      .eq('id', orcamento.id)

    if (error) {
      setIsSaving(false)
      alert('Erro ao salvar: ' + error.message)
      return
    }

    // Lembra, por vendedor, a quantidade de dias usada agora — vira o padrão
    // pré-preenchido na próxima proposta desse vendedor.
    const dias = parseInt(validadeDias, 10)
    if (usuarioId && !isNaN(dias)) {
      await supabase
        .from('usuarios')
        .update({ dias_validade_padrao: dias })
        .eq('id', usuarioId)
    }

    setIsSaving(false)

    // Atualiza os dados do Server Component (ex: PdfButtons) sem recarregar a página inteira
    router.refresh()
  }

  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Detalhes Comerciais & Logística</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição da Proposta</Label>
            <Textarea
              placeholder="Ex: 48L x 52C x 3A, secagem de café, 3 cortinas..."
              value={formData.descricao_proposta}
              onChange={e => setFormData({ ...formData, descricao_proposta: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Número do Pedido (opcional)</Label>
            <Input
              placeholder={`Em branco usa o padrão: ${orcamento.id.split('-')[0].toUpperCase()}`}
              value={formData.numero_pedido}
              onChange={e => setFormData({ ...formData, numero_pedido: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Validade da Proposta</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={validadeDias}
                  onChange={e => handleDiasChange(e.target.value)}
                  placeholder="5"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  dias{formData.data_validade ? ` — vence em ${formatDataBR(formData.data_validade)}` : ""}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={v => setFormData({ ...formData, forma_pagamento: v || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                  <SelectItem value="A Combinar">A Combinar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Frete / Informações</Label>
            <Input
              placeholder="Ex: Transporte próprio por conta do destinatário"
              value={formData.tipo_frete}
              onChange={e => setFormData({ ...formData, tipo_frete: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Endereço de Entrega{!usarEnderecoCliente && <span className="text-red-500"> *</span>}</Label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <Checkbox
                  checked={usarEnderecoCliente}
                  onCheckedChange={(c) => handleUsarEnderecoClienteChange(!!c)}
                  disabled={!clienteEndereco}
                />
                Usar endereço do cadastro
              </label>
            </div>
            {usarEnderecoCliente ? (
              <p className="text-sm text-slate-600 border rounded-md px-3 py-2 bg-slate-50">
                {clienteEndereco || 'Cliente não tem endereço cadastrado.'}
              </p>
            ) : (
              <Input
                placeholder="Rua, número, bairro, cidade... (obrigatório)"
                value={enderecoCustom}
                onChange={e => {
                  setEnderecoCustom(e.target.value)
                  setFormData(prev => ({ ...prev, endereco_entrega: e.target.value }))
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cultura / Uso da Estufa</Label>
              <CulturaSelect
                value={formData.cultura}
                onChange={v => setFormData({ ...formData, cultura: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo de Entrega</Label>
              <Input
                placeholder="Ex: 45 dias úteis"
                value={formData.prazo_entrega}
                onChange={e => setFormData({ ...formData, prazo_entrega: e.target.value })}
              />
            </div>
          </div>
          <CroquiPicker orcamentoId={orcamento.id} parametrosUtilizados={orcamento.parametros_utilizados} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fechamento Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Subtotal dos Itens</span>
              <span className="font-medium">{formatadorMoeda.format(subtotal)}</span>
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right text-red-500">Desconto (R$)</Label>
              <Input
                type="number" step="0.01" className="col-span-2 text-right"
                value={formData.desconto}
                onChange={e => setFormData({ ...formData, desconto: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right text-blue-500">Frete (R$)</Label>
              <Input
                type="number" step="0.01" className="col-span-2 text-right"
                value={formData.frete}
                onChange={e => setFormData({ ...formData, frete: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right text-slate-500">Outras Desp. (R$)</Label>
              <Input
                type="number" step="0.01" className="col-span-2 text-right"
                value={formData.outras_despesas}
                onChange={e => setFormData({ ...formData, outras_despesas: Number(e.target.value) })}
              />
            </div>

            <div className="pt-4 border-t flex justify-between items-center">
              <span className="font-bold text-lg">Total Líquido</span>
              <span className="font-black text-2xl text-[#d97021]">
                {formatadorMoeda.format(totalLiquido)}
              </span>
            </div>
          </div>

          <Button
            className="w-full mt-4"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Fechamento
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
