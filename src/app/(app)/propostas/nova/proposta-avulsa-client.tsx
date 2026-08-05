"use client"

import { useState } from "react"
import { useSettings } from "@/contexts/SettingsContext"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { ProposalWizard } from "@/components/propostas/ProposalWizard"
import { construirDadosJsonParaPDF } from "@/utils/construir-dados-pdf"
import { gerarTextoProposta } from "@/utils/proposta-template"

export function PropostaAvulsaClient() {
  const { settings, isLoading } = useSettings()
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  if (isLoading) {
    return <div className="p-8 text-center">Carregando configurações...</div>
  }

  const handleGenerate = async (formData: any) => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const parsedValor = (() => {
        let str = String(formData.valorTotal || '').trim();
        if (str.includes(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes('.')) {
          const parts = str.split('.');
          if (parts[parts.length - 1].length !== 2) str = str.replace(/\./g, '');
        }
        return Number(str.replace(/[^\d.-]/g, '')) || 0;
      })();
      
      const formattedValor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsedValor);

      const itensMock = [
        { produto_codigo: "01", produto_descricao: "[Produto Avulso]", quantidade_final: 1, unidade: "un", preco_unitario: parsedValor, valor_total: parsedValor, nome: "[Produto Avulso]", qtd: 1, unitStr: formattedValor, totalStr: formattedValor }
      ]

      const dadosResolvidos = construirDadosJsonParaPDF(formData, settings, itensMock)

      // Criamos um texto markdown fake apenas por compatibilidade com a visualizacao web, se precisar
      const textoGerado = `# Proposta para ${formData.clienteNome}\n\nGerada via formulário avulso.`

      const { data, error } = await supabase.from('propostas').insert({
        cliente_nome: formData.clienteNome,
        vendedor_nome: formData.vendedorNome,
        valor_total: parsedValor,
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Nova Proposta Avulsa</h1>
          <p className="text-muted-foreground mt-2">
            Preencha os dados abaixo para gerar um PDF de proposta comercial sem vinculação a um orçamento prévio.
          </p>
        </div>
      </div>

      <ProposalWizard initialData={{}} onSubmit={handleGenerate} isSaving={isSaving} />
    </div>
  )
}
