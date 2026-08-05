"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useSettings } from "@/contexts/SettingsContext"
import { ProposalWizard } from "@/components/propostas/ProposalWizard"
import { construirDadosJsonParaPDF } from "@/utils/construir-dados-pdf"
import { formatadorMoeda } from "@/utils/formatters"

export function PropostaClient({ orcamento }: { orcamento: any }) {
  const { settings, isLoading } = useSettings()
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  if (isLoading) {
    return <div className="p-8 text-center">Carregando configurações...</div>
  }

  // Prepara initialData do orcamento para preencher o Wizard
  const param = orcamento.parametros_estufa?.[0] || {}
  const total = (orcamento.valor_total || 0) - (Number(orcamento.desconto) || 0) + (Number(orcamento.frete) || 0) + (Number(orcamento.outras_despesas) || 0)
  
  const optB_trigger = 'A SER PAGO VIA PIX NA ASSINATURA'
  const isVarianteB = orcamento.forma_pagamento && orcamento.forma_pagamento.includes(optB_trigger)

  const initialData = {
    vendedorNome: orcamento.usuarios?.nome || '',
    vendedorTelefone: orcamento.usuarios?.telefone || '',
    orcamentoId: orcamento.id,
    dataEmissao: new Date(orcamento.criado_em).toLocaleDateString('pt-BR'),
    dataValidade: orcamento.data_validade ? new Date(orcamento.data_validade).toLocaleDateString('pt-BR') : '',
    clienteNome: orcamento.clientes?.nome || '',
    clienteContato: orcamento.clientes?.contato || '',
    
    cultura: param.cultura === '**' ? '' : param.cultura || '',
    largura: param.largura_total === '**' ? '' : param.largura_total || '',
    comprimento: param.comprimento_total === '**' ? '' : param.comprimento_total || '',
    modulos: param.modulos || '',
    alturaLateral: param.pe_direito === '**' ? '' : param.pe_direito || '',
    alturaCentral: param.altura_arco === '**' ? '' : param.altura_arco || '',
    areaTotal: param.area_total || '',
    
    // Tenta puxar valores padrão mas deixa livre para editar
    valorTotal: total.toString(),
    frete: (orcamento.frete && Number(orcamento.frete) > 0) ? orcamento.frete.toString() : 'INCLUSO',
    variantePagamento: isVarianteB ? 'B' : 'A',
  }

  const handleGenerate = async (formData: any) => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      
      const itensMapeados = (orcamento.itens || []).map((i: any) => ({
        codigo: i.produto_codigo,
        nome: i.produto_descricao || i.nome,
        qtd: i.quantidade_final || i.quantidade,
        unitStr: formatadorMoeda.format(i.preco_unitario || 0),
        totalStr: formatadorMoeda.format(i.valor_total || 0)
      }))

      const dadosResolvidos = construirDadosJsonParaPDF(formData, settings, itensMapeados)

      const textoGerado = `# Proposta para ${formData.clienteNome}\n\nGerada via formulário de orçamento.`

      const { data, error } = await supabase.from('propostas').insert({
        orcamento_id: orcamento.id,
        cliente_nome: formData.clienteNome,
        valor_total: Number(formData.valorTotal) || 0,
        texto_conteudo: textoGerado,
        dados_json: dadosResolvidos,
        status: 'Gerada'
      }).select().single()

      if (error) throw error

      if (data) {
        router.push(`/propostas/${data.id}`)
      }
    } catch (err) {
      console.error('Erro ao salvar proposta:', err)
      alert('Erro ao salvar proposta. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Proposta Comercial</h2>
          <p className="text-muted-foreground mt-2">
            ID: #{orcamento.id.split('-')[0].toUpperCase()}
          </p>
        </div>
      </div>

      <ProposalWizard initialData={initialData} onSubmit={handleGenerate} isSaving={isSaving} />
    </div>
  )
}
