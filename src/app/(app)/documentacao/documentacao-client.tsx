"use client"

import { useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  BookOpen, 
  Edit3, 
  Eye, 
  Copy, 
  Check, 
  Download, 
  Save, 
  Loader2, 
  Search, 
  Sparkles, 
  Bot, 
  FileText, 
  ListTree, 
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Users,
  Cpu,
  Code2,
  Terminal,
  ExternalLink,
  Info
} from "lucide-react"
import { salvarManualOficial, DadosItemManual } from "@/app/actions/documentacao"

export interface DocumentacaoClientProps {
  manualHumano: DadosItemManual
  manualTecnico: DadosItemManual
  isAdministrador: boolean
  // Retrocompatibilidade opcional
  conteudoInicial?: string
  versaoInicial?: string
  atualizadoEm?: string
}

type TipoManual = "humano" | "tecnico"

export function DocumentacaoClient({
  manualHumano: manualHumanoProp,
  manualTecnico: manualTecnicoProp,
  isAdministrador,
  conteudoInicial,
  versaoInicial,
  atualizadoEm: atualizadoEmProp
}: DocumentacaoClientProps) {
  // Inicialização segura com fallback
  const humanoInicial: DadosItemManual = manualHumanoProp || {
    conteudo: conteudoInicial || "",
    versao: versaoInicial || "1.0",
    atualizadoEm: atualizadoEmProp || ""
  }

  const tecnicoInicial: DadosItemManual = manualTecnicoProp || {
    conteudo: conteudoInicial || "",
    versao: versaoInicial || "1.0",
    atualizadoEm: atualizadoEmProp || ""
  }

  // Estado do manual ativo
  const [manualAtivo, setManualAtivo] = useState<TipoManual>("humano")

  // Estados dos conteúdos
  const [conteudoHumano, setConteudoHumano] = useState(humanoInicial.conteudo)
  const [versaoHumano, setVersaoHumano] = useState(humanoInicial.versao)
  const [atualizadoEmHumano, setAtualizadoEmHumano] = useState(humanoInicial.atualizadoEm)

  const [conteudoTecnico, setConteudoTecnico] = useState(tecnicoInicial.conteudo)
  const [versaoTecnico, setVersaoTecnico] = useState(tecnicoInicial.versao)
  const [atualizadoEmTecnico, setAtualizadoEmTecnico] = useState(tecnicoInicial.atualizadoEm)

  // Estados de controle
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copiou, setCopiou] = useState(false)
  const [copiouClaude, setCopiouClaude] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")

  // Seletores conforme o manual ativo
  const conteudoAtual = manualAtivo === "humano" ? conteudoHumano : conteudoTecnico
  const versaoAtual = manualAtivo === "humano" ? versaoHumano : versaoTecnico
  const atualizadoEmAtual = manualAtivo === "humano" ? atualizadoEmHumano : atualizadoEmTecnico

  const setConteudoAtual = (novo: string) => {
    if (manualAtivo === "humano") setConteudoHumano(novo)
    else setConteudoTecnico(novo)
  }

  const setVersaoAtual = (nova: string) => {
    if (manualAtivo === "humano") setVersaoHumano(nova)
    else setVersaoTecnico(nova)
  }

  // Gera Sumário (TOC) dinamicamente a partir dos cabeçalhos ## do markdown atual
  const sumario = useMemo(() => {
    const lines = conteudoAtual.split("\n")
    const items: { id: string; titulo: string; nivel: number }[] = []

    for (const line of lines) {
      const match = line.match(/^(#{2,3})\s+(.+)$/)
      if (match) {
        const nivel = match[1].length
        const titulo = match[2].trim()
        const id = titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        items.push({ id, titulo, nivel })
      }
    }
    return items
  }, [conteudoAtual])

  const handleCopiar = () => {
    navigator.clipboard.writeText(conteudoAtual)
    setCopiou(true)
    toast.success(`${manualAtivo === "humano" ? "Manual Humano" : "Manual Técnico"} copiado para a área de transferência!`)
    setTimeout(() => setCopiou(false), 3000)
  }

  const handleCopiarParaClaude = () => {
    const promptClaude = `Você é o Engenheiro Especialista em Estruturas de Estufas da ArcoForte.
Abaixo está o MANUAL TÉCNICO OFICIAL DE VARIÁVEIS, REGRAS E FÓRMULAS do sistema ArcoForte Orçamentos (Versão ${versaoTecnico}).

Utilize SEMPRE este manual como fonte de verdade matemática absoluta para todas as suas análises, cálculos e respostas:

${conteudoTecnico}

---
Por favor, atue como o engenheiro sênior da ArcoForte. Quando sugerir ou atualizar regras de cálculo:
1. Explique didaticamente a lógica em português claro.
2. Utilize exclusivamente os nomes técnicos de variáveis documentados na Seção 1.
3. Termine SEMPRE sua resposta com o bloco padronizado em JSON com as chaves "parametros", "regras", "topicos" e "produtos", para que o sistema possa importar com 1 clique.`

    navigator.clipboard.writeText(promptClaude)
    setCopiouClaude(true)
    toast.success("Prompt mestre com Manual Técnico e instruções copiado para o Claude Desktop!", {
      duration: 5000,
      description: "Basta colar no chat do Claude Desktop (Ctrl+V) e começar a criar ou ajustar regras!"
    })
    setTimeout(() => setCopiouClaude(false), 3000)
  }

  const handleDownload = () => {
    const blob = new Blob([conteudoAtual], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const nomeArquivo = manualAtivo === "humano"
      ? `manual-humano-arcoforte-v${versaoHumano.replace(/\s+/g, "_")}.md`
      : `manual-tecnico-claude-arcoforte-v${versaoTecnico.replace(/\s+/g, "_")}.md`
    a.download = nomeArquivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Download do arquivo Markdown iniciado!")
  }

  const handleSalvar = async () => {
    setIsSaving(true)
    try {
      const res = await salvarManualOficial(manualAtivo, conteudoAtual, versaoAtual)
      if (res.success) {
        toast.success(res.message, { duration: 5000 })
        const agora = new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        if (manualAtivo === "humano") setAtualizadoEmHumano(agora)
        else setAtualizadoEmTecnico(agora)
        setIsEditing(false)
      } else {
        toast.error("Erro ao salvar: " + res.error)
      }
    } catch (err: any) {
      toast.error("Erro fatal: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* SELETOR DE VERSÃO DO MANUAL (HUMANO VS TÉCNICO / CLAUDE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD DO MANUAL HUMANO */}
        <div
          onClick={() => {
            if (isEditing) return
            setManualAtivo("humano")
          }}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all shadow-sm ${
            manualAtivo === "humano"
              ? "border-[#d97021] bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white ring-2 ring-[#d97021]/20 shadow-md"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 opacity-80"
          } ${isEditing ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shadow-sm ${
              manualAtivo === "humano"
                ? "bg-[#d97021] text-white"
                : "bg-slate-100 text-slate-600"
            }`}>
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base text-slate-900">
                  Manual em Linguagem Natural
                </span>
                <Badge variant="outline" className={manualAtivo === "humano" ? "bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[11px]" : "bg-slate-100 text-slate-600 text-[11px]"}>
                  Para Humanos & Vendedores
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Texto simples, didático e sem termos de programação. Ideal para vendedores, engenharia, novos colaboradores e clientes entenderem como a estufa é projetada.
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2.5">
                <span className="font-semibold text-amber-700">Versão {versaoHumano}</span>
                <span>•</span>
                <span>{atualizadoEmHumano || "Atualizado recentemente"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD DO MANUAL TÉCNICO (CLAUDE & IA) */}
        <div
          onClick={() => {
            if (isEditing) return
            setManualAtivo("tecnico")
          }}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all shadow-sm ${
            manualAtivo === "tecnico"
              ? "border-purple-600 bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-white ring-2 ring-purple-600/20 shadow-md"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 opacity-80"
          } ${isEditing ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shadow-sm ${
              manualAtivo === "tecnico"
                ? "bg-purple-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}>
              <Cpu className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base text-slate-900">
                  Manual Técnico (Claude & IA)
                </span>
                <Badge variant="outline" className={manualAtivo === "tecnico" ? "bg-purple-100 text-purple-800 border-purple-300 font-semibold text-[11px]" : "bg-slate-100 text-slate-600 text-[11px]"}>
                  Variáveis & Fórmulas
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Dicionário oficial com nomes técnicos de variáveis (<code className="text-purple-700 font-mono text-[10px]">nome_tecnico</code>), regras R001 a R069, fórmulas matemáticas e bloco JSON padronizado.
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2.5">
                <span className="font-semibold text-purple-700">Versão {versaoTecnico}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-purple-700 font-medium">
                  <Bot className="h-3 w-3" /> Base do Assistente Zeca
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CABEÇALHO DO MANUAL SELECIONADO E AÇÕES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl text-white shadow-md shrink-0 ${
              manualAtivo === "humano"
                ? "bg-gradient-to-br from-[#d97021] to-amber-700"
                : "bg-gradient-to-br from-purple-600 to-indigo-800"
            }`}>
              {manualAtivo === "humano" ? <BookOpen className="h-7 w-7" /> : <Code2 className="h-7 w-7" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {manualAtivo === "humano" 
                    ? "Manual de Regras e Orçamento (Linguagem Simples)" 
                    : "Manual Técnico de Regras, Variáveis e Fórmulas"}
                </h1>
                <Badge variant="outline" className={`font-bold text-xs ${
                  manualAtivo === "humano" 
                    ? "bg-amber-50 text-amber-800 border-amber-300" 
                    : "bg-purple-50 text-purple-800 border-purple-300"
                }`}>
                  Versão {versaoAtual}
                </Badge>
                {manualAtivo === "tecnico" && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 100% Compatível com Claude Desktop
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl">
                {manualAtivo === "humano"
                  ? "Guia de referência explicativo em português claro sobre as medidas da estufa, seleção de arcos, calhas, divisas, telas e garantias de fábrica."
                  : "Dicionário de variáveis, identificadores de componentes, regras R001-R069 e especificação JSON para integração direta com Claude e IA."}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Atualizado: {atualizadoEmAtual}
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Homologado ArcoForte Engenharia
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* BOTÃO ESPECIAL DE COPIAR PARA O CLAUDE DESKTOP */}
            {manualAtivo === "tecnico" && (
              <Button
                onClick={handleCopiarParaClaude}
                className="gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold shadow-md h-9 text-xs"
              >
                {copiouClaude ? <Check className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4" />}
                {copiouClaude ? "Copiado para o Claude!" : "Copiar para o Claude Desktop"}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiar}
              className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              {copiou ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copiou ? "Copiado!" : "Copiar Markdown"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              <Download className="h-4 w-4" />
              Baixar .MD
            </Button>

            {isAdministrador && (
              <Button
                variant={isEditing ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsEditing(prev => !prev)}
                className={`gap-1.5 shadow-sm font-semibold text-xs ${
                  !isEditing 
                    ? (manualAtivo === "humano" ? "bg-[#d97021] hover:bg-[#c3631b] text-white" : "bg-purple-600 hover:bg-purple-700 text-white")
                    : ""
                }`}
              >
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {isEditing ? "Cancelar Edição" : `Editar ${manualAtivo === "humano" ? "Manual Humano" : "Manual Técnico"}`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO: MODO EDIÇÃO OU MODO LEITURA */}
      {isEditing ? (
        <Card className={`shadow-md border-2 ${manualAtivo === "humano" ? "border-amber-300" : "border-purple-300"}`}>
          <CardHeader className={`pb-3 border-b ${manualAtivo === "humano" ? "bg-amber-50/70 border-amber-200" : "bg-purple-50/70 border-purple-200"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Edit3 className={`h-4 w-4 ${manualAtivo === "humano" ? "text-[#d97021]" : "text-purple-600"}`} />
                  Editando: {manualAtivo === "humano" ? "Manual em Linguagem Natural" : "Manual Técnico (Claude & IA)"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  {manualAtivo === "humano"
                    ? "Edite as explicações conceituais e orientações didáticas para os vendedores e clientes."
                    : "Edite as variáveis, fórmulas R001-R069 e esquemas técnicos para o Claude e a IA."}
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="versaoInput" className="text-xs font-semibold text-slate-700">Versão:</label>
                  <Input
                    id="versaoInput"
                    value={versaoAtual}
                    onChange={(e) => setVersaoAtual(e.target.value)}
                    className="w-24 h-8 text-xs font-bold bg-white"
                    placeholder="1.0"
                  />
                </div>
                <Button
                  onClick={handleSalvar}
                  disabled={isSaving}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 shadow-sm text-xs"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-xs mb-3">
                <TabsTrigger value="editor" className="text-xs gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" /> Editor Markdown
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Prévia Formatada
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor">
                <Textarea
                  rows={26}
                  value={conteudoAtual}
                  onChange={(e) => setConteudoAtual(e.target.value)}
                  className="font-mono text-xs leading-relaxed resize-y bg-slate-50/50 focus:bg-white"
                  placeholder="Escreva a documentação oficial em Markdown..."
                />
              </TabsContent>

              <TabsContent value="preview">
                <div className="border rounded-xl p-8 bg-white max-h-[600px] overflow-y-auto prose prose-slate max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{conteudoAtual}</ReactMarkdown>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        /* MODO LEITURA COM SUMÁRIO LATERAL E BUSCA */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* COLUNA LATERAL: SUMÁRIO NAVEGÁVEL */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="sticky top-6 border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ListTree className="h-4 w-4 text-primary" />
                    Índice do Manual
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">{sumario.length} seções</span>
                </div>
              </CardHeader>
              <CardContent className="pt-3 px-3">
                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  {sumario.map((item, idx) => (
                    <a
                      key={idx}
                      href={`#${item.id}`}
                      className={`block py-1.5 px-2.5 rounded-lg text-xs transition-colors hover:bg-slate-100 hover:text-primary ${
                        item.nivel === 2
                          ? "font-semibold text-slate-800"
                          : "pl-5 text-slate-500 font-normal"
                      }`}
                    >
                      {item.titulo}
                    </a>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t p-3 bg-slate-50/80 rounded-b-xl flex flex-col items-start gap-1">
                {manualAtivo === "humano" ? (
                  <>
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Users className="h-3 w-3 text-[#d97021]" /> Para Vendedores e Clientes
                    </span>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      Use estas seções para tirar dúvidas comerciais e explicar as características de cada estrutura.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                      <Bot className="h-3 w-3 text-purple-600" /> Claude Desktop & Zeca
                    </span>
                    <p className="text-[10px] text-purple-800 leading-tight">
                      Clique em <strong>&quot;Copiar para o Claude Desktop&quot;</strong> acima para alimentar sua conversa externa no Claude com este manual oficial.
                    </p>
                  </>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* COLUNA PRINCIPAL: TEXTO COMPLETO RENDERIZADO */}
          <div className="lg:col-span-3">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Filtrar tópicos (ex: calha, mola, arco, R001, vao)..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>
                    {manualAtivo === "humano" ? "Manual em Linguagem Natural" : "Manual Técnico de Variáveis"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-8 bg-white min-h-[600px]">
                <div className="documentacao-markdown">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-slate-900 pb-3 border-b mb-6 tracking-tight" {...props} />,
                      h2: ({ node, children, ...props }) => {
                        const text = String(children || "")
                        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
                        const colorClass = manualAtivo === "humano" ? "text-[#d97021] border-orange-100" : "text-purple-700 border-purple-100"
                        return <h2 id={id} className={`text-lg font-bold ${colorClass} pt-6 pb-2 border-b mb-4 mt-8 flex items-center gap-2`} {...props}>{children}</h2>
                      },
                      h3: ({ node, children, ...props }) => {
                        const text = String(children || "")
                        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
                        return <h3 id={id} className="text-sm font-bold text-slate-800 mt-5 mb-2" {...props}>{children}</h3>
                      },
                      p: ({ node, ...props }) => <p className="text-xs text-slate-700 leading-relaxed mb-3" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 mb-4 pl-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1 mb-4 pl-2" {...props} />,
                      li: ({ node, ...props }) => <li className="text-xs leading-relaxed" {...props} />,
                      table: ({ node, ...props }) => (
                        <div className="rounded-lg border border-slate-200 overflow-hidden my-4 shadow-sm">
                          <table className="w-full text-xs text-left border-collapse" {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }) => <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-800" {...props} />,
                      th: ({ node, ...props }) => <th className="p-2.5 font-semibold text-slate-700" {...props} />,
                      td: ({ node, ...props }) => <td className="p-2.5 border-t border-slate-100 text-slate-600 font-mono text-[11px]" {...props} />,
                      code: ({ node, className, children, ...props }) => {
                        const isInline = !className
                        if (isInline) {
                          const bg = manualAtivo === "humano" ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-purple-50 text-purple-900 border-purple-200"
                          return <code className={`${bg} border px-1 py-0.5 rounded font-mono text-[11px]`} {...props}>{children}</code>
                        }
                        return (
                          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs my-4 overflow-x-auto border border-slate-800 shadow-sm">
                            <code {...props}>{children}</code>
                          </div>
                        )
                      },
                      blockquote: ({ node, ...props }) => {
                        const border = manualAtivo === "humano" ? "border-[#d97021] bg-orange-50/50" : "border-purple-600 bg-purple-50/50"
                        return <blockquote className={`border-l-4 ${border} pl-4 py-2 italic text-xs text-slate-700 my-4 rounded-r`} {...props} />
                      }
                    }}
                  >
                    {conteudoAtual}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
