# Parâmetros a cadastrar em Configurações → Parâmetros da Estufa

Antes de clicar em "Carregar MD", esses parâmetros precisam existir no sistema (senão as fórmulas que os usam calculam 0 silenciosamente). Nenhum é booleano — todos são seleção de texto ou número.

Os 5 campos abaixo já existem no formulário (não recadastrar): `pe_direito`, `n_modulos`, `largura_modulo`, `vao` (+ `n_vaos`/`comprimento_estufa`, calculados automaticamente).

| nome_tecnico | rótulo | tipo | opções |
|---|---|---|---|
| tipo_arco | Tipo de Arco | seleção | SIMPLES, DUPLO, LANTERNIM |
| n_divisas | Nº de Divisas (lateral/cobertura) | número | — |
| n_divisas_frente_fundo | Nº de Divisas (frente/fundo) | número | — |
| fixacao_superior | Fixação Superior | seleção | CALHA, PERFIL SIMPLES, PERFIL DUPLO |
| fixacao_inferior | Fixação Inferior | seleção | MURETA, ENTERRADA |
| cobertura | Cobertura de Teto | seleção | SIM, NAO |
| fechamento_material | Material de Fechamento Lateral/Frente-Fundo | seleção | NENHUM, TELA, FILME |
| tela_largura_rolo | Largura do Rolo de Tela (m) | número | — |
| fechamento_divisa_perfil | Perfil na Divisa do Fechamento | seleção | MOLAS JUNTAS, MOLAS SEPARADAS |
| meia_lua_material | Material da Meia Lua | seleção | AUTOMATICO, FORCAR FILME |
| modo_cabos | Modo de Cabos de Aço | seleção | COMPLETO, PERSONALIZADO, APENAS INTERNO, SEM CABO |
| travamentos_x | Nº de Travamentos em X (por vão) | número | — |
| portas_abrir | Portas de Abrir 2,00x1,00m | número | — |
| portas_correr_pequena | Portas de Correr 1,20x2,00m | número | — |
| portas_correr_grande | Portas de Correr 2,10x3,00m | número | — |
| anticamara_frontal | Anti-Câmara Frontal | número | — |
| anticamara_lateral | Anti-Câmara Lateral | número | — |

Depois de cadastrar esses 17, coloque `regras-completas-arcoforte.md` em `docs/regras-completas-arcoforte.md` dentro do projeto e clique em "Carregar MD".

## O que ficou pendente no arquivo de regras (não trava o carregamento, só precisa da sua confirmação)
- Parafusos de montagem fechados em 06/08/2026 (arco simples/duplo/lanternim, normal/frontal, cabo interno/externo — grupo 9). Dois pontos ainda em aberto:
  - Poste de canto com calha: o cálculo usa 6 parafusos de 1" (regra antiga), mas você mencionou uma regra geral de "10 por pilar onde tem calha". Preciso que confirme se o canto também é 10 ou se é exceção.
  - "ARCO CALANDRADO 2,5\" 1,55MM" (normal e frontal) — não existe como tipo de arco no sistema hoje (só SIMPLES/DUPLO/LANTERNIM) e o parafuso de 3,5" citado ainda não tem código. Documentado no manual, mas sem fórmula ativa.
- A fórmula de tela usa 1 rolo cheio por peça (sem aproveitamento de raias entre peças). Quando `pe_direito < tela_largura_rolo`, confere manualmente se dá pra economizar tela combinando peças — a fórmula automática não faz essa otimização.
