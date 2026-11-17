"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileSpreadsheet } from "lucide-react"
import { importarProdutosXLSX } from "@/app/actions/importar-produtos"

export function XlsxUploader() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await importarProdutosXLSX(formData)
      if (result.success) {
        alert(result.message)
        setIsOpen(false)
        router.refresh()
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
        Importar planilha (preços / pesos)
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar produtos, preços e pesos</DialogTitle>
          <DialogDescription>
            Envie o arquivo .xlsx exportado do Sensio ou do sistema de nota fiscal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p><b className="text-foreground">Tabela de preços (Sensio):</b> cria produtos novos e atualiza os preços. Se tiver coluna de peso, grava o peso junto.</p>
          <p><b className="text-foreground">Planilha só de pesos:</b> basta ter a coluna <b>Código</b> e <b>Peso Bruto</b> (e, se quiser, <b>Peso Líquido</b>), em kg por unidade. Atualiza só o peso dos produtos que já existem — preço e descrição não mudam.</p>
          <p>Célula de peso vazia não apaga o peso já cadastrado. O peso é usado para calcular o peso total do orçamento e o frete.</p>
        </div>
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
