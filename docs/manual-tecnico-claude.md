# Manual Técnico de Regras, Variáveis e Fórmulas — ArcoForte
### Versão para Claude Desktop, Engenharia e Assistente de Inteligência Artificial

**Versão Técnica:** 1.0  
**Data de Atualização:** Outubro de 2026  
**Finalidade:** Base de conhecimento técnico e formal para o Claude Desktop, agentes de IA e motor de cálculo do sistema de orçamentos ArcoForte.

---

## 1. Dicionário Completo de Parâmetros e Variáveis de Entrada

Estes são os nomes técnicos exatos dos parâmetros cadastrados no banco de dados (`parametros_estufa`) e utilizados no motor de cálculo:

| Nome Técnico (`nome_tecnico`) | Rótulo no Sistema | Tipo | Opções Aceitas / Valores | Descrição Técnica |
|---|---|---|---|---|
| `n_modulos` | Número de Módulos | `numero` | Inteiro ≥ 1 (ex: 1, 2, 3...) | Quantidade de naves/arcos em largura geminados |
| `largura_modulo` | Largura do Módulo (m) | `selecao` | `["7", "8", "10"]` | Vão de largura de cada módulo em metros |
| `n_vaos` | Número de Vãos | `numero` | Inteiro ≥ 1 | Quantidade de vãos longitudinais entre postes |
| `vao` | Tamanho do Vão (m) | `selecao` | `["3", "4"]` | Distância padrão entre pilares sucessivos |
| `pe_direito` | Pé-Direito (m) | `selecao` | `["3", "4", "5"]` | Altura livre do solo até a base da curvatura do arco |
| `tipo_arco` | Tipo de Arco | `selecao` | `["SIMPLES", "DUPLO", "LANTERNIM"]` | Perfil e reforço estrutural dos arcos |
| `tipo_poste` | Tipo de Poste | `selecao` | `["100X50 GALVANIZADO", "75X40 GALVANIZADO", "EUCALIPTO"]` | Modelo de pilar vertical principal |
| `calha_lateral` | Fixação Superior | `selecao` | `["CALHA", "LATERAL DUPLA", "LATERAL SIMPLES"]` | Tipo de fixação e escoamento superior nas laterais |
| `fixacao_inferior` | Tem Fixação Inferior? | `booleano` | `true` ou `false` | Indica se há ancoragem rígida na base |
| `tipo_fixacao_inferior` | Qual é a Fixação Inferior? | `selecao` | `["LATERAL SIMPLES", "MURETA", "ENTERRADA"]` | Tipo de base inferior para telas/filmes |
| `arco_divisa` | Tem Arco de Divisa? | `booleano` | `true` ou `false` | Indica se há divisões transversais na cobertura |
| `n_divisas` | Nº de Divisas por Módulo | `numero` | Inteiro ≥ 0 | Quantidade de seções de divisão na cobertura |
| `postes_frontais_duplos` | Postes Frontais/Canto Duplos? | `booleano` | `true` ou `false` | Dobra a especificação dos pilares de cabeceira |
| `postes_topo_duplos` | Postes Frontais Topo Duplos? | `booleano` | `true` ou `false` | Dobra a especificação dos pilares de cumeeira |
| `postes_divisa_duplos` | Postes de Divisa são Duplos? | `booleano` | `true` ou `false` | Dobra os pilares internos sob o arco de divisa |
| `modelo_cabo` | Modelo Cabo de Aço | `selecao` | `["COMPLETO", "INTERNOS", "LATERAL 1", "LATERAL 2", "FRONTAIS"]` | Posicionamento dos cabos de contraventamento |
| `travamentos_x` | Nº de Travamentos em X | `numero` | Inteiro ≥ 0 | Quantidade de cruzetas de cabo de aço por vão |
| `fechamento_lateral` | Tem Fechamento Lateral? | `booleano` | `true` ou `false` | Ativa a necessidade de telas ou filmes laterais |
| `tipo_cobertura` | Tipo de Cobertura | `selecao` | `["FILME", "SEM COBERTURA", "TELA"]` | Material instalado sobre a cumeeira dos arcos |
| `possui_anticamara` | Possui Anticâmara? | `booleano` | `true` ou `false` | Ativa câmara de desinfecção na entrada |
| `portas_correr` | Qtd Portas de Correr | `numero` | Inteiro ≥ 0 | Quantidade de portas de correr instaladas |
| `tamanho_ultimo_vao` | Tamanho do Último Vão (m) | `numero` | Decimal | Usado quando o comprimento não é múltiplo exato |

### Variáveis Derivadas Automáticas (Calculadas no Código):
* `largura_total = n_modulos * largura_modulo`
* `comprimento_estufa = vao * (n_vaos - 1) + (tamanho_ultimo_vao || vao)`
* `area_total = largura_total * comprimento_estufa`
* `postes_por_linha = n_vaos + 1`

---

## 2. Grupos de Componentes Cadastrados no Banco

| ID do Grupo | Nome Oficial do Grupo | Função Estrutural |
|---|---|---|
| `1` | `1. POSTES` | Pilares verticais (cantos, laterais, divisas e topos) |
| `2` | `2. ARCOS` | Estrutura curva de sustentação do teto (frontal, normal, divisa) |
| `3` | `3. DORSAL / CONTRAVENTO / ENCAIXE CENTRAL` | Travamento longitudinal de cumeeira e cruzetas |
| `4` | `4. LATERAL / CALHA` | Vigas laterais, calhas de alumínio e peças frontais |
| `5` | `5. EMENDAS E SUPORTES` | Suportes de calha simples/duplos, esperas de arco e PU |
| `6` | `6. MOLA` | Molas zig-zag de fixação de filmes e perfis de alumínio |
| `7` | `7. CABOS DE AÇO` | Cabos 3/16, esticadores M8/M10 e chumbadores |
| `8` | `8. PORTAS` | Kits de portas de abrir, correr simples e correr dupla |
| `9` | `9. PARAFUSOS / DIVERSOS` | Parafusos sextavados, brocantes e fixadores |
| `10` | `10. FECHAMENTO LATERAL - TELAS` | Telas antiafídeos e sombreamento lateral/frontal |
| `11` | `11. COBERTURA - FILMES` | Filmes plásticos difusores térmicos para o teto |
| `12` | `Cortina Lateral Móvel` | Sistema mecânico de enrolamento de cortina lateral |

---

## 3. Tabela Oficial de Regras de Quantidades (R001 a R069)

| Regra ID | Grupo | Posição | Código Produto | Fórmula de Quantidade (`formula_quantidade`) | Condição de Aplicação (`condicao_aplicabilidade`) |
|---|---|---|---|---|---|
| `R001` | 1. Postes | Postes de Canto | `MANUAL` | `4` | `sempre` |
| `R002` | 1. Postes | Postes Laterais | `MANUAL` | `2 * (postes_por_linha - 2)` | `sempre` |
| `R003` | 1. Postes | Postes Frontais Divisa | `MANUAL` | `(n_modulos - 1) * 2` | `n_modulos > 1` |
| `R004` | 1. Postes | Postes Internos Divisa | `MANUAL` | `(n_modulos - 1) * (postes_por_linha - 2)` | `n_modulos > 1` |
| `R005` | 1. Postes | Postes Frontais Topo | `3120` | `postes_por_arco_frontal * 2 * n_modulos` | `pe_direito == 3` |
| `R006` | 1. Postes | Postes Frontais Topo | `3023` | `postes_por_arco_frontal * 2 * n_modulos` | `pe_direito == 4` |
| `R007` | 1. Postes | Postes Frontais Topo | `3416` | `postes_por_arco_frontal * 2 * n_modulos` | `pe_direito == 5` |
| `R009` | 2. Arcos | Arco Frontal | `3012` | `n_modulos * 2` | `tipo_arco == 'SIMPLES' and largura_modulo == 7` |
| `R010` | 2. Arcos | Arco Frontal | `3013` | `n_modulos * 2` | `tipo_arco == 'SIMPLES' and largura_modulo == 8` |
| `R011` | 2. Arcos | Arco Frontal | `3384` | `n_modulos * 2` | `tipo_arco == 'DUPLO' and largura_modulo == 7` |
| `R012` | 2. Arcos | Arco Frontal | `3109` | `n_modulos * 2` | `tipo_arco == 'DUPLO' and largura_modulo == 8` |
| `R013` | 2. Arcos | Arco Frontal | `3386` | `n_modulos * 2` | `tipo_arco == 'DUPLO' and largura_modulo == 10` |
| `R014` | 2. Arcos | Arco Frontal | `3165` | `n_modulos * 2` | `tipo_arco == 'LANTERNIM' and largura_modulo == 7` |
| `R015` | 2. Arcos | Arco Frontal | `3110` | `n_modulos * 2` | `tipo_arco == 'LANTERNIM' and largura_modulo == 8` |
| `R016` | 2. Arcos | Arco Frontal | `3043` | `n_modulos * 2` | `tipo_arco == 'LANTERNIM' and largura_modulo == 10` |
| `R017` | 2. Arcos | Arco Normal | `3005` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'SIMPLES' and largura_modulo == 7` |
| `R018` | 2. Arcos | Arco Normal | `3006` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'SIMPLES' and largura_modulo == 8` |
| `R019` | 2. Arcos | Arco Normal | `3415` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'DUPLO' and largura_modulo == 7` |
| `R020` | 2. Arcos | Arco Normal | `3108` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'DUPLO' and largura_modulo == 8` |
| `R021` | 2. Arcos | Arco Normal | `3007` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'DUPLO' and largura_modulo == 10` |
| `R022` | 2. Arcos | Arco Normal | `3417` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'LANTERNIM' and largura_modulo == 7` |
| `R023` | 2. Arcos | Arco Normal | `3098` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'LANTERNIM' and largura_modulo == 8` |
| `R024` | 2. Arcos | Arco Normal | `3014` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco == 'LANTERNIM' and largura_modulo == 10` |
| `R026` | 2. Arcos | Arco de Divisa | `3407` | `n_divisas` | `tipo_arco == 'DUPLO' and largura_modulo == 7` |
| `R027` | 2. Arcos | Arco de Divisa | `3408` | `n_divisas` | `tipo_arco == 'DUPLO' and largura_modulo == 8` |
| `R028` | 2. Arcos | Arco de Divisa | `3409` | `n_divisas` | `tipo_arco == 'DUPLO' and largura_modulo == 10` |
| `R033` | 3. Dorsal/Contravento | Contravento 3,85m | `3031` | `n_modulos * 4` | `largura_modulo == 7 or largura_modulo == 8` |
| `R034` | 3. Dorsal/Contravento | Contravento 4,80m | `3032` | `n_modulos * 4` | `largura_modulo == 10` |
| `R035` | 3. Dorsal/Contravento | Dorsal 2" c/ Emenda 6m | `3017` | `ceil(comprimento_estufa / 6) * n_modulos` | `tipo_arco != 'LANTERNIM'` |
| `R036` | 3. Dorsal/Contravento | Emenda Tubo Dorsal | `3040` | `max(0, ceil(comprimento_estufa / 6) - 1) * n_modulos` | `tipo_arco != 'LANTERNIM'` |
| `R037` | 3. Dorsal/Contravento | Encaixe Central | `3027` | `((n_vaos - 1) * n_modulos) - n_divisas` | `tipo_arco != 'LANTERNIM'` |
| `R038` | 4. Lateral/Calha | Lateral Simples 6m | `3035` | `ceil(comprimento_estufa / 6)` | `calha_lateral == 'LATERAL SIMPLES'` |
| `R039` | 4. Lateral/Calha | Lateral Dupla 6m | `3034` | `ceil(comprimento_estufa / 6)` | `calha_lateral == 'LATERAL DUPLA'` |
| `R040` | 4. Lateral/Calha | Calha Maxx Alumínio 6m | `5200` | `ceil(comprimento_estufa / 6)` | `calha_lateral == 'CALHA' and vao == 3` |
| `R041` | 4. Lateral/Calha | Calha Big Maxx Premium 8m | `5110` | `ceil(comprimento_estufa / 8)` | `calha_lateral == 'CALHA' and vao == 4` |
| `R043` | 4. Lateral/Calha | Calha Central Dupla | `5200` | `ceil(comprimento_estufa / 6) * (n_modulos - 1)` | `n_modulos > 1 and vao == 3` |
| `R044` | 4. Lateral/Calha | Frontal 50x30 7m | `3042` | `n_modulos * 2` | `largura_modulo == 7` |
| `R045` | 4. Lateral/Calha | Frontal 50x30 8m | `3015` | `n_modulos * 2` | `largura_modulo == 8` |
| `R046` | 4. Lateral/Calha | Frontal 50x30 10m | `3016` | `n_modulos * 2` | `largura_modulo == 10` |
| `R048` | 5. Emendas/Suportes | Espera de Arco Galv | `3018` | `2 * (n_vaos + 1)` | `calha_lateral != 'CALHA'` |
| `R049` | 5. Emendas/Suportes | Suporte Calha Simples | `3019` | `2 * ((n_vaos + 1) - 2)` | `calha_lateral == 'CALHA'` |
| `R050` | 5. Emendas/Suportes | Suporte Entrada Calha Direito | `3089` | `1` | `calha_lateral == 'CALHA'` |
| `R051` | 5. Emendas/Suportes | Suporte Entrada Calha Esquerdo | `3085` | `1` | `calha_lateral == 'CALHA'` |
| `R052` | 5. Emendas/Suportes | Suporte Saída Água 150mm Direito | `3093` | `1` | `calha_lateral == 'CALHA'` |
| `R053` | 5. Emendas/Suportes | Suporte Saída Água 150mm Esquerdo | `3094` | `1` | `calha_lateral == 'CALHA'` |
| `R054` | 5. Emendas/Suportes | Suporte Calha Dupla Central | `3020` | `(n_modulos - 1) * ((n_vaos + 1) - 2)` | `n_modulos > 1` |
| `R055` | 5. Emendas/Suportes | Suporte Entrada Calha Duplo | `3090` | `n_modulos - 1` | `n_modulos > 1` |
| `R056` | 5. Emendas/Suportes | Suporte Saída Água 150mm Duplo | `3095` | `n_modulos - 1` | `n_modulos > 1` |
| `R057` | 5. Emendas/Suportes | PU Selante 400g | `5024` | `ceil((comprimento_estufa / (vao * 2)) * n_linhas_calha / 2.5)` | `n_linhas_calha > 0` |
| `R058` | 6. Perfis e Molas | Perfil Alumínio Duplo Maxx 6m | `5084` | `ceil((altura_postes_canto * 4 + altura_postes_canto * n_divisas) / 6)` | `fechamento_lateral == true` |
| `R059` | 6. Perfis e Molas | Perfil Alumínio Simples Maxx 6m | `5085` | `ceil((2 * comprimento_estufa + 2 * largura_total) / 6)` | `tipo_fixacao_inferior == 'MURETA'` |
| `R060` | 6. Perfis e Molas | Mola de Fixação 25m | `3049` | `ceil((soma_aplicacoes * 1.10) / 25)` | `sempre` |
| `R061` | 7. Cabos de Aço | Cabo de Aço Galv 3/16 | `5009` | `ceil(metros_cabo * 1.05 / 10) * 10` | `modelo_cabo != 'SEM CABO'` |
| `R062` | 7. Cabos de Aço | Esticador Olho-Olho | `5308` | `ceil(total_cabos * 1.05)` | `modelo_cabo != 'SEM CABO'` |
| `R063` | 7. Cabos de Aço | Kit Suporte p/ Cabo 25un | `5309` | `ceil(total_suportes * 1.05 / 25)` | `modelo_cabo != 'SEM CABO'` |
| `R064` | 7. Cabos de Aço | Chumbador | `3058` | `ceil(chumbadores_bruto * 1.05)` | `modelo_cabo != 'SEM CABO'` |
| `R065` | 8. Portas | Porta de Abrir 2,00x1,00m | `3033` | `portas_abrir` | `portas_abrir > 0` |
| `R066` | 8. Portas | Porta de Correr 1,20x2,00m | `3039` | `portas_correr_pequena` | `portas_correr_pequena > 0` |
| `R067` | 8. Portas | Porta de Correr 2,10x3,00m | `3073` | `portas_correr_grande` | `portas_correr_grande > 0` |
| `R068` | 8. Portas | Anti-Câmara Frontal | `3150` | `anticamara_frontal` | `anticamara_frontal > 0` |
| `R069` | 8. Portas | Anti-Câmara Lateral | `3160` | `anticamara_lateral` | `anticamara_lateral > 0` |

### Pendências Técnicas Sem Fórmula Fechada (Apenas Documentadas):
* **Parafusos e Fixadores:** Quantidades de parafusos autobrocantes, sextavados e parabolts variam de acordo com montagem local.
* **Cobertura (Filme e Tela de Teto):** O corte e bobinas dependem do fornecedor ativo (Suncover, Suntherm, Fortelon) e sobras de esticamento.
* **Saída Central (Código 3086):** Depende do desnível do terreno e projeto de drenagem central.
* **Cortina Lateral Móvel (Códigos 1254, 3155, 3388, 3423, 4151):** Sistema com manivela ou motorização opcional.

---

## 4. Instruções de Resposta para o Claude Desktop

Ao sugerir ou atualizar regras de cálculo para o usuário, siga estas 3 regras:
1. Explique a lógica em português claro antes de emitir as fórmulas.
2. Utilize exclusivamente os nomes técnicos de variáveis documentados na Seção 1 deste manual.
3. Termine SEMPRE sua resposta com o bloco de código JSON padronizado abaixo, que será importado com 1 clique pelo sistema:

```json
{
  "parametros": [
    {
      "nome_tecnico": "exemplo_campo",
      "rotulo": "Nome do Campo no Formulário",
      "tipo": "numero | selecao | booleano | texto",
      "opcoes": ["Opção 1", "Opção 2"]
    }
  ],
  "regras": [
    {
      "grupo": "1. Postes",
      "posicao": "Nome da Posição / Peça",
      "produto_codigo": "3012",
      "produto_descricao": "Descrição da Peça",
      "formula_quantidade": "2 * (n_vaos + 1)",
      "condicao_aplicabilidade": "sempre",
      "obs": "Observação técnica"
    }
  ],
  "topicos": [
    {
      "titulo": "Garantias",
      "texto": "Texto atualizado da cláusula..."
    }
  ],
  "produtos": [
    {
      "codigo": "3999",
      "descricao": "Nome do produto se for novo"
    }
  ]
}
```
