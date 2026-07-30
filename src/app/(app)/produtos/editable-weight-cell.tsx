"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"

export function EditableWeightCell({ 
  produtoId, 
  campo, 
  valorInicial 
}: { 
  produtoId: string, 
  campo: 'peso_bruto_kg' | 'peso_liquido_kg', 
  valorInicial: number | null 
}) {
  const [valor, setValor] = useState(valorInicial !== null ? String(valorInicial) : "")
  const [isSaving, setIsSaving] = useState(false)
  
  const handleBlur = async () => {
    const numValue = valor === "" ? null : Number(valor)
    
    // Evitar salvar se não mudou
    if (numValue === valorInicial) return

    setIsSaving(true)
    const supabase = createClient()
    
    await supabase
      .from('produtos')
      .update({ [campo]: numValue })
      .eq('id', produtoId)
      
    setIsSaving(false)
  }

  return (
    <Input 
      type="number" 
      step="0.001"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={handleBlur}
      disabled={isSaving}
      placeholder="-"
      className="w-24 text-right h-8"
    />
  )
}
