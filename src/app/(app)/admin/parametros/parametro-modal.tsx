"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Save } from "lucide-react"
import { createParametro, updateParametro } from "@/app/actions/parametros"

type ParametroModalProps = {
    isOpen: boolean;
    onClose: () => void;
    parametro: any | null; // null = criando um novo
}

type FormValues = {
    nome_tecnico: string;
    rotulo: string;
    tipo: string;
    opcoes_texto: string; // opções separadas por vírgula, convertido pra JSON ao salvar
    status: string; // "ativo" | "inativo"
}

export function ParametroModal({ isOpen, onClose, parametro }: ParametroModalProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { register, handleSubmit, setValue, watch, reset } = useForm<FormValues>({
        defaultValues: {
            nome_tecnico: "",
            rotulo: "",
            tipo: "selecao",
            opcoes_texto: "",
            status: "ativo",
        }
    })

    useEffect(() => {
        if (isOpen) {
            if (parametro) {
                let opcoesTexto = ""
                try {
                    const parsed = parametro.opcoes ? JSON.parse(parametro.opcoes) : []
                    opcoesTexto = Array.isArray(parsed) ? parsed.join(", ") : ""
                } catch {
                    opcoesTexto = ""
                }
                reset({
                    nome_tecnico: parametro.nome_tecnico || "",
                    rotulo: parametro.rotulo || "",
                    tipo: parametro.tipo || "selecao",
                    opcoes_texto: opcoesTexto,
                    status: parametro.ativo === false ? "inativo" : "ativo",
                })
            } else {
                reset({
                    nome_tecnico: "",
                    rotulo: "",
                    tipo: "selecao",
                    opcoes_texto: "",
                    status: "ativo",
                })
            }
            setError(null)
        }
    }, [isOpen, parametro, reset])

    const tipo = watch("tipo")

    const onSubmit = async (data: FormValues) => {
        setIsSaving(true)
        setError(null)

        const nomeTecnico = data.nome_tecnico.trim()
        if (!/^[a-z][a-z0-9_]*$/.test(nomeTecnico)) {
            setError("Nome técnico deve ser minúsculo, sem espaço e sem acento (ex: fechamento_material).")
            setIsSaving(false)
            return
        }

        let opcoes: string | null = null
        if (data.tipo === "selecao") {
            const lista = data.opcoes_texto
                .split(",")
                .map(v => v.trim())
                .filter(v => v.length > 0)
            if (lista.length < 2) {
                setError("Preencha pelo menos 2 opções separadas por vírgula pra um campo de seleção.")
                setIsSaving(false)
                return
            }
            opcoes = JSON.stringify(lista)
        }

        const payload = {
            nome_tecnico: nomeTecnico,
            rotulo: data.rotulo.trim(),
            tipo: data.tipo,
            opcoes,
            ativo: data.status === "ativo",
        }

        const res = parametro
            ? await updateParametro(parametro.id, payload)
            : await createParametro(payload)

        setIsSaving(false)
        if (res.success) {
            onClose()
        } else {
            setError(res.error || "Erro desconhecido ao salvar.")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{parametro ? "Editar Parâmetro" : "Novo Parâmetro"}</DialogTitle>
                    <DialogDescription>
                        Campos usados pelas fórmulas de cálculo. Nome técnico não pode mudar depois de usado em regras.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label>Nome Técnico</Label>
                        <Input
                            {...register("nome_tecnico", { required: true })}
                            placeholder="ex: fechamento_material"
                            className="font-mono text-sm"
                            disabled={!!parametro}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Usado nas fórmulas. Minúsculo, sem espaço/acento (use _ no lugar de espaço).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Rótulo (aparece pro vendedor)</Label>
                        <Input {...register("rotulo", { required: true })} placeholder="ex: Material de Fechamento" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={watch("tipo")} onValueChange={(v) => setValue("tipo", v || "selecao")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="selecao">Seleção (lista de opções)</SelectItem>
                                    <SelectItem value="numero">Número</SelectItem>
                                    <SelectItem value="texto">Texto livre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={watch("status")} onValueChange={(v) => setValue("status", v || "ativo")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ativo">Ativo</SelectItem>
                                    <SelectItem value="inativo">Inativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {tipo === "selecao" && (
                        <div className="space-y-2">
                            <Label>Opções (separadas por vírgula)</Label>
                            <Textarea
                                {...register("opcoes_texto")}
                                placeholder="ex: SIMPLES, DUPLO, LANTERNIM"
                                rows={2}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Use exatamente os mesmos valores que a fórmula compara (ex: 'SIMPLES', tudo maiúsculo se for o caso).
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
                    )}

                    <Button type="submit" disabled={isSaving} className="w-full bg-[#d97021] hover:bg-[#c3631b]">
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Salvando..." : "Salvar Parâmetro"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
