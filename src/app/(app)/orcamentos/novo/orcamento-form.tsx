"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calculator, Save, Plus, Download, ArrowLeftRight, User, Ruler, Settings2, ListChecks, Image as ImageIcon, Search, Check, ChevronDown, X, Info, AlertTriangle } from "lucide-react"
import { calcularOrcamento, ItemOrcamento, ParametrosEstufa, Produto, RegraCalculo, montarTextoExplicacao } from "@/utils/engine"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useRouter, useSearchParams } from "next/navigation"
import { registrarOrcamentoNoLead } from "@/app/actions/crm"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

function ProdutoSelectComBusca({
  id,
  ariaLabel,
  produtos,
  value,
  onChange,
  placeholder = "Selecione o produto...",
  searchPlaceholder = "Pesquisar por código ou nome..."
}: {
  id?: string
  ariaLabel?: string
  produtos: Produto[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  searchPlaceholder?: string
}) {
  const [busca, setBusca] = useState("")
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const normalizar = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  const termo = normalizar(busca.trim())
  const produtosFiltrados = produtos.filter((p) => {
    if (!termo) return true
    const codigo = normalizar(String(p.codigo))
    const descricao = normalizar(String(p.descricao))
    return codigo.includes(termo) || descricao.includes(termo)
  })

  const produtoSelecionado = value
    ? produtos.find((p) => p.codigo.toString() === value.toString())
    : undefined

  const selecionarAutomaticoSeUnico = () => {
    if (!termo) return
    const exato = produtosFiltrados.find((p) => normalizar(String(p.codigo)) === termo)
    if (exato) {
      onChange(exato.codigo.toString())
      setAberto(false)
      setBusca("")
      return
    }
    if (produtosFiltrados.length === 1) {
      onChange(produtosFiltrados[0].codigo.toString())
      setAberto(false)
      setBusca("")
    }
  }

  return (
    <div ref={containerRef} className="relative grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          value={busca}
          aria-label={ariaLabel ? `Pesquisar ${ariaLabel}` : searchPlaceholder}
          placeholder={searchPlaceholder}
          onFocus={() => setAberto(true)}
          onChange={(e) => {
            setBusca(e.target.value)
            setAberto(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && produtosFiltrados.length > 0) {
              e.preventDefault()
              const exato = produtosFiltrados.find((p) => normalizar(String(p.codigo)) === termo)
              const escolhido = exato || produtosFiltrados[0]
              onChange(escolhido.codigo.toString())
              setAberto(false)
              setBusca("")
            }
          }}
          onBlur={() => {
            if (!value && termo) {
              selecionarAutomaticoSeUnico()
            }
          }}
          className="bg-white pl-8 pr-8 h-9 text-sm"
        />
        {busca && (
          <button
            type="button"
            onClick={() => {
              setBusca("")
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            title="Limpar pesquisa"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setAberto((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-white py-2 pr-2.5 pl-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={`truncate text-left flex-1 ${produtoSelecionado ? "text-slate-900 font-medium" : "text-muted-foreground"}`}>
          {produtoSelecionado
            ? `${produtoSelecionado.codigo} - ${produtoSelecionado.descricao}`
            : value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {aberto && (
        <div
          role="listbox"
          aria-label={ariaLabel || "Lista de produtos"}
          className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 text-popover-foreground shadow-md"
        >
          {produtosFiltrados.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-slate-500">
              Nenhum produto encontrado para &quot;{busca}&quot;.
            </div>
          ) : (
            produtosFiltrados.map((p) => {
              const isSelected = p.codigo.toString() === value?.toString()
              return (
                <button
                  key={p.codigo}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(p.codigo.toString())
                    setAberto(false)
                    setBusca("")
                  }}
                  className={`relative flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-left text-sm outline-hidden select-none hover:bg-slate-100 ${
                    isSelected ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700"
                  }`}
                >
                  <span className="flex-1 truncate">
                    {p.codigo} - {p.descricao}
                  </span>
                  {isSelected && (
                    <span className="absolute right-2 flex size-4 items-center justify-center text-[#d97021]">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

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
  orcamentoInicial?: {
    id: string
    cliente_id: string
    status?: string
    parametros_utilizados: ParametrosEstufa
    itens?: ItemOrcamento[]
  }
}

export function OrcamentoForm({ parametrosDef, regras, produtos, clientes, orcamentoInicial }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const initialCroquiUrl = searchParams.get('croqui_url') || undefined
  const initialCroquiId = searchParams.get('croqui_id') || undefined
  const initialC = searchParams.get('c') ? Number(searchParams.get('c')) : ''
  const initialL = searchParams.get('l') ? Number(searchParams.get('l')) : ''
  const initialA = searchParams.get('a') ? Number(searchParams.get('a')) : undefined
  // Vindo do CRM: /orcamentos/novo?lead=<id>&cliente=<id>
  const leadIdCrm = searchParams.get('lead') || null
  const clienteInicialCrm = searchParams.get('cliente') || ''

  const [paramsForm, setParamsForm] = useState<ParametrosEstufa>((): ParametrosEstufa => {
    if (orcamentoInicial?.parametros_utilizados) {
      return {
        tipo_poste: '100X50 GALVANIZADO',
        ...orcamentoInicial.parametros_utilizados,
      }
    }
    return {
      croqui_url: initialCroquiUrl || '',
      croqui_id: initialCroquiId || '',
      pe_direito: initialA || '',
      tipo_poste: '100X50 GALVANIZADO'
    }
  })
  const [resultado, setResultado] = useState<ItemOrcamento[]>(() => orcamentoInicial?.itens || [])
  
  // Controle de Cliente
  const [localClientes, setLocalClientes] = useState(clientes)
  const [selectedCliente, setSelectedCliente] = useState<string>(orcamentoInicial?.cliente_id || clienteInicialCrm || "")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [novoCliente, setNovoCliente] = useState({ nome: '', documento: '', cidade_uf: '' })
  const [swapItemIndex, setSwapItemIndex] = useState<number | null>(null)
  const [itemExplicado, setItemExplicado] = useState<ItemOrcamento | null>(null)

  // Larguras de módulo vêm das opções do parâmetro largura_modulo (Pacote de Regras)
  const largurasModulo: number[] = (() => {
    const pl = parametrosDef.find(p => p.nome_tecnico === 'largura_modulo')
    const bruto: string[] = pl ? (Array.isArray(pl.opcoes) ? pl.opcoes : JSON.parse((pl.opcoes as string) || '[]')) : []
    const lista = bruto.map(Number).filter(n => n > 0).sort((a, b) => b - a)
    return lista.length ? lista : [10, 8, 7]
  })()
  const larguraMinima = Math.min(...largurasModulo)
  const listaLarguras = [...largurasModulo].sort((a, b) => a - b).join(', ')
  // Módulos menores que 7 m só existem com arco simples e sem arco de divisa
  const larguraModuloAtual = Number(paramsForm['largura_modulo']) || 0
  const soArcoSimples = larguraModuloAtual > 0 && larguraModuloAtual < 7

  useEffect(() => {
    if (!soArcoSimples) return
    setParamsForm(prev => {
      const arcoErrado = !!prev['tipo_arco'] && prev['tipo_arco'] !== 'SIMPLES'
      if (!arcoErrado && !prev['arco_divisa']) return prev
      return {
        ...prev,
        ...(arcoErrado ? { tipo_arco: 'SIMPLES' } : {}),
        arco_divisa: false,
        n_divisas_por_modulo: ''
      }
    })
  }, [soArcoSimples, paramsForm['tipo_arco'], paramsForm['arco_divisa']])
  
  const [comprimento, setComprimento] = useState<number | ''>(() => {
    const p = orcamentoInicial?.parametros_utilizados
    if (p?.comprimento_estufa) return Number(p.comprimento_estufa)
    if (p?.vao && p?.n_vaos) return Number(p.vao) * Number(p.n_vaos)
    return initialC
  })
  const [larguraTotal, setLarguraTotal] = useState<number | ''>(() => {
    const p = orcamentoInicial?.parametros_utilizados
    if (p?.n_modulos && p?.largura_modulo) {
      return Number(p.n_modulos) * Number(p.largura_modulo)
    }
    return initialL
  })
  const [vaoError, setVaoError] = useState('')
  const [vaoUltimo, setVaoUltimo] = useState<number | ''>('')
  const [tentouCalcular, setTentouCalcular] = useState(false)
  const [camposTocados, setCamposTocados] = useState<Record<string, boolean>>({})
  const [avisosDigitacao, setAvisosDigitacao] = useState<Record<string, string>>({})

  const marcarTocado = (campo: string) => {
    setCamposTocados(prev => prev[campo] ? prev : { ...prev, [campo]: true })
  }

  const limparAvisoDigitacao = (campo: string) => {
    setAvisosDigitacao(prev => {
      if (!prev[campo]) return prev
      const next = { ...prev }
      delete next[campo]
      return next
    })
  }

  const handleNumericKeyDown = (campo: string, permiteDecimal = false) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return
    const regex = permiteDecimal ? /^[0-9.,-]$/ : /^[0-9-]$/
    if (!regex.test(e.key)) {
      e.preventDefault()
      setAvisosDigitacao(prev => ({
        ...prev,
        [campo]: permiteDecimal
          ? 'Digite apenas números (use vírgula ou ponto para decimais).'
          : 'Digite apenas números inteiros neste campo.'
      }))
    } else {
      limparAvisoDigitacao(campo)
    }
  }
  
  const [portasConfig, setPortasConfig] = useState<{ id: string, quantidade: number | '', tipo: string }[]>(() => {
    const p = orcamentoInicial?.parametros_utilizados
    if (!p) return []
    const list: { id: string, quantidade: number | '', tipo: string }[] = []
    if (Number(p.portas_abrir) > 0) {
      list.push({ id: 'init-abrir', quantidade: Number(p.portas_abrir), tipo: 'abrir' })
    }
    if (Number(p.portas_correr_pequena) > 0) {
      list.push({ id: 'init-correr-p', quantidade: Number(p.portas_correr_pequena), tipo: 'correr_pequena' })
    }
    if (Number(p.portas_correr_grande) > 0) {
      list.push({ id: 'init-correr-g', quantidade: Number(p.portas_correr_grande), tipo: 'correr_grande' })
    }
    if (list.filter(x => x.tipo.startsWith('correr')).length === 0 && Number(p.portas_correr) > 0) {
      list.push({ id: 'init-correr', quantidade: Number(p.portas_correr), tipo: 'correr_pequena' })
    }
    return list
  })
  const [anticamaraConfig, setAnticamaraConfig] = useState<{ id: string, quantidade: number | '', modelo: string }[]>(() => {
    const p = orcamentoInicial?.parametros_utilizados
    if (!p) return []
    const list: { id: string, quantidade: number | '', modelo: string }[] = []
    if (Number(p.anticamara_frontal) > 0) {
      list.push({ id: 'init-3150', quantidade: Number(p.anticamara_frontal), modelo: '3150' })
    }
    if (Number(p.anticamara_lateral) > 0) {
      list.push({ id: 'init-3160', quantidade: Number(p.anticamara_lateral), modelo: '3160' })
    }
    return list
  })

  // Efeito para sincronizar portasConfig com portas_abrir, portas_correr_pequena, portas_correr_grande e portas_correr
  useEffect(() => {
    let abrir = 0;
    let correrPequena = 0;
    let correrGrande = 0;
    portasConfig.forEach(p => {
      const q = Number(p.quantidade) || 0;
      if (p.tipo === 'abrir') abrir += q;
      if (p.tipo === 'correr_pequena') correrPequena += q;
      if (p.tipo === 'correr_grande') correrGrande += q;
    });
    const correrTotal = correrPequena + correrGrande;
    setParamsForm(prev => ({
      ...prev,
      portas_abrir: abrir > 0 ? abrir : '',
      portas_correr_pequena: correrPequena > 0 ? correrPequena : '',
      portas_correr_grande: correrGrande > 0 ? correrGrande : '',
      portas_correr: correrTotal > 0 ? correrTotal : ''
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
    const c = Number(comprimento)
    const vaoNum = Number(paramsForm['vao'])
    if (comprimento !== '' && !isNaN(c) && c >= 3 && c <= 500 && vaoNum > 0) {
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
    } else {
      setVaoError('')
      setVaoUltimo('')
      if (comprimento === '' || isNaN(c) || c <= 0 || c > 500) {
        setParamsForm(prev => ({ ...prev, n_vaos: '', comprimento_estufa: '' }))
      }
    }
  }, [comprimento, paramsForm['vao']])

  // Efeito para atualizar comprimento_estufa no paramsForm
  useEffect(() => {
    if (paramsForm['vao'] && paramsForm['n_vaos']) {
      const vao = Number(paramsForm['vao'])
      const nVaos = Number(paramsForm['n_vaos'])
      const vaoUlt = vaoUltimo !== '' ? Number(vaoUltimo) : vao

      if (vao > 0 && nVaos > 0 && vaoUlt > 0) {
        const comprimento_estufa = vao * (nVaos - 1) + vaoUlt
        setParamsForm(prev => ({ ...prev, comprimento_estufa }))
      }
    }
  }, [paramsForm['vao'], paramsForm['n_vaos'], vaoUltimo])

  const ordenarOpcoesNumericas = (opcoes: string[]) =>
    [...opcoes].sort((a, b) => {
      const na = Number(String(a).replace(',', '.'))
      const nb = Number(String(b).replace(',', '.'))
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
    })

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

  // Pé-direito 5 m não tem poste 75x40 (volta para 100x50); pé-direito 2 m só tem poste 75x40 (força 75x40)
  useEffect(() => {
    const pd = Number(paramsForm['pe_direito'])
    if (paramsForm['tipo_poste'] === '75X40 GALVANIZADO' && pd === 5) {
      setParamsForm(prev => ({
        ...prev,
        tipo_poste: '100X50 GALVANIZADO'
      }))
    } else if (pd === 2 && paramsForm['tipo_poste'] !== '75X40 GALVANIZADO') {
      setParamsForm(prev => ({
        ...prev,
        tipo_poste: '75X40 GALVANIZADO'
      }))
    }
  }, [paramsForm['pe_direito'], paramsForm['tipo_poste']])

  // Efeito para sincronizar divisas de frente/fundo, perfil na divisa, largura do rolo de tela e meia lua
  useEffect(() => {
    const fechamentoAtivo = Boolean(paramsForm['fechamento_lateral'])
    const material = String(paramsForm['tipo_fechamento_material'] || '')
    const nModulos = Number(paramsForm['n_modulos']) || 0
    const maxDivisas = Math.max(0, nModulos - 1)
    const masterDivisas = Boolean(paramsForm['master_divisas_frente_fundo'])

    let nextMasterDivisas = masterDivisas
    let nextDivisasFrente = Number(paramsForm['divisas_frente']) || 0
    let nextDivisasFundo = Number(paramsForm['divisas_fundo']) || 0

    if (!fechamentoAtivo || !material || nModulos <= 1) {
      nextMasterDivisas = false
      nextDivisasFrente = 0
      nextDivisasFundo = 0
    } else if (!masterDivisas) {
      nextDivisasFrente = 0
      nextDivisasFundo = 0
    } else {
      nextDivisasFrente = Math.min(maxDivisas, Math.max(0, nextDivisasFrente))
      nextDivisasFundo = Math.min(maxDivisas, Math.max(0, nextDivisasFundo))
    }

    const nDivisasPorModulo = Number(paramsForm['n_divisas_por_modulo']) || 0
    const temDivisa = fechamentoAtivo && Boolean(material) && (nDivisasPorModulo > 0 || nextDivisasFrente > 0 || nextDivisasFundo > 0)
    const atualPerfil = String(paramsForm['fechamento_divisa_perfil'] || '')
    const nextPerfil = temDivisa ? (atualPerfil || 'MOLAS JUNTAS') : ''

    const atualLarguraRolo = paramsForm['tela_largura_rolo'] ?? ''
    const nextLarguraRolo = fechamentoAtivo && material === 'tela' ? atualLarguraRolo : ''

    const atualMeiaLua = String(paramsForm['meia_lua_material'] || '')
    const nextMeiaLua = fechamentoAtivo && material ? (atualMeiaLua || material) : ''
    const atualProdMeiaLua = String(paramsForm['produto_meia_lua'] || '')
    const nextProdMeiaLua = fechamentoAtivo && material && nextMeiaLua && nextMeiaLua !== material ? atualProdMeiaLua : ''

    if (
      Boolean(paramsForm['master_divisas_frente_fundo']) !== nextMasterDivisas ||
      paramsForm['divisas_frente'] !== nextDivisasFrente ||
      paramsForm['divisas_fundo'] !== nextDivisasFundo ||
      (paramsForm['fechamento_divisa_perfil'] ?? '') !== nextPerfil ||
      (paramsForm['tela_largura_rolo'] ?? '') !== nextLarguraRolo ||
      (paramsForm['meia_lua_material'] ?? '') !== nextMeiaLua ||
      (paramsForm['produto_meia_lua'] ?? '') !== nextProdMeiaLua
    ) {
      setParamsForm(prev => ({
        ...prev,
        master_divisas_frente_fundo: nextMasterDivisas,
        divisas_frente: nextDivisasFrente,
        divisas_fundo: nextDivisasFundo,
        fechamento_divisa_perfil: nextPerfil,
        tela_largura_rolo: nextLarguraRolo,
        meia_lua_material: nextMeiaLua,
        produto_meia_lua: nextProdMeiaLua
      }))
    }
  }, [
    paramsForm['fechamento_lateral'],
    paramsForm['tipo_fechamento_material'],
    paramsForm['n_modulos'],
    paramsForm['master_divisas_frente_fundo'],
    paramsForm['divisas_frente'],
    paramsForm['divisas_fundo'],
    paramsForm['n_divisas_por_modulo'],
    paramsForm['fechamento_divisa_perfil'],
    paramsForm['tela_largura_rolo'],
    paramsForm['meia_lua_material'],
    paramsForm['produto_meia_lua']
  ])

  // Validação completa de campos obrigatórios e limites práticos
  const errosValidacao: Record<string, string> = {}
  const valorInvalidoImediato: Record<string, boolean> = {}

  if (larguraTotal === '' || larguraTotal === undefined || larguraTotal === null) {
    errosValidacao['larguraTotal'] = `Informe a largura da estufa (mínimo ${larguraMinima} m).`
  } else {
    const l = Number(larguraTotal)
    if (isNaN(l) || l <= 0) {
      errosValidacao['larguraTotal'] = `A largura deve ser maior que 0 (mínimo ${larguraMinima} m).`
      valorInvalidoImediato['larguraTotal'] = true
    } else if (l < larguraMinima) {
      errosValidacao['larguraTotal'] = `A largura mínima da estufa é de ${larguraMinima} m (1 módulo de ${larguraMinima} m).`
      valorInvalidoImediato['larguraTotal'] = true
    } else if (l > 500) {
      errosValidacao['larguraTotal'] = 'A largura máxima permitida é de 500 m.'
      valorInvalidoImediato['larguraTotal'] = true
    } else {
      const nMod = Number(paramsForm['n_modulos'])
      const lMod = Number(paramsForm['largura_modulo'])
      if (paramsForm['n_modulos'] !== '' && nMod >= 1 && nMod <= 50 && lMod > 0 && l !== nMod * lMod) {
        errosValidacao['larguraTotal'] = `A largura (${l} m) não coincide com ${nMod} módulo(s) de ${lMod} m (${nMod * lMod} m).`
        valorInvalidoImediato['larguraTotal'] = true
      } else if (!largurasModulo.some(w => l % w === 0) && (!paramsForm['n_modulos'] || !paramsForm['largura_modulo'])) {
        errosValidacao['larguraTotal'] = `A largura (${l} m) deve ser múltipla de uma das larguras de módulo (${listaLarguras} m).`
        valorInvalidoImediato['larguraTotal'] = true
      }
    }
  }

  if (comprimento === '' || comprimento === undefined || comprimento === null) {
    errosValidacao['comprimento'] = 'Informe o comprimento da estufa (mínimo 3 m).'
  } else {
    const c = Number(comprimento)
    if (isNaN(c) || c <= 0) {
      errosValidacao['comprimento'] = 'O comprimento deve ser maior que 0 (mínimo 3 m).'
      valorInvalidoImediato['comprimento'] = true
    } else if (c < 3) {
      errosValidacao['comprimento'] = 'O comprimento mínimo da estufa é de 3 m (1 vão de 3 m).'
      valorInvalidoImediato['comprimento'] = true
    } else if (c > 500) {
      errosValidacao['comprimento'] = 'O comprimento máximo permitido é de 500 m.'
      valorInvalidoImediato['comprimento'] = true
    }
  }

  if (!paramsForm['pe_direito']) {
    errosValidacao['pe_direito'] = 'Selecione a altura (pé-direito) da estufa.'
  }

  if (paramsForm['n_modulos'] === '' || paramsForm['n_modulos'] === undefined || paramsForm['n_modulos'] === null) {
    errosValidacao['n_modulos'] = 'Informe o número de módulos (entre 1 e 50).'
  } else {
    const nMod = Number(paramsForm['n_modulos'])
    if (isNaN(nMod) || nMod < 1) {
      errosValidacao['n_modulos'] = 'O número de módulos deve ser de pelo menos 1.'
      valorInvalidoImediato['n_modulos'] = true
    } else if (!Number.isInteger(nMod)) {
      errosValidacao['n_modulos'] = 'O número de módulos deve ser um número inteiro.'
      valorInvalidoImediato['n_modulos'] = true
    } else if (nMod > 50) {
      errosValidacao['n_modulos'] = 'O limite máximo é de 50 módulos.'
      valorInvalidoImediato['n_modulos'] = true
    }
  }

  if (!paramsForm['largura_modulo']) {
    errosValidacao['largura_modulo'] = `Selecione a largura do módulo (${listaLarguras} m).`
  }

  if (!paramsForm['vao']) {
    errosValidacao['vao'] = 'Selecione o tamanho do vão (3 ou 4 m).'
  }

  if (vaoError) {
    const vUlt = Number(vaoUltimo)
    const vPadrao = Number(paramsForm['vao'] || 4)
    if (vaoUltimo === '' || isNaN(vUlt) || vUlt <= 0) {
      errosValidacao['vaoUltimo'] = 'O tamanho do último vão deve ser maior que 0.'
      if (vaoUltimo !== '') valorInvalidoImediato['vaoUltimo'] = true
    } else if (vUlt > vPadrao) {
      errosValidacao['vaoUltimo'] = `O último vão não pode ser maior que ${vPadrao} m.`
      valorInvalidoImediato['vaoUltimo'] = true
    }
  }

  if (parametrosDef.some(p => p.nome_tecnico === 'tipo_arco') && !paramsForm['tipo_arco']) {
    errosValidacao['tipo_arco'] = 'Selecione o tipo de arco.'
  }

  if (parametrosDef.some(p => p.nome_tecnico === 'calha_lateral') && !paramsForm['calha_lateral']) {
    errosValidacao['calha_lateral'] = 'Selecione a fixação superior.'
  }

  if (paramsForm['master_travamentos_x']) {
    const tx = paramsForm['travamentos_x']
    const nTx = Number(tx)
    if (tx === '' || tx === undefined) {
      errosValidacao['travamentos_x'] = 'Informe quantos travamentos em X por linha (1 a 20).'
    } else if (isNaN(nTx) || nTx < 1 || !Number.isInteger(nTx) || nTx > 20) {
      errosValidacao['travamentos_x'] = 'Informe um número inteiro entre 1 e 20.'
      valorInvalidoImediato['travamentos_x'] = true
    }
  }

  if (paramsForm['arco_divisa']) {
    const nd = paramsForm['n_divisas_por_modulo']
    const nNd = Number(nd)
    const nVaosAtual = Number(paramsForm['n_vaos']) || 0
    if (nd === '' || nd === undefined) {
      errosValidacao['n_divisas_por_modulo'] = 'Informe quantos arcos de divisa por módulo.'
    } else if (isNaN(nNd) || nNd < 1 || !Number.isInteger(nNd) || nNd > 50) {
      errosValidacao['n_divisas_por_modulo'] = 'Informe um número inteiro entre 1 e 50.'
      valorInvalidoImediato['n_divisas_por_modulo'] = true
    } else if (nVaosAtual > 1 && nNd >= nVaosAtual) {
      errosValidacao['n_divisas_por_modulo'] = `Deve ser menor que o número de vãos (${nVaosAtual}).`
      valorInvalidoImediato['n_divisas_por_modulo'] = true
    }
  }

  if (paramsForm['fixacao_inferior'] && parametrosDef.some(p => p.nome_tecnico === 'tipo_fixacao_inferior')) {
    if (!paramsForm['tipo_fixacao_inferior']) {
      errosValidacao['tipo_fixacao_inferior'] = 'Selecione o tipo de fixação inferior (ex.: MURETA).'
    }
  }

  if (paramsForm['fechamento_lateral'] && paramsForm['tipo_fechamento_material'] === 'tela') {
    const rolo = paramsForm['tela_largura_rolo']
    if (rolo !== '' && rolo !== undefined) {
      const nRolo = Number(rolo)
      if (isNaN(nRolo) || nRolo <= 0 || nRolo > 20) {
        errosValidacao['tela_largura_rolo'] = 'A largura do rolo deve ser maior que 0 e até 20 m.'
        valorInvalidoImediato['tela_largura_rolo'] = true
      }
    }
  }

  if (paramsForm['master_portas']) {
    portasConfig.forEach((porta, idx) => {
      const q = Number(porta.quantidade)
      if (porta.quantidade === '' || isNaN(q) || q < 1 || !Number.isInteger(q) || q > 50) {
        errosValidacao[`porta_qtd_${idx}`] = 'Informe entre 1 e 50 portas.'
        if (porta.quantidade !== '') valorInvalidoImediato[`porta_qtd_${idx}`] = true
      }
      if (!porta.tipo) {
        errosValidacao[`porta_tipo_${idx}`] = 'Selecione o modelo da porta.'
      }
    })
  }

  if (paramsForm['possui_anticamara']) {
    anticamaraConfig.forEach((item, idx) => {
      const q = Number(item.quantidade)
      if (item.quantidade === '' || isNaN(q) || q < 1 || !Number.isInteger(q) || q > 20) {
        errosValidacao[`anticamara_qtd_${idx}`] = 'Informe entre 1 e 20 anticâmaras.'
        if (item.quantidade !== '') valorInvalidoImediato[`anticamara_qtd_${idx}`] = true
      }
      if (!item.modelo) {
        errosValidacao[`anticamara_modelo_${idx}`] = 'Selecione o modelo da anticâmara.'
      }
    })
  }

  const obterErroVisivel = (campo: string): string | undefined => {
    if (avisosDigitacao[campo]) return avisosDigitacao[campo]
    if (errosValidacao[campo] && (tentouCalcular || camposTocados[campo] || valorInvalidoImediato[campo])) {
      return errosValidacao[campo]
    }
    return undefined
  }

  const obterIdDomCampo = (campo: string): string => {
    const mapaFixo: Record<string, string> = {
      larguraTotal: 'campo-largura-estufa',
      comprimento: 'campo-comprimento-estufa',
      pe_direito: 'campo-pe-direito',
      n_modulos: 'campo-n-modulos',
      largura_modulo: 'campo-largura-modulo',
      vao: 'campo-vao',
      vaoUltimo: 'campo-vao-ultimo',
      travamentos_x: 'campo-travamentos-x',
      n_divisas_por_modulo: 'campo-n-divisas-por-modulo',
      tela_largura_rolo: 'campo-tela-largura-rolo',
      tipo_fixacao_inferior: 'campo-tipo-fixacao-inferior',
    }
    if (mapaFixo[campo]) return mapaFixo[campo]
    if (campo.startsWith('porta_qtd_')) return `campo-porta-qtd-${campo.replace('porta_qtd_', '')}`
    if (campo.startsWith('porta_tipo_')) return `campo-porta-tipo-${campo.replace('porta_tipo_', '')}`
    if (campo.startsWith('anticamara_qtd_')) return `campo-anticamara-qtd-${campo.replace('anticamara_qtd_', '')}`
    if (campo.startsWith('anticamara_modelo_')) return `campo-anticamara-modelo-${campo.replace('anticamara_modelo_', '')}`
    return `campo-${campo}`
  }

  const focarCampoComErro = (campo: string) => {
    const idDom = obterIdDomCampo(campo)
    setTimeout(() => {
      const el = document.getElementById(idDom)
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' })
        el.focus({ preventScroll: true })
      }
    }, 0)
  }

  const renderErroCampo = (campo: string) => {
    const msg = obterErroVisivel(campo)
    if (!msg) return null
    return (
      <div
        id={`erro-${campo}`}
        role="alert"
        aria-live="polite"
        className="mt-1 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
        <span>{msg}</span>
      </div>
    )
  }

  const chavesErrosAtivos = Object.keys(errosValidacao)
  const listaErrosAtivos = Object.values(errosValidacao)

  const handleCalcular = () => {
    setTentouCalcular(true)
    if (chavesErrosAtivos.length > 0) {
      setResultado([])
      focarCampoComErro(chavesErrosAtivos[0])
      toast.error("Revise os campos destacados em vermelho no formulário.", {
        description: errosValidacao[chavesErrosAtivos[0]]
      })
      return
    }
    const nDivisasPorModulo = Number(paramsForm['n_divisas_por_modulo']) || 0
    const nModulosCalc = Number(paramsForm['n_modulos']) || 0
    const paramsCalculo = {
      ...paramsForm,
      n_divisas: nDivisasPorModulo * nModulosCalc // total de arcos de divisa = por modulo x numero de modulos
    }
    const itens = calcularOrcamento(paramsCalculo, regras, produtos)
    setResultado(itens)
  }

  // Abre a explicação de um item. Itens de orçamento salvo vêm do banco sem os detalhes do
  // cálculo: nesse caso refaz o cálculo com os parâmetros atuais e pega os detalhes do mesmo item.
  const abrirExplicacao = (item: ItemOrcamento) => {
    if (item.detalhes && item.detalhes.length > 0) {
      setItemExplicado(item)
      return
    }
    const nDivisasPorModulo = Number(paramsForm['n_divisas_por_modulo']) || 0
    const nModulosCalc = Number(paramsForm['n_modulos']) || 0
    const itens = calcularOrcamento({ ...paramsForm, n_divisas: nDivisasPorModulo * nModulosCalc }, regras, produtos)
    const codigoOriginal = item.manualOriginalProduto || item.produto_codigo
    const igual = itens.find(i => i.produto_codigo === codigoOriginal && i.grupo_nome === item.grupo_nome)
      || itens.find(i => i.produto_codigo === codigoOriginal)
    setItemExplicado({ ...item, detalhes: igual?.detalhes || [] })
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
    setTentouCalcular(true)
    if (chavesErrosAtivos.length > 0) {
      focarCampoComErro(chavesErrosAtivos[0])
      toast.error("Corrija os campos inválidos antes de salvar o orçamento.", {
        description: errosValidacao[chavesErrosAtivos[0]]
      })
      return
    }
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
      let orcamentoId = orcamentoInicial?.id

      if (orcamentoId) {
        // 1. Atualizar o orçamento existente
        const { error: orcError } = await supabase
          .from('orcamentos')
          .update({
            cliente_id: selectedCliente,
            parametros_utilizados: paramsForm,
            valor_total: valorTotal
          })
          .eq('id', orcamentoId)

        if (orcError) throw orcError

        // Remover itens antigos para substituir pela lista atualizada
        const { error: delError } = await supabase
          .from('orcamento_itens')
          .delete()
          .eq('orcamento_id', orcamentoId)

        if (delError) throw delError
      } else {
        // 1. Criar novo orçamento
        const { data: orcamento, error: orcError } = await supabase
          .from('orcamentos')
          .insert({
            cliente_id: selectedCliente,
            vendedor_id: user.id,
            status: 'Rascunho',
            parametros_utilizados: paramsForm,
            valor_total: valorTotal,
            ...(leadIdCrm ? { lead_id: leadIdCrm } : {})
          })
          .select('id')
          .single()

        if (orcError) throw orcError
        orcamentoId = orcamento.id
      }

      // 2. Inserir os itens
      const itensToInsert = resultado.map(item => ({
        orcamento_id: orcamentoId,
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

      if (orcamentoInicial?.id) {
        toast.success("Orçamento atualizado com sucesso!")
        router.push(`/orcamentos/${orcamentoId}`)
        router.refresh()
      } else if (leadIdCrm && orcamentoId) {
        await registrarOrcamentoNoLead(leadIdCrm, orcamentoId, valorTotal)
        toast.success("Orçamento salvo e ligado ao lead!")
        router.push(`/crm/lead/${leadIdCrm}`)
      } else {
        toast.success("Orçamento salvo com sucesso!")
        router.push('/orcamentos')
      }
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
              <div className="grid gap-2 content-start">
                <Label htmlFor="campo-largura-estufa" className="font-bold text-slate-800 uppercase text-xs">Largura da Estufa (m) *</Label>
                <Input 
                  id="campo-largura-estufa"
                  type="number"
                  min={7}
                  max={500}
                  step="any"
                  value={larguraTotal}
                  placeholder="Ex: 14"
                  aria-invalid={!!obterErroVisivel('larguraTotal')}
                  aria-describedby={obterErroVisivel('larguraTotal') ? 'erro-larguraTotal' : undefined}
                  className={`bg-white text-lg py-6 ${obterErroVisivel('larguraTotal') ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'}`}
                  onKeyDown={handleNumericKeyDown('larguraTotal', true)}
                  onBlur={() => marcarTocado('larguraTotal')}
                  onChange={(e) => {
                    marcarTocado('larguraTotal')
                    limparAvisoDigitacao('larguraTotal')
                    const raw = e.target.value.replace(',', '.')
                    const novoValor = raw === '' ? '' : Number(raw)
                    setLarguraTotal(novoValor)
                    const l = Number(novoValor)
                    if (novoValor !== '' && !isNaN(l) && l >= larguraMinima && l <= 500) {
                      const largurasPermitidas = largurasModulo
                      const atualW = Number(paramsForm['largura_modulo']) || 0
                      if (largurasModulo.includes(atualW) && l % atualW === 0 && l / atualW <= 50) {
                        handleParamChange('n_modulos', l / atualW)
                      } else {
                        for (const w of largurasPermitidas) {
                          if (l % w === 0 && l / w <= 50) {
                            setParamsForm(prev => ({
                              ...prev,
                              largura_modulo: w,
                              n_modulos: l / w
                            }))
                            break
                          }
                        }
                      }
                    }
                  }}
                />
                {renderErroCampo('larguraTotal')}
              </div>

              <div className="grid gap-2 content-start">
                <Label htmlFor="campo-comprimento-estufa" className="font-bold text-slate-800 uppercase text-xs">Comprimento da Estufa (m) *</Label>
                <Input 
                  id="campo-comprimento-estufa"
                  type="number"
                  min={3}
                  max={500}
                  step="any"
                  value={comprimento}
                  placeholder="Ex: 50"
                  aria-invalid={!!obterErroVisivel('comprimento')}
                  aria-describedby={obterErroVisivel('comprimento') ? 'erro-comprimento' : undefined}
                  className={`bg-white text-lg py-6 ${obterErroVisivel('comprimento') ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'}`}
                  onKeyDown={handleNumericKeyDown('comprimento', true)}
                  onBlur={() => marcarTocado('comprimento')}
                  onChange={(e) => {
                    marcarTocado('comprimento')
                    limparAvisoDigitacao('comprimento')
                    const raw = e.target.value.replace(',', '.')
                    setComprimento(raw === '' ? '' : Number(raw))
                  }}
                />
                {renderErroCampo('comprimento')}
              </div>

              {(() => {
                const param = parametrosDef.find(p => p.nome_tecnico === 'pe_direito')
                if (!param) return null
                const opcoesRaw: string[] = Array.isArray(param.opcoes) ? param.opcoes : JSON.parse(param.opcoes as string || '[]')
                const opcoes = ordenarOpcoesNumericas(opcoesRaw)
                return (
                  <div className="grid gap-2 content-start">
                    <Label htmlFor="campo-pe-direito" className="font-bold text-slate-800 uppercase text-xs">Altura / Pé-Direito (m) *</Label>
                    <Select
                      value={paramsForm['pe_direito']?.toString() || ''}
                      onValueChange={(val) => {
                        marcarTocado('pe_direito')
                        handleParamChange(param.nome_tecnico, Number(val))
                      }}
                    >
                      <SelectTrigger
                        id="campo-pe-direito"
                        aria-label="Altura / Pé-Direito (m)"
                        aria-invalid={!!obterErroVisivel('pe_direito')}
                        aria-describedby={obterErroVisivel('pe_direito') ? 'erro-pe_direito' : undefined}
                        onBlur={() => marcarTocado('pe_direito')}
                        className={`bg-white text-lg py-6 ${obterErroVisivel('pe_direito') ? 'border-red-500' : 'border-slate-300'}`}
                      >
                        <SelectValue placeholder="Selecione...">
                          {paramsForm['pe_direito'] ? `${String(paramsForm['pe_direito']).replace('.', ',')} m` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{String(op).replace('.', ',')} m</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderErroCampo('pe_direito')}
                  </div>
                )
              })()}
            </div>

            {/* Segunda Linha: Módulos, Largura e Tamanho do Vão */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              {(() => {
                const paramModulos = parametrosDef.find(p => p.nome_tecnico === 'n_modulos')
                const rotuloModulos = paramModulos?.rotulo || 'Número de Módulos'
                return (
                  <div className="grid gap-2 content-start">
                    <Label htmlFor="campo-n-modulos" className="font-bold text-slate-800 uppercase text-xs">{rotuloModulos} *</Label>
                    <Input 
                      id="campo-n-modulos"
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      value={paramsForm['n_modulos'] !== undefined && paramsForm['n_modulos'] !== '' ? String(paramsForm['n_modulos']) : ''}
                      placeholder="Ex: 2 módulos"
                      aria-invalid={!!obterErroVisivel('n_modulos')}
                      aria-describedby={obterErroVisivel('n_modulos') ? 'erro-n_modulos' : undefined}
                      className={`bg-white text-lg py-6 ${obterErroVisivel('n_modulos') ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'}`}
                      onKeyDown={handleNumericKeyDown('n_modulos', false)}
                      onBlur={() => marcarTocado('n_modulos')}
                      onChange={(e) => {
                        marcarTocado('n_modulos')
                        limparAvisoDigitacao('n_modulos')
                        const novoN = e.target.value === '' ? '' : Number(e.target.value)
                        handleParamChange('n_modulos', novoN)
                        const n = Number(novoN)
                        const w = Number(paramsForm['largura_modulo']) || 0
                        if (novoN !== '' && !isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 50 && w > 0) {
                          setLarguraTotal(n * w)
                        }
                      }}
                    />
                    {renderErroCampo('n_modulos')}
                  </div>
                )
              })()}

              {(() => {
                const paramLargura = parametrosDef.find(p => p.nome_tecnico === 'largura_modulo')
                if (!paramLargura) return null
                const opcoesRaw: string[] = Array.isArray(paramLargura.opcoes) ? paramLargura.opcoes : JSON.parse(paramLargura.opcoes as string || '[]')
                const opcoes = ordenarOpcoesNumericas(opcoesRaw)
                return (
                  <div className="grid gap-2 content-start">
                    <Label htmlFor="campo-largura-modulo" className="font-bold text-slate-800 uppercase text-xs">{paramLargura.rotulo} *</Label>
                    <Select
                      value={paramsForm['largura_modulo']?.toString() || ''}
                      onValueChange={(val) => {
                        marcarTocado('largura_modulo')
                        const w = Number(val)
                        const l = Number(larguraTotal) || 0
                        const n = Number(paramsForm['n_modulos']) || 0
                        if (w > 0 && l >= larguraMinima && l <= 500 && l % w === 0 && l / w <= 50) {
                          setParamsForm(prev => ({
                            ...prev,
                            largura_modulo: w,
                            n_modulos: l / w
                          }))
                        } else if (w > 0 && n >= 1 && n <= 50 && Number.isInteger(n)) {
                          handleParamChange('largura_modulo', w)
                          setLarguraTotal(n * w)
                        } else {
                          handleParamChange('largura_modulo', w)
                        }
                      }}
                    >
                      <SelectTrigger
                        id="campo-largura-modulo"
                        aria-label={paramLargura.rotulo}
                        aria-invalid={!!obterErroVisivel('largura_modulo')}
                        aria-describedby={obterErroVisivel('largura_modulo') ? 'erro-largura_modulo' : undefined}
                        onBlur={() => marcarTocado('largura_modulo')}
                        className={`bg-white text-lg py-6 ${obterErroVisivel('largura_modulo') ? 'border-red-500' : 'border-slate-300'}`}
                      >
                        <SelectValue placeholder="Selecione...">
                          {paramsForm['largura_modulo'] ? `${paramsForm['largura_modulo']} m` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{String(op).replace('.', ',')} m</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderErroCampo('largura_modulo')}
                  </div>
                )
              })()}

              {(() => {
                const paramVao = parametrosDef.find(p => p.nome_tecnico === 'vao')
                if (!paramVao) return null
                const opcoesRaw: string[] = Array.isArray(paramVao.opcoes) ? paramVao.opcoes : JSON.parse(paramVao.opcoes as string || '[]')
                const opcoes = ordenarOpcoesNumericas(opcoesRaw)
                return (
                  <div className="grid gap-2 content-start">
                    <Label htmlFor="campo-vao" className="font-bold text-slate-800 uppercase text-xs">{paramVao.rotulo} *</Label>
                    <Select
                      value={paramsForm['vao']?.toString() || ''}
                      onValueChange={(val) => {
                        marcarTocado('vao')
                        handleParamChange('vao', Number(val))
                      }}
                    >
                      <SelectTrigger
                        id="campo-vao"
                        aria-label={paramVao.rotulo}
                        aria-invalid={!!obterErroVisivel('vao')}
                        aria-describedby={obterErroVisivel('vao') ? 'erro-vao' : undefined}
                        onBlur={() => marcarTocado('vao')}
                        className={`bg-white text-lg py-6 ${obterErroVisivel('vao') ? 'border-red-500' : 'border-slate-300'}`}
                      >
                        <SelectValue placeholder="Selecione...">
                          {paramsForm['vao'] ? `${paramsForm['vao']} m` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{String(op).replace('.', ',')} m</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderErroCampo('vao')}
                  </div>
                )
              })()}
            </div>
            
            {comprimento !== '' && Number(comprimento) >= 3 && Number(comprimento) <= 500 && paramsForm['vao'] && !vaoError && (
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
                  <Label htmlFor="campo-vao-ultimo" className="font-bold text-orange-900 uppercase text-xs">Tamanho do último vão (m) *</Label>
                  <Input 
                    id="campo-vao-ultimo"
                    type="number"
                    min={0.5}
                    max={Number(paramsForm['vao']) || 4}
                    step="any"
                    value={vaoUltimo}
                    aria-invalid={!!obterErroVisivel('vaoUltimo')}
                    aria-describedby={obterErroVisivel('vaoUltimo') ? 'erro-vaoUltimo' : undefined}
                    onKeyDown={handleNumericKeyDown('vaoUltimo', true)}
                    onBlur={() => marcarTocado('vaoUltimo')}
                    onChange={(e) => {
                      marcarTocado('vaoUltimo')
                      limparAvisoDigitacao('vaoUltimo')
                      const raw = e.target.value.replace(',', '.')
                      setVaoUltimo(raw === '' ? '' : Number(raw))
                    }}
                    className={`bg-white text-lg py-6 ${obterErroVisivel('vaoUltimo') ? 'border-red-500 focus-visible:ring-red-500' : 'border-orange-300 focus-visible:ring-orange-500'}`}
                  />
                  {renderErroCampo('vaoUltimo')}
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
              .filter(p => !['n_modulos', 'largura_modulo', 'n_vaos', 'pe_direito', 'vao', 'portas_abrir', 'portas_correr', 'portas_correr_pequena', 'portas_correr_grande'].includes(p.nome_tecnico))
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
                // Pé-direito 2 e 2,5 m não têm postes duplos
                const pdAtual = Number(paramsForm['pe_direito'])
                if (pdAtual > 0 && pdAtual < 3) return null
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
                const opcoesFixInf: string[] = tipoFixacaoInferior
                  ? (Array.isArray(tipoFixacaoInferior.opcoes)
                      ? tipoFixacaoInferior.opcoes
                      : JSON.parse((tipoFixacaoInferior.opcoes as string) || '[]'))
                  : []
                const rotuloFixInf = param.rotulo?.toLowerCase().includes('mureta')
                  ? param.rotulo
                  : `${param.rotulo} (Mureta / Enterrada / Lateral Simples)`
                return (
                  <div key="master_fixacao_inferior" className="col-span-1 md:col-span-2 flex flex-col mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="fixacao_inferior" 
                        checked={!!paramsForm['fixacao_inferior']}
                        onCheckedChange={(c) => {
                          handleParamChange('fixacao_inferior', c)
                          if (!c) {
                            handleParamChange('tipo_fixacao_inferior', '')
                          } else if (!paramsForm['tipo_fixacao_inferior'] && opcoesFixInf.includes('MURETA')) {
                            handleParamChange('tipo_fixacao_inferior', 'MURETA')
                          }
                        }}
                      />
                      <Label htmlFor="fixacao_inferior" className="text-sm font-bold leading-none cursor-pointer">
                        {rotuloFixInf}
                      </Label>
                    </div>
                    {paramsForm['fixacao_inferior'] && tipoFixacaoInferior && (
                      <div className="grid gap-2 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        <Label htmlFor="campo-tipo-fixacao-inferior" className="uppercase text-xs font-semibold text-slate-600">
                          {tipoFixacaoInferior.rotulo} *
                        </Label>
                        <Select 
                          value={paramsForm['tipo_fixacao_inferior']?.toString() || ''}
                          onValueChange={(val) => {
                            marcarTocado('tipo_fixacao_inferior')
                            handleParamChange('tipo_fixacao_inferior', val)
                          }}
                        >
                          <SelectTrigger
                            id="campo-tipo-fixacao-inferior"
                            aria-label={tipoFixacaoInferior.rotulo}
                            aria-invalid={!!obterErroVisivel('tipo_fixacao_inferior')}
                            aria-describedby={obterErroVisivel('tipo_fixacao_inferior') ? 'erro-tipo_fixacao_inferior' : undefined}
                            onBlur={() => marcarTocado('tipo_fixacao_inferior')}
                            className={`w-full bg-white ${obterErroVisivel('tipo_fixacao_inferior') ? 'border-red-500' : ''}`}
                          >
                            <SelectValue placeholder="Selecione...">
                              {paramsForm['tipo_fixacao_inferior'] ? String(paramsForm['tipo_fixacao_inferior']) : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {opcoesFixInf.map((op: string) => (
                              <SelectItem key={op} value={op}>{op}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {renderErroCampo('tipo_fixacao_inferior')}
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
                          <Label htmlFor="campo-travamentos-x" className="uppercase text-xs font-semibold text-slate-600">Quantos X por linha? *</Label>
                          <Input 
                            id="campo-travamentos-x"
                            type="number"
                            min={1}
                            max={20}
                            step={1}
                            placeholder="Ex: 1"
                            value={paramsForm['travamentos_x'] !== undefined && paramsForm['travamentos_x'] !== '' ? String(paramsForm['travamentos_x']) : ''}
                            aria-invalid={!!obterErroVisivel('travamentos_x')}
                            aria-describedby={obterErroVisivel('travamentos_x') ? 'erro-travamentos_x' : undefined}
                            onKeyDown={handleNumericKeyDown('travamentos_x', false)}
                            onBlur={() => marcarTocado('travamentos_x')}
                            onChange={(e) => {
                              marcarTocado('travamentos_x')
                              limparAvisoDigitacao('travamentos_x')
                              handleParamChange('travamentos_x', e.target.value === '' ? '' : Number(e.target.value))
                            }}
                            className={`bg-white ${obterErroVisivel('travamentos_x') ? 'border-red-500' : ''}`}
                          />
                          {renderErroCampo('travamentos_x')}
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
                          <Label htmlFor="campo-tipo-cobertura" className="uppercase text-xs font-semibold text-slate-600">Qual o tipo de cobertura?</Label>
                          <Select 
                            value={paramsForm['tipo_cobertura']?.toString() || ''}
                            onValueChange={(val) => {
                              handleParamChange('tipo_cobertura', val)
                              handleParamChange('produto_filme_cobertura', '') // reseta o produto ao mudar
                            }}
                          >
                            <SelectTrigger id="campo-tipo-cobertura" className="bg-white">
                              <SelectValue placeholder="Selecione...">
                                {paramsForm['tipo_cobertura'] ? String(paramsForm['tipo_cobertura']) : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FILME">FILME</SelectItem>
                              <SelectItem value="TELA">TELA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {showProducts && (
                          <div className="grid gap-2 pt-2 border-t border-slate-200">
                            <Label htmlFor="campo-produto-cobertura" className="uppercase text-xs font-semibold text-slate-600">
                              {isFilme ? 'Qual Filme / Plástico?' : 'Qual Tela?'}
                            </Label>
                            <ProdutoSelectComBusca
                              id="campo-produto-cobertura"
                              ariaLabel={isFilme ? 'Qual Filme / Plástico da cobertura?' : 'Qual Tela da cobertura?'}
                              value={paramsForm['produto_filme_cobertura']?.toString() || ''}
                              onChange={(val) => handleParamChange('produto_filme_cobertura', val)}
                              produtos={produtos.filter(p => {
                                const desc = p.descricao.toUpperCase()
                                if (isFilme) {
                                  return desc.includes('FILME') || desc.includes('PLÁSTICO') || desc.includes('PLASTICO') || desc.includes('LONA')
                                } else {
                                  return desc.includes('TELA') || desc.includes('SOMBRITE') || desc.includes('REDE')
                                }
                              })}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              if (param.tipo === 'booleano' && param.nome_tecnico === 'arco_divisa' && soArcoSimples) {
                return (
                  <div key={param.nome_tecnico} className="col-span-2 mt-2 text-xs text-slate-500">
                    Módulo de {larguraModuloAtual} m não tem arco de divisa.
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
                          if (param.nome_tecnico === 'fechamento_lateral' && !c) {
                            handleParamChange('tipo_fechamento_material', '')
                            handleParamChange('produto_filme_fechamento', '')
                            handleParamChange('master_divisas_frente_fundo', false)
                            handleParamChange('divisas_frente', 0)
                            handleParamChange('divisas_fundo', 0)
                            handleParamChange('fechamento_divisa_perfil', '')
                            handleParamChange('tela_largura_rolo', '')
                            handleParamChange('meia_lua_material', '')
                            handleParamChange('produto_meia_lua', '')
                          }
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
                          <Label htmlFor="campo-tipo-fechamento-material" className="uppercase text-xs font-semibold text-slate-600">O que será usado no fechamento lateral?</Label>
                          <Select 
                            value={paramsForm['tipo_fechamento_material']?.toString() || ''}
                            onValueChange={(val) => {
                              handleParamChange('tipo_fechamento_material', val)
                              handleParamChange('produto_filme_fechamento', '') // reseta o produto ao mudar
                              handleParamChange('meia_lua_material', val || '')
                              handleParamChange('produto_meia_lua', '')
                              if (val !== 'tela') {
                                handleParamChange('tela_largura_rolo', '')
                              }
                            }}
                          >
                            <SelectTrigger id="campo-tipo-fechamento-material" className="bg-white">
                              <SelectValue placeholder="Selecione...">
                                {paramsForm['tipo_fechamento_material'] === 'filme'
                                  ? 'Filme / Plástico'
                                  : paramsForm['tipo_fechamento_material'] === 'tela'
                                    ? 'Tela'
                                    : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="filme">Filme / Plástico</SelectItem>
                              <SelectItem value="tela">Tela</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {paramsForm['tipo_fechamento_material'] && (
                          <>
                            <div className="grid gap-2 pt-2 border-t border-slate-200">
                              <Label htmlFor="campo-produto-fechamento" className="uppercase text-xs font-semibold text-slate-600">
                                {paramsForm['tipo_fechamento_material'] === 'filme' ? 'Qual Filme / Plástico?' : 'Qual Tela?'}
                              </Label>
                              <ProdutoSelectComBusca
                                id="campo-produto-fechamento"
                                ariaLabel={paramsForm['tipo_fechamento_material'] === 'filme' ? 'Qual Filme / Plástico do fechamento?' : 'Qual Tela do fechamento?'}
                                value={paramsForm['produto_filme_fechamento']?.toString() || ''}
                                onChange={(val) => handleParamChange('produto_filme_fechamento', val)}
                                produtos={produtos.filter(p => {
                                  const desc = p.descricao.toUpperCase()
                                  if (paramsForm['tipo_fechamento_material'] === 'filme') {
                                    return desc.includes('FILME') || desc.includes('PLÁSTICO') || desc.includes('PLASTICO') || desc.includes('LONA')
                                  } else {
                                    return desc.includes('TELA') || desc.includes('SOMBRITE') || desc.includes('REDE')
                                  }
                                })}
                              />
                            </div>

                            {paramsForm['tipo_fechamento_material'] === 'tela' && (
                              <div className="grid gap-2 pt-2 border-t border-slate-200">
                                <Label htmlFor="campo-tela-largura-rolo" className="uppercase text-xs font-semibold text-slate-600">
                                  Largura do rolo da tela escolhida (m)
                                </Label>
                                <Input
                                  id="campo-tela-largura-rolo"
                                  type="number"
                                  step="any"
                                  min={0.5}
                                  max={20}
                                  placeholder="Ex: 3 ou 4,2"
                                  value={paramsForm['tela_largura_rolo'] !== undefined && paramsForm['tela_largura_rolo'] !== '' ? String(paramsForm['tela_largura_rolo']) : ''}
                                  aria-invalid={!!obterErroVisivel('tela_largura_rolo')}
                                  aria-describedby={obterErroVisivel('tela_largura_rolo') ? 'erro-tela_largura_rolo' : undefined}
                                  onKeyDown={handleNumericKeyDown('tela_largura_rolo', true)}
                                  onBlur={() => marcarTocado('tela_largura_rolo')}
                                  onChange={(e) => {
                                    marcarTocado('tela_largura_rolo')
                                    limparAvisoDigitacao('tela_largura_rolo')
                                    const raw = e.target.value.replace(',', '.')
                                    handleParamChange('tela_largura_rolo', raw === '' ? '' : Number(raw))
                                  }}
                                  className={`bg-white ${obterErroVisivel('tela_largura_rolo') ? 'border-red-500' : ''}`}
                                />
                                {renderErroCampo('tela_largura_rolo')}
                              </div>
                            )}

                            {(Number(paramsForm['n_modulos']) || 0) > 1 && (() => {
                              const maxDivisas = Math.max(0, (Number(paramsForm['n_modulos']) || 0) - 1)
                              return (
                                <div className="grid gap-3 pt-2 border-t border-slate-200">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="master_divisas_frente_fundo"
                                      checked={!!paramsForm['master_divisas_frente_fundo']}
                                      onCheckedChange={(c) => {
                                        handleParamChange('master_divisas_frente_fundo', !!c)
                                        if (!c) {
                                          handleParamChange('divisas_frente', 0)
                                          handleParamChange('divisas_fundo', 0)
                                        }
                                      }}
                                    />
                                    <Label htmlFor="master_divisas_frente_fundo" className="text-sm font-bold leading-none cursor-pointer">
                                      {paramsForm['tipo_fechamento_material'] === 'filme'
                                        ? 'Vai ter divisa de FILME na frente e no fundo?'
                                        : 'Vai ter divisa de TELA na frente e no fundo?'}
                                    </Label>
                                  </div>

                                  {paramsForm['master_divisas_frente_fundo'] && (
                                    <div className="grid gap-3 pl-6">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-1.5">
                                          <Label htmlFor="campo-divisas-frente" className="uppercase text-xs font-semibold text-slate-600">
                                            Quantas divisas na FRENTE?
                                          </Label>
                                          <Input
                                            id="campo-divisas-frente"
                                            type="number"
                                            min={0}
                                            max={maxDivisas}
                                            value={Number(paramsForm['divisas_frente'] ?? 0)}
                                            onChange={(e) => {
                                              const v = Math.min(maxDivisas, Math.max(0, Math.floor(Number(e.target.value) || 0)))
                                              handleParamChange('divisas_frente', v)
                                            }}
                                            className="bg-white"
                                          />
                                          <span className="text-[11px] text-slate-500">
                                            máximo {maxDivisas} nesta estufa
                                          </span>
                                        </div>
                                        <div className="grid gap-1.5">
                                          <Label htmlFor="campo-divisas-fundo" className="uppercase text-xs font-semibold text-slate-600">
                                            Quantas divisas no FUNDO?
                                          </Label>
                                          <Input
                                            id="campo-divisas-fundo"
                                            type="number"
                                            min={0}
                                            max={maxDivisas}
                                            value={Number(paramsForm['divisas_fundo'] ?? 0)}
                                            onChange={(e) => {
                                              const v = Math.min(maxDivisas, Math.max(0, Math.floor(Number(e.target.value) || 0)))
                                              handleParamChange('divisas_fundo', v)
                                            }}
                                            className="bg-white"
                                          />
                                          <span className="text-[11px] text-slate-500">
                                            máximo {maxDivisas} nesta estufa
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-xs text-slate-500">
                                        A divisa só pode ser feita em poste frontal de divisa modular.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {((Number(paramsForm['n_divisas_por_modulo']) || 0) > 0 ||
                              (Number(paramsForm['divisas_frente']) || 0) > 0 ||
                              (Number(paramsForm['divisas_fundo']) || 0) > 0) && (
                              <div className="grid gap-2 pt-2 border-t border-slate-200">
                                <Label className="uppercase text-xs font-semibold text-slate-600">
                                  Perfil na divisa:
                                </Label>
                                <Select
                                  value={paramsForm['fechamento_divisa_perfil']?.toString() || 'MOLAS JUNTAS'}
                                  onValueChange={(val) => handleParamChange('fechamento_divisa_perfil', val)}
                                >
                                  <SelectTrigger className="bg-white w-full">
                                    <SelectValue placeholder="Selecione...">
                                      {paramsForm['fechamento_divisa_perfil'] === 'MOLAS SEPARADAS'
                                        ? 'Molas separadas (5078)'
                                        : 'Molas juntas (5084)'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="MOLAS JUNTAS">Molas juntas (5084)</SelectItem>
                                    <SelectItem value="MOLAS SEPARADAS">Molas separadas (5078)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="grid gap-3 pt-2 border-t border-slate-200">
                              <div className="grid gap-2">
                                <Label className="uppercase text-xs font-semibold text-slate-600">
                                  Material da meia lua (arcos frontais):
                                </Label>
                                <Select
                                  value={paramsForm['meia_lua_material']?.toString() || paramsForm['tipo_fechamento_material']?.toString() || ''}
                                  onValueChange={(val) => {
                                    handleParamChange('meia_lua_material', val)
                                    handleParamChange('produto_meia_lua', '')
                                  }}
                                >
                                  <SelectTrigger className="bg-white w-full">
                                    <SelectValue placeholder="Selecione...">
                                      {(paramsForm['meia_lua_material'] || paramsForm['tipo_fechamento_material']) === 'tela'
                                        ? 'Tela'
                                        : 'Filme'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="filme">Filme</SelectItem>
                                    <SelectItem value="tela">Tela</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {paramsForm['meia_lua_material'] &&
                                paramsForm['meia_lua_material'] !== paramsForm['tipo_fechamento_material'] && (
                                <div className="grid gap-2">
                                  <Label className="uppercase text-xs font-semibold text-slate-600">
                                    {paramsForm['meia_lua_material'] === 'filme' ? 'Qual filme da meia lua?' : 'Qual tela da meia lua?'}
                                  </Label>
                                  <ProdutoSelectComBusca
                                    value={paramsForm['produto_meia_lua']?.toString() || ''}
                                    onChange={(val) => handleParamChange('produto_meia_lua', val)}
                                    produtos={produtos.filter(p => {
                                      const desc = p.descricao.toUpperCase()
                                      if (paramsForm['meia_lua_material'] === 'filme') {
                                        return desc.includes('FILME') || desc.includes('PLÁSTICO') || desc.includes('PLASTICO') || desc.includes('LONA')
                                      } else {
                                        return desc.includes('TELA') || desc.includes('SOMBRITE') || desc.includes('REDE')
                                      }
                                    })}
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {param.nome_tecnico === 'arco_divisa' && paramsForm['arco_divisa'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        <div className="grid gap-2">
                          <Label htmlFor="campo-n-divisas-por-modulo" className="uppercase text-xs font-semibold text-slate-600">Quantos arcos de divisa por módulo? *</Label>
                          <Input 
                            id="campo-n-divisas-por-modulo"
                            type="number"
                            min={1}
                            max={50}
                            step={1}
                            placeholder="Ex: 1"
                            value={paramsForm['n_divisas_por_modulo'] !== undefined && paramsForm['n_divisas_por_modulo'] !== '' ? String(paramsForm['n_divisas_por_modulo']) : ''}
                            aria-invalid={!!obterErroVisivel('n_divisas_por_modulo')}
                            aria-describedby={obterErroVisivel('n_divisas_por_modulo') ? 'erro-n_divisas_por_modulo' : undefined}
                            onKeyDown={handleNumericKeyDown('n_divisas_por_modulo', false)}
                            onBlur={() => marcarTocado('n_divisas_por_modulo')}
                            onChange={(e) => {
                              marcarTocado('n_divisas_por_modulo')
                              limparAvisoDigitacao('n_divisas_por_modulo')
                              handleParamChange('n_divisas_por_modulo', e.target.value === '' ? '' : Number(e.target.value))
                            }}
                            className={`bg-white ${obterErroVisivel('n_divisas_por_modulo') ? 'border-red-500' : ''}`}
                          />
                          {renderErroCampo('n_divisas_por_modulo')}
                        </div>
                      </div>
                    )}

                    {param.nome_tecnico === 'possui_anticamara' && paramsForm['possui_anticamara'] && (
                      <div className="grid gap-4 mt-4 ml-6 p-4 bg-slate-50 border border-slate-200 rounded-md w-full md:w-[600px] max-w-full">
                        {anticamaraConfig.map((item, index) => (
                          <div key={item.id} className="flex flex-col sm:flex-row items-start gap-4 relative pr-12">
                            <div className="grid gap-2 flex-1 w-full">
                              <Label htmlFor={`campo-anticamara-qtd-${index}`} className="uppercase text-[10px] font-semibold text-slate-600">Quantidade de Anticâmaras *</Label>
                              <Input 
                                id={`campo-anticamara-qtd-${index}`}
                                type="number"
                                min={1}
                                max={20}
                                step={1}
                                placeholder="Ex: 1 anticâmara"
                                value={item.quantidade}
                                aria-invalid={!!obterErroVisivel(`anticamara_qtd_${index}`)}
                                aria-describedby={obterErroVisivel(`anticamara_qtd_${index}`) ? `erro-anticamara_qtd_${index}` : undefined}
                                onKeyDown={handleNumericKeyDown(`anticamara_qtd_${index}`, false)}
                                onBlur={() => marcarTocado(`anticamara_qtd_${index}`)}
                                onChange={(e) => {
                                  marcarTocado(`anticamara_qtd_${index}`)
                                  limparAvisoDigitacao(`anticamara_qtd_${index}`)
                                  const newConfig = [...anticamaraConfig];
                                  newConfig[index].quantidade = e.target.value === '' ? '' : Number(e.target.value);
                                  setAnticamaraConfig(newConfig);
                                }}
                                className={`bg-white ${obterErroVisivel(`anticamara_qtd_${index}`) ? 'border-red-500' : ''}`}
                              />
                              {renderErroCampo(`anticamara_qtd_${index}`)}
                            </div>
                            <div className="grid gap-2 flex-[2] w-full">
                              <Label htmlFor={`campo-anticamara-modelo-${index}`} className="uppercase text-[10px] font-semibold text-slate-600">Qual o modelo da anticâmara? *</Label>
                              <Select 
                                value={item.modelo}
                                onValueChange={(val) => {
                                  marcarTocado(`anticamara_modelo_${index}`)
                                  const newConfig = [...anticamaraConfig];
                                  newConfig[index].modelo = val ?? "";
                                  setAnticamaraConfig(newConfig);
                                }}
                              >
                                <SelectTrigger
                                  id={`campo-anticamara-modelo-${index}`}
                                  aria-invalid={!!obterErroVisivel(`anticamara_modelo_${index}`)}
                                  aria-describedby={obterErroVisivel(`anticamara_modelo_${index}`) ? `erro-anticamara_modelo_${index}` : undefined}
                                  onBlur={() => marcarTocado(`anticamara_modelo_${index}`)}
                                  className={`bg-white w-full ${obterErroVisivel(`anticamara_modelo_${index}`) ? 'border-red-500' : ''}`}
                                >
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
                              {renderErroCampo(`anticamara_modelo_${index}`)}
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

              if (param.nome_tecnico === 'tipo_poste') {
                const permite75x40 = Number(paramsForm['pe_direito']) !== 5
                const permite100x50 = Number(paramsForm['pe_direito']) !== 2
                return (
                  <div key="tipo_poste" className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="uppercase text-xs font-semibold text-slate-600">{param.rotulo}</Label>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-semibold">
                        Padrão Ativo
                      </Badge>
                    </div>
                    <Select 
                      value={paramsForm['tipo_poste']?.toString() || '100X50 GALVANIZADO'}
                      onValueChange={(val) => handleParamChange('tipo_poste', val)}
                    >
                      <SelectTrigger id="campo-tipo-poste" className="w-full bg-white">
                        <SelectValue placeholder="Selecione...">
                          {paramsForm['tipo_poste'] === '75X40 GALVANIZADO'
                            ? (permite75x40 ? '75x40 Galvanizado' : '75x40 Galvanizado (não existe para pé-direito 5 m)')
                            : paramsForm['tipo_poste'] === 'EUCALIPTO'
                              ? 'Eucalipto Tratado (Aguardando aprovação de regras)'
                              : '100x50 Galvanizado (Padrão Homologado ArcoForte)'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="100X50 GALVANIZADO"
                          disabled={!permite100x50}
                          className={!permite100x50 ? "opacity-50 text-slate-400" : undefined}
                        >
                          {permite100x50
                            ? "100x50 Galvanizado (Padrão Homologado ArcoForte)"
                            : "100x50 Galvanizado (não existe para pé-direito 2 m)"}
                        </SelectItem>
                        <SelectItem
                          value="75X40 GALVANIZADO"
                          disabled={!permite75x40}
                          className={!permite75x40 ? "opacity-50 text-slate-400" : undefined}
                        >
                          {permite75x40
                            ? "75x40 Galvanizado"
                            : "75x40 Galvanizado (não existe para pé-direito 5 m)"}
                        </SelectItem>
                        <SelectItem value="EUCALIPTO" disabled className="opacity-50 text-slate-400">
                          Eucalipto Tratado (Aguardando aprovação de regras)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      * Postes 100x50 Galvanizados são o padrão. Em todos os pés-direitos, menos o de 5 m, é possível usar 75x40 Galvanizado nos postes de canto, laterais e de divisa modular; os postes centrais de topo de arco continuam 100x50. Eucalipto aguarda aprovação de regras.
                    </p>
                  </div>
                )
              }

              if (param.tipo === 'selecao' && param.opcoes) {
                const opcoesTodas: string[] = Array.isArray(param.opcoes) ? param.opcoes : JSON.parse(param.opcoes as string || '[]')
                const limitarArco = param.nome_tecnico === 'tipo_arco' && soArcoSimples
                const opcoes = limitarArco ? opcoesTodas.filter(o => o === 'SIMPLES') : opcoesTodas
                const obrigatorio = param.nome_tecnico === 'tipo_arco' || param.nome_tecnico === 'calha_lateral'
                return (
                  <div key={param.nome_tecnico} className="grid gap-2 content-start">
                    <Label htmlFor={`campo-${param.nome_tecnico}`} className="uppercase text-xs font-semibold text-slate-600">
                      {param.rotulo}{obrigatorio ? ' *' : ''}
                    </Label>
                    <Select
                      value={paramsForm[param.nome_tecnico]?.toString() || ''}
                      onValueChange={(val) => {
                        marcarTocado(param.nome_tecnico)
                        const num = Number(val)
                        handleParamChange(param.nome_tecnico, isNaN(num) ? val : num)
                      }}
                    >
                      <SelectTrigger
                        id={`campo-${param.nome_tecnico}`}
                        aria-label={param.rotulo}
                        aria-invalid={!!obterErroVisivel(param.nome_tecnico)}
                        aria-describedby={obterErroVisivel(param.nome_tecnico) ? `erro-${param.nome_tecnico}` : undefined}
                        onBlur={() => marcarTocado(param.nome_tecnico)}
                        className={`w-full bg-white ${obterErroVisivel(param.nome_tecnico) ? 'border-red-500' : ''}`}
                      >
                        <SelectValue placeholder="Selecione...">
                          {paramsForm[param.nome_tecnico] ? String(paramsForm[param.nome_tecnico]) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {opcoes.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {limitarArco && (
                      <p className="text-xs text-slate-500">Módulo de {larguraModuloAtual} m só tem arco simples.</p>
                    )}
                    {renderErroCampo(param.nome_tecnico)}
                  </div>
                )
              }

              return (
                <div key={param.nome_tecnico} className="grid gap-2 content-start">
                  <Label htmlFor={`campo-${param.nome_tecnico}`} className="uppercase text-xs font-semibold text-slate-600">{param.rotulo}</Label>
                  <Input 
                    id={`campo-${param.nome_tecnico}`}
                    type={param.tipo === 'numero' ? 'number' : 'text'} 
                    value={paramsForm[param.nome_tecnico] !== undefined && paramsForm[param.nome_tecnico] !== '' ? String(paramsForm[param.nome_tecnico]) : ''}
                    placeholder={`Ex: ${param.tipo === 'numero' ? '10' : ''}`}
                    aria-invalid={!!obterErroVisivel(param.nome_tecnico)}
                    aria-describedby={obterErroVisivel(param.nome_tecnico) ? `erro-${param.nome_tecnico}` : undefined}
                    onKeyDown={param.tipo === 'numero' ? handleNumericKeyDown(param.nome_tecnico, true) : undefined}
                    onBlur={() => marcarTocado(param.nome_tecnico)}
                    onChange={(e) => {
                      marcarTocado(param.nome_tecnico)
                      limparAvisoDigitacao(param.nome_tecnico)
                      const val = param.tipo === 'numero' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                      handleParamChange(param.nome_tecnico, val)
                    }}
                  />
                  {renderErroCampo(param.nome_tecnico)}
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
                    <div key={porta.id} className="flex flex-col sm:flex-row items-start gap-4 relative pr-12">
                      <div className="grid gap-2 flex-1 w-full">
                        <Label htmlFor={`campo-porta-qtd-${index}`} className="uppercase text-[10px] font-semibold text-slate-600">Quantas Portas? *</Label>
                        <Input 
                          id={`campo-porta-qtd-${index}`}
                          type="number"
                          min={1}
                          max={50}
                          step={1}
                          placeholder="Ex: 2 portas"
                          value={porta.quantidade}
                          aria-invalid={!!obterErroVisivel(`porta_qtd_${index}`)}
                          aria-describedby={obterErroVisivel(`porta_qtd_${index}`) ? `erro-porta_qtd_${index}` : undefined}
                          onKeyDown={handleNumericKeyDown(`porta_qtd_${index}`, false)}
                          onBlur={() => marcarTocado(`porta_qtd_${index}`)}
                          onChange={(e) => {
                            marcarTocado(`porta_qtd_${index}`)
                            limparAvisoDigitacao(`porta_qtd_${index}`)
                            const newConfig = [...portasConfig];
                            newConfig[index].quantidade = e.target.value === '' ? '' : Number(e.target.value);
                            setPortasConfig(newConfig);
                          }}
                          className={`bg-white ${obterErroVisivel(`porta_qtd_${index}`) ? 'border-red-500' : ''}`}
                        />
                        {renderErroCampo(`porta_qtd_${index}`)}
                      </div>
                      <div className="grid gap-2 flex-[2] w-full">
                        <Label htmlFor={`campo-porta-tipo-${index}`} className="uppercase text-[10px] font-semibold text-slate-600">Qual o modelo da porta? *</Label>
                        <Select 
                          value={porta.tipo}
                          onValueChange={(val) => {
                            marcarTocado(`porta_tipo_${index}`)
                            const newConfig = [...portasConfig];
                            newConfig[index].tipo = val ?? "";
                            setPortasConfig(newConfig);
                          }}
                        >
                          <SelectTrigger
                            id={`campo-porta-tipo-${index}`}
                            aria-invalid={!!obterErroVisivel(`porta_tipo_${index}`)}
                            aria-describedby={obterErroVisivel(`porta_tipo_${index}`) ? `erro-porta_tipo_${index}` : undefined}
                            onBlur={() => marcarTocado(`porta_tipo_${index}`)}
                            className={`bg-white ${obterErroVisivel(`porta_tipo_${index}`) ? 'border-red-500' : ''}`}
                          >
                            <SelectValue placeholder="Selecione o modelo...">
                              {porta.tipo === 'abrir'
                                ? 'Porta de Abrir 2,00 x 1,00 m'
                                : porta.tipo === 'correr_pequena'
                                  ? 'Porta de Correr 1,20 x 2,00 m'
                                  : porta.tipo === 'correr_grande'
                                    ? 'Porta de Correr 2,10 x 3,00 m'
                                    : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abrir">Porta de Abrir 2,00 x 1,00 m</SelectItem>
                            <SelectItem value="correr_pequena">Porta de Correr 1,20 x 2,00 m</SelectItem>
                            <SelectItem value="correr_grande">Porta de Correr 2,10 x 3,00 m</SelectItem>
                          </SelectContent>
                        </Select>
                        {renderErroCampo(`porta_tipo_${index}`)}
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
          <CardFooter className="bg-muted/30 pt-6 flex flex-col gap-4">
            {tentouCalcular && chavesErrosAtivos.length > 0 && (
              <div className="w-full rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>
                    Há {chavesErrosAtivos.length} campo(s) obrigatório(s) ou inválido(s). Confira a mensagem em vermelho junto de cada campo.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => focarCampoComErro(chavesErrosAtivos[0])}
                  className="shrink-0 border-red-300 bg-white text-red-700 hover:bg-red-100 text-xs h-7"
                >
                  Ir para o campo
                </Button>
              </div>
            )}
            <Button onClick={handleCalcular} className="w-full gap-2 text-lg py-6 bg-[#d97021] hover:bg-[#c3631b] text-white">
              <Calculator className="h-5 w-5" />
              {orcamentoInicial ? "Recalcular Lista de Materiais" : "Calcular Lista de Materiais"}
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
                    gerarPDFOrcamento({ id: orcamentoInicial?.id || 'RASCUNHO', clientes: { nome: cliente?.nome || '' }, parametros_utilizados: paramsForm }, resultado, false)
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
                    gerarPDFOrcamento({ id: orcamentoInicial?.id || 'RASCUNHO', clientes: { nome: cliente?.nome || '' }, parametros_utilizados: paramsForm }, resultado, true)
                  }}
                >
                  <Download className="h-4 w-4" />
                  PDF Agrupado
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Dialog open={!!itemExplicado} onOpenChange={(aberto) => { if (!aberto) setItemExplicado(null) }}>
                  <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Como chegamos nesta quantidade</DialogTitle>
                      <DialogDescription>
                        {itemExplicado ? `${itemExplicado.produto_codigo} - ${itemExplicado.produto_descricao}` : ''}
                      </DialogDescription>
                    </DialogHeader>
                    {itemExplicado && (() => {
                      const detalhes = itemExplicado.detalhes || []
                      const numero = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)
                      const calculado = detalhes.reduce((acc, d) => acc + d.quantidade_final, 0)
                      return (
                        <div className="space-y-4 text-sm">
                          {detalhes.length === 0 && (
                            <p className="text-slate-600">
                              Com os dados preenchidos agora, nenhuma regra do sistema calcula este item. Ele pode ter sido incluído ou trocado à mão. Clique em Recalcular Lista de Materiais para conferir.
                            </p>
                          )}
                          {detalhes.map((d, i) => {
                            const texto = montarTextoExplicacao(d)
                            return (
                              <div key={i} className="rounded-md border border-slate-200 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-800">{d.posicao_nome}</span>
                                  <span className="font-bold text-[#d97021] whitespace-nowrap">{numero(d.quantidade_final)} {itemExplicado.unidade}</span>
                                </div>
                                {texto ? (
                                  <p className="text-slate-700 leading-relaxed">{texto}</p>
                                ) : (
                                  <p className="text-slate-500 italic">Esta regra ainda não tem explicação escrita.</p>
                                )}
                                {(d.margem_perda > 0 || d.arredondamento !== 'nenhum') && (
                                  <p className="text-xs text-slate-600">
                                    {d.margem_perda > 0 ? `Somamos ${numero(d.margem_perda)}% de sobra. ` : ''}
                                    {d.arredondamento === 'cima' ? 'Arredondamos para cima.' : d.arredondamento === 'baixo' ? 'Arredondamos para baixo.' : ''}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                          {detalhes.length > 1 && (
                            <p className="text-right font-semibold text-slate-800">
                              Total calculado: {numero(calculado)} {itemExplicado.unidade}
                            </p>
                          )}
                          {itemExplicado.isManualChange && detalhes.length > 0 && (
                            <p className="rounded-md bg-orange-50 border border-orange-200 p-2 text-xs text-orange-700">
                              Este item foi alterado manualmente. O sistema tinha calculado {numero(calculado)} {itemExplicado.unidade}.
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </DialogContent>
                </Dialog>
                {/* Agrupar por grupo para exibição */}
                {Array.from(new Set(resultado.map(i => i.grupo_nome))).map(grupo => (
                  <div key={grupo}>
                    <h3 className="font-bold border-b pb-2 mb-3 text-slate-700">{grupo}</h3>
                    <div className="space-y-2">
                      {resultado.filter(i => i.grupo_nome === grupo).map((item, idx) => {
                        const realIndex = resultado.indexOf(item)
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                            <div className="flex-1">
                              <span className="font-medium">{item.produto_codigo} - {item.produto_descricao}</span>
                              {(
                                <button
                                  type="button"
                                  onClick={() => abrirExplicacao(item)}
                                  className="inline-flex align-middle ml-1.5 text-[#d97021]/70 hover:text-[#d97021]"
                                  title="Como o sistema chegou nesta quantidade"
                                  aria-label="Explicar o cálculo"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              )}
                              {item.isManualChange && (
                                <Badge variant="outline" className="ml-2 mt-1 text-[10px] h-5 bg-orange-50 text-orange-600 border-orange-200 w-fit">Alterado Manualmente</Badge>
                              )}
                            </div>
                            <div className="text-right flex items-center justify-end gap-3 min-w-[180px]">
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={item.quantidade_final}
                                  onChange={(e) => {
                                    const novaQtd = Math.max(0, Number(e.target.value) || 0)
                                    const newRes = [...resultado]
                                    const current = newRes[realIndex]
                                    newRes[realIndex] = {
                                      ...current,
                                      quantidade_final: novaQtd,
                                      valor_total: current.preco_unitario * novaQtd,
                                      isManualChange: true,
                                      manualOriginalProduto: current.manualOriginalProduto || current.produto_codigo
                                    }
                                    setResultado(newRes)
                                  }}
                                  className="w-20 h-7 text-right bg-white px-2 text-xs font-bold"
                                  title="Editar quantidade"
                                />
                                <span className="text-xs font-semibold text-slate-600">{item.unidade}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-[100px] justify-end">
                                <span className="text-xs text-muted-foreground block">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_total)}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-[#d97021]"
                                  onClick={() => setSwapItemIndex(realIndex)}
                                  title="Trocar Produto"
                                >
                                  <ArrowLeftRight className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                                  onClick={() => {
                                    setResultado(resultado.filter((_, i) => i !== realIndex))
                                  }}
                                  title="Remover Item"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
              {swapItemIndex !== null && resultado[swapItemIndex] && (
                <div className="text-sm bg-slate-50 p-3 rounded border">
                  <span className="font-semibold block mb-1 text-slate-700">Substituindo original:</span>
                  <p>{resultado[swapItemIndex].produto_codigo} - {resultado[swapItemIndex].produto_descricao}</p>
                  <p className="text-xs text-muted-foreground mt-1">Quantidade: {resultado[swapItemIndex].quantidade_final} {resultado[swapItemIndex].unidade}</p>
                </div>
              )}
              <div className="grid gap-2 mt-2">
                <Label>Novo Produto do Catálogo</Label>
                <ProdutoSelectComBusca
                  produtos={produtos}
                  value={swapItemIndex !== null && resultado[swapItemIndex] ? resultado[swapItemIndex].produto_codigo.toString() : ''}
                  onChange={(val) => {
                    if (swapItemIndex === null) return
                    const prod = produtos.find(p => p.codigo.toString() === val.toString())
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
                        manualOriginalProduto: original.manualOriginalProduto || original.produto_codigo
                      }
                      setResultado(newRes)
                      setSwapItemIndex(null)
                    }
                  }}
                />
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
            <div className="text-4xl font-bold text-[#d97021] mb-4">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
            </div>
            {tentouCalcular && chavesErrosAtivos.length > 0 && (
              <div role="alert" className="mb-5 rounded-md border border-red-500/50 bg-red-950/70 p-3 text-xs text-red-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-red-300 mb-0.5">Cálculo pausado — preencha os campos pendentes:</strong>
                  <span>{errosValidacao[chavesErrosAtivos[0]]}</span>
                </div>
              </div>
            )}
            {valorTotal > 500000 && (
              <div role="alert" className="mb-5 rounded-md border border-amber-500/40 bg-amber-950/60 p-3 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Valor elevado:</strong> o total ultrapassa R$ 500.000,00. Confira se as medidas, módulos e quantidades digitadas estão corretas antes de salvar.
                </span>
              </div>
            )}
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
              {isLoading ? "Salvando..." : orcamentoInicial ? "Salvar Alterações" : "Salvar Orçamento"}
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
          {isLoading ? "Salvando..." : orcamentoInicial ? "Salvar Alterações" : "Salvar Orçamento"}
        </Button>
      </div>
    </div>
  )
}
