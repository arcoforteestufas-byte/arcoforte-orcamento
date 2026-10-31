# Manual Oficial de Regras, Dimensionamento e Orçamento — ArcoForte Estufas Agrícolas

**Versão Oficial:** 1.0  
**Última Atualização:** Outubro de 2026  
**Documento de Referência:** Engenharia e Orçamentos ArcoForte  
**Finalidade:** Fonte oficial da verdade para cálculo de listas de materiais, precificação, treinamento de vendedores e base de conhecimento para o Assistente de Inteligência Artificial (Zeca).

---

## 1. As Quatro Medidas que Definem uma Estufa

Toda estufa ArcoForte tem suas dimensões globais determinadas por quatro números principais preenchidos no orçamento:

| Medida | Nome Técnico | Unidade | Descrição e Valores Típicos |
|---|---|---|---|
| **Módulos** | `n_modulos` | un | Quantidade de módulos (arcos em largura) lado a lado (1, 2, 3...) |
| **Largura do Módulo** | `largura_modulo` | m | Largura individual de cada módulo (normalmente 7m, 8m ou 10m) |
| **Comprimento** | `comprimento_estufa` | m | Comprimento total da estufa ao longo da linha de postes |
| **Pé-Direito** | `pe_direito` | m | Altura livre do solo até a base do arco (normalmente 3m, 4m ou 5m) |

### Fórmulas de Dimensões Globais:
* **Largura Total (m):**  
  `largura_total = n_modulos * largura_modulo`
* **Área Total (m²):**  
  `area_total = largura_total * comprimento_estufa`
* **Comprimento Contínuo e Vãos:**  
  A distância entre os postes (vão) é de 3m ou 4m. Quando o comprimento total da estufa não é múltiplo exato do vão (ex: 22m com vão de 4m), o último vão tem tamanho diferenciado (`tamanho_ultimo_vao`).
  Fórmula:  
  `comprimento_estufa = vao * (n_vaos - 1) + tamanho_ultimo_vao`  
  *(Se o último vão for regular: `comprimento_estufa = vao * n_vaos`)*.

---

## 2. Tipos de Componentes e Estrutura

### 2.1 Postes e Pilares (Grupo 1)
* **Postes de Canto:** Sempre 4 unidades por estufa (2 na lateral 1 e 2 na lateral 2).
* **Postes Laterais:** Postes intermediários ao longo das laterais externas.  
  Fórmula: `2 * ((n_vaos + 1) - 2)`
* **Postes Frontais de Divisa Modular:** Presentes quando há 2 ou mais módulos (`n_modulos > 1`).  
  Fórmula: `(n_modulos - 1) * 2`
* **Postes Internos de Divisa Modular:** Pilares internos entre os módulos.  
  Fórmula: `(n_modulos - 1) * ((n_vaos + 1) - 2)`
* **Postes Frontais Topo de Arco:** Sustentam o topo do arco na frente e fundo.  
  Fórmula: `postes_por_arco_frontal * 2 * n_modulos`  
  - Para pé-direito 3m: Poste 5,50x100x50 Galv (Código 3120)  
  - Para pé-direito 4m: Poste 6,75x100x50 Galv (Código 3023)  
  - Para pé-direito 5m: Poste Duplo 8,00x100x100 Galv (Código 3416)

### 2.2 Arcos de Cobertura (Grupo 2)
* **Tipos de Arco Disponíveis:**
  1. **Simples (Leve):** Estrutura em arco calandrado simples.
  2. **Duplo:** Estrutura reforçada com treliçamento duplo.
  3. **Lanternim:** Estrutura com abertura superior para ventilação e saída de ar quente.
* **Arcos Frontais:** Posicionados nas extremidades da frente e fundo.  
  Fórmula: `n_modulos * 2` (códigos variam por tipo e largura: 7m, 8m ou 10m).
* **Arcos Normais (Intermediários):**  
  Fórmula: `((n_vaos - 1) * n_modulos) - n_divisas`
* **Arcos de Divisa:** Substituem o arco normal quando há divisão de plástico na cobertura.  
  Fórmula: `n_divisas`

### 2.3 Dorsal, Contraventos e Encaixes Centrais (Grupo 3)
* **Dorsal:** Tubo contínuo longitudinal que corre no topo dos arcos conectando toda a cumeeira.  
  Fórmula (arcos Simples e Duplos): `ceil(comprimento_estufa / 6) * n_modulos` barras de 6 metros (Código 3017).  
  *Observação:* Em estufas com **Lanternim**, a dorsal é substituída pela estrutura de laterais do próprio lanternim.
* **Emenda de Dorsal:**  
  Fórmula: `max(0, ceil(comprimento_estufa / 6) - 1) * n_modulos` (Código 3040).
* **Contraventos (Reforços Diagonais):**  
  Fórmula: `n_modulos * 4` (código 3031 para arcos 7m/8m de 3,85m; código 3032 para arcos 10m de 4,80m).
* **Encaixes Centrais:**  
  Fórmula: `((n_vaos - 1) * n_modulos) - n_divisas` (Código 3027).

### 2.4 Laterais e Calhas (Grupo 4)
* **Fixação Superior da Lateral:**
  - **Calha de Alumínio:** Usada para captação de água pluvial e fixação do filme. Em vão de 3m usa Calha Maxx 6m (5200); em vão de 4m usa Calha Big Maxx Premium 8m (5110).
  - **Lateral Dupla:** Tubo 50x30 com perfis duplos parafusados (Código 3034).
  - **Lateral Simples:** Tubo 50x30 simples (Código 3035).
* **Calha Central entre Módulos:** Obrigatória em estufas com 2 ou mais módulos (`n_modulos > 1`).
* **Frontal / Fundo:** Peças de acabamento frontal em tubo 50x30.  
  Fórmula: `n_modulos * 2`.

### 2.5 Emendas, Suportes e Acessórios de Calha (Grupo 5)
* **Espera de Arco:** Usada quando a fixação lateral NÃO é calha.  
  Fórmula: `2 * (n_vaos + 1)` (Código 3018).
* **Suportes de Calha:**
  - Suporte Calha Lateral Simples: `2 * ((n_vaos + 1) - 2)` (Código 3019).
  - Suporte Calha Dupla Central: `(n_modulos - 1) * ((n_vaos + 1) - 2)` (Código 3020).
  - Entradas e Saídas d'Água (direito e esquerdo, códigos 3089, 3085, 3093, 3094, 3090, 3095).
* **PU Selante:** Tubos de selante PU 40 cinza 400g para vedação das junções de calha.  
  Fórmula: `ceil((comprimento_estufa / (vao * 2)) * n_linhas_calha / 2.5)` (Código 5024).

### 2.6 Fixação de Filmes e Telas — Molas e Perfis (Grupo 6)
* **Mola Zig-Zag Galvanizada (Código 3049 - rolos de 25m):**  
  A mola é aplicada em todas as linhas de fixação de perfil (calhas, laterais, frontais, mureta e divisas).  
  Fórmula: soma de todas as aplicações lineares em metros, acrescida de 10% de margem de segurança, dividida por 25 metros.  
  `ceil((soma_aplicacoes * 1.10) / 25)`
* **Perfis de Alumínio:**
  - Perfil Alumínio Duplo Maxx 6m (Código 5084/5078) para cantos e divisas.
  - Perfil Alumínio Simples Maxx 6m (Código 5085) para mureta inferior.

### 2.7 Cabos de Aço e Esticadores (Grupo 7)
* **Cabo de Aço Galvanizado 3/16 (Código 5009):**  
  Arredondado para múltiplos de 10 metros com 5% de margem.
* **Esticadores Olho-Olho (O-O):**  
  - Internos: Esticador M8 extra forte com clips 3/16.
  - Externos: Esticador M10 extra forte com chumbador clips 3/16.
* **Chumbadores (Código 3058):**  
  Fixação dos esticadores externos no solo com concreto.

### 2.8 Portas e Acessos (Grupo 8)
* **Porta de Abrir 2,00 x 1,00m (Código 3033):** Recomendada para acesso rápido de pedestres.
* **Porta de Correr 1,20 x 2,00m (Código 3039):** Padrão para passagens de pessoas e pequenos equipamentos.
* **Porta de Correr Dupla 2,10 x 3,00m (Código 3073):** Indicada para passagem de tratores e implementos agrícolas.
* **Anticâmaras (Biosegurança):**  
  - Frontal 4L x 3C x 3A (Código 3150).  
  - Lateral 3L x 3C x 4A (Código 3160).  
  *(O sistema suporta a adição de múltiplos modelos e quantidades de anticâmaras por estufa).*

### 2.9 Cobertura (Filmes) e Fechamento (Telas) (Grupos 10 e 11)
* **Filme de Teto:** Filme agrícola difusor térmico com proteção UV (ex: 120, 150 micras). O código genérico `FILME-XXX` no motor de regras é resolvido dinamicamente para o produto selecionado pelo vendedor no formulário (`produto_filme_cobertura`).
* **Fechamento Lateral:** Tela antiafídeos (ex: 40, 50 mesh) ou filme plástico. O código genérico `TELA-XXX` no motor de regras é resolvido dinamicamente para o produto selecionado pelo vendedor (`produto_filme_fechamento`).

---

## 3. Diretrizes Comerciais e Prazos

### 3.1 Prazos e Validade
* **Validade Padrão da Proposta:** Definida por vendedor (geralmente de 5 a 15 dias corridos). O sistema pré-preenche automaticamente a última validade usada pelo usuário.
* **Prazo de Entrega Típico:** De 30 a 45 dias úteis a partir da confirmação do sinal/assinatura do contrato.

### 3.2 Condições de Pagamento Padrão
* **Condição A:** 50% de entrada via PIX na assinatura do contrato + 50% no carregamento da mercadoria na fábrica; opções de parcelamento no cartão ou boleto com taxas bancárias.
* **Condição B:** Pagamento total via PIX na assinatura do contrato.

### 3.3 Garantias Oficiais
* **Estrutura Metálica:** 48 meses (desde que não submetida a sobrecargas não previstas em projeto).
* **Galvanização a Fogo:** 36 meses.
* **Filmes Agrícolas:** 30 meses contra defeitos de fabricação (proporcional ao tempo de uso).
* **Telas:** 48 meses contra defeitos de fabricação.
* **Exclusões de Garantia:** Acontecimentos climáticos extremos (tempestades de vento fora da norma, granizo, raios), declividade de terreno inferior a 1,5% que cause acúmulo de água na calha, ou recalques de fundação por solo instável.

---

## 4. Instruções para o Assistente de Inteligência Artificial (Zeca)

Ao interagir com vendedores ou clientes:
1. Sempre consulte as fórmulas e regras deste manual para confirmar quantidades e especificações técnicas.
2. Em estufas com 2 ou mais módulos, nunca se esqueça de considerar a calha central e os postes internos de divisa.
3. Se o usuário perguntar sobre itens com regras pendentes (como aproveitamento de retalhos de tela ou parafusos especiais de arco calandrado de 2,5 polegadas), informe que a regra exata está em definição e consulte o setor de engenharia.
4. Mantenha tom seguro, técnico, objetivo e colaborativo, próprio de um especialista da equipe ArcoForte.
