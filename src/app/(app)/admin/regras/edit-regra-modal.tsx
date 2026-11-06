"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Parser } from "expr-eval"
import { Play, CheckCircle2, XCircle, History, Calculator, Sliders, Clock, User, Loader2 } from "lucide-react"
import { obterHistoricoRegra, HistoricoRegraItem } from "@/app/actions/regras"

type EditRegraModalProps = {
  isOpen: boolean;
  onClose: () => void;
  regra: any | null;
  posicoes: any[];
  produtos: any[];
  regras: any[];
}

const LABELS_CAMPOS: Record<string, string> = {
  formula_quantidade: "Fórmula de Quantidade",
  condicao_aplicabilidade: "Condição de Aplicabilidade",
  produto_codigo: "Código do Produto",
  posicao_id: "Posição Estrutural",
  unidade_medida: "Unidade de Medida",
  regra_arredondamento: "Regra de Arredondamento",
  margem_perda: "Margem de Perda (%)"
}

export function EditRegraModal({ isOpen, onClose, regra, posicoes, produtos }: EditRegraModalProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "historico">("editor")
  
  // Histórico state
  const [historico, setHistorico] = useState<HistoricoRegraItem[]>([])
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)

  // Simulador state com todas as variáveis do sistema
  const [testVars, setTestVars] = useState({
    n_modulos: 1,
    largura_modulo: 8,
    n_vaos: 10,
    vao: 3,
    pe_direito: 3,
    tipo_arco: "SIMPLES",
    tipo_poste: "100X50 GALVANIZADO",
    calha_lateral: "LATERAL DUPLA",
    arco_divisa: false,
    n_divisas: 0,
    postes_frontais_duplos: false,
    postes_topo_duplos: false,
    postes_divisa_duplos: false,
    modelo_cabo: "COMPLETO",
    travamentos_x: 0
  })

  const [testResult, setTestResult] = useState<{
    success: boolean;
    qty?: number;
    qtyRaw?: number;
    applied?: boolean;
    error?: string;
  } | null>(null)

  const { register, watch, reset } = useForm({
    defaultValues: {
      posicao_id: "",
      produto_codigo: "",
      formula_quantidade: "",
      condicao_aplicabilidade: "",
      unidade_medida: "",
      regra_arredondamento: "",
      margem_perda: 0
    }
  })

  // Carrega dados da regra e busca histórico ao abrir
  useEffect(() => {
    if (regra) {
      reset({
        posicao_id: regra.posicao_id || "",
        produto_codigo: regra.produto_codigo || "",
        formula_quantidade: regra.formula_quantidade || "",
        condicao_aplicabilidade: regra.condicao_aplicabilidade || "",
        unidade_medida: regra.unidade_medida || "un",
        regra_arredondamento: regra.regra_arredondamento || "cima",
        margem_perda: Number(regra.margem_perda) || 0
      })
      setTestResult(null)
      carregarHistorico(regra.id)
    }
  }, [regra, reset])

  const carregarHistorico = async (regraId: string) => {
    setIsLoadingHistorico(true)
    try {
      const res = await obterHistoricoRegra(regraId)
      if (res.success) {
        setHistorico(res.historico)
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err)
    } finally {
      setIsLoadingHistorico(false)
    }
  }

  const runSimulation = () => {
    const formula = watch("formula_quantidade")
    const condicao = watch("condicao_aplicabilidade")
    const arredondamento = watch("regra_arredondamento")
    const margem = Number(watch("margem_perda")) || 0

    try {
      const parser = new Parser()

      // Registrar mesmas funções auxiliares do motor (engine.ts)
      parser.functions.IF = function(cond: any, a: any, b: any) { return cond ? a : b; }
      parser.functions.AND = function(...args: any[]) { return args.every(Boolean); }
      parser.functions.OR = function(...args: any[]) { return args.some(Boolean); }
      parser.functions.SUM = function(...args: any[]) { return args.reduce((acc, v) => acc + (Number(v) || 0), 0); }
      parser.functions.ROUNDUP = function(val: any) { return Math.ceil(val); }
      parser.functions.FLOOR = function(val: any) { return Math.floor(val); }
      parser.functions.CONTAINS = function(haystack: any, needle: any) {
        return String(haystack ?? '').split(',').map(s => s.trim()).includes(String(needle).trim());
      }

      // Variáveis derivadas automáticas (mesma lógica do manual e engine)
      const largura_total = (Number(testVars.n_modulos) || 1) * (Number(testVars.largura_modulo) || 8)
      const comprimento_total = (Number(testVars.n_vaos) || 10) * (Number(testVars.vao) || 3)
      const postes_por_linha = (Number(testVars.n_vaos) || 10) + 1
      const area_total = largura_total * comprimento_total

      const fullVars: Record<string, any> = {
        ...testVars,
        largura_total,
        comprimento_total,
        postes_por_linha,
        area_total
      }

      // Proxy seguro para evitar crash com variáveis não definidas
      const safeVars = new Proxy(fullVars, {
        get(target, prop) {
          if (typeof prop === "string" && prop in target) {
            return target[prop]
          }
          return 0
        }
      })

      // 1. Avaliar Condição de Aplicabilidade
      let applied = true
      if (condicao && condicao.trim() !== "" && condicao.trim().toUpperCase() !== "SEMPRE") {
        applied = !!parser.evaluate(condicao, safeVars as any)
      }

      if (!applied) {
        setTestResult({ success: true, applied: false })
        return
      }

      // 2. Avaliar Fórmula de Quantidade
      const qtyRaw = Number(parser.evaluate(formula, safeVars as any)) || 0

      // 3. Aplicar perda e arredondamento
      let qtyFinal = qtyRaw * (1 + margem / 100)
      if (arredondamento === "cima") {
        qtyFinal = Math.ceil(qtyFinal)
      } else if (arredondamento === "baixo") {
        qtyFinal = Math.floor(qtyFinal)
      } else {
        qtyFinal = Number(qtyFinal.toFixed(2))
      }

      setTestResult({
        success: true,
        applied: true,
        qty: qtyFinal,
        qtyRaw: Number(qtyRaw.toFixed(2))
      })
    } catch (err: any) {
      setTestResult({ success: false, error: err.message })
    }
  }

  if (!regra) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-3xl md:max-w-5xl lg:max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#d97021]" />
                Detalhes da Regra
              </DialogTitle>
              <DialogDescription className="text-xs">
                Para alterar esta regra use Configurações → Pacote de Regras.
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={activeTab === "editor" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("editor")}
                className={`text-xs gap-1.5 ${activeTab === "editor" ? "bg-[#d97021] text-white hover:bg-[#c3631b]" : ""}`}
              >
                <Calculator className="h-3.5 w-3.5" />
                Detalhes & Simulador
              </Button>
              <Button
                type="button"
                variant={activeTab === "historico" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveTab("historico")
                  carregarHistorico(regra.id)
                }}
                className={`text-xs gap-1.5 ${activeTab === "historico" ? "bg-purple-600 text-white hover:bg-purple-700" : ""}`}
              >
                <History className="h-3.5 w-3.5" />
                Histórico ({historico.length})
              </Button>
            </div>
          </div>
        </DialogHeader>

        {activeTab === "editor" ? (
          <div className="mt-2 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LADO ESQUERDO: VISUALIZAÇÃO DA REGRA (6 colunas em telas grandes) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm text-slate-800">Parâmetros da Regra</h3>
                <Badge variant="outline" className="font-mono text-[10px]">
                  ID: {regra.id.slice(0, 8)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Produto Associado</Label>
                  <Select value={watch("produto_codigo")} disabled>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione um produto...">
                        {watch("produto_codigo") 
                          ? `${watch("produto_codigo")} - ${produtos.find(p => p.codigo === watch("produto_codigo"))?.descricao || ""}` 
                          : "Selecione um produto..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {produtos.map(p => (
                        <SelectItem key={p.codigo} value={p.codigo} className="text-xs">
                          {p.codigo} - {p.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Posição na Estrutura</Label>
                  <Select value={watch("posicao_id")} disabled>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a posição...">
                        {watch("posicao_id") 
                          ? posicoes.find(p => p.id === watch("posicao_id"))?.nome 
                          : "Selecione a posição..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {posicoes.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Fórmula de Quantidade</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Expressão matemática (expr-eval)
                  </span>
                </div>
                <Textarea 
                  {...register("formula_quantidade")}
                  readOnly
                  className="font-mono text-xs bg-slate-50 border-zinc-300"
                  rows={3}
                />
                <p className="text-[10px] text-slate-500">
                  Variáveis: <code className="font-mono text-purple-700">n_vaos, n_modulos, pe_direito, vao, tipo_arco, n_divisas, largura_modulo...</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Condição de Aplicabilidade</Label>
                <Textarea 
                  {...register("condicao_aplicabilidade")}
                  readOnly
                  placeholder="Sempre aplicável (sem condição)"
                  className="font-mono text-xs bg-slate-50 border-zinc-300"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unidade</Label>
                  <Input {...register("unidade_medida")} readOnly className="h-9 text-xs bg-slate-50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Arredondamento</Label>
                  <Select value={watch("regra_arredondamento")} disabled>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cima" className="text-xs">Para Cima</SelectItem>
                      <SelectItem value="baixo" className="text-xs">Para Baixo</SelectItem>
                      <SelectItem value="nenhum" className="text-xs">Nenhum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Perda (%)</Label>
                  <Input type="number" step="0.01" {...register("margem_perda")} readOnly className="h-9 text-xs bg-slate-50" />
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Para alterar esta regra use Configurações → Pacote de Regras.
              </div>
            </div>

            {/* LADO DIREITO: SIMULADOR INTEGRADO COM TODAS AS VARIÁVEIS (6 colunas) */}
            <div className="lg:col-span-6 bg-slate-950 rounded-xl p-5 text-zinc-100 flex flex-col justify-between border border-slate-800 shadow-md">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[#d97021]" />
                    <h3 className="font-bold text-sm text-[#d97021]">Simulador Integrado em Tempo Real</h3>
                  </div>
                  <Badge variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-400 text-[10px]">
                    Motor expr-eval
                  </Badge>
                </div>

                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Teste o resultado exato da fórmula e da condição antes de salvar, evitando erros em produção.
                </p>

                {/* GRADE DE VARIÁVEIS DE ENTRADA DO SIMULADOR */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">n_modulos</Label>
                    <Input 
                      type="number" 
                      value={testVars.n_modulos} 
                      onChange={e => setTestVars({...testVars, n_modulos: Number(e.target.value)})}
                      className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">largura_modulo (m)</Label>
                    <Select 
                      value={String(testVars.largura_modulo)} 
                      onValueChange={v => setTestVars({...testVars, largura_modulo: Number(v)})}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                        <SelectItem value="7">7 metros</SelectItem>
                        <SelectItem value="8">8 metros</SelectItem>
                        <SelectItem value="10">10 metros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">n_vaos (Arcos)</Label>
                    <Input 
                      type="number" 
                      value={testVars.n_vaos} 
                      onChange={e => setTestVars({...testVars, n_vaos: Number(e.target.value)})}
                      className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">vao (m)</Label>
                    <Select 
                      value={String(testVars.vao)} 
                      onValueChange={v => setTestVars({...testVars, vao: Number(v)})}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                        <SelectItem value="3">3 metros</SelectItem>
                        <SelectItem value="4">4 metros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">pe_direito (m)</Label>
                    <Select 
                      value={String(testVars.pe_direito)} 
                      onValueChange={v => setTestVars({...testVars, pe_direito: Number(v)})}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                        <SelectItem value="3">3 metros</SelectItem>
                        <SelectItem value="4">4 metros</SelectItem>
                        <SelectItem value="5">5 metros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">tipo_arco</Label>
                    <Select 
                      value={testVars.tipo_arco} 
                      onValueChange={v => setTestVars({...testVars, tipo_arco: v ?? "SIMPLES"})}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                        <SelectItem value="SIMPLES">SIMPLES</SelectItem>
                        <SelectItem value="DUPLO">DUPLO</SelectItem>
                        <SelectItem value="LANTERNIM">LANTERNIM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">n_divisas (Total)</Label>
                    <Input 
                      type="number" 
                      value={testVars.n_divisas} 
                      onChange={e => {
                        const val = Number(e.target.value) || 0
                        setTestVars({...testVars, n_divisas: val, arco_divisa: val > 0})
                      }}
                      className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">calha_lateral</Label>
                    <Select 
                      value={testVars.calha_lateral} 
                      onValueChange={v => setTestVars({...testVars, calha_lateral: v ?? "CALHA"})}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                        <SelectItem value="CALHA">CALHA</SelectItem>
                        <SelectItem value="LATERAL DUPLA">LATERAL DUPLA</SelectItem>
                        <SelectItem value="LATERAL SIMPLES">LATERAL SIMPLES</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 font-medium">tipo_poste</Label>
                    <Select 
                      value={testVars.tipo_poste} 
                      onValueChange={v => setTestVars({...testVars, tipo_poste: v ?? "100X50 GALVANIZADO"})}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                        <SelectItem value="100X50 GALVANIZADO">100X50 GALV</SelectItem>
                        <SelectItem value="75X40 GALVANIZADO">75X40 GALV</SelectItem>
                        <SelectItem value="EUCALIPTO">EUCALIPTO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CHECKBOXES ADICIONAIS DE POSTES DUPLOS */}
                <div className="grid grid-cols-2 gap-2 mb-3 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <Checkbox 
                      checked={testVars.arco_divisa}
                      onCheckedChange={c => setTestVars({...testVars, arco_divisa: !!c, n_divisas: c ? Math.max(1, testVars.n_divisas) : 0})}
                      className="border-zinc-600 data-[state=checked]:bg-[#d97021]"
                    />
                    <span>arco_divisa (ativo)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <Checkbox 
                      checked={testVars.postes_frontais_duplos}
                      onCheckedChange={c => setTestVars({...testVars, postes_frontais_duplos: !!c})}
                      className="border-zinc-600 data-[state=checked]:bg-[#d97021]"
                    />
                    <span>postes_frontais_duplos</span>
                  </label>
                </div>

                <Button 
                  type="button"
                  onClick={runSimulation}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold h-9 text-xs mb-3 shadow-md"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Calcular / Testar Regra Agora
                </Button>
              </div>

              {/* CARD DE RESULTADO DA SIMULAÇÃO */}
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 min-h-[110px] flex items-center justify-center">
                {!testResult ? (
                  <div className="text-xs text-zinc-500 text-center py-2 flex flex-col items-center gap-1">
                    <Calculator className="h-5 w-5 text-zinc-600" />
                    <span>Clique em &quot;Calcular / Testar Regra Agora&quot; para simular o resultado.</span>
                  </div>
                ) : testResult.success ? (
                  testResult.applied ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider">Condição Atendida</span>
                            <Badge variant="outline" className="text-[10px] bg-emerald-950/60 text-emerald-300 border-emerald-800">
                              Válida
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Qtd bruta: <span className="font-mono text-white">{testResult.qtyRaw}</span> • Arredondamento: {watch("regra_arredondamento")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Quantidade Final:</span>
                        <span className="text-2xl font-black font-mono text-emerald-400">
                          {testResult.qty} <span className="text-xs font-normal text-zinc-300">{watch("unidade_medida")}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                        <XCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Condição Não Atendida</span>
                          <Badge variant="outline" className="text-[10px] bg-amber-950/60 text-amber-300 border-amber-800">
                            Falsa
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                          Neste cenário, a condição de aplicabilidade avaliou para <strong>FALSO</strong>. Este item não seria inserido no orçamento.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-start gap-3 w-full text-left">
                    <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0">
                      <XCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-red-400">Erro de Sintaxe na Fórmula ou Condição</p>
                      <p className="text-[11px] text-red-300/90 font-mono mt-1 break-all bg-red-950/40 p-2 rounded border border-red-900">
                        {testResult.error}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          /* ABA: HISTÓRICO DE ALTERAÇÕES DA REGRA */
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-600" />
                  Histórico de Modificações desta Regra
                </h3>
                <p className="text-xs text-slate-500">
                  Todas as alterações de fórmula, condição e produto salvas nesta regra ficam registradas aqui.
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-800 border-purple-200">
                {historico.length} alterações registradas
              </Badge>
            </div>

            {isLoadingHistorico ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="text-xs">Carregando log de auditoria...</span>
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-12 border rounded-xl border-dashed bg-slate-50">
                <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Nenhum histórico anterior registrado para esta regra</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  As próximas alterações que você salvar serão gravadas com data, horário, autor e valores anteriores.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {historico.map((log) => {
                  const dataFormatada = log.alterado_em
                    ? new Date(log.alterado_em).toLocaleDateString("pt-BR") + " às " + new Date(log.alterado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : "Data não registrada"

                  const rotuloCampo = LABELS_CAMPOS[log.campo_alterado] || log.campo_alterado

                  return (
                    <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-semibold text-xs bg-slate-100 text-slate-800">
                            {rotuloCampo}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dataFormatada}
                          </span>
                        </div>
                        {log.usuario_nome && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{log.usuario_nome}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded-lg bg-red-50/60 border border-red-100">
                          <span className="text-[10px] uppercase font-bold text-red-700 block mb-1">Valor Anterior:</span>
                          <code className="text-xs font-mono text-red-900 break-all whitespace-pre-wrap">
                            {log.valor_anterior || "(vazio)"}
                          </code>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">Novo Valor:</span>
                          <code className="text-xs font-mono text-emerald-900 break-all whitespace-pre-wrap">
                            {log.novo_valor || "(vazio)"}
                          </code>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
