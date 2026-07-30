"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import { EditRegraModal } from "./edit-regra-modal"

type RegrasTableProps = {
  grupos: any[];
  posicoes: any[];
  regras: any[];
  produtos: any[];
}

export function RegrasTable({ grupos, posicoes, regras, produtos }: RegrasTableProps) {
  const [selectedRegra, setSelectedRegra] = useState<any | null>(null)

  return (
    <>
      <Tabs defaultValue={grupos[0]?.id} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
          {grupos.map(g => (
            <TabsTrigger key={g.id} value={g.id}>{g.nome}</TabsTrigger>
          ))}
        </TabsList>
        
        {grupos.map(grupo => {
          const posicoesDoGrupo = posicoes.filter(p => p.grupo_id === grupo.id)
          const regrasDoGrupo = regras.filter(r => posicoesDoGrupo.some(p => p.id === r.posicao_id))
          
          return (
            <TabsContent key={grupo.id} value={grupo.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{grupo.nome}</CardTitle>
                  <CardDescription>
                    Regras de cálculo vinculadas a este grupo estrutural.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Fórmula de Qtd</TableHead>
                        <TableHead>Condição</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regrasDoGrupo.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            Nenhuma regra cadastrada para este grupo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        regrasDoGrupo.map(regra => {
                          const posicao = posicoes.find(p => p.id === regra.posicao_id)
                          const produto = produtos.find(p => p.codigo === regra.produto_codigo)
                          
                          return (
                            <TableRow key={regra.id}>
                              <TableCell className="font-medium">{posicao?.nome}</TableCell>
                              <TableCell>{regra.produto_codigo} - {produto?.descricao}</TableCell>
                              <TableCell>
                                <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                  {regra.formula_quantidade}
                                </code>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs text-muted-foreground break-all">
                                  {regra.condicao_aplicabilidade}
                                </code>
                              </TableCell>
                              <TableCell><Badge variant="default">Ativa</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => setSelectedRegra(regra)}
                                >
                                  <Settings2 className="h-4 w-4"/>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <EditRegraModal 
        isOpen={!!selectedRegra}
        onClose={() => setSelectedRegra(null)}
        regra={selectedRegra}
        posicoes={posicoes}
        produtos={produtos}
        regras={regras}
      />
    </>
  )
}
