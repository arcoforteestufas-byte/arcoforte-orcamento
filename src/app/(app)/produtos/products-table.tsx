"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search } from "lucide-react"
import { EditableWeightCell } from "./editable-weight-cell"
import { excluirProdutos } from "@/app/actions/produtos"

interface Produto {
  id: string
  codigo: string
  descricao: string
  unidade: string
  peso_bruto_kg: number
  peso_liquido_kg: number
  preco_unitario: number
}

interface ProductsTableProps {
  produtos: Produto[]
}

export function ProductsTable({ produtos }: ProductsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProdutos = produtos.filter(p => {
    const term = searchTerm.toLowerCase()
    return p.codigo.toLowerCase().includes(term) || p.descricao.toLowerCase().includes(term)
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newIds = new Set([...selectedIds, ...filteredProdutos.map(p => p.id)])
      setSelectedIds(Array.from(newIds))
    } else {
      const filteredIds = new Set(filteredProdutos.map(p => p.id))
      setSelectedIds(selectedIds.filter(id => !filteredIds.has(id)))
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} produto(s)? Essa ação não pode ser desfeita.`)) return

    setIsDeleting(true)
    try {
      const res = await excluirProdutos(selectedIds)
      if (res.success) {
        setSelectedIds([])
      } else {
        alert("Erro ao excluir: " + res.error)
      }
    } catch (err: any) {
      alert("Erro fatal: " + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const allSelected = filteredProdutos.length > 0 && filteredProdutos.every(p => selectedIds.includes(p.id))

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por código ou descrição..."
            className="pl-8 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="p-2 px-4 bg-orange-50 border border-orange-200 rounded-md flex items-center gap-4 w-full sm:w-auto justify-between">
            <span className="text-orange-800 font-medium text-sm">{selectedIds.length} selecionado(s)</span>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2 h-8"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos os produtos"
                />
              </TableHead>
              <TableHead>Código (SKU)</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Peso Bruto (kg)</TableHead>
              <TableHead className="text-right">Peso Líq. (kg)</TableHead>
              <TableHead className="text-right">Preço Unitário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredProdutos || filteredProdutos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {produtos.length === 0 
                    ? "Nenhum produto cadastrado ainda. Sincronize com o Sensio!" 
                    : "Nenhum produto encontrado para a sua busca."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProdutos.map(produto => (
                <TableRow key={produto.codigo} className={selectedIds.includes(produto.id) ? "bg-orange-50/50" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(produto.id)}
                      onCheckedChange={(c) => handleSelectOne(produto.id, !!c)}
                      aria-label={`Selecionar produto ${produto.codigo}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Badge variant="outline" className="font-mono">{produto.codigo}</Badge>
                  </TableCell>
                  <TableCell>{produto.descricao}</TableCell>
                  <TableCell>{produto.unidade}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EditableWeightCell produtoId={produto.id} campo="peso_bruto_kg" valorInicial={produto.peso_bruto_kg} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EditableWeightCell produtoId={produto.id} campo="peso_liquido_kg" valorInicial={produto.peso_liquido_kg} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco_unitario || 0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
