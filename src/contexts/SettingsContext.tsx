"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Settings = {
  nome_empresa: string
  cor_primaria: string
  logo_url: string | null
  estilo_pdf: string
  proposta_topicos: any[]
  instagram?: string
  email?: string
  endereco?: string
  capa_pdf_url?: string | null
  fundo_pdf_url?: string | null
  frase_final?: string
  modelo_word_url?: string | null
}

type SettingsContextType = {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>
  isLoading: boolean
}

const defaultSettings: Settings = {
  nome_empresa: 'ArcoForte',
  cor_primaria: '#d97021', // Laranja original
  logo_url: null,
  estilo_pdf: 'padrao',
  instagram: '@arcoforte_estrutural',
  email: 'arcoforteestruturasmetalicas@gmail.com',
  endereco: 'AV. PEDRO LUDOVICO, Nº 9041, ANÁPOLIS',
  capa_pdf_url: null,
  fundo_pdf_url: null,
  frase_final: 'DEUS É FIEL',
  modelo_word_url: null,
  proposta_topicos: [
    {
      id: "ficha_tecnica",
      titulo: "Ficha Técnica",
      texto: "{{FICHA_TECNICA}}",
      tipo: "dinamico",
      ordem: 1,
      ativo: true
    },
    {
      id: "caracteristicas",
      titulo: "Características da Estufa",
      texto: "{{CARACTERISTICAS}}",
      tipo: "dinamico",
      ordem: 2,
      ativo: true
    },
    {
      id: "revestimentos",
      titulo: "Revestimentos e Condições Comerciais",
      texto: "I - REVESTIMENTOS\n• COBERTURAS: {{COBERTURA}}\n• LATERAL: {{LATERAL}}\n• FRONTAL: {{FRONTAL}}\n• MEIA LUA: {{MEIA_LUA}}\n\n{{TABELA_ITENS}}\n\nVALOR DO INVESTIMENTO: {{VALOR_TOTAL}}\n\n{{FINAME_E_PAGAMENTO}}\n\n{{CLAUSULAS}}",
      tipo: "dinamico",
      ordem: 3,
      ativo: true
    },
    {
      id: "responsabilidades",
      titulo: "Responsabilidades das Partes",
      texto: "### RESPONSABILIDADES DA CONTRATANTE\n\nA - Executar a captação de águas pluviais a partir dos coletores. (Tubos de PVC)\nB - Fornecer local seguro e próximo a obra, para guardar os materiais antes e durante a montagem;\nC - Fornecer materiais de concretagem da estrutura (Areia, Brita, Cimento, Betoneira, andaimes Tábuas, Bloco de concreto ou canaletas se necessário etc.).\nD - O CONTRATANTE deverá proporcionar todas as facilidades indispensáveis à boa execução do contrato.\nE - Adimplir com as condições de preço e pagamento, conforme pactuado.\nF - Fazer o descarregamento da mercadoria.\nG - Conferir materiais entregues através do romaneio recebido, não sendo aceitas reclamações após a assinatura do canhoto da NF.\nH - Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.\n\n### RESPONSABILIDADES DA ARCO FORTE\n\nA - Cumprir o objeto do contrato nos prazos e condições estabelecidos.\nB - Disponibilizar para seus clientes e fornecedores, todos os documentos que comprovam sua total regularidade com os pagamentos de tributos municipais, estaduais, federais e com as obrigações trabalhistas;",
      tipo: "texto",
      ordem: 4,
      ativo: true
    },
    {
      id: "garantias",
      titulo: "Garantias",
      texto: "• Estrutura - 48 meses. Desde que não submetidas a cargas extras que não estão neste projeto tais como sombreamentos, irrigação e outros sistemas. E danos causados por má operação ou conservação pelo usuário, ou por terceiros, bem como oriundos da ação agressiva de agentes da natureza (raios, vendavais, tempestades, granizos etc.) não são cobertos pelas garantias, mesmo durante o processo de montagem. Os itens e componentes não fabricados pela Arco Forte serão garantidos pelos seus devidos fabricantes com suporte da Arco Forte.\n• Galvanização - 36 meses. Somente para serviços de galvanização a fogo.\n• Filmes - 30 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;\n• Telas - 48 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;\n• A garantia não inclui outras despesas tais como frete, gastos adicionais de qualquer espécie, plantas de qualquer espécie e/ou quaisquer outros objetos abrigados sobre as estufas.",
      tipo: "texto",
      ordem: 5,
      ativo: true
    },
    {
      id: "exclusoes",
      titulo: "Excluem-se também da garantia",
      texto: "• Recalque da estrutura da estufa agrícola causado por instabilidade do solo;\n• Topografia fora das especificações contidas no contrato;\n• Ataque de animais;\n• Estufas sem tirantes laterais.\n• Quando houver agentes químicos e/ou físicos extremos em contato com as estruturas interna/externa (altas temperaturas, elevada concentração de sais e/ou produtos químicos no solo e/ou na atmosfera).\n• Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.\n• Condutores verticais: Nas saídas das águas pluviais das calhas, devem ser utilizados elementos de condução que NÃO resultem em estrangulamento no fluxo de água (curvas, reduções etc.), caso contrário poderá ocorrer o extravasamento da água na calha, com a possibilidade de causar rompimento do filme pairástico, podendo ocorrer comprometimento da estrutura de forma parcial ou completa, ocasionando até mesmo a queda de toda a estrutura devido ao aumento da carga ocasionado pelo acúmulo de água. As calhas e condutores devem ser limpos, retirando folhas, galhos, areia, terra, insetos, ninhos de aves, etc. constantemente a fim de desobstruir o fluxo das águas, facilitando o escoamento da água quando ocorrerem as precipitações.",
      tipo: "texto",
      ordem: 6,
      ativo: true
    }
  ]
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('configuracoes')
          .select('*')
          .limit(1)
          .single()

        if (!error && data) {
          const loadedSettings = {
            nome_empresa: data.nome_empresa || defaultSettings.nome_empresa,
            cor_primaria: data.cor_primaria || defaultSettings.cor_primaria,
            logo_url: data.logo_url,
            estilo_pdf: data.estilo_pdf || defaultSettings.estilo_pdf,
            proposta_topicos: data.proposta_topicos || defaultSettings.proposta_topicos,
            instagram: data.instagram || defaultSettings.instagram,
            email: data.email || defaultSettings.email,
            endereco: data.endereco || defaultSettings.endereco,
            capa_pdf_url: data.capa_pdf_url,
            fundo_pdf_url: data.fundo_pdf_url,
            frase_final: data.frase_final || defaultSettings.frase_final,
            modelo_word_url: data.modelo_word_url
          }
          setSettings(loadedSettings)
          
          if (loadedSettings.cor_primaria) {
            document.documentElement.style.setProperty('--theme-primary', loadedSettings.cor_primaria)
          }
        } else {
          // If error or no data, inject default color to prevent black screen
          document.documentElement.style.setProperty('--theme-primary', defaultSettings.cor_primaria)
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
        document.documentElement.style.setProperty('--theme-primary', defaultSettings.cor_primaria)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const supabase = createClient()
      const updated = { ...settings, ...newSettings }
      
      // Atualizar estado local para feedback instantâneo
      setSettings(updated)
      
      // Atualizar CSS instantaneamente
      if (newSettings.cor_primaria) {
        document.documentElement.style.setProperty('--theme-primary', newSettings.cor_primaria)
      }

      // Salvar no banco
      await supabase
        .from('configuracoes')
        .update({
          nome_empresa: updated.nome_empresa,
          cor_primaria: updated.cor_primaria,
          logo_url: updated.logo_url,
          estilo_pdf: updated.estilo_pdf,
          proposta_topicos: updated.proposta_topicos,
          instagram: updated.instagram,
          email: updated.email,
          endereco: updated.endereco,
          capa_pdf_url: updated.capa_pdf_url,
          fundo_pdf_url: updated.fundo_pdf_url,
          frase_final: updated.frase_final,
          modelo_word_url: updated.modelo_word_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000000')

    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
