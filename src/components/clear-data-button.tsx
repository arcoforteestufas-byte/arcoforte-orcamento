"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { clearRegrasEParametros } from "@/app/actions/clear-data"

export function ClearDataButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleClear = async () => {
    if (!confirm("Tem certeza que deseja apagar TODAS as regras de montagem e parâmetros do sistema? Isso não pode ser desfeito!")) return;

    setIsLoading(true)

    try {
      const result = await clearRegrasEParametros()
      if (result.success) {
        alert(result.message)
      } else {
        alert("Erro: " + result.error)
      }
    } catch (err: any) {
      alert("Erro fatal: " + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleClear}
      disabled={isLoading}
      className="gap-2"
    >
      <Trash2 className="h-4 w-4" />
      {isLoading ? "Apagando..." : "Apagar Tudo"}
    </Button>
  )
}
