"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Image as ImageIcon, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FaWhatsapp } from "react-icons/fa"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function CroquisGallery({ croquis, isAdministrador }: { croquis: any[], isAdministrador: boolean }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()

  const filteredCroquis = croquis.filter(croqui => {
    const terms = searchTerm.toLowerCase().trim().split(/\s+/)
    if (terms.length === 0 || terms[0] === "") return true

    // Para cada termo digitado, ele precisa existir no titulo OU em alguma tag
    return terms.every(term => {
      const matchTitle = croqui.titulo.toLowerCase().includes(term)
      const matchTag = croqui.tags?.some((t: string) => t.toLowerCase().includes(term))
      return matchTitle || matchTag
    })
  })

  const handleDelete = async (croqui: any) => {
    if (!window.confirm(`Tem certeza que deseja excluir o croqui "${croqui.titulo}"?`)) {
      return
    }

    setIsDeleting(croqui.id)
    const supabase = createClient()
    
    try {
      // 1. Excluir o arquivo no Storage (se for um URL do supabase, tentamos pegar o nome do arquivo)
      if (croqui.imagem_url && croqui.imagem_url.includes('/storage/v1/object/public/croquis/')) {
        const filePath = croqui.imagem_url.split('/storage/v1/object/public/croquis/')[1]
        if (filePath) {
          await supabase.storage.from('croquis').remove([filePath])
        }
      }

      // 2. Excluir do banco
      const { error } = await supabase.from('croquis').delete().eq('id', croqui.id)
      if (error) throw error
      
      toast.success("Croqui excluído com sucesso!")
      router.refresh()
    } catch (e: any) {
      console.error(e)
      toast.error("Erro ao excluir: " + e.message)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleShare = async (croqui: any) => {
    try {
      const response = await fetch(croqui.imagem_url)
      const blob = await response.blob()
      const file = new File([blob], `${croqui.titulo}.jpg`, { type: blob.type || 'image/jpeg' })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: croqui.titulo,
          text: `Confira este croqui: ${croqui.titulo}`,
          files: [file]
        })
      } else {
        // Fallback: faz o download automático da imagem
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${croqui.titulo}.jpg`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        
        // Abre o WhatsApp Web com o texto para ele anexar a foto baixada
        const text = `*Confira este croqui:* ${croqui.titulo}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error)
      const text = `*Confira este croqui:* ${croqui.titulo}\n${croqui.imagem_url}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  return (
    <Card>
      <div className="p-4 border-b">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título ou tag..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <CardContent className="p-6">
        {croquis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
            <p>Nenhum croqui encontrado na biblioteca.</p>
            {isAdministrador && <p className="text-sm mt-1">Clique em "Novo Croqui" para adicionar o primeiro.</p>}
          </div>
        ) : filteredCroquis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Search className="h-8 w-8 mb-4 opacity-20" />
            <p>Nenhum croqui encontrado para "{searchTerm}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCroquis.map((croqui) => (
              <div key={croqui.id} className="group relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
                <div className="aspect-video w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {croqui.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={croqui.imagem_url} 
                      alt={croqui.titulo} 
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                  {isAdministrador && (
                    <Button 
                      variant="destructive" 
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(croqui)}
                      disabled={isDeleting === croqui.id}
                      title="Excluir Croqui"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-lg line-clamp-1">{croqui.titulo}</h3>
                  {croqui.descricao && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex-1">
                      {croqui.descricao}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-3 flex-1">
                    {(croqui.tags || []).map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-2">
                    <Button 
                      className="w-full gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white"
                      onClick={() => {
                        let url = `/orcamentos/novo?croqui_id=${croqui.id}&croqui_url=${encodeURIComponent(croqui.imagem_url)}`
                        
                        // Extrair L (Largura), C (Comprimento) e A (Altura/Pé Direito) do título
                        const matchL = croqui.titulo.match(/(\d+(?:[.,]\d+)?)\s*[lL]/i)
                        const matchC = croqui.titulo.match(/(\d+(?:[.,]\d+)?)\s*[cC]/i)
                        const matchA = croqui.titulo.match(/(\d+(?:[.,]\d+)?)\s*[aA]/i)

                        if (matchL) url += `&l=${matchL[1].replace(',', '.')}`
                        if (matchC) url += `&c=${matchC[1].replace(',', '.')}`
                        if (matchA) url += `&a=${matchA[1].replace(',', '.')}`

                        window.location.href = url
                      }}
                    >
                      Criar Orçamento
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-[#25D366] hover:text-[#128C7E] hover:bg-[#25D366]/10 gap-2"
                      onClick={() => handleShare(croqui)}
                    >
                      <FaWhatsapp className="h-4 w-4" />
                      Compartilhar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
