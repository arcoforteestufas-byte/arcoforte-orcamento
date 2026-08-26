"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(produtos.map(p => p.id))
    } else {
      setSelectedIds([])
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

  const allSelected = produtos.length > 0 && selectedIds.length === produtos.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < produtos.length

  return (
    <div>
      {selectedIds.length > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md flex items-center justify-between">
          <span className="text-orange-800 font-medium">{selectedIds.length} produto(s) selecionado(s)</span>
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-2"
            onClick={handleDeleteSelected}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Excluindo..." : "Excluir Selecionados"}
          </Button>
        </div>
      )}

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
          {!produtos || produtos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                Nenhum produto cadastrado ainda. Sincronize com o Sensio!
              </TableCell>
            </TableRow>
          ) : (
            produtos.map(produto => (
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
  )
}
