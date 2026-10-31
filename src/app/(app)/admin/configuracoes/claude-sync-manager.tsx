"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Settings2, 
  FileText, 
  Package, 
  Trash2,
  HelpCircle,
  ExternalLink,
  BookOpen
} from "lucide-react"
import { 
  analisarTextoDoClaude, 
  aplicarDadosDoClaude, 
  ResultadoAnaliseClaude 
} from "@/app/actions/claude-sync"

export const INSTRUCAO_COMPLETA_CLAUDE = `# Contexto Técnico e Instruções — Sistema ArcoForte Orçamentos

Você é o assistente técnico de engenharia e orçamentos da ArcoForte (fabricante de estufas agrícolas).
Seu objetivo é me ajudar a analisar, definir e refinar regras de cálculo de materiais, parâmetros e propostas comerciais.

---

### 1. Parâmetros e Variáveis Base da Estufa
- n_modulos: Quantidade de módulos (arcos em largura: 1, 2, 3...)
- largura_modulo: Largura de cada módulo em metros (geralmente 7, 8 ou 10)
- n_vaos: Quantidade de vãos ao longo do comprimento
- vao: Distância padrão entre postes/arcos (3 ou 4 metros)
- pe_direito: Altura lateral livre útil (3, 4 ou 5 metros)
- tipo_arco: 'SIMPLES', 'DUPLO' ou 'LANTERNIM'
- calha_lateral: 'CALHA', 'LATERAL DUPLA' ou 'LATERAL SIMPLES'
- fixacao_inferior: booleano (true/false)
- tipo_fixacao_inferior: 'LATERAL SIMPLES', 'MURETA' ou 'ENTERRADA'
- modelo_cabo: 'COMPLETO', 'INTERNOS', 'LATERAL 1', 'LATERAL 2', 'FRENTE', 'FUNDO'
- travamentos_x: Quantidade de travamentos em X por vão
- possui_anticamara: booleano (true/false)
- comprimento_estufa: vao * (n_vaos - 1) + tamanho_ultimo_vao (ou vao * n_vaos)
- largura_total: n_modulos * largura_modulo
- area_total: largura_total * comprimento_estufa

---

### 2. Grupos de Componentes Cadastrados
1. Postes
2. Arcos
3. Dorsal / Contravento / Encaixe Central
4. Lateral / Calha
5. Emendas e Suportes
6. Mola
7. Cabos de Aço
8. Portas
9. Parafusos / Diversos
10. Fechamento Lateral - Telas
11. Cobertura - Filmes
12. Cortina Lateral Móvel

---

### 3. FORMATO DE SAÍDA OBRIGATÓRIO (Para Sincronização em 1 Clique)
Sempre que definirmos, ajustarmos ou criarmos novas regras, além da sua explicação em português simples, adicione OBRIGATORIAMENTE ao final da sua resposta um bloco de código JSON padronizado com as alterações:

\`\`\`json
{
  "parametros": [
    {
      "nome_tecnico": "exemplo_parametro",
      "rotulo": "Nome Exibido no Formulário",
      "tipo": "numero | selecao | booleano | texto",
      "opcoes": ["Opção 1", "Opção 2"]
    }
  ],
  "regras": [
    {
      "grupo": "1. Postes",
      "posicao": "Poste Lateral",
      "produto_codigo": "3012",
      "produto_descricao": "Descrição da Peça",
      "formula_quantidade": "2 * (n_vaos + 1)",
      "condicao_aplicabilidade": "sempre",
      "obs": "Observação técnica opcional"
    }
  ],
  "topicos": [
    {
      "titulo": "Garantias",
      "texto": "Texto atualizado da cláusula..."
    }
  ],
  "produtos": [
    {
      "codigo": "3999",
      "descricao": "Nome do produto se for novo"
    }
  ]
}
\`\`\`

Esse bloco JSON é lido automaticamente pela Central de Sincronização do sistema ArcoForte para aplicação instantânea no banco de dados com 1 clique!`

export function ClaudeSyncManager() {
  const [textoEntrada, setTextoEntrada] = useState("")
  const [isAnalisando, setIsAnalisando] = useState(false)
  const [isAplicando, setIsAplicando] = useState(false)
  const [copiouPrompt, setCopiouPrompt] = useState(false)
  const [modalInstrucaoAberto, setModalInstrucaoAberto] = useState(false)
  const [resultado, setResultado] = useState<ResultadoAnaliseClaude | null>(null)

  const handleCopiarPrompt = () => {
    navigator.clipboard.writeText(INSTRUCAO_COMPLETA_CLAUDE)
    setCopiouPrompt(true)
    toast.success("Instrução completa copiada! Cole no Claude Desktop para ele conhecer o sistema.", { duration: 5000 })
    setTimeout(() => setCopiouPrompt(false), 3000)
  }

  const handleAnalisar = async () => {
    if (!textoEntrada.trim()) {
      toast.error("Cole primeiro o texto gerado pelo Claude Desktop.")
      return
    }

    setIsAnalisando(true)
    try {
      const res = await analisarTextoDoClaude(textoEntrada)
      if (res.erro) {
        toast.error("Erro na análise: " + res.erro)
      } else {
        setResultado(res)
        const total = (res.parametros?.length || 0) + (res.regras?.length || 0) + (res.topicos?.length || 0)
        if (total === 0) {
          toast.warning("Nenhum dado estruturado identificado. Tente copiar um trecho com fórmulas ou tabelas.")
        } else {
          toast.success(res.resumo)
        }
      }
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message)
    } finally {
      setIsAnalisando(false)
    }
  }

  const handleAplicar = async () => {
    if (!resultado) return

    setIsAplicando(true)
    try {
      const res = await aplicarDadosDoClaude({
        parametros: resultado.parametros,
        regras: resultado.regras,
        topicos: resultado.topicos,
        produtos: resultado.produtos
      })

      if (res.success) {
        toast.success(res.message, { duration: 6000 })
        // Limpa o formulário após aplicar com sucesso
        setTextoEntrada("")
        setResultado(null)
      } else {
        toast.error("Erro ao aplicar: " + res.error)
      }
    } catch (err: any) {
      toast.error("Erro fatal ao aplicar no sistema: " + err.message)
    } finally {
      setIsAplicando(false)
    }
  }

  const totalItens = (resultado?.parametros?.length || 0) + 
                     (resultado?.regras?.length || 0) + 
                     (resultado?.topicos?.length || 0) + 
                     (resultado?.produtos?.length || 0)

  return (
    <div className="space-y-6">
      {/* CARD 1: INSTRUÇÃO PARA COPIAR E ENVIAR AO CLAUDE */}
      <Card className="border-purple-300 bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-purple-100 bg-purple-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Instrução para Enviar ao Claude Desktop
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-[10px] font-bold">
                    PROMPT MESTRE
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-0.5">
                  Copie essa instrução e envie uma vez ao Claude. Ele passará a conhecer todas as variáveis da ArcoForte e responderá no formato que o sistema importa com 1 clique.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href="/documentacao">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-semibold"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#d97021]" />
                  Manual Oficial
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalInstrucaoAberto(true)}
                className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Ver Instrução
              </Button>
              <Button
                size="sm"
                onClick={handleCopiarPrompt}
                className="gap-1.5 bg-purple-700 hover:bg-purple-800 text-white shadow font-semibold text-xs"
              >
                {copiouPrompt ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
                {copiouPrompt ? "Copiado!" : "Copiar Instrução p/ Claude"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 text-xs text-slate-600 space-y-3">
          <div className="flex items-start gap-2 bg-white/80 p-3 rounded-lg border border-purple-100">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-800">Como usar no seu Claude Desktop:</span>
              <p>
                Basta clicar no botão roxo <strong>&quot;Copiar Instrução para o Claude&quot;</strong> acima, abrir a sua conversa no aplicativo do Claude e dar <strong>Ctrl+V</strong>. 
                A partir daí, toda regra que você formular com ele já virá pronta para você colar na caixa abaixo.
              </p>
            </div>
          </div>

          <div className="relative rounded-lg bg-slate-900 text-slate-200 p-3 font-mono text-[11px] max-h-32 overflow-hidden border border-slate-800">
            <div className="absolute top-2 right-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopiarPrompt}
                className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
              >
                {copiouPrompt ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copiar
              </Button>
            </div>
            <pre className="pr-16 line-clamp-4">{INSTRUCAO_COMPLETA_CLAUDE}</pre>
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900 to-transparent flex items-end justify-center pb-1">
              <button 
                onClick={() => setModalInstrucaoAberto(true)} 
                className="text-[11px] text-purple-300 hover:text-purple-200 hover:underline"
              >
                Clique para ver os parâmetros e grupos completos...
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL COM TEXTO COMPLETO DA INSTRUÇÃO */}
      <Dialog open={modalInstrucaoAberto} onOpenChange={setModalInstrucaoAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-900 font-bold">
              <Bot className="h-5 w-5 text-purple-700" />
              Instrução Completa para o Claude Desktop
            </DialogTitle>
            <DialogDescription>
              Copie o texto abaixo e envie no início da conversa ou adicione nas instruções do seu projeto no Claude Desktop.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs leading-relaxed border border-slate-800 overflow-x-auto whitespace-pre-wrap select-all">
            {INSTRUCAO_COMPLETA_CLAUDE}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalInstrucaoAberto(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleCopiarPrompt}
              className="gap-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold"
            >
              {copiouPrompt ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
              {copiouPrompt ? "Copiado!" : "Copiar Instrução Completa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CARD 2: CAIXA PARA COLAR A RESPOSTA DO CLAUDE */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-purple-600" />
              Cole aqui a resposta gerada pelo Claude Desktop
            </span>
            {textoEntrada && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setTextoEntrada(""); setResultado(null); }}
                className="text-slate-400 hover:text-red-500 h-8 px-2 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Pode colar o bloco JSON, tabelas Markdown ou até mesmo a explicação que o Claude te deu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={8}
            placeholder={
              "Exemplo: Copie a resposta do Claude Desktop e dê Ctrl+V aqui...\n\n" +
              "Pode ser:\n" +
              "- O bloco JSON com { \"parametros\": [...], \"regras\": [...] }\n" +
              "- Ou tabelas markdown com colunas de parâmetros e regras\n" +
              "- Ou o texto corrido onde o Claude explicou os novos cálculos"
            }
            value={textoEntrada}
            onChange={(e) => setTextoEntrada(e.target.value)}
            className="font-mono text-xs leading-relaxed bg-slate-50/50 focus:bg-white resize-y"
          />
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t bg-slate-50/50 py-3 px-6 rounded-b-xl">
          <span className="text-xs text-muted-foreground">
            {textoEntrada ? `${textoEntrada.length} caracteres para análise` : "Nenhum texto colado ainda"}
          </span>
          <Button
            onClick={handleAnalisar}
            disabled={isAnalisando || !textoEntrada.trim()}
            className="gap-2 bg-purple-700 hover:bg-purple-800 text-white font-medium"
          >
            {isAnalisando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isAnalisando ? "Analisando..." : "Analisar Conteúdo do Claude"}
          </Button>
        </CardFooter>
      </Card>

      {/* CARD 3: PRÉVIA E APLICAÇÃO EM 1 CLIQUE */}
      {resultado && (
        <Card className="border-purple-200 shadow-md ring-1 ring-purple-100">
          <CardHeader className="bg-gradient-to-r from-purple-50/60 to-transparent pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg font-bold">Prévia dos Dados Identificados</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  {resultado.resumo}
                </CardDescription>
              </div>
              <Button
                onClick={handleAplicar}
                disabled={isAplicando || totalItens === 0}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md transition-all self-start sm:self-auto"
                size="lg"
              >
                {isAplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {isAplicando ? "Gravando no Sistema..." : "Aplicar Tudo no Sistema com 1 Clique"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {totalItens === 0 ? (
              <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <p>Nenhuma regra ou parâmetro foi detectado no texto colado.</p>
                <p className="text-xs text-muted-foreground">Tente colar a resposta do Claude com o bloco JSON ou linhas de tabela.</p>
              </div>
            ) : (
              <Tabs defaultValue={resultado.regras?.length ? "regras" : (resultado.parametros?.length ? "parametros" : "topicos")} className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-xl mb-4">
                  <TabsTrigger value="regras" className="gap-1.5 text-xs">
                    <Layers className="h-3.5 w-3.5" />
                    Regras ({resultado.regras?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="parametros" className="gap-1.5 text-xs">
                    <Settings2 className="h-3.5 w-3.5" />
                    Parâmetros ({resultado.parametros?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="produtos" className="gap-1.5 text-xs">
                    <Package className="h-3.5 w-3.5" />
                    Produtos ({resultado.produtos?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="topicos" className="gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    Proposta ({resultado.topicos?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* ABA REGRAS */}
                <TabsContent value="regras">
                  {resultado.regras?.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma regra de cálculo neste bloco.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-32">Grupo</TableHead>
                            <TableHead>Posição / Peça</TableHead>
                            <TableHead className="w-24">Produto</TableHead>
                            <TableHead>Fórmula de Qtd</TableHead>
                            <TableHead>Condição</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultado.regras.map((r, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-medium text-slate-700">{r.grupo || "Geral"}</TableCell>
                              <TableCell className="font-semibold text-slate-900">{r.posicao}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  {r.produto_codigo}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-purple-700 font-medium">
                                {r.formula_quantidade}
                              </TableCell>
                              <TableCell className="font-mono text-slate-500 text-[11px]">
                                {r.condicao_aplicabilidade || "sempre"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* ABA PARÂMETROS */}
                <TabsContent value="parametros">
                  {resultado.parametros?.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum parâmetro neste bloco.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Nome Técnico</TableHead>
                            <TableHead>Rótulo no Formulário</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Opções (se seleção)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultado.parametros.map((p, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-mono text-slate-800 font-semibold">{p.nome_tecnico}</TableCell>
                              <TableCell>{p.rotulo}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {p.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-500 font-mono text-[11px]">
                                {p.opcoes && p.opcoes.length > 0 ? p.opcoes.join(", ") : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* ABA PRODUTOS */}
                <TabsContent value="produtos">
                  {resultado.produtos?.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum produto novo neste bloco.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-28">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultado.produtos.map((pr, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-mono font-bold text-slate-800">{pr.codigo}</TableCell>
                              <TableCell>{pr.descricao}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* ABA TÓPICOS DA PROPOSTA */}
                <TabsContent value="topicos">
                  {resultado.topicos?.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum texto de proposta comercial neste bloco.</p>
                  ) : (
                    <div className="space-y-3">
                      {resultado.topicos.map((t, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-slate-50 text-xs space-y-1">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            {t.titulo}
                          </div>
                          <p className="text-slate-600 line-clamp-3">{t.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
