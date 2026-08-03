"use client"

import { useState, useRef } from "react"
import { useSettings } from "@/contexts/SettingsContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Paintbrush, Image as ImageIcon, Settings2, FileText, CheckCircle2, Users } from "lucide-react"
import { UsersManager } from "@/components/users-manager"

export default function ConfiguracoesPage() {
  const { settings, updateSettings } = useSettings()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Estados locais para o formulário
  const [nome, setNome] = useState(settings.nome_empresa)
  const [logo, setLogo] = useState(settings.logo_url || "")
  const [cor, setCor] = useState(settings.cor_primaria)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await updateSettings({
      nome_empresa: nome,
      logo_url: logo === "" ? null : logo,
      cor_primaria: cor
    })
    setIsSaving(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  // Predefinições de Cores Premium
  const presetColors = [
    { name: "Laranja ArcoForte", value: "#d97021" },
    { name: "Azul Corporativo", value: "#0ea5e9" },
    { name: "Verde Agro", value: "#16a34a" },
    { name: "Roxo SaaS", value: "#8b5cf6" },
    { name: "Preto Minimalista", value: "#1e293b" },
    { name: "Vermelho Crimson", value: "#e11d48" }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Configurações do Sistema</h1>
        <p className="text-muted-foreground mt-2">Personalize a identidade visual, usuários e parâmetros globais do aplicativo.</p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-[500px]">
          <TabsTrigger value="geral" className="flex items-center gap-2"><Settings2 size={16}/> Geral</TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2"><Users size={16}/> Usuários</TabsTrigger>
          <TabsTrigger value="designer" className="flex items-center gap-2"><Paintbrush size={16}/> Designer</TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center gap-2"><FileText size={16}/> PDF</TabsTrigger>
        </TabsList>
        
        {/* ABA GERAL */}
        <TabsContent value="geral" className="mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Identidade da Empresa</CardTitle>
              <CardDescription>
                O nome e logotipo serão exibidos na barra lateral e em documentos oficiais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-md">
                <Label htmlFor="nome">Nome da Empresa</Label>
                <Input 
                  id="nome" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Ex: ArcoForte Estufas"
                />
              </div>

              <div className="space-y-3 max-w-md">
                <Label htmlFor="logo">Logo URL</Label>
                <div className="flex gap-4 items-start">
                  <Input 
                    id="logo" 
                    value={logo} 
                    onChange={(e) => setLogo(e.target.value)} 
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Cole o link (URL) ou clique no espaço abaixo para enviar uma imagem do seu computador.</p>
                
                {/* Preview Logo */}
                <div className="flex items-end gap-4 mt-4">
                  <div 
                    className="p-4 border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl flex items-center justify-center w-40 h-24 cursor-pointer relative group"
                    onClick={() => fileInputRef.current?.click()}
                    title="Clique para selecionar uma logo"
                  >
                    {logo ? (
                      <>
                        <img src={logo} alt="Preview" className="max-w-full max-h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-medium">Trocar Imagem</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-primary transition-colors">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs font-medium">Clique para Upload</span>
                      </div>
                    )}
                  </div>
                  
                  {logo && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 mb-1"
                      onClick={() => {
                        setLogo("")
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                    >
                      Remover Logo
                    </Button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA USUARIOS */}
        <TabsContent value="usuarios" className="mt-6">
          <UsersManager />
        </TabsContent>
        
        {/* ABA DESIGNER */}
        <TabsContent value="designer" className="mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Tema e Cores</CardTitle>
              <CardDescription>
                A cor escolhida será aplicada em todos os botões, cabeçalhos e destaques do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Cor Primária</Label>
                <div className="flex flex-wrap gap-4">
                  {presetColors.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setCor(p.value)}
                      className={`w-12 h-12 rounded-full shadow-sm transition-transform hover:scale-110 flex items-center justify-center ${cor === p.value ? 'ring-4 ring-offset-2 ring-primary' : 'ring-1 ring-slate-200'}`}
                      style={{ backgroundColor: p.value }}
                      title={p.name}
                    >
                      {cor === p.value && <CheckCircle2 className="text-white w-6 h-6" />}
                    </button>
                  ))}
                  <div className="flex items-center gap-2 border border-slate-200 p-1.5 rounded-full bg-slate-50">
                    <input 
                      type="color" 
                      value={cor} 
                      onChange={(e) => setCor(e.target.value)}
                      className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-500 pr-3 font-semibold uppercase">{cor}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA PDF */}
        <TabsContent value="pdf" className="mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Opções de Impressão</CardTitle>
              <CardDescription>
                Preferências para os orçamentos exportados em PDF. (Em desenvolvimento)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary font-medium text-sm flex items-center gap-3">
                <Settings2 className="w-5 h-5" />
                As opções de layout do PDF estão sendo integradas ao novo gerador. A cor primária definida na aba Designer já está sendo aplicada automaticamente nos seus PDFs!
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FOOTER FIXO PARA SALVAR */}
      <div className="fixed bottom-0 left-0 right-0 md:left-72 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-end gap-4 z-30 px-4 sm:px-8 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        {savedMsg && (
          <span className="text-green-600 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 size={18} /> Salvo com sucesso!
          </span>
        )}
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="px-8 shadow-md">
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
      <div className="h-20"></div> {/* Espaçador para o footer fixed */}
    </div>
  )
}
