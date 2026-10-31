"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { UserCog } from "lucide-react"
import { updateCliente } from "@/app/actions/clientes"
import { ClienteFormFields, ClienteFormData, inferirTipoDocumento } from "@/components/clientes/cliente-form-fields"

export function CompletarClienteDialog({ clienteId, cliente }: { clienteId: string, cliente: any }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<ClienteFormData>({
    nome: cliente?.nome || "",
    tipo_documento: cliente?.tipo_documento || inferirTipoDocumento(cliente?.documento),
    documento: cliente?.documento || "",
    telefone: cliente?.telefone || "",
    email: cliente?.email || "",
    cidade_uf: cliente?.cidade_uf || "",
    endereco: cliente?.endereco || "",
    contato: cliente?.contato || "",
    contato_telefone: cliente?.contato_telefone || "",
    nome_fantasia: cliente?.nome_fantasia || "",
  })

  const handleSave = async () => {
    if (!formData.tipo_documento) {
      alert("Selecione se o cliente é CNPJ ou CPF.")
      return
    }
    if (!formData.nome.trim()) {
      alert("Informe o nome do cliente.")
      return
    }

    setIsSaving(true)
    try {
      const result = await updateCliente(clienteId, formData)
      if (result.error) throw new Error(result.error)
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      alert("Erro ao salvar cliente: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <UserCog className="h-4 w-4" />
        Completar Cadastro
      </Button>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar Cadastro do Cliente</DialogTitle>
          <DialogDescription>
            Esses dados são usados na proposta comercial gerada a partir deste orçamento.
          </DialogDescription>
        </DialogHeader>
        <ClienteFormFields formData={formData} setFormData={setFormData} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button className="bg-[#d97021] hover:bg-[#c3631b] text-white" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
