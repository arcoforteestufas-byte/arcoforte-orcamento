"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileSpreadsheet } from "lucide-react"
import { importarProdutosXLSX } from "@/app/actions/importar-produtos"

export function XlsxUploader() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await importarProdutosXLSX(formData)
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
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" />
        }
      >
        <FileSpreadsheet className="h-4 w-4" />
        Sincronizar com Sensio (XLSX)
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Tabela de Preços (Sensio)</DialogTitle>
          <DialogDescription>
            Faça upload do arquivo .xlsx exportado diretamente do seu sistema ERP (Sensio). O sistema criará novos produtos e atualizará os preços dos existentes automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <Input type="file" name="file" accept=".xlsx" required className="cursor-pointer" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">
              {isLoading ? "Sincronizando..." : "Iniciar Sincronização"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
