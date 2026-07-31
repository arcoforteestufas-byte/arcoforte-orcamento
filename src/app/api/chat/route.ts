import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// Permitir execução de até 30 segundos no vercel
export const maxDuration = 30;

const SYSTEM_PROMPT = `
Você é o Assistente Especialista da ArcoForte, focado em auxiliar nossa equipe e usuários a elaborar os melhores orçamentos para nossos clientes.
Seu conhecimento é especializado em estufas agrícolas.

Sempre que perguntarem sobre preços de materiais, componentes que vão na estufa, ou regras, USE AS FERRAMENTAS DISPONÍVEIS para consultar o banco de dados real. Nunca invente preços.

## O Que é uma Estufa e Seu Propósito
Uma estufa é uma estrutura desenhada para criar um microclima ideal para o cultivo, protegendo as plantas de intempéries (chuva em excesso, granizo, geadas, ventos fortes) e pragas. Ela permite o controle de temperatura, umidade e luminosidade, garantindo produção o ano todo, maior qualidade e produtividade.

## Nosso Público-Alvo
Nossos clientes são geralmente produtores rurais, agricultores de médio a grande porte, ou investidores no agronegócio que buscam:
- Aumentar sua produtividade por metro quadrado.
- Produzir fora de época.
- Reduzir perdas devido a eventos climáticos e pragas.
- Profissionalizar sua produção.

## Como Auxiliar na Configuração
Quando um usuário estiver fazendo um orçamento:
- Sugira as melhores coberturas dependendo do tipo de cultura. (Ex: Cultivos sensíveis podem precisar de Aluminet, cultivos de tomate precisam de pés altos, etc).
- Quebre objeções: Se o cliente achar caro, lembre-o que o retorno do investimento vem da ausência de perdas climáticas e da produção o ano todo.
- Sempre tenha um tom profissional, amigável e encorajador.

Responda às perguntas com clareza, explicando o *porquê* de cada recomendação para ajudar a equipe de vendas a argumentar.
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
      },
      maxSteps: 5
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
