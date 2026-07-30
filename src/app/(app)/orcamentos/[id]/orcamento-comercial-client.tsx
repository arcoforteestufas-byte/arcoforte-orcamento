"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2 } from "lucide-react"

export function OrcamentoComercial({ orcamento }: { orcamento: any }) {
  const [formData, setFormData] = useState({
    desconto: orcamento.desconto || 0,
    frete: orcamento.frete || 0,
    outras_despesas: orcamento.outras_despesas || 0,
    forma_pagamento: orcamento.forma_pagamento || "",
    tipo_frete: orcamento.tipo_frete || "",
    endereco_entrega: orcamento.endereco_entrega || "",
    data_validade: orcamento.data_validade || "",
    descricao_proposta: orcamento.descricao_proposta || ""
  })
  const [isSaving, setIsSaving] = useState(false)
  
  const totalItens = orcamento.valor_total || 0
  const subtotal = totalItens
  const totalLiquido = subtotal - Number(formData.desconto) + Number(formData.frete) + Number(formData.outras_despesas)

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()
    
    await supabase
      .from('orcamentos')
      .update({
        desconto: formData.desconto,
        frete: formData.frete,
        outras_despesas: formData.outras_despesas,
        forma_pagamento: formData.forma_pagamento,
        tipo_frete: formData.tipo_frete,
        endereco_entrega: formData.endereco_entrega,
        data_validade: formData.data_validade,
        descricao_proposta: formData.descricao_proposta
      })
      .eq('id', orcamento.id)
      
    setIsSaving(false)
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Validade</Label>
              <Input 
                type="date"
                value={formData.data_validade}
                onChange={e => setFormData({ ...formData, data_validade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select 
                value={formData.forma_pagamento} 
                onValueChange={v => setFormData({ ...formData, forma_pagamento: v })}
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
            <Label>Endereço de Entrega</Label>
            <Input 
              placeholder="Se for diferente do cadastro"
              value={formData.endereco_entrega}
              onChange={e => setFormData({ ...formData, endereco_entrega: e.target.value })}
            />
          </div>
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
