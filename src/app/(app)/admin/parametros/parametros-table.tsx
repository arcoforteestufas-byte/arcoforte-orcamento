"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import { SyncParamsButton } from "@/components/sync-params-button"
import { ClearDataButton } from "@/components/clear-data-button"
import { ParametroModal } from "./parametro-modal"

type ParametrosTableProps = {
    parametros: any[];
}

const TIPO_LABEL: Record<string, string> = {
    selecao: "Seleção",
    numero: "Número",
    texto: "Texto",
    booleano: "Booleano (legado)",
}

export function ParametrosTable({ parametros }: ParametrosTableProps) {
    const [selected, setSelected] = useState<any | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const modalOpen = isCreating || !!selected

    const closeModal = () => {
        setIsCreating(false)
        setSelected(null)
    }

    const renderOpcoes = (opcoes: string | null) => {
        if (!opcoes) return <span className="text-muted-foreground">—</span>
        try {
            const lista = JSON.parse(opcoes)
            if (!Array.isArray(lista)) return <span className="text-muted-foreground">—</span>
            return (
                <div className="flex flex-wrap gap-1">
                    {lista.map((op: string) => (
                        <Badge key={op} variant="secondary" className="font-mono text-[11px]">{op}</Badge>
                    ))}
                </div>
            )
        } catch {
            return <span className="text-muted-foreground">—</span>
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Parâmetros da Estufa</CardTitle>
                        <CardDescription>
                            Campos usados pelas fórmulas de cálculo (Regras de Montagem). Nome técnico é o que aparece nas fórmulas.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <ClearDataButton />
                        <SyncParamsButton />
                        <Button className="gap-2" onClick={() => setIsCreating(true)}>
                            Novo Parâmetro
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome Técnico</TableHead>
                                <TableHead>Rótulo</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Opções</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parametros.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                        Nenhum parâmetro cadastrado ainda.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                parametros.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-mono text-sm font-medium">{p.nome_tecnico}</TableCell>
                                        <TableCell>{p.rotulo}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{TIPO_LABEL[p.tipo] || p.tipo}</Badge>
                                        </TableCell>
                                        <TableCell>{renderOpcoes(p.opcoes)}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.ativo ? "default" : "secondary"}>
                                                {p.ativo ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="icon" onClick={() => setSelected(p)}>
                                                <Settings2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ParametroModal
                isOpen={modalOpen}
                onClose={closeModal}
                parametro={selected}
            />
        </>
    )
}
