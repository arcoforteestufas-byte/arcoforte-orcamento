import { ConfiguracoesClient } from "./configuracoes-client"
import RegrasMontagemPage from "../regras/regras-content"
import ParametrosEstufaPage from "../parametros/parametros-content"

export default function ConfiguracoesPage() {
  return (
    <ConfiguracoesClient 
      regrasNode={<RegrasMontagemPage />}
      parametrosNode={<ParametrosEstufaPage />}
    />
  )
}
