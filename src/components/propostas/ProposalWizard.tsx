"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Check, ChevronRight, ChevronLeft, Save, Image as ImageIcon, Search } from 'lucide-react'
import catalogData from '../../../catalog_data.json'

const catalogOptions = Array.isArray(catalogData?.CATALOGO) 
  ? catalogData.CATALOGO.slice(1).map((item: any) => item[1])
  : [];

const STEPS = [
  { id: 1, title: 'Capa/Cliente' },
  { id: 2, title: 'Ficha Técnica' },
  { id: 3, title: 'Croqui' },
  { id: 4, title: 'Frente e Fundo' },
  { id: 5, title: 'Características' },
  { id: 6, title: 'Valores' },
]

export function ProposalWizard({ initialData, onSubmit, isSaving }: { initialData: any, onSubmit: (data: any) => void, isSaving: boolean }) {
  const [croquis, setCroquis] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Capa/Cliente
    vendedorNome: initialData.vendedorNome || '',
    vendedorTelefone: initialData.vendedorTelefone || '',
    orcamentoId: initialData.orcamentoId || 'AVULSO',
    dataEmissao: initialData.dataEmissao || new Date().toLocaleDateString('pt-BR'),
    dataValidade: initialData.dataValidade || '',
    clienteNome: initialData.clienteNome || '',
    clienteContato: initialData.clienteContato || '',
    
    // Dimensões e Ficha Técnica
    cultura: initialData.cultura || '',
    larguraTotal: initialData.larguraTotal || '',
    tamanhoArco: initialData.tamanhoArco || '7',
    comprimentoTotal: initialData.comprimentoTotal || '',
    distanciaArcos: initialData.distanciaArcos || '3',
    largura: initialData.largura || '',
    comprimento: initialData.comprimento || '',
    modulos: initialData.modulos || '2',
    alturaLateral: initialData.alturaLateral || '',
    alturaCentral: initialData.alturaCentral || '',
    areaTotal: initialData.areaTotal || '',
    croquiUrl: initialData.croquiUrl || '',
    coberturaFilme: initialData.coberturaFilme || 'FILME DIF 120 MIC',
    
    // Frente e Fundo
    arcoCalandrado: initialData.arcoCalandrado || 'ARCO CALANDRADO 8MTS 2"X1,25MM GALV',
    colunasExtremidades: initialData.colunasExtremidades || '4,80X100X50 2MM GALV',
    colunasCentral: initialData.colunasCentral || 'POSTE CENTRAL 6,75X100X50 2MM GALV',
    filmeCobertura: initialData.filmeCobertura || 'FILME DIFUSOR 120 MIC 10,00 GINEGAR',
    fechamentoLateral: initialData.fechamentoLateral || 'TELA OPTINET 40 MESH 4,0MTS GINEGAR',
    portaAcesso: initialData.portaAcesso || 'PORTA DE ABRIR 2,00X1,00 MT GALV',
    lateralTubo: initialData.lateralTubo || 'LATERAL 50X30MTS C/ MOLAS SEPARADAS GALV 1,25MM 6MTS',
    centralCalha: initialData.centralCalha || 'CALHA MAXX ALUMÍNIO 10A X17L 6MTS',
    travasInternas: initialData.travasInternas || 'ESTICADOR O-O M8 EXTRA FORTE INTERNO CABO AÇO GALV 3/16 4,8 MM',
    travasExternas: initialData.travasExternas || 'CABO AÇO GALV 3/16 4,8 MM ESTICADOR O-O M10 EXTRA FORTE EXTERNO',
    
    // Características Técnicas
    profundidadeFundacao: initialData.profundidadeFundacao || '0,80 metr.',
    alturaArco: initialData.alturaArco || '1,80',
    materialTravessa: initialData.materialTravessa || 'tubo de 2 polegadas',
    
    // Preço, Frete e Pagamento
    valorTotal: initialData.valorTotal || '0',
    frete: initialData.frete || '0',
    prazoEntrega: initialData.prazoEntrega || '45',
    variantePagamento: initialData.variantePagamento || 'A',
  })

  useEffect(() => {
    const fetchCroquis = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('croquis').select('*').order('created_at', { ascending: false })
      if (data) setCroquis(data)
    }

    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.user_metadata) {
        setFormData((prev: any) => {
          if (!prev.vendedorNome) {
            return {
              ...prev,
              vendedorNome: user.user_metadata.nome || user.email?.split('@')[0] || '',
              vendedorTelefone: user.user_metadata.telefone || prev.vendedorTelefone
            }
          }
          return prev
        })
      }
    }

    fetchCroquis()
    fetchUser()
  }, [])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDimensaoChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [field]: value };
      
      const w = parseFloat(newData.larguraTotal?.replace(',', '.') || 'NaN');
      const a = parseFloat(newData.tamanhoArco?.replace(',', '.') || 'NaN');
      if (!isNaN(w) && !isNaN(a) && a > 0) {
        newData.modulos = (w / a).toString();
        newData.largura = `${w / a} VÃO ${a} MT`;
      } else {
        newData.largura = '';
      }
      
      const l = parseFloat(newData.comprimentoTotal?.replace(',', '.') || 'NaN');
      const d = parseFloat(newData.distanciaArcos?.replace(',', '.') || 'NaN');
      if (!isNaN(l) && !isNaN(d) && d > 0) {
        newData.comprimento = `${l / d} VÃO ${d} MT`;
      } else {
        newData.comprimento = '';
      }
      
      if (!isNaN(w) && !isNaN(l)) {
        newData.areaTotal = (w * l).toString();
      }
      
      return newData;
    });
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) setCurrentStep(c => c + 1)
  }

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1)
  }

  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border rounded-xl shadow-sm overflow-hidden">
      <datalist id="catalog-options">
        {catalogOptions.map((opt, i) => (
          <option key={i} value={opt} />
        ))}
      </datalist>
      
      {/* Progress Header */}
      <div className="bg-slate-50 border-b p-4 md:px-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                    ${currentStep === step.id ? 'bg-[#d97021] text-white' : 
                      currentStep > step.id ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span className="hidden md:block text-xs font-medium text-slate-500">{step.title}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 md:mx-4 rounded-full transition-colors ${currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 md:p-8 min-h-[400px]">
        
        {/* STEP 1: Capa/Cliente */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Informações da Capa e Contato</h2>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Vendedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Vendedor</Label>
                  <Input value={formData.vendedorNome} onChange={e => handleChange('vendedorNome', e.target.value)} placeholder="Ex: Ronilson" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone do Vendedor</Label>
                  <Input value={formData.vendedorTelefone} onChange={e => handleChange('vendedorTelefone', e.target.value)} placeholder="(62) 99999-9999" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Cliente / Contratante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome / Razão Social *</Label>
                  <Input value={formData.clienteNome} onChange={e => handleChange('clienteNome', e.target.value)} placeholder="Ex: João da Silva" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={formData.clienteTelefone || ''} onChange={e => handleChange('clienteTelefone', e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={formData.clienteEmail || ''} onChange={e => handleChange('clienteEmail', e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>CPF / CNPJ</Label>
                  <Input value={formData.clienteDocumento || ''} onChange={e => handleChange('clienteDocumento', e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade / UF</Label>
                  <Input value={formData.clienteCidade || ''} onChange={e => handleChange('clienteCidade', e.target.value)} placeholder="Ex: Holambra / SP" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={formData.clienteEndereco || ''} onChange={e => handleChange('clienteEndereco', e.target.value)} placeholder="Rua, Número, Bairro" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Proposta</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nº do Pedido</Label>
                  <Input value={formData.orcamentoId} onChange={e => handleChange('orcamentoId', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Validade da Proposta</Label>
                  <Input value={formData.dataValidade} onChange={e => handleChange('dataValidade', e.target.value)} placeholder="Ex: 5 dias" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Ficha Técnica */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Dimensões e Ficha Técnica</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label>Cultura / Uso da Estufa</Label>
                <Input value={formData.cultura} onChange={e => handleChange('cultura', e.target.value)} placeholder="Ex: PISCICULTURA ou HORTALIÇAS" />
              </div>
              <div className="space-y-2">
                <Label>Largura Total (m)</Label>
                <Input value={formData.larguraTotal || ''} onChange={e => handleDimensaoChange('larguraTotal', e.target.value)} type="number" placeholder="Ex: 14" />
              </div>
              <div className="space-y-2">
                <Label>Tamanho do Arco (m)</Label>
                <Input value={formData.tamanhoArco || ''} onChange={e => handleDimensaoChange('tamanhoArco', e.target.value)} type="number" placeholder="Ex: 7" />
              </div>
              <div className="space-y-2 bg-slate-50 p-2 rounded border border-dashed flex flex-col justify-center">
                <Label className="text-xs text-slate-500 mb-1">Texto Final (Largura)</Label>
                <span className="font-semibold text-sm text-slate-700">{formData.largura || '-'}</span>
              </div>
              
              <div className="space-y-2">
                <Label>Comprimento Total (m)</Label>
                <Input value={formData.comprimentoTotal || ''} onChange={e => handleDimensaoChange('comprimentoTotal', e.target.value)} type="number" placeholder="Ex: 30" />
              </div>
              <div className="space-y-2">
                <Label>Distância entre Arcos (m)</Label>
                <Input value={formData.distanciaArcos || ''} onChange={e => handleDimensaoChange('distanciaArcos', e.target.value)} type="number" placeholder="Ex: 3" />
              </div>
              <div className="space-y-2 bg-slate-50 p-2 rounded border border-dashed flex flex-col justify-center">
                <Label className="text-xs text-slate-500 mb-1">Texto Final (Comprimento)</Label>
                <span className="font-semibold text-sm text-slate-700">{formData.comprimento || '-'}</span>
              </div>

              <div className="space-y-2">
                <Label>Nº de Módulos</Label>
                <Input value={formData.modulos} onChange={e => handleChange('modulos', e.target.value)} type="number" />
              </div>
              <div className="space-y-2">
                <Label>Altura Lateral (m)</Label>
                <Input value={formData.alturaLateral} onChange={e => handleChange('alturaLateral', e.target.value)} placeholder="Ex: 2,20" />
              </div>
              <div className="space-y-2">
                <Label>Altura Central (m)</Label>
                <Input value={formData.alturaCentral} onChange={e => handleChange('alturaCentral', e.target.value)} placeholder="Ex: 3,80" />
              </div>
              <div className="space-y-2">
                <Label>Área Total (m²)</Label>
                <Input value={formData.areaTotal} onChange={e => handleChange('areaTotal', e.target.value)} placeholder="Ex: 420" />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Cobertura (Filme)</Label>
                <Input value={formData.coberturaFilme} onChange={e => handleChange('coberturaFilme', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Croqui */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Seleção de Imagem / Croqui</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Selecione um croqui da biblioteca para substituir a imagem padrão da capa da estufa na proposta.
                </p>
                <div className="space-y-2">
                  <Label>Imagem / Croqui</Label>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsLibraryOpen(true)} type="button">
                      <ImageIcon className="w-4 h-4" />
                      {formData.croquiUrl && formData.croquiUrl.trim() !== '' ? 'Alterar Croqui Selecionado' : 'Abrir Biblioteca de Croquis'}
                    </Button>
                    <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
                      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] h-[85vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Biblioteca de Croquis</DialogTitle>
                          <div className="relative mt-2">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                              type="search"
                              placeholder="Pesquisar croqui por título..."
                              className="pl-9 bg-slate-50"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div 
                              className={`group relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col cursor-pointer hover:ring-2 hover:ring-[#d97021] transition-all ${(!formData.croquiUrl || formData.croquiUrl.trim() === '') ? 'ring-2 ring-[#d97021]' : ''}`}
                              onClick={() => {
                                handleChange('croquiUrl', ' ')
                                setIsLibraryOpen(false)
                              }}
                            >
                              <div className="aspect-video w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                <span className="text-slate-400 text-sm">Sem Croqui</span>
                              </div>
                              <div className="p-4 bg-white border-t text-sm font-bold text-center text-slate-800">Padrão da Capa</div>
                            </div>
                            
                            {croquis.filter(c => c.titulo.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                              <div 
                                key={c.id}
                                className={`group relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col cursor-pointer hover:ring-2 hover:ring-[#d97021] transition-all ${formData.croquiUrl === c.imagem_url ? 'ring-2 ring-[#d97021]' : ''}`}
                                onClick={() => {
                                  handleChange('croquiUrl', c.imagem_url)
                                  setIsLibraryOpen(false)
                                }}
                              >
                                <div className="aspect-video w-full bg-slate-50 relative overflow-hidden flex items-center justify-center">
                                  <img src={c.imagem_url} alt={c.titulo} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                                <div className="p-4 bg-white border-t text-sm font-bold truncate text-slate-800" title={c.titulo}>
                                  {c.titulo}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {formData.croquiUrl && formData.croquiUrl.trim() !== '' && (
                      <Button variant="ghost" size="sm" className="text-red-500 justify-start" onClick={() => handleChange('croquiUrl', ' ')}>
                        Remover croqui
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center p-4 border rounded-md bg-slate-50 min-h-[200px]">
                {formData.croquiUrl && formData.croquiUrl.trim() !== '' ? (
                  <img src={formData.croquiUrl} alt="Preview do Croqui" className="max-w-full max-h-[200px] object-contain rounded shadow-sm" />
                ) : (
                  <p className="text-slate-400 text-sm">Preview da Imagem Padrão</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Frente e Fundo */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Especificações (Frente e Fundo)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Arco Calandrado</Label>
                <Input list="catalog-options" value={formData.arcoCalandrado} onChange={e => handleChange('arcoCalandrado', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Colunas Extremidades</Label>
                <Input list="catalog-options" value={formData.colunasExtremidades} onChange={e => handleChange('colunasExtremidades', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Colunas Central</Label>
                <Input list="catalog-options" value={formData.colunasCentral} onChange={e => handleChange('colunasCentral', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Filme de Cobertura / Fechamento</Label>
                <Input list="catalog-options" value={formData.filmeCobertura} onChange={e => handleChange('filmeCobertura', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Porta de Acesso</Label>
                <Input list="catalog-options" value={formData.portaAcesso} onChange={e => handleChange('portaAcesso', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Laterais (Tubo)</Label>
                <Input list="catalog-options" value={formData.lateralTubo} onChange={e => handleChange('lateralTubo', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Central (Calha)</Label>
                <Input list="catalog-options" value={formData.centralCalha} onChange={e => handleChange('centralCalha', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Travas Internas</Label>
                <Input list="catalog-options" value={formData.travasInternas} onChange={e => handleChange('travasInternas', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Travas Externas</Label>
                <Input list="catalog-options" value={formData.travasExternas} onChange={e => handleChange('travasExternas', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Características */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Características Técnicas Extras</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Profundidade da Fundação (Ex: 0,40 metr.)</Label>
                <Input value={formData.profundidadeFundacao} onChange={e => handleChange('profundidadeFundacao', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Altura do Arco Calandrado (Ex: 1,60)</Label>
                <Input value={formData.alturaArco} onChange={e => handleChange('alturaArco', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Material da Travessa (Ex: tubo retangular ou calha de alumínio)</Label>
                <Input value={formData.materialTravessa} onChange={e => handleChange('materialTravessa', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Valores */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Valores e Condições de Pagamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input type="number" value={formData.valorTotal} onChange={e => handleChange('valorTotal', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Frete (R$ ou Descrição)</Label>
                <Input value={formData.frete} onChange={e => handleChange('frete', e.target.value)} placeholder="Ex: 500.00 ou INCLUSO" />
              </div>
              <div className="space-y-2">
                <Label>Prazo de Entrega (Dias Úteis)</Label>
                <Input type="number" value={formData.prazoEntrega} onChange={e => handleChange('prazoEntrega', e.target.value)} placeholder="Ex: 45" />
              </div>
              <div className="space-y-2">
                <Label>Variante de Pagamento</Label>
                <Select value={formData.variantePagamento} onValueChange={val => handleChange('variantePagamento', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a variante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Variante A (Parcelado + Finame)</SelectItem>
                    <SelectItem value="B">Variante B (À vista PIX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      <div className="bg-slate-50 border-t p-4 flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSaving} className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white">
            {isSaving ? "Gerando..." : "Salvar e Gerar PDF"} <Save className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
