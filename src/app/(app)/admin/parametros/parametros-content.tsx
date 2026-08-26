import { createAdminClient } from "@/utils/supabase/server"
import { ParametrosTable } from "./parametros-table"

export default async function ParametrosEstufaPage() {
    const supabaseAdmin = await createAdminClient()

    const { data: parametros } = await supabaseAdmin
        .from('parametros_estufa')
        .select('*')
        .order('nome_tecnico')

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Parâmetros da Estufa</h2>
                <p className="text-muted-foreground">
                    Campos que aparecem no formulário de orçamento e são usados pelas fórmulas em Regras de Montagem.
                </p>
            </div>

            <ParametrosTable parametros={parametros || []} />
        </div>
    )
}
