"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useSettings } from "@/contexts/SettingsContext"
import { construirDadosJsonParaPDF } from "@/utils/construir-dados-pdf"
import { formatadorMoeda } from "@/utils/formatters"
import { ItemOrcamento } from "@/utils/engine"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { construirVariaveisDocx } from "@/utils/construir-variaveis-docx"
import { preencherDocxTemplate } from "@/utils/preencher-docx"

// Textos padrão da proposta — os mesmos valores fixos que o formulário manual
// (Nova Proposta Avulsa) sempre usou como default. Não vêm do orçamento porque
// não existe informação equivalente salva lá.
const PADRAO = {
  arcoCalandrado: 'ARCO CALANDRADO 8MTS 2"X1,25MM GALV',
  colunasExtremidades: '4,80X100X50 2MM GALV',
  colunasCentral: 'POSTE CENTRAL 6,75X100X50 2MM GALV',
  filmeCobertura: 'FILME DIFUSOR 120 MIC 10,00 GINEGAR',
  coberturaFilme: 'FILME DIF 120 MIC',
  fechamentoLateral: 'TELA OPTINET 40 MESH 4,0MTS GINEGAR',
  portaAcesso: 'KIT PORTA DE ABRIR 2,00X1,00 MT GALV',
  lateralTubo: 'LATERAL 50X30MTS C/ MOLAS SEPARADAS GALV 1,25MM 6MTS',
  centralCalha: 'CALHA BIG EXTRA FORTE DE ALUMÍNIO 8 MTS',
  travasInternas: 'ESTICADOR O-O M8 EXTRA FORTE INTERNO C/CLIPS 3/16 + CABO',
  travasExternas: 'ESTICADOR O-O M10 EXTRA FORTE EXTERNO C/ CHUMBADOR CLIPS 3/16',
  profundidadeFundacao: '0,80 metr.',
  alturaArco: '1,80',
  materialTravessa: 'tubo retangular 50/30',
}

// Proposta gerada a partir de um orçamento: diferente da "Nova Proposta Avulsa"
// (que pede tudo no formulário porque não tem de onde puxar), aqui os dados já
// existem no orçamento — então o sistema só pega e gera, sem mostrar formulário.
export function PropostaClient({ orcamento, itens }: { orcamento: any, itens: ItemOrcamento[] }) {
  const { settings, isLoading } = useSettings()
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const jaGerou = useRef(false)

  useEffect(() => {
    if (isLoading || jaGerou.current) return
    jaGerou.current = true
    gerar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  const gerar = async () => {
    setErro(null)
    try {
      // parametros_utilizados usa as mesmas chaves (nome_tecnico) da tabela
      // parametros_estufa: n_modulos, largura_modulo, n_vaos, vao, pe_direito, etc.
      const param = orcamento.parametros_utilizados || {}
      const total = (orcamento.valor_total || 0) - (Number(orcamento.desconto) || 0) + (Number(orcamento.frete) || 0) + (Number(orcamento.outras_despesas) || 0)

      const optB_trigger = 'A SER PAGO VIA PIX NA ASSINATURA'
      const isVarianteB = orcamento.forma_pagamento && orcamento.forma_pagamento.includes(optB_trigger)

      const nModulos = Number(param.n_modulos) || undefined
      const larguraModulo = Number(param.largura_modulo) || undefined
      const nVaos = Number(param.n_vaos) || undefined
      const vao = Number(param.vao) || undefined
      const peDireito = param.pe_direito !== undefined && param.pe_direito !== null && param.pe_direito !== '' ? String(param.pe_direito) : ''

      const larguraTotalNum = (nModulos && larguraModulo) ? nModulos * larguraModulo : undefined
      const comprimentoTotalNum = (nVaos && vao) ? nVaos * vao : undefined
      const areaTotalNum = (larguraTotalNum && comprimentoTotalNum) ? larguraTotalNum * comprimentoTotalNum : undefined

      const formData = {
        vendedorNome: orcamento.usuarios?.nome || '',
        vendedorTelefone: orcamento.usuarios?.telefone || '',
        orcamentoId: orcamento.numero_pedido || orcamento.id.split('-')[0].toUpperCase(),
        dataEmissao: new Date(orcamento.criado_em).toLocaleDateString('pt-BR'),
        dataValidade: orcamento.data_validade ? new Date(orcamento.data_validade).toLocaleDateString('pt-BR') : '',
        clienteNome: orcamento.clientes?.nome || '',
        clienteContato: orcamento.clientes?.contato || orcamento.clientes?.telefone || '',
        clienteTelefone: orcamento.clientes?.telefone || '',
        clienteEmail: orcamento.clientes?.email || '',
        clienteEndereco: orcamento.clientes?.endereco || '',
        clienteCidade: orcamento.clientes?.cidade_uf || '',
        clienteDocumento: orcamento.clientes?.documento || '',

        cultura: orcamento.cultura || '',
        larguraTotal: larguraTotalNum?.toString() || '',
        tamanhoArco: larguraModulo?.toString() || '',
        comprimentoTotal: comprimentoTotalNum?.toString() || '',
        distanciaArcos: vao?.toString() || '',
        largura: (larguraTotalNum && larguraModulo) ? `${nModulos} VÃO ${larguraModulo} MT` : '',
        comprimento: (comprimentoTotalNum && vao) ? `${nVaos} VÃO ${vao} MT` : '',
        modulos: nModulos?.toString() || '',
        alturaLateral: peDireito,
        alturaCentral: '',
        areaTotal: areaTotalNum?.toString() || '',
        croquiUrl: param.croqui_url || '',

        ...PADRAO,

        valorEstrutura: (orcamento.valor_total || 0).toString(),
        valorTotal: total.toString(),
        frete: (orcamento.frete && Number(orcamento.frete) > 0) ? orcamento.frete.toString() : 'INCLUSO',
        prazoEntrega: orcamento.prazo_entrega || '45',
        variantePagamento: isVarianteB ? 'B' : 'A',
      }

      const supabase = createClient()

      const itensMapeados = (itens || []).map((i: any) => ({
        codigo: i.produto_codigo,
        nome: i.produto_descricao,
        qtd: `${i.quantidade_final} ${i.unidade}`,
        unitStr: formatadorMoeda.format(i.preco_unitario || 0),
        totalStr: formatadorMoeda.format(i.valor_total || 0)
      }))

      const dadosResolvidos = construirDadosJsonParaPDF(formData, settings, itensMapeados)

      const textoGerado = `# Proposta para ${formData.clienteNome}\n\nGerada automaticamente a partir do orçamento #${orcamento.id.split('-')[0].toUpperCase()}.`

      // Se tem um modelo Word configurado, preenche ele também e guarda o
      // arquivo .docx pronto pra download.
      let arquivoDocxUrl: string | null = null
      if (settings.modelo_word_url) {
        const formatCurrency = (v: any) => formatadorMoeda.format(Number(String(v ?? '').replace(',', '.')) || 0)
        const variaveisDocx = construirVariaveisDocx(formData, itensMapeados, formatCurrency)

        const templateResp = await fetch(settings.modelo_word_url)
        if (!templateResp.ok) throw new Error('Não foi possível baixar o modelo Word configurado em Configurações → Proposta.')
        const templateBuffer = await templateResp.arrayBuffer()

        const docxBlob = preencherDocxTemplate(templateBuffer, variaveisDocx)
        const nomeArquivo = `proposta_${orcamento.id}_${Date.now()}.docx`

        const { error: uploadError } = await supabase.storage.from('assets').upload(nomeArquivo, docxBlob)
        if (uploadError) throw new Error('Erro ao salvar o Word gerado: ' + uploadError.message)

        const { data: publicUrlData } = supabase.storage.from('assets').getPublicUrl(nomeArquivo)
        arquivoDocxUrl = publicUrlData?.publicUrl || null
      }

      const { data, error } = await supabase.from('propostas').insert({
        orcamento_id: orcamento.id,
        cliente_nome: formData.clienteNome,
        valor_total: Number(formData.valorTotal) || 0,
        texto_conteudo: textoGerado,
        dados_json: dadosResolvidos,
        arquivo_docx_url: arquivoDocxUrl,
        status: 'Gerada'
      }).select().single()

      if (error) throw error

      if (data) {
        router.push(`/propostas/${data.id}`)
      }
    } catch (err: any) {
      console.error('Erro ao gerar proposta:', err)
      setErro(err.message || 'Erro desconhecido ao gerar a proposta.')
      jaGerou.current = false
    }
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h2 className="text-2xl font-bold tracking-tight">Não foi possível gerar a proposta</h2>
        <p className="text-muted-foreground max-w-md">{erro}</p>
        <Button className="bg-[#d97021] hover:bg-[#c3631b] text-white" onClick={gerar}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Loader2 className="h-10 w-10 text-[#d97021] animate-spin" />
      <h2 className="text-xl font-semibold text-slate-700">Gerando proposta comercial...</h2>
      <p className="text-muted-foreground text-sm">
        Usando os dados do orçamento #{orcamento.id.split('-')[0].toUpperCase()}.
      </p>
    </div>
  )
}
