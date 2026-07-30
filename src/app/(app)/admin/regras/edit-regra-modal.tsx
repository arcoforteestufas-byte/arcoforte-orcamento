"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Parser } from "expr-eval"
import { Play, Save, CheckCircle2, XCircle } from "lucide-react"
import { updateRegraCalculo } from "@/app/actions/regras"
import { ConditionBuilder } from "./condition-builder"

type EditRegraModalProps = {
  isOpen: boolean;
  onClose: () => void;
  regra: any | null;
  posicoes: any[];
  produtos: any[];
  regras: any[];
}

export function EditRegraModal({ isOpen, onClose, regra, posicoes, produtos, regras }: EditRegraModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  
  // Simulador state
  const [testVars, setTestVars] = useState({
    n_vaos: 10,
    n_modulos: 1,
    pe_direito: 3,
    largura_modulo: 8,
    comprimento_total: 40
  })
  const [testResult, setTestResult] = useState<{ success: boolean; qty?: number; applied?: boolean; error?: string } | null>(null)

  const { register, handleSubmit, setValue, watch, reset } = useForm({
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

  // Set form values when modal opens
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
    }
  }, [regra, reset])

  const onSubmit = async (data: any) => {
    if (!regra) return
    setIsSaving(true)
    const res = await updateRegraCalculo(regra.id, data)
    setIsSaving(false)
    if (res.success) {
      onClose()
    } else {
      alert("Erro ao salvar: " + res.error)
    }
  }

  const runSimulation = () => {
    const formula = watch("formula_quantidade")
    const condicao = watch("condicao_aplicabilidade")

    try {
      const parser = new Parser()
      let applied: boolean = true
      
      if (condicao && condicao.trim() !== "") {
        // Evaluate condition
        // Convert == to === for expr-eval if needed, expr-eval supports == and 'and'
        applied = !!parser.evaluate(condicao, testVars)
      }

      if (!applied) {
        setTestResult({ success: true, applied: false })
        return
      }

      const qty = parser.evaluate(formula, testVars)
      setTestResult({ success: true, applied: true, qty })

    } catch (err: any) {
      setTestResult({ success: false, error: err.message })
    }
  }

  if (!regra) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor Avançado de Regra</DialogTitle>
          <DialogDescription>
            Edite a matemática e as condições que determinam a quantidade deste produto no orçamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Lado Esquerdo: Formulário */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Configuração da Regra</h3>
            
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select 
                value={watch("produto_codigo")} 
                onValueChange={(v) => setValue("produto_codigo", v || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto...">
                    {watch("produto_codigo") 
                      ? `${watch("produto_codigo")} - ${produtos.find(p => p.codigo === watch("produto_codigo"))?.descricao}` 
                      : "Selecione um produto..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.codigo} value={p.codigo}>
                      {p.codigo} - {p.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Posição na Estrutura</Label>
              <Select 
                value={watch("posicao_id")} 
                onValueChange={(v) => setValue("posicao_id", v || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a posição...">
                    {watch("posicao_id") 
                      ? posicoes.find(p => p.id === watch("posicao_id"))?.nome 
                      : "Selecione a posição..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {posicoes.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fórmula de Quantidade</Label>
              <Textarea 
                {...register("formula_quantidade", { required: true })}
                className="font-mono text-sm bg-slate-50 border-zinc-300"
                placeholder="Ex: (n_vaos - 1) * 2"
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground">Variáveis suportadas: n_vaos, n_modulos, pe_direito, largura_modulo...</p>
            </div>

            <div className="space-y-2">
              <ConditionBuilder 
                value={watch("condicao_aplicabilidade") || ""}
                onChange={(val) => setValue("condicao_aplicabilidade", val)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input {...register("unidade_medida", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Arredondamento</Label>
                <Select value={watch("regra_arredondamento")} onValueChange={v => setValue("regra_arredondamento", v || "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cima">Para Cima</SelectItem>
                    <SelectItem value="baixo">Para Baixo</SelectItem>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Perda (%)</Label>
                <Input type="number" step="0.01" {...register("margem_perda")} />
              </div>
            </div>
            
            <Button type="submit" disabled={isSaving} className="w-full mt-4 bg-[#d97021] hover:bg-[#c3631b]">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Regra"}
            </Button>
          </div>

          {/* Lado Direito: Testador de Fórmula */}
          <div className="bg-zinc-900 rounded-lg p-6 text-zinc-100 flex flex-col">
            <h3 className="font-semibold border-b border-zinc-700 pb-2 mb-4 text-[#d97021]">
              Simulador Integrado
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Insira variáveis abaixo para testar a matemática antes de salvar.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">n_vaos (Arcos)</Label>
                <Input 
                  type="number" 
                  value={testVars.n_vaos} 
                  onChange={e => setTestVars({...testVars, n_vaos: Number(e.target.value)})}
                  className="bg-zinc-800 border-zinc-700 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">n_modulos (Naves)</Label>
                <Input 
                  type="number" 
                  value={testVars.n_modulos} 
                  onChange={e => setTestVars({...testVars, n_modulos: Number(e.target.value)})}
                  className="bg-zinc-800 border-zinc-700 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">pe_direito (m)</Label>
                <Input 
                  type="number" 
                  value={testVars.pe_direito} 
                  onChange={e => setTestVars({...testVars, pe_direito: Number(e.target.value)})}
                  className="bg-zinc-800 border-zinc-700 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">largura_modulo (m)</Label>
                <Input 
                  type="number" 
                  value={testVars.largura_modulo} 
                  onChange={e => setTestVars({...testVars, largura_modulo: Number(e.target.value)})}
                  className="bg-zinc-800 border-zinc-700 h-8"
                />
              </div>
            </div>

            <Button 
              type="button"
              variant="outline"
              onClick={runSimulation}
              className="w-full bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-white mb-6"
            >
              <Play className="h-4 w-4 mr-2 text-emerald-400" />
              Simular Resultado
            </Button>

            <div className="flex-1 bg-zinc-950 rounded border border-zinc-800 p-4">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-2">Saída do Motor:</span>
              
              {!testResult ? (
                <div className="text-sm text-zinc-600 text-center py-4">
                  Clique em Simular para testar a regra.
                </div>
              ) : testResult.success ? (
                testResult.applied ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <div>
                      <p className="text-sm text-emerald-400">Condição Válida!</p>
                      <p className="text-2xl font-bold font-mono text-white">
                        {testResult.qty} {watch("unidade_medida")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-amber-500" />
                    <div>
                      <p className="text-sm text-amber-400">Condição Falsa.</p>
                      <p className="text-sm text-zinc-300 mt-1">
                        Esta regra não seria aplicada neste cenário.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-semibold">Erro de Sintaxe!</p>
                    <p className="text-xs text-red-300/80 font-mono mt-1 break-all">
                      {testResult.error}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
