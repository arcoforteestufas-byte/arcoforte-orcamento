"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Image as ImageIcon, Search, X, Loader2 } from "lucide-react"

export function CroquiPicker({ orcamentoId, parametrosUtilizados }: { orcamentoId: string, parametrosUtilizados: any }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [croquis, setCroquis] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const croquiUrlAtual = parametrosUtilizados?.croqui_url || ""

  const abrirBiblioteca = async () => {
    setIsOpen(true)
    if (croquis.length === 0) {
      setIsLoading(true)
      const supabase = createClient()
      const { data } = await supabase.from('croquis').select('*').order('created_at', { ascending: false })
      if (data) setCroquis(data)
      setIsLoading(false)
    }
  }

  const selecionar = async (croqui: any | null) => {
    setIsSaving(true)
    const supabase = createClient()

    const novosParametros = {
      ...(parametrosUtilizados || {}),
      croqui_url: croqui?.imagem_url || '',
      croqui_id: croqui?.id || '',
    }

    const { error } = await supabase
      .from('orcamentos')
      .update({ parametros_utilizados: novosParametros })
      .eq('id', orcamentoId)

    setIsSaving(false)

    if (error) {
      alert('Erro ao salvar croqui: ' + error.message)
      return
    }

    setIsOpen(false)
    router.refresh()
  }

  const filtrados = croquis.filter(c => c.titulo.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="space-y-2">
      <Label>Croqui da Estufa</Label>
      {croquiUrlAtual ? (
        <div className="flex items-center gap-3 border rounded-md p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={croquiUrlAtual} alt="Croqui selecionado" className="h-16 w-24 object-cover rounded shrink-0" />
          <div className="flex-1 text-sm text-slate-600">Croqui anexado a este orçamento.</div>
          <Button variant="outline" size="sm" onClick={abrirBiblioteca} disabled={isSaving}>Trocar</Button>
          <Button variant="ghost" size="icon" onClick={() => selecionar(null)} disabled={isSaving} title="Remover croqui">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <Button variant="outline" className="w-full justify-start gap-2" onClick={abrirBiblioteca}>
          <ImageIcon className="h-4 w-4" />
          Selecionar Croqui da Biblioteca
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Biblioteca de Croquis</DialogTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Pesquisar croqui por título..."
                className="pl-9 bg-slate-50"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando croquis...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div
                  className={`group relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col cursor-pointer hover:ring-2 hover:ring-[#d97021] transition-all ${!croquiUrlAtual ? 'ring-2 ring-[#d97021]' : ''}`}
                  onClick={() => selecionar(null)}
                >
                  <div className="aspect-video w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    <span className="text-slate-400 text-sm">Sem Croqui</span>
                  </div>
                  <div className="p-4 bg-white border-t text-sm font-bold text-center text-slate-800">Nenhum</div>
                </div>

                {filtrados.map(c => (
                  <div
                    key={c.id}
                    className={`group relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col cursor-pointer hover:ring-2 hover:ring-[#d97021] transition-all ${croquiUrlAtual === c.imagem_url ? 'ring-2 ring-[#d97021]' : ''}`}
                    onClick={() => selecionar(c)}
                  >
                    <div className="aspect-video w-full bg-slate-50 relative overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.imagem_url} alt={c.titulo} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <div className="p-4 bg-white border-t text-sm font-bold truncate text-slate-800" title={c.titulo}>
                      {c.titulo}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
