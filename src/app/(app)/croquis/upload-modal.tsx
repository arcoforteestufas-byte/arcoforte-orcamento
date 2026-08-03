"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Upload, X } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export function UploadModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag])
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSave = async () => {
    if (!titulo || !file) {
      toast.warning("Título e Imagem são obrigatórios.")
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    
    try {
      // 1. Upload the file to 'croquis' bucket
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `uploads/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('croquis')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('croquis')
        .getPublicUrl(filePath)

      // 2. Insert into database
      const { error: dbError } = await supabase
        .from('croquis')
        .insert({
          titulo,
          descricao: descricao || null,
          imagem_url: publicUrl,
          tags
        })

      if (dbError) throw dbError

      toast.success("Croqui adicionado com sucesso!")
      setIsOpen(false)
      resetForm()
      router.refresh()
    } catch (e: any) {
      console.error(e)
      toast.error("Erro ao salvar croqui: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitulo("")
    setDescricao("")
    setTags([])
    setTagInput("")
    setFile(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger 
        render={<Button className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white" />}
      >
        <PlusCircle className="h-4 w-4" />
        Novo Croqui
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Croqui</DialogTitle>
          <DialogDescription>
            Envie o desenho e classifique-o para facilitar a busca pela equipe.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input 
              id="titulo" 
              value={titulo} 
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Teto Curvo 8x50 Treliçada" 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imagem">Imagem (PNG/JPG) *</Label>
            <div className="flex items-center gap-2">
              <Input 
                id="imagem" 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição Opcional</Label>
            <Textarea 
              id="descricao" 
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes técnicos sobre este croqui..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags / Categorias (pressione Enter)</Label>
            <Input 
              id="tags" 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Ex: capela, 8m, trelicada" 
            />
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                  {tag}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 rounded-full p-0 text-muted-foreground hover:bg-slate-200"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-[#d97021] hover:bg-[#c3631b] text-white gap-2">
            {isLoading ? "Salvando..." : (
              <>
                <Upload className="h-4 w-4" />
                Salvar Croqui
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
