"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Code } from "lucide-react"

type Clause = {
  id: string;
  logical: "and" | "or" | "";
  variable: string;
  operator: string;
  value: string;
}

const VARIABLES = [
  "n_vaos", "n_modulos", "pe_direito", "largura_modulo", "vao",
  "tipo_arco", "cobertura", "fechamento_lateral", "tela_lateral",
  "fixacao_inferior", "calha_lateral", "n_divisas", "portas_abrir", 
  "portas_correr", "travamentos_x", "modelo_cabo"
]

const OPERATORS = [
  { label: "Igual a (==)", value: "==" },
  { label: "Diferente de (!=)", value: "!=" },
  { label: "Maior que (>)", value: ">" },
  { label: "Menor que (<)", value: "<" },
  { label: "Maior ou igual (>=)", value: ">=" },
  { label: "Menor ou igual (<=)", value: "<=" },
]

export function ConditionBuilder({ 
  value, 
  onChange 
}: { 
  value: string, 
  onChange: (val: string) => void 
}) {
  const [isVisualMode, setIsVisualMode] = useState(true)
  const [clauses, setClauses] = useState<Clause[]>([])

  // Parse initial value into clauses
  useEffect(() => {
    if (!value || value.trim() === "") {
      setClauses([{ id: Math.random().toString(), logical: "", variable: "", operator: "==", value: "" }])
      return
    }

    try {
      // Split by " and " or " or "
      // This is a naive parser. If the string is too complex, we fallback to raw text.
      const tokens = value.split(/\s+(and|or)\s+/i)
      const parsedClauses: Clause[] = []
      
      let nextLogical: "and" | "or" | "" = ""
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim()
        if (token.toLowerCase() === "and" || token.toLowerCase() === "or") {
          nextLogical = token.toLowerCase() as "and" | "or"
          continue
        }

        const match = token.match(/^([a-zA-Z0-9_]+)\s*(==|!=|>|<|>=|<=)\s*(.*)$/)
        if (!match) {
          throw new Error("Complex clause found, fallback to raw mode")
        }

        parsedClauses.push({
          id: Math.random().toString(),
          logical: parsedClauses.length === 0 ? "" : (nextLogical || "and"),
          variable: match[1],
          operator: match[2],
          value: match[3].replace(/^["']|["']$/g, '') // remove quotes if any for the UI
        })
      }
      
      setClauses(parsedClauses)
    } catch (e) {
      // If parsing fails, force raw text mode
      setIsVisualMode(false)
    }
  }, [value])

  const updateParent = (newClauses: Clause[]) => {
    const stringified = newClauses.map((c, idx) => {
      if (!c.variable) return ""
      
      // format value: if it's text, we should probably add quotes, unless it's a boolean or number
      // But for simplicity, we let the user write "simples" or true/false, and we check if it's a number/boolean
      let formattedVal = c.value
      if (isNaN(Number(c.value)) && c.value !== "true" && c.value !== "false" && !c.value.startsWith('"')) {
        formattedVal = `"${c.value}"`
      }

      const prefix = idx === 0 ? "" : ` ${c.logical} `
      return `${prefix}${c.variable} ${c.operator} ${formattedVal}`
    }).join("").trim()
    
    onChange(stringified)
  }

  const updateClause = (id: string, field: keyof Clause, val: string) => {
    const next = clauses.map(c => c.id === id ? { ...c, [field]: val } : c)
    setClauses(next)
    updateParent(next)
  }

  const addClause = () => {
    setClauses([...clauses, { id: Math.random().toString(), logical: "and", variable: "", operator: "==", value: "" }])
  }

  const removeClause = (id: string) => {
    const next = clauses.filter(c => c.id !== id)
    if (next.length > 0) next[0].logical = "" // first clause shouldn't have logical operator
    setClauses(next)
    updateParent(next)
  }

  if (!isVisualMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium leading-none">Condição de Aplicabilidade (Texto Livre)</label>
          <Button variant="ghost" size="sm" type="button" onClick={() => setIsVisualMode(true)}>
            Tentar Modo Visual
          </Button>
        </div>
        <Input 
          value={value}
          onChange={e => onChange(e.target.value)}
          className="font-mono text-sm"
          placeholder="Ex: pe_direito == 3 and n_modulos > 1"
        />
        <p className="text-xs text-amber-600">O modo texto está ativado pois a expressão é complexa ou incompleta.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-zinc-50 p-4 rounded-md border border-zinc-200">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none text-zinc-800">Condição Visual</label>
        <Button variant="ghost" size="sm" type="button" onClick={() => setIsVisualMode(false)} className="h-7 text-xs text-zinc-500">
          <Code className="h-3 w-3 mr-1" /> Editar como Texto
        </Button>
      </div>

      <div className="space-y-2">
        {clauses.map((clause, idx) => (
          <div key={clause.id} className="flex items-center gap-2">
            
            {idx > 0 && (
              <Select value={clause.logical} onValueChange={(v) => updateClause(clause.id, "logical", v || "")}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">E (and)</SelectItem>
                  <SelectItem value="or">OU (or)</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Select value={clause.variable} onValueChange={(v) => updateClause(clause.id, "variable", v || "")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Variável" />
              </SelectTrigger>
              <SelectContent>
                {VARIABLES.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={clause.operator} onValueChange={(v) => updateClause(clause.id, "operator", v || "")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input 
              value={clause.value}
              onChange={e => updateClause(clause.id, "value", e.target.value)}
              placeholder="Valor"
              className="flex-1"
            />

            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => removeClause(clause.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addClause} className="w-full mt-2 border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Adicionar Condição
      </Button>

      {/* Preview */}
      <div className="mt-2 text-xs text-zinc-500 p-2 bg-white rounded border flex items-center gap-2">
        <Code className="h-3 w-3" />
        <code className="font-mono">{value || "Sempre aplicável (sem condição)"}</code>
      </div>
    </div>
  )
}
