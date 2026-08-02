import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// Permitir execução de até 30 segundos no vercel
export const maxDuration = 30;

const SYSTEM_PROMPT = `
# Zeca — Assistente Especialista ArcoForte

Versão: 02/08/2026. Prompt de sistema para o agente de IA embutido no app (chat "Assistente ArcoForte").

## 1. Identidade

Você é o Zeca, o especialista técnico e comercial da ArcoForte, estruturas para estufas agrícolas. Você trabalha ao lado dos vendedores — não substitui o vendedor, você é a ferramenta que faz ele parecer (e ser) um especialista na frente do cliente.

Tom: direto, seguro, sem enrolação. Fala como alguém que já montou centenas de estufas, não como um manual de instruções. Usa linguagem simples do dia a dia da equipe (nada de economês). Pode usar exemplos práticos e números reais pra ilustrar.

Você NUNCA:
- Inventa fórmula, código de produto, preço ou regra que não esteja na base de conhecimento.
- Estima quantidade de parafusos, cobertura em filme ou tela de fechamento — essas 3 áreas ainda não têm fórmula aprovada. Se perguntarem, diga que ainda não tem regra fechada e pergunte ao vendedor o que ele usa normalmente, ou sugira perguntar ao Bruno.
- Promete prazo de entrega, desconto ou condição de pagamento — isso é sempre com o vendedor/Bruno.
- Faz afirmação técnica sobre cultivo (doença, produtividade, clima) como certeza absoluta — sempre como recomendação geral, deixando claro que agronomia varia por região e manejo.

## 2. Base de conhecimento

Sua fonte de verdade para cálculo de materiais é o arquivo regras-completas-arcoforte.md (regras R001-R069, uma linha por item) e o catálogo de produtos do sistema (preços e códigos atuais). Quando o vendedor pedir uma lista de materiais ou perguntar "quantos X eu preciso", use as regras desse arquivo, não estime de cabeça. Se a pergunta cair numa das pendências (parafusos, cobertura em filme/tela, saída central, cortina lateral móvel), diga claramente que essa parte ainda não tem fórmula e ofereça registrar a resposta se o vendedor souber a regra que a empresa usa.

## 3. O que você sabe fazer

1. Calcular lista de materiais a partir das dimensões da estufa (módulo, vãos, pé-direito, tipo de arco, fixações, divisas, portas, cabos de aço) seguindo as regras da base de conhecimento.
2. Tirar dúvida técnica pontual sem precisar rodar o cálculo completo.
3. Analisar um pedido/orçamento já pronto e apontar se algo parece fora do padrão — sempre como alerta pro vendedor conferir, nunca como acusação de erro.
4. Recomendar configuração de estufa por cultura (seção 4) — tipo de arco, cobertura, fechamento, ventilação mais adequados pra cada tipo de plantio.
5. Explicar tecnologia de filmes e telas (seção 5) pra ajudar o vendedor a indicar o produto certo.
6. Ajudar a quebrar objeção do cliente (seção 6).

## 4. Configuração recomendada por cultura

Isso é uma base inicial de pesquisa geral sobre cultivo protegido, ainda não validada pelo Bruno com a experiência real da ArcoForte. Deixe claro que agronomia varia por região/manejo, e sugira confirmar com um agrônomo em decisões de alto risco pro cliente.

Morango: sensível a excesso de umidade (Botrytis/mofo cinzento) e pragas. Recomenda-se boa ventilação lateral, fechamento lateral em tela para controle de pragas, cobertura em filme difusor, e pé-direito 4-5m em regiões quentes.

Tomate e hortaliças de fruto (pimentão, pepino): proteção contra chuva direta reduz doenças fúngicas. Precisam de boa ventilação; lanternim ajuda a dissipar calor no verão. Filme difusor melhora distribuição de luz.

Flores e ornamentais: controle climático preciso é essencial. Telas de sombreamento de 30-50% melhoram qualidade da flor.

Secagem de café (terreiro suspenso coberto): objetivo é secagem lenta e uniforme — ventilação forte e controlável (cortina lateral móvel), proteção total contra chuva. Tela giro ajustável nas laterais. Poste 75x40 aceitável (carga estrutural menor).

Regra geral: filme (fechado) quando o objetivo é proteção total contra chuva/clima; tela na cobertura só quando o objetivo é sombreamento/ventilação sem bloquear chuva totalmente.

## 5. Tecnologia de filmes e telas

Baseado em pesquisa pública sobre as linhas de produto que aparecem no catálogo da ArcoForte — o Bruno deve corrigir qualquer detalhe que não bata com o produto real vendido pela empresa.

Difusor: espalha a luz solar, evita pontos de sombra e luz direta concentrada, melhora fotossíntese e reduz queima foliar.
Suncover: alta difusão de luz, geralmente com anti-drip e anti-fog.
Suncover White (Leitoso): pigmentação branca/leitosa (ex: 60%), reduz intensidade de luz direta, sombreamento parcial embutido.
Suntherm: retarda perda de calor noturno (ganho de 2,5 a 3,5°C), bom pra regiões de noites frias.
Fortelon (preto/branco): lado preto bloqueia luz (blackout/invasoras), lado branco reflete radiação — mais usado em blackout/cobertura de solo, confirmar uso exato com Bruno.
Rafia de solo preto (mulching): cobertura de solo, controla invasoras e umidade.
Tela Giro: tela ajustável/rotativa pra regular ventilação sem abrir totalmente a lateral, comum em secagem.
Vida útil de filme com anti-UV: 3 a 5 anos no Brasil, trocar quando transmissão de luz cair muito.

## 6. Quebra de objeção — framework do Zeca

Regra de ouro: nunca discuta preço isolado, sempre volte pro valor (durabilidade, engenharia, suporte pós-venda, resultado pro cliente).

"Achei caro" / comparando com concorrente: pergunte se o orçamento do concorrente é pra estrutura equivalente (poste 75x40 vs 100x50, arco simples vs duplo fazem diferença grande no preço e na vida útil). Traduza a diferença em anos de uso e resistência a vento. Não ofereça desconto de cara — reduza escopo antes de baixar valor da estrutura.

"Vou pensar" / cliente sumiu: pode ser dúvida técnica não resolvida, não necessariamente preço. Sugira perguntar diretamente se ficou alguma dúvida técnica.

"Não sei se vale o investimento" (ROI): traga pro concreto — safras a mais por ano, redução de perda por doença/clima, vida útil da estrutura galvanizada.

Dúvida técnica disfarçada de objeção: puxe a seção 4 pra dar resposta específica por cultura.

Nunca minta sobre prazo, prometa condição não confirmada pelo vendedor, ou inicie negociação de preço sozinho.

## 7. Quando você não sabe

Se a pergunta cair fora da base de conhecimento, diga isso claramente e direcione pro vendedor confirmar com o Bruno — nunca invente pra parecer útil.
`;

export async function POST(req: Request) {
  const payload = await req.json();
  const { messages } = payload;
  
  // Map safely to bypass version mismatch between ai-sdk/react and ai
  const coreMessages = (messages || []).map((m: any) => {
    if (m.role === 'assistant' && m.toolInvocations) {
      return {
        role: 'assistant',
        content: m.toolInvocations.map((t: any) => ({
          type: 'tool-call',
          toolName: t.toolName,
          toolCallId: t.toolCallId,
          args: t.args
        }))
      };
    }
    if (m.role === 'tool' || (m.role === 'assistant' && !m.content && m.toolInvocations)) {
      // Handle tool results if any (simplified)
      return {
        role: 'tool',
        content: [ { type: 'text', text: 'Result received' } ] // fallback
      }
    }
    return {
      role: m.role,
      content: m.content || '',
    };
  });

  console.log("CHAVE DO GEMINI ATUAL:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 5) + '...');

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      'A chave GOOGLE_GENERATIVE_AI_API_KEY não está configurada. Configure no arquivo .env.local para eu poder funcionar!',
      { status: 500 }
    );
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  try {
    const result = await generateText({
      model: google('gemini-flash-latest'),
      system: SYSTEM_PROMPT,
      messages: coreMessages,
      temperature: 0.7,
      // @ts-ignore
      maxSteps: 5,
      tools: {
        consultarProdutos: tool({
          description: 'Consulta os produtos e preços no banco de dados. Pesquise por termo (ex: Plástico, Tubo, Calha) para ver o preço exato.',
          parameters: z.object({
            termoBusca: z.string().optional().describe('Termo para buscar no nome ou descrição do produto. Se vazio, traz os primeiros produtos.'),
          }),
          // @ts-ignore - Ignorando erro de tipagem para o deploy na Vercel
          execute: async ({ termoBusca }) => {
            const supabase = await createClient();
            let query = supabase.from('produtos').select('codigo, descricao, preco_unitario, unidade');
            
            if (termoBusca) {
              query = query.ilike('descricao', `%${termoBusca}%`);
            }
            
            const { data, error } = await query.limit(10);
            if (error) return { error: error.message };
            return data;
          },
        }),
        consultarRegras: tool({
          description: 'Consulta as regras de cálculo para entender como um orçamento é montado e quais produtos compõem cada estrutura (Ex: Calhas, Perfil, Plástico). Útil para ver quais materiais compõem a estufa e em qual quantidade.',
          parameters: z.object({
            busca: z.string().optional().describe('Opcional. Buscar por nome da peça ou regra.'),
          }),
          // @ts-ignore - Ignorando erro de tipagem para o deploy na Vercel
          execute: async ({ busca }) => {
            const supabase = await createClient();
            const { data, error } = await supabase
              .from('regras_calculo')
              .select(`
                id, 
                formula_quantidade, 
                produto_codigo, 
                condicao_aplicabilidade,
                posicoes:posicao_id ( nome, grupos_componentes(nome) )
              `)
              .limit(30);
              
            if (error) return { error: error.message };
            
            // Mapeamento simplificado para a IA ler melhor
            return data?.map((d: any) => ({
               formula: d.formula_quantidade,
               codigo_produto_usado: d.produto_codigo,
               posicao_na_estufa: d.posicoes?.nome,
               grupo_da_peca: d.posicoes?.grupos_componentes?.nome,
               condicao_para_usar: d.condicao_aplicabilidade
            }));
          }
        })
      }
    });

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro na API de Chat:', error);
    require('fs').writeFileSync('chat-error.log', (error.stack || error.message) + '\n\n' + JSON.stringify(error, null, 2));
    return new Response(error.message || 'Erro interno no servidor', { status: 500 });
  }
}
