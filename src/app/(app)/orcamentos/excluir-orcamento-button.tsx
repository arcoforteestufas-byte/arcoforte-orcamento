"use client"

import { useState, useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { excluirOrcamento } from "@/app/actions/orcamentos"

export function ExcluirOrcamentoButton({ id, label }: { id: string, label?: string }) {
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const handleDelete = () => {
    const confirmMsg = `Tem certeza que deseja excluir permanentemente o orçamento ${label || ''}? Essa ação não pode ser desfeita.`
    if (!window.confirm(confirmMsg)) return

    setErro(null)
    startTransition(async () => {
      const res = await excluirOrcamento(id)
      if (!res.success) {
        setErro(res.error || "Erro ao excluir orçamento.")
        alert(res.error || "Erro ao excluir orçamento.")
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Excluir Orçamento"
      onClick={handleDelete}
      disabled={isPending}
      className="text-slate-500 hover:text-red-600 hover:bg-red-50"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  )
}
