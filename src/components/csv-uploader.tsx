"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileUp } from "lucide-react"
import { importarRegrasCSV } from "@/app/actions/importar-csv"

export function CsvUploader() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await importarRegrasCSV(formData)
      if (result.success) {
        alert(result.message)
        setIsOpen(false)
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <Button variant="outline" className="gap-2 border-[#d97021] text-[#d97021] hover:bg-[#fff3eb]" />
        }
      >
        <FileUp className="h-4 w-4" />
        Importar CSV
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Regras via CSV</DialogTitle>
          <DialogDescription>
            Faça upload do arquivo .csv contendo as regras de montagem. As colunas esperadas são: Grupo, Posicao, Codigo, Produto, Formula_Qtd, Condicao, Observacao.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <Input type="file" name="file" accept=".csv" required className="cursor-pointer" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-[#d97021] hover:bg-[#c3631b] text-white">
              {isLoading ? "Processando..." : "Importar Agora"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
