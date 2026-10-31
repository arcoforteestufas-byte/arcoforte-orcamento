"use client"

import { useState } from "react"
import { useSettings } from "@/contexts/SettingsContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trash2, Plus, GripVertical, CheckCircle2, FileText, Image as ImageIcon, Edit, Loader2, FileType2, X } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRef } from "react"
import { DESCRICAO_VARIAVEIS_DOCX } from "@/utils/construir-variaveis-docx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function PropostaTopicsManager() {
  const { settings, updateSettings } = useSettings()
  const [topicos, setTopicos] = useState<any[]>(settings.proposta_topicos || [])
  const [instagram, setInstagram] = useState(settings.instagram || "")
  const [email, setEmail] = useState(settings.email || "")
  const [endereco, setEndereco] = useState(settings.endereco || "")
  const [fraseFinal, setFraseFinal] = useState(settings.frase_final || "")
  
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const capaInputRef = useRef<HTMLInputElement>(null)
  const fundoInputRef = useRef<HTMLInputElement>(null)
  
  const [isUploadingCapa, setIsUploadingCapa] = useState(false)
  const [isUploadingFundo, setIsUploadingFundo] = useState(false)
  
  const [capaUrl, setCapaUrl] = useState(settings.capa_pdf_url || "")
  const [fundoUrl, setFundoUrl] = useState(settings.fundo_pdf_url || "")

  const modeloWordInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingModeloWord, setIsUploadingModeloWord] = useState(false)
  const [modeloWordUrl, setModeloWordUrl] = useState(settings.modelo_word_url || "")
  const [mostrarVariaveis, setMostrarVariaveis] = useState(false)

  const handleUploadModeloWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingModeloWord(true)
      const supabase = createClient()
      const filename = `modelo_proposta_${Date.now()}.docx`

      const { error: uploadError } = await supabase.storage.from('assets').upload(filename, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('assets').getPublicUrl(filename)
      if (data?.publicUrl) {
        setModeloWordUrl(data.publicUrl)
        await updateSettings({ modelo_word_url: data.publicUrl })
      }
    } catch (err: any) {
      console.error('Erro ao fazer upload do modelo Word:', err)
      alert('Erro ao fazer upload do arquivo: ' + (err?.message || 'erro desconhecido'))
    } finally {
      setIsUploadingModeloWord(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoverModeloWord = async () => {
    setModeloWordUrl("")
    await updateSettings({ modelo_word_url: null })
  }

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'capa' | 'fundo'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isCapa = type === 'capa'
    const setUploading = isCapa ? setIsUploadingCapa : setIsUploadingFundo
    const setUrl = isCapa ? setCapaUrl : setFundoUrl

    try {
      setUploading(true)
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const filename = `${type}_${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filename, file)
        
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('assets').getPublicUrl(filename)
      if (data?.publicUrl) {
        setUrl(data.publicUrl)
        // Auto-save the specific setting
        await updateSettings(isCapa ? { capa_pdf_url: data.publicUrl } : { fundo_pdf_url: data.publicUrl })
      }
    } catch (err) {
      console.error(`Erro ao fazer upload de ${type}:`, err)
      alert(`Erro ao fazer upload do arquivo. Tente novamente.`)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleUpdateTopico = (index: number, field: string, value: any) => {
    const novos = [...topicos]
    novos[index] = { ...novos[index], [field]: value }
    setTopicos(novos)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const novos = [...topicos]
    const temp = novos[index - 1]
    novos[index - 1] = novos[index]
    novos[index] = temp
    setTopicos(novos)
  }

  const handleMoveDown = (index: number) => {
    if (index === topicos.length - 1) return
    const novos = [...topicos]
    const temp = novos[index + 1]
    novos[index + 1] = novos[index]
    novos[index] = temp
    setTopicos(novos)
  }

  const handleRemove = (index: number) => {
    if (confirm("Tem certeza que deseja remover este tópico?")) {
      const novos = topicos.filter((_, i) => i !== index)
      setTopicos(novos)
    }
  }

  const handleAdd = () => {
    setTopicos([
      ...topicos,
      {
        id: `novo_${Date.now()}`,
        titulo: "Novo Tópico",
        texto: "Texto do seu tópico...",
        tipo: "texto",
        ativo: true
      }
    ])
  }

  const handleSave = async () => {
    setIsSaving(true)
    const ordenados = topicos.map((t, i) => ({ ...t, ordem: i + 1 }))
    await updateSettings({ 
      proposta_topicos: ordenados,
      instagram,
      email,
      endereco,
      frase_final: fraseFinal,
      capa_pdf_url: capaUrl,
      fundo_pdf_url: fundoUrl,
      modelo_word_url: modeloWordUrl || null
    })
    setTopicos(ordenados)
    setIsSaving(false)
    
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  // OLD UI Component for editing text
  const TextEditorDialog = () => (
    <DialogContent className="sm:max-w-4xl md:max-w-5xl w-full max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editor de Textos da Proposta</DialogTitle>
        <DialogDescription>
          Configure os textos e a ordem dos tópicos que aparecerão na Proposta Comercial gerada em PDF.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 mt-4">
        {topicos.map((topico, idx) => (
          <div key={topico.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative group">
            <div className="absolute right-4 top-4 flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>
                <GripVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleMoveDown(idx)} disabled={idx === topicos.length - 1}>
                <GripVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Título do Tópico</label>
                  <Input 
                    value={topico.titulo} 
                    onChange={(e) => handleUpdateTopico(idx, 'titulo', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Conteúdo (Suporta formatação Markdown)</label>
                <Textarea 
                  value={topico.texto} 
                  onChange={(e) => handleUpdateTopico(idx, 'texto', e.target.value)}
                  rows={10}
                  className="font-mono text-sm leading-relaxed"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={handleAdd} className="gap-2 border-dashed">
            <Plus className="h-4 w-4" />
            Adicionar Novo Tópico
          </Button>
        </div>
      </div>
    </DialogContent>
  )

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* LEFT SIDEBAR - ESCOPO GLOBAL & MODELOS */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-6">
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-center text-primary border-primary/30 hover:bg-primary/5 hover:text-primary">
            + Novo Modelo
          </Button>
          <Button className="w-full justify-between px-4 bg-[#d97021] hover:bg-[#c26019] text-white">
            <span>Estufa Padrão</span>
            <Edit className="w-4 h-4 opacity-70 hover:opacity-100" />
          </Button>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Escopo Global</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Instagram</label>
              <Input 
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                className="h-9 text-sm"
                placeholder="@seuinstagram"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">E-mail</label>
              <Input 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-9 text-sm"
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Endereço</label>
              <Textarea 
                value={endereco}
                onChange={e => setEndereco(e.target.value)}
                className="text-sm resize-none"
                rows={3}
                placeholder="Av. Principal, 1000..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT - MODELO PDF */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
        
        {/* IDENTIDADE VISUAL */}
        <div className="mb-10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Identidade Visual (PDF)</h3>
          <div className="flex flex-wrap gap-6">
            
            {/* CAPA */}
            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <input 
                type="file" 
                ref={capaInputRef} 
                className="hidden" 
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => handleFileUpload(e, 'capa')}
              />
              <div 
                onClick={() => capaInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors relative overflow-hidden ${
                  capaUrl 
                    ? 'border-green-400 bg-green-50 hover:bg-green-100' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {isUploadingCapa ? (
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                ) : capaUrl ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <span className="text-xs font-medium text-green-700">CAPA SALVA</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-8 h-8 text-red-400" />
                    <span className="text-xs font-medium text-slate-600">CAPA EM PDF</span>
                  </>
                )}
              </div>
            </div>

            {/* FUNDO */}
            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <input 
                type="file" 
                ref={fundoInputRef} 
                className="hidden" 
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => handleFileUpload(e, 'fundo')}
              />
              <div 
                onClick={() => fundoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors relative overflow-hidden ${
                  fundoUrl 
                    ? 'border-green-400 bg-green-50 hover:bg-green-100' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {isUploadingFundo ? (
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                ) : fundoUrl ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <span className="text-xs font-medium text-green-700 text-center px-2">FUNDO SALVO</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 text-center px-2">PDF OU IMAGEM</span>
                    <span className="text-[10px] text-slate-400 -mt-1">Fundo das páginas</span>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* MODELO WORD (.DOCX) */}
        <div className="mb-10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo Word (.docx)</h3>
          <p className="text-sm text-slate-500 mb-4">
            Suba um arquivo Word com "tags" (marcadores) nos lugares onde os dados devem entrar, tipo <code className="bg-slate-100 px-1 rounded">{'{cliente_nome}'}</code>.
            Quando esse modelo estiver configurado, toda proposta gerada preenche esse Word automaticamente e disponibiliza pra download.
          </p>

          <input
            type="file"
            ref={modeloWordInputRef}
            className="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleUploadModeloWord}
          />

          <div className="flex flex-wrap items-center gap-4">
            <div
              onClick={() => modeloWordInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl h-24 w-full max-w-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                modeloWordUrl
                  ? 'border-green-400 bg-green-50 hover:bg-green-100'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {isUploadingModeloWord ? (
                <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
              ) : modeloWordUrl ? (
                <>
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                  <span className="text-xs font-medium text-green-700">MODELO CONFIGURADO</span>
                </>
              ) : (
                <>
                  <FileType2 className="w-7 h-7 text-blue-400" />
                  <span className="text-xs font-medium text-slate-600">ENVIAR ARQUIVO .DOCX</span>
                </>
              )}
            </div>

            {modeloWordUrl && (
              <div className="flex flex-col gap-2">
                <a href={modeloWordUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Ver modelo atual
                </a>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 w-fit" onClick={handleRemoverModeloWord}>
                  <X className="w-3.5 h-3.5" /> Remover modelo (volta a gerar só o PDF padrão)
                </Button>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-4 text-primary hover:text-primary hover:bg-primary/10 gap-1 text-xs px-2"
            onClick={() => setMostrarVariaveis(v => !v)}
          >
            {mostrarVariaveis ? "Esconder" : "Ver"} variáveis disponíveis pro Word
          </Button>

          {mostrarVariaveis && (
            <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs text-slate-500">
                Para a lista de materiais (tabela de itens), use um loop no Word: <code className="bg-white px-1 rounded border">{'{#itens}'}</code> ... <code className="bg-white px-1 rounded border">{'{codigo}'} {'{descricao}'} {'{quantidade}'} {'{unitario}'} {'{total}'}</code> ... <code className="bg-white px-1 rounded border">{'{/itens}'}</code> dentro de uma linha de tabela.
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {DESCRICAO_VARIAVEIS_DOCX.map(v => (
                  <div key={v.tag} className="flex items-center gap-3 px-4 py-1.5 text-sm">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700 shrink-0">{`{${v.tag}}`}</code>
                    <span className="text-slate-500 text-xs">{v.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* VISIBILIDADE DAS SEÇÕES */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visibilidade das Seções por Padrão</h3>
            <Dialog>
              <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1 text-xs px-2" />}>
                <Edit className="w-3 h-3" />
                Editar Textos
              </DialogTrigger>
              <TextEditorDialog />
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topicos.map((topico, idx) => (
              <label key={topico.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="checkbox"
                  checked={topico.ativo !== false}
                  onChange={(e) => handleUpdateTopico(idx, 'ativo', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary accent-[#d97021]"
                />
                <span className="text-sm font-medium text-slate-700 truncate">{topico.titulo}</span>
              </label>
            ))}
          </div>
        </div>

        {/* FRASE FINAL */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Frase Final de Destaque</h3>
          <Input 
            value={fraseFinal}
            onChange={e => setFraseFinal(e.target.value)}
            className="text-center font-medium bg-slate-50 border-slate-200"
            placeholder="DEUS É FIEL"
          />
        </div>

        {/* SALVAR */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4">
          {savedMsg && (
            <span className="text-green-600 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-right-4 text-sm">
              <CheckCircle2 size={16} /> Salvo com sucesso!
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-8 shadow-md">
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

      </div>
    </div>
  )
}
