import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Iniciando correcoes...');

  // 1. Corrigir Encaixe Central (3027)
  const { data: posEncaixe } = await supabase.from('posicoes').select('id').eq('nome', 'Arco Interno').single();
  if (posEncaixe) {
    const { error: err1 } = await supabase.from('regras_calculo')
      .update({ formula_quantidade: '(n_vaos - 1) * n_modulos - n_divisas' })
      .match({ posicao_id: posEncaixe.id, produto_codigo: '3027' });
    if (err1) console.error('Erro 1:', err1);
    else console.log('Encaixe Central corrigido.');
  }

  // 2. Remover regras antigas de Frente/Fundo (2+ modulos)
  const { data: posFrente2 } = await supabase.from('posicoes').select('id').eq('nome', 'Frente/Fundo (2+ modulos)').single();
  if (posFrente2) {
    await supabase.from('regras_calculo').delete().match({ posicao_id: posFrente2.id, produto_codigo: '3035' });
    await supabase.from('regras_calculo').delete().match({ posicao_id: posFrente2.id, produto_codigo: '3034' });
    console.log('Regras 3035 e 3034 de Frente/Fundo removidas.');
  }

  // 3. Atualizar regras de Frente/Fundo (1 modulo) para ser apenas Frente/Fundo
  const { data: posFrente1 } = await supabase.from('posicoes').select('id').eq('nome', 'Frente/Fundo (1 modulo)').single();
  if (posFrente1) {
    await supabase.from('posicoes').update({ nome: 'Frente/Fundo' }).eq('id', posFrente1.id);
    
    await supabase.from('regras_calculo')
      .update({ formula_quantidade: 'n_modulos * 2', condicao_aplicabilidade: 'largura_modulo == 7' })
      .match({ posicao_id: posFrente1.id, produto_codigo: '3042' });
      
    await supabase.from('regras_calculo')
      .update({ formula_quantidade: 'n_modulos * 2', condicao_aplicabilidade: 'largura_modulo == 8' })
      .match({ posicao_id: posFrente1.id, produto_codigo: '3015' });
      
    await supabase.from('regras_calculo')
      .update({ formula_quantidade: 'n_modulos * 2', condicao_aplicabilidade: 'largura_modulo == 10' })
      .match({ posicao_id: posFrente1.id, produto_codigo: '3016' });
      
    console.log('Regras Frontais (3042, 3015, 3016) atualizadas.');
  }

  // 4. Corrigir Emenda Lateral (3063)
  const { data: posEmenda } = await supabase.from('posicoes').select('id').eq('nome', 'Emenda Lateral').single();
  if (posEmenda) {
    const { error: errEmenda } = await supabase.from('regras_calculo')
      .update({ formula_quantidade: 'max(0, ceil((n_vaos * vao) / 6) - 1) * 2' })
      .match({ posicao_id: posEmenda.id, produto_codigo: '3063' });
    if (errEmenda) console.error('Erro Emenda:', errEmenda);
    else console.log('Emenda Lateral corrigida.');
  }

  console.log('Concluido!');
}
run();

