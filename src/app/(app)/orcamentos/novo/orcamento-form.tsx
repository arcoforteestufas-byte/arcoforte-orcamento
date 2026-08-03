"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calculator, Save, Plus, Download, ArrowLeftRight, User, Ruler, Settings2, ListChecks } from "lucide-react"
import { calcularOrcamento, ItemOrcamento, ParametrosEstufa, Produto, RegraCalculo } from "@/utils/engine"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

type Props = {
  parametrosDef: {
    nome_tecnico: string
    rotulo: string
    tipo: string
    opcoes: any
  }[]
  regras: RegraCalculo[]
  produtos: Produto[]
  clientes: { id: string, nome: string, documento: string | null, cidade_uf: string | null }[]
}

export function OrcamentoForm({ parametrosDef, regras, produtos, clientes }: Props) {
  const router = useRouter()
  const [paramsForm, setParamsForm] = useState<ParametrosEstufa>({})
  const [resultado, setResultado] = useState<ItemOrcamento[]>([])
  
  // Controle de Cliente
  const [localClientes, setLocalClientes] = useState(clientes)
  const [selectedCliente, setSelectedCliente] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [novoCliente, setNovoCliente] = useState({ nome: '', documento: '', cidade_uf: '' })
  const [swapItemIndex, setSwapItemIndex] = useState<number | null>(null)
  
  // Controle de Comprimento e Largura
  const [comprimento, setComprimento] = useState<number | ''>('')
  const [larguraTotal, setLarguraTotal] = useState<number | ''>('')
  const [vaoError, setVaoError] = useState('')
  const [vaoUltimo, setVaoUltimo] = useState<number | ''>('')


  // Mantém a lista atualizada caso o Next.js mande novos props do servidor
  useEffect(() => {
    setLocalClientes(clientes)
  }, [clientes])

  const handleParamChange = (nome_tecnico: string, valor: any) => {
    setParamsForm((prev) => ({
      ...prev,
      [nome_tecnico]: valor
    }))
  }

  // Efeito para calcular n_vaos e comprimento_estufa
  useEffect(() => {
    if (comprimento && paramsForm['vao']) {
      const c = Number(comprimento)
      const vaoNum = Number(paramsForm['vao'])
      
      if (vaoNum > 0) {
        const calculadoNVaos = Math.ceil(c / vaoNum)
        setParamsForm(prev => ({ ...prev, n_vaos: calculadoNVaos }))
        
        if (c % vaoNum !== 0) {
          const resto = c % vaoNum
          setVaoError(`Nota: Como ${c}m não divide perfeitamente por ${vaoNum}m, haverá um vão de ${resto}m no final.`)
          if (vaoUltimo === '') {
            setVaoUltimo(resto)
          }
        } else {
          setVaoError('')
          setVaoUltimo('')
        }
      }
    } else {
      setVaoError('')
      setVaoUltimo('')
    }
  }, [comprimento, paramsForm['vao']])

  // Efeito para atualizar comprimento_estufa no paramsForm
  useEffect(() => {
    if (paramsForm['vao'] && paramsForm['n_vaos']) {
      const vao = Number(paramsForm['vao'])
      const nVaos = Number(paramsForm['n_vaos'])
      const vaoUlt = vaoUltimo !== '' ? Number(vaoUltimo) : vao

      const comprimento_estufa = vao * (nVaos - 1) + vaoUlt
      setParamsForm(prev => ({ ...prev, comprimento_estufa }))
    }
  }, [paramsForm['vao'], paramsForm['n_vaos'], vaoUltimo])

  // Efeito para adivinhar módulos pela largura total
  useEffect(() => {
    if (larguraTotal) {
      const l = Number(larguraTotal)
      const largurasPermitidas = [10, 8, 7] // Preferência para módulos maiores
      for (const w of largurasPermitidas) {
        if (l % w === 0) {
          setParamsForm(prev => ({
            ...prev,
            largura_modulo: w,
            n_modulos: l / w
          }))
          break
        }
      }
    }
  }, [larguraTotal])

  const handleCalcular = () => {
    const itens = calcularOrcamento(paramsForm, regras, produtos)
    setResultado(itens)
  }

  const handleSalvarCliente = async () => {
    if (!novoCliente.nome) return toast.error("O nome é obrigatório")
    
    setIsLoading(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome: novoCliente.nome,
          documento: novoCliente.documento || null,
          cidade_uf: novoCliente.cidade_uf || null,
          vendedor_id: user.id
        })
        .select('id')
        .single()

      if (error) throw error

      setNovoCliente({ nome: '', documento: '', cidade_uf: '' })
      setIsModalOpen(false)
      
      // Adiciona o novo cliente localmente para o Select achar o nome dele imediatamente
      setLocalClientes(prev => [...prev, { 
        id: data.id, 
        nome: novoCliente.nome, 
        documento: novoCliente.documento || null, 
        cidade_uf: novoCliente.cidade_uf || null 
      }])

      // Atualiza a lista na tela chamando o server novamente (isso vai sincronizar o prop via useEffect)
      router.refresh()
      
      // Seleciona o cliente recém criado
      if (data) {
        setSelectedCliente(data.id)
      }
      
      // Feedback pro usuário
      toast.success("Cliente salvo rapidamente!", {
        description: "Lembre-se de ir até a aba 'Clientes' mais tarde para completar o cadastro (telefone, endereço, etc).",
        duration: 5000,
      })
      
    } catch (e: any) {
      toast.error("Erro ao salvar cliente: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSalvarOrcamento = async () => {
    if (!selectedCliente) {
      toast.warning("Selecione um cliente antes de salvar o orçamento.")
      return
    }
    if (resultado.length === 0) {
      toast.warning("Calcule a lista de materiais antes de salvar.")
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const valorTotal = resultado.reduce((acc, curr) => acc + curr.valor_total, 0)

      // 1. Criar o orçamento
      const { data: orcamento, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          cliente_id: selectedCliente,
          vendedor_id: user.id,
          status: 'Rascunho',
          parametros_utilizados: paramsForm,
          valor_total: valorTotal
        })
        .select('id')
        .single()

      if (orcError) throw orcError

      // 2. Inserir os itens
      const itensToInsert = resultado.map(item => ({
        orcamento_id: orcamento.id,
        produto_codigo: item.produto_codigo,
        posicao_id: item.posicao_id || null,
        descricao_customizada: item.isManualChange ? `Substituiu: ${item.manualOriginalProduto}` : null,
        quantidade: item.quantidade_final,
        unidade: item.unidade,
        preco_unitario: item.preco_unitario,
        valor_total: item.valor_total,
        origem: item.isManualChange ? 'manual' : 'regra',
        alterado_por: item.isManualChange ? user.id : null
      }))

      const { error: itensError } = await supabase
        .from('orcamento_itens')
        .insert(itensToInsert)

      if (itensError) {
        // Se a coluna alterado_por não existir, tenta sem ela
        console.warn("Aviso: A coluna alterado_por ainda não existe no banco de dados. O sistema aplicou um fallback ignorando-a.")
        const fallbackItens = itensToInsert.map(({alterado_por, ...rest}) => rest)
        const { error: fallbackError } = await supabase.from('orcamento_itens').insert(fallbackItens)
        if (fallbackError) throw fallbackError
      }

      toast.success("Orçamento salvo com sucesso!")
      router.push('/orcamentos') // Redireciona para a lista
    } catch (e: any) {
      toast.error("Erro ao salvar orçamento: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const valorTotal = resultado.reduce((acc, item) => acc + item.valor_total, 0)

  // Agrupa resultados por categoria para o resumo
  const totalEstrutura = resultado
    .filter(i => !i.grupo_nome.toLowerCase().includes('cobertura') && !i.grupo_nome.toLowerCase().includes('diversos'))
    .reduce((acc, item) => acc + item.valor_total, 0)
  
  const totalCobertura = resultado
    .filter(i => i.grupo_nome.toLowerCase().includes('cobertura'))
    .reduce((acc, item) => acc + item.valor_total, 0)
    
  const totalDiversos = resultado
    .filter(i => i.grupo_nome.toLowerCase().includes('diversos') || i.grupo_nome.toLowerCase().includes('parafuso'))
    .reduce((acc, item) => acc + item.valor_total, 0)

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#d97021] to-[#ff9e5e]" />
          <CardHeader className="bg-white pb-4 border-b border-slate-100">
            <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
              <User className="h-5 w-5 text-[#d97021]" />
              Cliente
            </CardTitle>
            <CardDescription className="text-slate-500">Selecione um cliente existente ou cadastre um novo na hora.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label>Selecione o Cliente</Label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select value={selectedCliente} onValueChange={(v) => setSelectedCliente(v || "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o cliente...">
                        {selectedCliente ? localClientes.find(c => c.id === selectedCliente)?.nome : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {localClientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome} {c.documento ? `(${c.documento})` : ''}
                        </SelectItem>
                      ))}
                      {localClientes.length === 0 && (
                        <div className="px-2 py-4 text-sm text-center text-slate-500">
                          Nenhum cliente cadastrado.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger 
                    render={
                      <Button variant="outline" className="gap-2 text-[#d97021] border-[#d97021] hover:bg-[#fff3eb]" />
                    }
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Novo
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Novo Cliente</DialogTitle>
                    <DialogDescription>
                      Cadastre apenas os dados básicos agora para não perder o orçamento em andamento. Você poderá preencher o restante (telefone, endereço, etc) depois, diretamente na aba de Clientes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome / Razão Social *</Label>
                      <Input 
                        id="nome" 
                        value={novoCliente.nome} 
                        onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})}
                        placeholder="Ex: João Batista" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="documento">CPF / CNPJ</Label>
                        <Input 
                          id="documento" 
                          value={novoCliente.documento}
                          onChange={(e) => setNovoCliente({...novoCliente, documento: e.target.value})}
                          placeholder="Somente números" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cidade">Cidade / UF</Label>
                        <Input 
                          id="cidade" 
                          value={novoCliente.cidade_uf}
                          onChange={(e) => setNovoCliente({...novoCliente, cidade_uf: e.target.value})}
                          placeholder="Ex: Holambra / SP" 
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSalvarCliente} disabled={isLoading} className="bg-[#d97021] hover:bg-[#c3631b]">
                      {isLoading ? "Salvando..." : "Salvar Cliente"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-slate-700 to-slate-900" />
          <CardHeader className="bg-white pb-4 border-b border-slate-100">
            <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
              <Ruler className="h-5 w-5 text-slate-700" />
              Tamanho da Estufa
            </CardTitle>
            <CardDescription className="text-slate-500">Defina as dimensões principais do projeto.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 p-6 bg-slate-50/50">
            {/* Primeira Linha: Comprimento, Largura e Pé-Direito */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              <div className="grid gap-2">
                <Label className="font-bold text-slate-800 uppercase text-xs">Comprimento da Estufa (m)</Label>
                <Input 
                  type="number"
                  value={comprimento}
                  placeholder="Ex: 50"
                  className="bg-white border-slate-300 text-lg py-6"
                  onChange={(e) => setComprimento(Number(e.target.value) || '')}
                />
              </div>

              <div className="grid gap-2">
                <Label className="font-bold text-slate-800 uppercase text-xs">Largura da Estufa (m)</Label>
                <Input 
                  type="number"
                  value={larguraTotal}
                  placeholder="Ex: 14"
                  className="bg-white border-slate-300 text-lg py-6"
                  onChange={(e) => setLarguraTotal(Number(e.target.value) || '')}
                />
              </div>

              {(() => {
                const param = parametrosDef.find(p => p.nome_tecnico === 'pe_direito')
                if (!param) return null
                const opcoes: string[] = Array.isArray(param.opcoes) ? param.opcoes : JSON.parse(param.opcoes as string || '[]')
                return (
                  <div className="grid gap-2">
                    <Label className="font-bold text-slate-800 uppercase text-xs">{param.rotulo}</Label>
                    <Select onValueChange={(val) => handleParamChange(param.nome_tecnico, Number(val))}>
                      <SelectTrigger className="bg-white border-slate-300 text-lg py-6"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })()}
            </div>

            {/* Segunda Linha: Módulos, Largura e Tamanho do Vão */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              {(() => {
                const paramModulos = parametrosDef.find(p => p.nome_tecnico === 'n_modulos')
                return paramModulos ? (
                  <div className="grid gap-2">
                    <Label className="font-bold text-slate-800 uppercase text-xs">{paramModulos.rotulo}</Label>
                    <Input 
                      type="number" 
                      value={paramsForm['n_modulos'] as number || ''}
                      placeholder="Ex: 2"
                      className="bg-white border-slate-300 text-lg py-6"
                      onChange={(e) => handleParamChange('n_modulos', Number(e.target.value))}
                    />
                  </div>
                ) : null
              })()}

              {(() => {
                const paramLargura = parametrosDef.find(p => p.nome_tecnico === 'largura_modulo')
                if (!paramLargura) return null
                const opcoes: string[] = Array.isArray(paramLargura.opcoes) ? paramLargura.opcoes : JSON.parse(paramLargura.opcoes as string || '[]')
                return (
                  <div className="grid gap-2">
                    <Label className="font-bold text-slate-800 uppercase text-xs">{paramLargura.rotulo}</Label>
                    <Select value={paramsForm['largura_modulo']?.toString() || ''} onValueChange={(val) => handleParamChange('largura_modulo', Number(val))}>
                      <SelectTrigger className="bg-white border-slate-300 text-lg py-6"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })()}

              {(() => {
                const paramVao = parametrosDef.find(p => p.nome_tecnico === 'vao')
                if (!paramVao) return null
                const opcoes: string[] = Array.isArray(paramVao.opcoes) ? paramVao.opcoes : JSON.parse(paramVao.opcoes as string || '[]')
                return (
                  <div className="grid gap-2">
                    <Label className="font-bold text-slate-800 uppercase text-xs">{paramVao.rotulo}</Label>
                    <Select onValueChange={(val) => handleParamChange('vao', Number(val))}>
                      <SelectTrigger className="bg-white border-slate-300 text-lg py-6"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })()}
            </div>
            
            {comprimento && paramsForm['vao'] && !vaoError && (
              <div className="text-sm text-slate-500 font-medium bg-slate-200/50 p-3 rounded-md mt-2 flex items-center gap-2">
                <span className="text-[#d97021]">ℹ</span>
                O sistema calculou automaticamente {paramsForm['n_vaos']} vãos para cobrir o comprimento de {comprimento}m.
              </div>
            )}
            {vaoError && (
              <div className="grid gap-2 mt-4 bg-orange-50 p-4 rounded-md border border-orange-200">
                <div className="text-sm text-orange-800 font-medium flex items-center gap-2 mb-2">
                  <span className="text-orange-600 font-bold">!</span>
                  {vaoError}
                </div>
                <div className="grid gap-2 sm:w-1/3">
                  <Label className="font-bold text-orange-900 uppercase text-xs">Tamanho do último vão (m)</Label>
                  <Input 
                    type="number"
                    value={vaoUltimo}
                    onChange={(e) => setVaoUltimo(Number(e.target.value) || '')}
                    className="bg-white border-orange-300 text-lg py-6 focus-visible:ring-orange-500"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-slate-400 to-slate-600" />
          <CardHeader className="bg-white pb-4 border-b border-slate-100">
            <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-slate-600" />
              Condições e Acessórios
            </CardTitle>
            <CardDescription className="text-slate-500">Preencha os demais parâmetros técnicos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 grid-cols-1 md:grid-cols-2 p-6">
            {parametrosDef.filter(p => !['n_modulos', 'largura_modulo', 'n_vaos', 'pe_direito', 'vao'].includes(p.nome_tecnico)).map((param) => {
              if (param.tipo === 'booleano') {
                return (
                  <div key={param.nome_tecnico} className="col-span-2 flex items-center space-x-2 mt-2">
                    <Checkbox 
                      id={param.nome_tecnico} 
                      checked={!!paramsForm[param.nome_tecnico]}
                      onCheckedChange={(c) => handleParamChange(param.nome_tecnico, c)}
                    />
                    <Label htmlFor={param.nome_tecnico} className="text-sm font-medium leading-none">
                      {param.rotulo}
                    </Label>
                  </div>
                )
              }

              if (param.tipo === 'selecao' && param.opcoes) {
                const opcoes: string[] = Array.isArray(param.opcoes) ? param.opcoes : JSON.parse(param.opcoes as string || '[]')
                return (
                  <div key={param.nome_tecnico} className="grid gap-2">
                    <Label className="uppercase text-xs font-semibold text-slate-600">{param.rotulo}</Label>
                    <Select onValueChange={(val) => {
                      const num = Number(val)
                      handleParamChange(param.nome_tecnico, isNaN(num) ? val : num)
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              return (
                <div key={param.nome_tecnico} className="grid gap-2">
                  <Label className="uppercase text-xs font-semibold text-slate-600">{param.rotulo}</Label>
                  <Input 
                    type={param.tipo === 'numero' ? 'number' : 'text'} 
                    placeholder={`Ex: ${param.tipo === 'numero' ? '10' : ''}`}
                    onChange={(e) => {
                      const val = param.tipo === 'numero' ? Number(e.target.value) : e.target.value
                      handleParamChange(param.nome_tecnico, val)
                    }}
                  />
                </div>
              )
            })}
          </CardContent>
          <CardFooter className="bg-muted/30 pt-6">
            <Button onClick={handleCalcular} className="w-full gap-2 text-lg py-6 bg-[#d97021] hover:bg-[#c3631b] text-white">
              <Calculator className="h-5 w-5" />
              Calcular Lista de Materiais
            </Button>
          </CardFooter>
        </Card>

        {resultado.length > 0 && (
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-700" />
            <CardHeader className="bg-white pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                Lista de Materiais
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 text-slate-600 border-slate-300 hover:bg-slate-100"
                  onClick={async () => {
                    const cliente = localClientes.find(c => c.id === selectedCliente)
                    const { gerarPDFOrcamento } = await import('@/utils/pdf-generator')
                    gerarPDFOrcamento({ id: 'RASCUNHO', clientes: { nome: cliente?.nome || '' } }, resultado, false)
                  }}
                >
                  <Download className="h-4 w-4" />
                  PDF Detalhado
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 border-[#d97021] text-[#d97021] hover:bg-[#fff3eb] hidden sm:flex"
                  onClick={async () => {
                    const cliente = localClientes.find(c => c.id === selectedCliente)
                    const { gerarPDFOrcamento } = await import('@/utils/pdf-generator')
                    gerarPDFOrcamento({ id: 'RASCUNHO', clientes: { nome: cliente?.nome || '' } }, resultado, true)
                  }}
                >
                  <Download className="h-4 w-4" />
                  PDF Agrupado
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Agrupar por grupo para exibição */}
                {Array.from(new Set(resultado.map(i => i.grupo_nome))).map(grupo => (
                  <div key={grupo}>
                    <h3 className="font-bold border-b pb-2 mb-3 text-slate-700">{grupo}</h3>
                    <div className="space-y-2">
                      {resultado.filter(i => i.grupo_nome === grupo).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{item.produto_descricao}</span>
                            <span className="text-xs text-muted-foreground ml-2">({item.posicao_nome})</span>
                            {item.isManualChange && (
                              <Badge variant="outline" className="ml-2 mt-1 text-[10px] h-5 bg-orange-50 text-orange-600 border-orange-200 w-fit">Alterado Manualmente</Badge>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end min-w-[90px]">
                            <span className="font-bold">{item.quantidade_final} {item.unidade}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground block">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_total)}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-slate-400 hover:text-[#d97021]"
                                onClick={() => setSwapItemIndex(resultado.indexOf(item))}
                                title="Trocar Produto"
                              >
                                <ArrowLeftRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={swapItemIndex !== null} onOpenChange={(open) => { if (!open) setSwapItemIndex(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Substituir Produto</DialogTitle>
              <DialogDescription>
                Selecione o novo produto para este item. Essa ação ficará registrada no orçamento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {swapItemIndex !== null && (
                <div className="text-sm bg-slate-50 p-3 rounded border">
                  <span className="font-semibold block mb-1 text-slate-700">Substituindo original:</span>
                  <p>{resultado[swapItemIndex].produto_descricao}</p>
                  <p className="text-xs text-muted-foreground mt-1">Quantidade calculada: {resultado[swapItemIndex].quantidade_final} {resultado[swapItemIndex].unidade}</p>
                </div>
              )}
              <div className="grid gap-2 mt-2">
                <Label>Novo Produto do Catálogo</Label>
                <Select onValueChange={(val) => {
                  if (swapItemIndex === null) return
                  const prod = produtos.find(p => p.codigo === val)
                  if (prod) {
                    const newRes = [...resultado]
                    const original = newRes[swapItemIndex]
                    newRes[swapItemIndex] = {
                      ...original,
                      produto_codigo: prod.codigo,
                      produto_descricao: prod.descricao,
                      preco_unitario: prod.preco_unitario,
                      valor_total: prod.preco_unitario * original.quantidade_final,
                      isManualChange: true,
                      manualOriginalProduto: original.produto_codigo
                    }
                    setResultado(newRes)
                    setSwapItemIndex(null)
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione ou busque..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                     {produtos.map(p => (
                       <SelectItem key={p.codigo} value={p.codigo}>{p.descricao} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco_unitario)}</SelectItem>
                     ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSwapItemIndex(null)}>Cancelar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Card className="sticky top-6 shadow-md bg-zinc-900 text-white border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-300">Resumo Financeiro</CardTitle>
            <CardDescription className="text-zinc-500">Total calculado dinamicamente</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-4xl font-bold text-[#d97021] mb-6">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Itens de Estrutura</span>
                <span className="text-zinc-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEstrutura)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Cobertura / Plásticos</span>
                <span className="text-zinc-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCobertura)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Diversos / Parafusos</span>
                <span className="text-zinc-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDiversos)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-6 hidden md:flex">
            <Button 
              className="w-full gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white"
              onClick={handleSalvarOrcamento}
              disabled={isLoading}
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Salvando..." : "Salvar Orçamento"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-50">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-zinc-400 text-sm font-medium">Total:</span>
          <span className="text-2xl font-bold text-[#d97021]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
          </span>
        </div>
        <Button 
          className="w-full gap-2 text-lg py-6 bg-[#d97021] hover:bg-[#c3631b] text-white"
          onClick={handleSalvarOrcamento}
          disabled={isLoading}
        >
          <Save className="h-5 w-5" />
          {isLoading ? "Salvando..." : "Salvar Orçamento"}
        </Button>
      </div>
    </div>
  )
}
