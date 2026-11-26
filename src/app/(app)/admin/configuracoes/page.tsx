import { ConfiguracoesClient } from "./configuracoes-client"
import RegrasMontagemPage from "../regras/regras-content"
import ParametrosEstufaPage from "../parametros/parametros-content"
import { obterManuaisOficiais } from "@/app/actions/documentacao"
import { DocumentacaoClient } from "@/app/(app)/documentacao/documentacao-client"
import { obterUsuario } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ConfiguracoesPage() {
  const user = await obterUsuario()
  const isAdministrador = user?.user_metadata?.cargo === "Administrador"

  const manuais = await obterManuaisOficiais()

  return (
    <ConfiguracoesClient 
      regrasNode={<RegrasMontagemPage />}
      parametrosNode={<ParametrosEstufaPage />}
      documentacaoNode={
        <DocumentacaoClient
          manualHumano={manuais.humano}
          manualTecnico={manuais.tecnico}
          isAdministrador={isAdministrador}
        />
      }
    />
  )
}
