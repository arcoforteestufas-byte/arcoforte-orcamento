"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"

export function CulturaSelect({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [culturas, setCulturas] = useState<{ id: string, nome: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('culturas').select('*').order('nome')
      if (data) setCulturas(data)
      setIsLoading(false)
    }
    carregar()
  }, [])

  const abrirCadastro = () => {
    setNovoNome("")
    setIsDialogOpen(true)
  }

  const handleCadastrar = async () => {
    const nome = novoNome.trim()
    if (!nome) return

    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('culturas')
      .upsert({ nome }, { onConflict: 'nome' })
      .select()
      .single()
    setIsSaving(false)

    if (error) {
      alert('Erro ao cadastrar cultura: ' + error.message)
      return
    }

    setCulturas(prev => {
      if (prev.some(c => c.nome === nome)) return prev
      return [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
    })
    onChange(nome)
    setIsDialogOpen(false)
  }

  // Se o valor atual (ex: digitado antes dessa mudança) ainda não está na lista, mostra ele também
  const opcoes = value && !culturas.some(c => c.nome === value)
    ? [{ id: '__atual__', nome: value }, ...culturas]
    : culturas

  return (
    <>
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={(v) => onChange(v || '')}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione..."} />
          </SelectTrigger>
          <SelectContent>
            {opcoes.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma cultura cadastrada ainda.</div>
            ) : (
              opcoes.map(c => (
                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={abrirCadastro}
          title="Cadastrar nova cultura"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastrar Cultura</DialogTitle>
            <DialogDescription>
              Depois de cadastrada, essa cultura fica disponível pra selecionar em qualquer orçamento.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Ex: Morango"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCadastrar() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#d97021] hover:bg-[#c3631b] text-white"
              onClick={handleCadastrar}
              disabled={isSaving || !novoNome.trim()}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? "Salvando..." : "Cadastrar e Usar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
