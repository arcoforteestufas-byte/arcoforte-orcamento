'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { saveCliente, updateCliente } from "@/app/actions/clientes"
import { ClienteFormFields, ClienteFormData, CLIENTE_FORM_DATA_VAZIO, inferirTipoDocumento } from "@/components/clientes/cliente-form-fields"

export function ClientesClient({ initialClientes }: { initialClientes: any[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null)

  const [formData, setFormData] = useState<ClienteFormData & { observacoes: string }>({
    ...CLIENTE_FORM_DATA_VAZIO,
    observacoes: ''
  })

  const filteredClientes = initialClientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.cidade_uf && c.cidade_uf.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleOpenNew = () => {
    setEditingClienteId(null)
    setFormData({ ...CLIENTE_FORM_DATA_VAZIO, observacoes: '' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (cliente: any) => {
    setEditingClienteId(cliente.id)
    setFormData({
      nome: cliente.nome || '',
      tipo_documento: cliente.tipo_documento || inferirTipoDocumento(cliente.documento),
      documento: cliente.documento || '',
      cidade_uf: cliente.cidade_uf || '',
      telefone: cliente.telefone || '',
      endereco: cliente.endereco || '',
      email: cliente.email || '',
      contato: cliente.contato || '',
      contato_telefone: cliente.contato_telefone || '',
      nome_fantasia: cliente.nome_fantasia || '',
      observacoes: cliente.observacoes || ''
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.tipo_documento) {
      toast.error('Selecione se o cliente é CNPJ ou CPF')
      return
    }
    if (!formData.nome.trim()) {
      toast.error('O nome é obrigatório')
      return
    }

    try {
      const dataToSave = {
        nome: formData.nome,
        tipo_documento: formData.tipo_documento || null,
        documento: formData.documento || null,
        cidade_uf: formData.cidade_uf || null,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        email: formData.email || null,
        contato: formData.contato || null,
        contato_telefone: formData.contato_telefone || null,
        nome_fantasia: formData.nome_fantasia || null,
        observacoes: formData.observacoes || null
      }

      if (editingClienteId) {
        const result = await updateCliente(editingClienteId, dataToSave)
        if (result.error) throw new Error(result.error)
        toast.success('Cliente atualizado com sucesso!')
      } else {
        const result = await saveCliente(dataToSave)
        if (result.error) throw new Error(result.error)
        toast.success('Cliente cadastrado com sucesso!')
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">
            Gerencie o cadastro de clientes e o histórico de orçamentos.
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white">
          <PlusCircle className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Clientes</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome ou cidade..."
                className="pl-8 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            Mostrando todos os clientes cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.nome}
                      {!cliente.telefone && !cliente.endereco && (
                        <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200 bg-orange-50">
                          Incompleto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{cliente.documento || '-'}</TableCell>
                    <TableCell>{cliente.cidade_uf || '-'}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Editar Cliente" onClick={() => handleOpenEdit(cliente)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClienteId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <DialogDescription>
              {editingClienteId ? 'Atualize os dados do cliente.' : 'Cadastre um novo cliente no sistema.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <ClienteFormFields formData={formData} setFormData={(data) => setFormData({ ...data, observacoes: formData.observacoes })} />
            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Informações adicionais sobre o cliente..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#d97021] hover:bg-[#c3631b] text-white">
              Salvar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
