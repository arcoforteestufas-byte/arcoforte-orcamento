import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// Permitir streaming de até 30 segundos no vercel
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
  const { messages } = await req.json();

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
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
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

    const anyResult = result as any;
    if (anyResult.toDataStreamResponse) {
      return anyResult.toDataStreamResponse();
    } else if (anyResult.toTextStreamResponse) {
      return anyResult.toTextStreamResponse();
    } else if (anyResult.toAIStreamResponse) {
      return anyResult.toAIStreamResponse();
    }
    throw new Error("No valid stream response method found in AI SDK");
  } catch (error: any) {
    console.error('Erro na API de Chat:', error);
    return new Response(error.message || 'Erro interno no servidor', { status: 500 });
  }
}
