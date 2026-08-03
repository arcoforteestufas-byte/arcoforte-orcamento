"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FaWhatsapp } from "react-icons/fa"

export function CroquisGallery({ croquis, isAdministrador }: { croquis: any[], isAdministrador: boolean }) {
  const [searchTerm, setSearchTerm] = useState("")

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

  const handleShare = (croqui: any) => {
    const text = `*Confira este croqui:* ${croqui.titulo}\n${croqui.imagem_url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
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
                      onClick={() => window.location.href = `/orcamentos/novo?croqui_id=${croqui.id}&croqui_url=${encodeURIComponent(croqui.imagem_url)}`}
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
