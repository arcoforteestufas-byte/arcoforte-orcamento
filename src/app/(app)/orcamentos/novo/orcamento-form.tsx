"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calculator, Save, Plus, Download, ArrowLeftRight, User, Ruler, Settings2, ListChecks, Image as ImageIcon } from "lucide-react"
import { calcularOrcamento, ItemOrcamento, ParametrosEstufa, Produto, RegraCalculo } from "@/utils/engine"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useRouter, useSearchParams } from "next/navigation"
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
  const searchParams = useSearchParams()
  
  const initialCroquiUrl = searchParams.get('croqui_url') || undefined
  const initialCroquiId = searchParams.get('croqui_id') || undefined
  const initialC = searchParams.get('c') ? Number(searchParams.get('c')) : ''
  const initialL = searchParams.get('l') ? Number(searchParams.get('l')) : ''
  const initialA = searchParams.get('a') ? Number(searchParams.get('a')) : undefined

  const [paramsForm, setParamsForm] = useState<ParametrosEstufa>({
    croqui_url: initialCroquiUrl || '',
    croqui_id: initialCroquiId || '',
    pe_direito: initialA || ''
  })
  const [resultado, setResultado] = useState<ItemOrcamento[]>([])
  
  // Controle de Cliente
  const [localClientes, setLocalClientes] = useState(clientes)
  const [selectedCliente, setSelectedCliente] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [novoCliente, setNovoCliente] = useState({ nome: '', documento: '', cidade_uf: '' })
  const [swapItemIndex, setSwapItemIndex] = useState<number | null>(null)
  
  const [comprimento, setComprimento] = useState<number | ''>(initialC)
  const [larguraTotal, setLarguraTotal] = useState<number | ''>(initialL)
  const [vaoError, setVaoError] = useState('')
  const [vaoUltimo, setVaoUltimo] = useState<number | ''>('')
  
  const [portasConfig, setPortasConfig] = useState<{ id: string, quantidade: number | '', tipo: string }[]>([])
  const [anticamaraConfig, setAnticamaraConfig] = useState<{ id: string, quantidade: number | '', modelo: string }[]>([])

  // Efeito para sincronizar portasConfig com qtd_portas_abrir e qtd_portas_correr
  useEffect(() => {
    let abrir = 0;
    let correr = 0;
    portasConfig.forEach(p => {
      const q = Number(p.quantidade) || 0;
      if (p.tipo === 'abrir') abrir += q;
      if (p.tipo === 'correr') correr += q;
    });
    setParamsForm(prev => ({
      ...prev,
      portas_abrir: abrir > 0 ? abrir : '',
      portas_correr: correr > 0 ? correr : ''
    }));
  }, [portasConfig])

  // Efeito para sincronizar anticamaraConfig com anticamara_frontal e anticamara_lateral
  // (3150 = Anti-Camara Frontal, 3160 = Anti-Camara Lateral)
  useEffect(() => {
    let frontal = 0;
    let lateral = 0;
    anticamaraConfig.forEach(a => {
      const q = Number(a.quantidade) || 0;
      if (a.modelo === '3150') frontal += q;
      if (a.modelo === '3160') lateral += q;
    });
    setParamsForm(prev => ({
      ...prev,
      anticamara_frontal: frontal > 0 ? frontal : '',
      anticamara_lateral: lateral > 0 ? lateral : ''
    }));
  }, [anticamaraConfig])


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

  // Efeito reverso: Atualizar larguraTotal se os módulos mudarem manualmente
  useEffect(() => {
    const n = Number(paramsForm['n_modulos']) || 0
    const w = Number(paramsForm['largura_modulo']) || 0
    if (n > 0 && w > 0) {
      const calc = n * w
      if (calc !== Number(larguraTotal)) {
        setLarguraTotal(calc)
      }
    }
  }, [paramsForm['n_modulos'], paramsForm['largura_modulo']])

  // Limpar configurações de postes duplos se o poste mudar para EUCALIPTO
  useEffect(() => {
    if (paramsForm['tipo_poste'] === 'EUCALIPTO') {
      setParamsForm(prev => ({
        ...prev,
        master_postes_duplos: false,
        postes_frontais_duplos: false,
        postes_topo_duplos: false,
        postes_divisa_duplos: false
      }))
    }
  }, [paramsForm['tipo_poste']])

  const handleCalcular = () => {
    const nDivisasPorModulo = Number(paramsForm['n_divisas_por_modulo']) || 0
    const nModulosCalc = Number(paramsForm['n_modulos']) || 0
    const paramsCalculo = {
      ...paramsForm,
      n_divisas: nDivisasPorModulo * nModulosCalc // total de arcos de divisa = por modulo x numero de modulos
    }
    const itens = calcularOrcamento(paramsCalculo, regras, produtos)
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
  const isFilme = (g: string) => {
    const l = g.toLowerCase();
    return l.includes('filme') || l.includes('plástico') || l.includes('plastico') || l.includes('cobertura');
  };
  const isTela = (g: string) => {
    const l = g.toLowerCase();
    return l.includes('tela') && !isFilme(g);
  };
  const isEstrutura = (g: string) => !isFilme(g) && !isTela(g);

  const totalEstrutura = resultado.filter(i => isEstrutura(i.grupo_nome)).reduce((acc, item) => acc + item.valor_total, 0)
  const totalFilmes = resultado.filter(i => isFilme(i.grupo_nome)).reduce((acc, item) => acc + item.valor_total, 0)
  const totalTelas = resultado.filter(i => isTela(i.grupo_nome)).reduce((acc, item) => acc + item.valor_total, 0)

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr] pb-36 md:pb-0">
      <div className="flex flex-col gap-6">
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#d97021] to-[#ff9e5e]" />
          <CardHeader className="bg-white pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#d97021]" />
                  Cliente
                </CardTitle>
                <CardDescription className="text-slate-500">Selecione um cliente existente ou cadastre um novo na hora.</CardDescription>
              </div>
              {paramsForm.croqui_url && (
                <Badge variant="outline" className="bg-[#d97021]/10 text-[#d97021] border-[#d97021]/20 gap-1 hidden sm:flex">
                  <ImageIcon className="w-3 h-3" />
                  Croqui Anexado
                </Badge>
              )}
            </div>
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
            {/* Primeira Linha: Largura, Comprimento e Altura */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
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

              {(() => {
                const param = parametrosDef.find(p => p.nome_tecnico === 'pe_direito')
                if (!param) return null
                const opcoes: string[] = Array.isArray(param.opcoes) ? param.opcoes : JSON.parse(param.opcoes as string || '[]')
                return (
                  <div className="grid gap-2">
                    <Label className="font-bold text-slate-800 uppercase text-xs">Altura (m)</Label>
                    <Select value={paramsForm['pe_direito']?.toString() || ''} onValueChange={(val) => handleParamChange(param.nome_tecnico, Number(val))}>
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
            {parametrosDef
              .filter(p => !['n_modulos', 'largura_modulo', 'n_vaos', 'pe_direito', 'vao', 'portas_abrir', 'portas_correr'].includes(p.nome_tecnico))
              .sort((a, b) => {
                const getWeight = (nome: string) => {
                  if (nome === 'tipo_arco') return 1;
                  if (nome === 'tipo_poste') return 2;
                  if (nome === 'calha_lateral') return 3;
                  if (nome.includes('poste')) return 4;
                  if (nome === 'arco_divisa') return 5;
                  if (nome === 'fechamento_lateral') return 99;
                  if (nome === 'fixacao_inferior') return 100;
                  return 50;
                };
                return getWeight(a.nome_tecnico) - getWeight(b.nome_tecnico);
              })
              .map((param) => {
              if (param.nome_tecnico === 'postes_topo_duplos' || param.nome_tecnico === 'postes_divisa_duplos' || param.nome_tecnico === 'tipo_fixacao_inferior') return null;

              if (param.nome_tecnico === 'postes_frontais_duplos') {
                const p2 = parametrosDef.find(p => p.nome_tecnico === 'postes_topo_duplos');
                const p3 = parametrosDef.find(p => p.nome_tecnico === 'postes_divisa_duplos');
                
                const isEucalipto = paramsForm['tipo_poste'] === 'EUCALIPTO';

                return (
                  <div key="master_postes_duplos" className={`col-span-2 flex flex-col mt-2 ${isEucalipto ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master_postes_duplos" 
                        disabled={isEucalipto}
                        checked={!!paramsForm['master_postes_duplos']}
                        onCheckedChange={(c) => {
                          handleParamChange('master_postes_duplos', c)
                          if (!c) {
                              handleParamChange('postes_frontais_duplos', false)
                              if (p2) handleParamChange('postes_topo_duplos', false)
                              if (p3) handleParamChange('postes_divisa_duplos', false)
                          }
                        }}
                      />
                      <Label htmlFor="master_postes_duplos" className="text-sm font-bold leading-none cursor-pointer">
                        Poste de canto - frontal - divisas duplos?
                      </Label>
                    </div>
                    {paramsForm['master_postes_duplos'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={param.nome_tecnico} checked={!!paramsForm[param.nome_tecnico]} onCheckedChange={(c) => handleParamChange(param.nome_tecnico, c)} />
                            <Label htmlFor={param.nome_tecnico} className="text-sm font-medium leading-none cursor-pointer">{param.rotulo}</Label>
                          </div>
                          {p2 && (
                            <div className="flex items-center space-x-2">
                              <Checkbox id={p2.nome_tecnico} checked={!!paramsForm[p2.nome_tecnico]} onCheckedChange={(c) => handleParamChange(p2.nome_tecnico, c)} />
                              <Label htmlFor={p2.nome_tecnico} className="text-sm font-medium leading-none cursor-pointer">{p2.rotulo}</Label>
                            </div>
                          )}
                          {p3 && (
                            <div className="flex items-center space-x-2">
                              <Checkbox id={p3.nome_tecnico} checked={!!paramsForm[p3.nome_tecnico]} onCheckedChange={(c) => handleParamChange(p3.nome_tecnico, c)} />
                              <Label htmlFor={p3.nome_tecnico} className="text-sm font-medium leading-none cursor-pointer">{p3.rotulo}</Label>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )
              }

              if (param.nome_tecnico === 'fixacao_inferior') {
                const tipoFixacaoInferior = parametrosDef.find(p => p.nome_tecnico === 'tipo_fixacao_inferior');
                return (
                  <div key="master_fixacao_inferior" className="col-span-1 md:col-span-2 flex flex-col mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="fixacao_inferior" 
                        checked={!!paramsForm['fixacao_inferior']}
                        onCheckedChange={(c) => {
                          handleParamChange('fixacao_inferior', c)
                          if (!c) handleParamChange('tipo_fixacao_inferior', '')
                        }}
                      />
                      <Label htmlFor="fixacao_inferior" className="text-sm font-bold leading-none cursor-pointer">
                        {param.rotulo}
                      </Label>
                    </div>
                    {paramsForm['fixacao_inferior'] && tipoFixacaoInferior && (
                      <div className="grid gap-2 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        <Label className="uppercase text-xs font-semibold text-slate-600">{tipoFixacaoInferior.rotulo}</Label>
                        <Select 
                          value={paramsForm['tipo_fixacao_inferior']?.toString() || ''}
                          onValueChange={(val) => handleParamChange('tipo_fixacao_inferior', val)}
                        >
                          <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {JSON.parse(tipoFixacaoInferior.opcoes as string || '[]').map((op: string) => (
                              <SelectItem key={op} value={op}>{op}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )
              }

              if (param.nome_tecnico === 'travamentos_x') {
                return (
                  <div key="master_travamentos_x" className="col-span-1 md:col-span-2 flex flex-col mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master_travamentos_x" 
                        checked={!!paramsForm['master_travamentos_x']}
                        onCheckedChange={(c) => {
                          handleParamChange('master_travamentos_x', c)
                          if (!c) {
                              handleParamChange('travamentos_x', '')
                          }
                        }}
                      />
                      <Label htmlFor="master_travamentos_x" className="text-sm font-bold leading-none cursor-pointer">
                        Possui travamento em X nas linhas de poste?
                      </Label>
                    </div>
                    {paramsForm['master_travamentos_x'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[300px] max-w-full">
                        <div className="grid gap-2">
                          <Label className="uppercase text-xs font-semibold text-slate-600">Quantos X por linha?</Label>
                          <Input 
                            type="number"
                            placeholder="Ex: 1"
                            value={paramsForm['travamentos_x']?.toString() || ''}
                            onChange={(e) => handleParamChange('travamentos_x', Number(e.target.value) || '')}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              if (param.nome_tecnico === 'modelo_cabo') {
                const opcoes: string[] = Array.isArray(param.opcoes) ? param.opcoes : JSON.parse(param.opcoes as string || '[]')
                const dropdownOpcoes = opcoes.filter(o => o !== "SEM CABO DE AÇO" && o !== "COMPLETO")
                
                const atuais = paramsForm['modelo_cabo'] ? String(paramsForm['modelo_cabo']).split(',').map(s => s.trim()).filter(Boolean) : []
                const isCompleto = dropdownOpcoes.length > 0 && dropdownOpcoes.every(op => atuais.includes(op))
                
                const toggleOpcao = (op: string, checked: boolean) => {
                  let novos = [...atuais].filter(x => x !== 'COMPLETO')
                  
                  if (op === 'COMPLETO') {
                    if (checked) novos = [...dropdownOpcoes]
                    else novos = []
                  } else {
                    if (checked) novos.push(op)
                    else novos = novos.filter(x => x !== op)
                  }
                  
                  if (dropdownOpcoes.length > 0 && dropdownOpcoes.every(o => novos.includes(o))) {
                    novos.push('COMPLETO')
                  }

                  handleParamChange('modelo_cabo', novos.join(','))
                }

                return (
                  <div key="master_modelo_cabo" className="col-span-1 md:col-span-2 flex flex-col mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master_modelo_cabo" 
                        checked={!!paramsForm['master_modelo_cabo']}
                        onCheckedChange={(c) => {
                          handleParamChange('master_modelo_cabo', c)
                          if (!c) handleParamChange('modelo_cabo', '')
                        }}
                      />
                      <Label htmlFor="master_modelo_cabo" className="text-sm font-bold leading-none cursor-pointer">
                        Possui cabo de aço na estrutura?
                      </Label>
                    </div>
                    {paramsForm['master_modelo_cabo'] && (
                      <div className="grid gap-3 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        <Label className="uppercase text-xs font-semibold text-slate-600 mb-1">Em quais lugares vai o cabo de aço? (Selecione um ou mais)</Label>
                        
                        <div className="flex items-center space-x-2 mb-2 pb-3 border-b border-slate-200">
                          <Checkbox 
                            id="cabo_COMPLETO" 
                            checked={isCompleto}
                            onCheckedChange={(c) => toggleOpcao('COMPLETO', !!c)}
                          />
                          <Label htmlFor="cabo_COMPLETO" className="text-sm font-bold leading-none cursor-pointer">
                            COMPLETO (Selecionar Todos)
                          </Label>
                        </div>

                        {dropdownOpcoes.map(op => (
                          <div key={op} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`cabo_${op}`} 
                              checked={atuais.includes(op)}
                              onCheckedChange={(c) => toggleOpcao(op, !!c)}
                            />
                            <Label htmlFor={`cabo_${op}`} className="text-sm font-medium leading-none cursor-pointer">
                              {op}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              if (param.nome_tecnico === 'tipo_cobertura') {
                const isFilme = paramsForm['tipo_cobertura'] === 'FILME'
                const isTela = paramsForm['tipo_cobertura'] === 'TELA'
                const showProducts = isFilme || isTela
                
                return (
                  <div key="master_tipo_cobertura" className="col-span-1 md:col-span-2 flex flex-col mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master_tipo_cobertura" 
                        checked={!!paramsForm['master_tipo_cobertura']}
                        onCheckedChange={(c) => {
                          handleParamChange('master_tipo_cobertura', c)
                          if (!c) {
                            handleParamChange('tipo_cobertura', '')
                            handleParamChange('produto_filme_cobertura', '')
                          }
                        }}
                      />
                      <Label htmlFor="master_tipo_cobertura" className="text-sm font-bold leading-none cursor-pointer">
                        Possui Cobertura?
                      </Label>
                    </div>

                    {paramsForm['master_tipo_cobertura'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        <div className="grid gap-2">
                          <Label className="uppercase text-xs font-semibold text-slate-600">Qual o tipo de cobertura?</Label>
                          <Select 
                            value={paramsForm['tipo_cobertura']?.toString() || ''}
                            onValueChange={(val) => {
                              handleParamChange('tipo_cobertura', val)
                              handleParamChange('produto_filme_cobertura', '') // reseta o produto ao mudar
                            }}
                          >
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FILME">FILME</SelectItem>
                              <SelectItem value="TELA">TELA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {showProducts && (
                          <div className="grid gap-2 pt-2 border-t border-slate-200">
                            <Label className="uppercase text-xs font-semibold text-slate-600">
                              {isFilme ? 'Qual Filme / Plástico?' : 'Qual Tela?'}
                            </Label>
                            <Select 
                              value={paramsForm['produto_filme_cobertura']?.toString() || ''}
                              onValueChange={(val) => handleParamChange('produto_filme_cobertura', val)}
                            >
                              <SelectTrigger className="bg-white w-full">
                                <SelectValue placeholder="Selecione o produto...">
                                  {paramsForm['produto_filme_cobertura']
                                    ? (() => {
                                      const prod = produtos.find(p => p.codigo.toString() === paramsForm['produto_filme_cobertura']?.toString());
                                      return prod ? `${prod.codigo} - ${prod.descricao}` : paramsForm['produto_filme_cobertura']?.toString();
                                    })()
                                    : undefined
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="min-w-[300px] md:min-w-[500px] max-w-[90vw] max-h-[400px]">
                                {produtos
                                  .filter(p => {
                                    const desc = p.descricao.toUpperCase()
                                    if (isFilme) {
                                      return desc.includes('FILME') || desc.includes('PLÁSTICO') || desc.includes('PLASTICO') || desc.includes('LONA')
                                    } else {
                                      return desc.includes('TELA') || desc.includes('SOMBRITE') || desc.includes('REDE')
                                    }
                                  })
                                  .map(p => (
                                    <SelectItem key={p.codigo} value={p.codigo.toString()} className="w-full truncate">{p.codigo} - {p.descricao}</SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              if (param.tipo === 'booleano') {
                return (
                  <div key={param.nome_tecnico} className="col-span-2 flex flex-col mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={param.nome_tecnico} 
                        checked={!!paramsForm[param.nome_tecnico]}
                        onCheckedChange={(c) => {
                          handleParamChange(param.nome_tecnico, c)
                          if (param.nome_tecnico === 'arco_divisa' && !c) {
                            handleParamChange('n_divisas_por_modulo', '') // reseta a quantidade ao desmarcar
                          }
                          if (param.nome_tecnico === 'possui_anticamara') {
                            if (!c) {
                              setAnticamaraConfig([])
                            } else if (anticamaraConfig.length === 0) {
                              setAnticamaraConfig([{ id: Math.random().toString(36).substring(2, 9), quantidade: '', modelo: '' }])
                            }
                          }
                        }}
                      />
                      <Label htmlFor={param.nome_tecnico} className="text-sm font-medium leading-none cursor-pointer">
                        {param.rotulo}
                      </Label>
                    </div>


                    {param.nome_tecnico === 'fechamento_lateral' && paramsForm['fechamento_lateral'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        <div className="grid gap-2">
                          <Label className="uppercase text-xs font-semibold text-slate-600">O que será usado no fechamento lateral?</Label>
                          <Select 
                            value={paramsForm['tipo_fechamento_material']?.toString() || ''}
                            onValueChange={(val) => {
                              handleParamChange('tipo_fechamento_material', val)
                              handleParamChange('produto_filme_fechamento', '') // reseta o produto ao mudar
                            }}
                          >
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="filme">Filme / Plástico</SelectItem>
                              <SelectItem value="tela">Tela</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {paramsForm['tipo_fechamento_material'] && (
                          <div className="grid gap-2 pt-2 border-t border-slate-200">
                            <Label className="uppercase text-xs font-semibold text-slate-600">
                              {paramsForm['tipo_fechamento_material'] === 'filme' ? 'Qual Filme / Plástico?' : 'Qual Tela?'}
                            </Label>
                            <Select 
                              value={paramsForm['produto_filme_fechamento']?.toString() || ''}
                              onValueChange={(val) => handleParamChange('produto_filme_fechamento', val)}
                            >
                              <SelectTrigger className="bg-white w-full">
                                <SelectValue placeholder="Selecione o produto...">
                                  {paramsForm['produto_filme_fechamento']
                                    ? (() => {
                                      const prod = produtos.find(p => p.codigo.toString() === paramsForm['produto_filme_fechamento']?.toString());
                                      return prod ? `${prod.codigo} - ${prod.descricao}` : paramsForm['produto_filme_fechamento']?.toString();
                                    })()
                                    : undefined
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="max-w-[90vw] md:max-w-[600px] max-h-[400px]">
                                {produtos
                                  .filter(p => {
                                    const desc = p.descricao.toUpperCase()
                                    if (paramsForm['tipo_fechamento_material'] === 'filme') {
                                      return desc.includes('FILME') || desc.includes('PLÁSTICO') || desc.includes('PLASTICO') || desc.includes('LONA')
                                    } else {
                                      return desc.includes('TELA') || desc.includes('SOMBRITE') || desc.includes('REDE')
                                    }
                                  })
                                  .map(p => (
                                    <SelectItem key={p.codigo} value={p.codigo.toString()} className="w-full truncate">{p.codigo} - {p.descricao}</SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {param.nome_tecnico === 'arco_divisa' && paramsForm['arco_divisa'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        <div className="grid gap-2">
                          <Label className="uppercase text-xs font-semibold text-slate-600">Quantos arcos de divisa por módulo?</Label>
                          <Input 
                            type="number"
                            placeholder="Ex: 1"
                            value={paramsForm['n_divisas_por_modulo']?.toString() || ''}
                            onChange={(e) => handleParamChange('n_divisas_por_modulo', Number(e.target.value) || '')}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {param.nome_tecnico === 'possui_anticamara' && paramsForm['possui_anticamara'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        {anticamaraConfig.map((item, index) => (
                          <div key={item.id} className="flex flex-col sm:flex-row items-end gap-4 relative pr-12">
                            <div className="grid gap-2 flex-1 w-full">
                              <Label className="uppercase text-[10px] font-semibold text-slate-600">Quantas?</Label>
                              <Input 
                                type="number"
                                placeholder="Ex: 2"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const newConfig = [...anticamaraConfig];
                                  newConfig[index].quantidade = e.target.value === '' ? '' : Number(e.target.value);
                                  setAnticamaraConfig(newConfig);
                                }}
                                className="bg-white"
                              />
                            </div>
                            <div className="grid gap-2 flex-[2] w-full">
                              <Label className="uppercase text-[10px] font-semibold text-slate-600">Qual o modelo da anticâmara?</Label>
                              <Select 
                                value={item.modelo}
                                onValueChange={(val) => {
                                  const newConfig = [...anticamaraConfig];
                                  newConfig[index].modelo = val ?? "";
                                  setAnticamaraConfig(newConfig);
                                }}
                              >
                                <SelectTrigger className="bg-white w-full">
                                  <SelectValue placeholder="Selecione o produto...">
                                    {item.modelo
                                      ? (() => {
                                          const prod = produtos.find(p => p.codigo.toString() === item.modelo);
                                          return prod ? `${prod.codigo} - ${prod.descricao}` : item.modelo;
                                        })()
                                      : undefined
                                    }
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-w-[90vw] md:max-w-[600px] max-h-[400px]">
                                  {produtos
                                    .filter(p => p.descricao.toUpperCase().includes('ANTICAMARA') || p.descricao.toUpperCase().includes('ANTICÂMARA') || p.descricao.toUpperCase().includes('ANTI CAMARA'))
                                    .map(p => (
                                      <SelectItem key={p.codigo} value={p.codigo.toString()} className="w-full truncate">{p.codigo} - {p.descricao}</SelectItem>
                                    ))
                                  }
                                </SelectContent>
                              </Select>
                            </div>
                            {anticamaraConfig.length > 1 && (
                              <Button 
                                variant="ghost" 
                                onClick={() => setAnticamaraConfig(anticamaraConfig.filter((_, i) => i !== index))}
                                className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 rounded-full"
                                title="Remover"
                              >
                                <span className="sr-only">Remover</span>
                                ✕
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button 
                          variant="outline"
                          className="w-full border-dashed border-[#d97021] text-[#d97021] hover:bg-[#fff3eb] mt-2"
                          onClick={() => setAnticamaraConfig([...anticamaraConfig, { id: Math.random().toString(36).substring(2, 9), quantidade: '', modelo: '' }])}
                        >
                          + Adicionar outro modelo de anticâmara
                        </Button>
                      </div>
                    )}
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
                      <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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

            {/* Secao de Portas Customizada */}
            <div className="col-span-1 md:col-span-2 flex flex-col mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="master_portas" 
                  checked={!!paramsForm['master_portas']}
                  onCheckedChange={(c) => {
                    handleParamChange('master_portas', c)
                    if (!c) {
                      setPortasConfig([])
                    } else if (portasConfig.length === 0) {
                      setPortasConfig([{ id: Math.random().toString(36).substring(2, 9), quantidade: '', tipo: '' }])
                    }
                  }}
                />
                <Label htmlFor="master_portas" className="text-sm font-bold leading-none cursor-pointer">
                  Possui Portas?
                </Label>
              </div>

              {paramsForm['master_portas'] && (
                <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                  {portasConfig.map((porta, index) => (
                    <div key={porta.id} className="flex flex-col sm:flex-row items-end gap-4 relative pr-12">
                      <div className="grid gap-2 flex-1 w-full">
                        <Label className="uppercase text-[10px] font-semibold text-slate-600">Quantas Portas?</Label>
                        <Input 
                          type="number"
                          placeholder="Ex: 2"
                          value={porta.quantidade}
                          onChange={(e) => {
                            const newConfig = [...portasConfig];
                            newConfig[index].quantidade = e.target.value === '' ? '' : Number(e.target.value);
                            setPortasConfig(newConfig);
                          }}
                          className="bg-white"
                        />
                      </div>
                      <div className="grid gap-2 flex-[2] w-full">
                        <Label className="uppercase text-[10px] font-semibold text-slate-600">Qual o modelo da porta?</Label>
                        <Select 
                          value={porta.tipo}
                          onValueChange={(val) => {
                            const newConfig = [...portasConfig];
                            newConfig[index].tipo = val ?? "";
                            setPortasConfig(newConfig);
                          }}
                        >
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="correr">Porta de Correr</SelectItem>
                            <SelectItem value="abrir">Porta de Abrir</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {portasConfig.length > 1 && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setPortasConfig(portasConfig.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 rounded-full"
                          title="Remover Porta"
                        >
                          <span className="sr-only">Remover</span>
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    variant="outline"
                    className="w-full border-dashed border-[#d97021] text-[#d97021] hover:bg-[#fff3eb] mt-2"
                    onClick={() => setPortasConfig([...portasConfig, { id: Math.random().toString(36).substring(2, 9), quantidade: '', tipo: '' }])}
                  >
                    + Adicionar outro modelo de porta
                  </Button>
                </div>
              )}
            </div>
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
                    gerarPDFOrcamento({ id: 'RASCUNHO', clientes: { nome: cliente?.nome || '' }, parametros_utilizados: paramsForm }, resultado, false)
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
                    gerarPDFOrcamento({ id: 'RASCUNHO', clientes: { nome: cliente?.nome || '' }, parametros_utilizados: paramsForm }, resultado, true)
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
                <span className="text-zinc-400">Filmes / Plásticos</span>
                <span className="text-zinc-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFilmes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Telas</span>
                <span className="text-zinc-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalTelas)}</span>
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
