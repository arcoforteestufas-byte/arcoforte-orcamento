"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Settings = {
  nome_empresa: string
  cor_primaria: string
  logo_url: string | null
  estilo_pdf: string
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
  estilo_pdf: 'padrao'
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
            estilo_pdf: data.estilo_pdf || defaultSettings.estilo_pdf
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
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')

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
