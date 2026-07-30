require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAnticamara() {
  console.log('Iniciando correção da Anticâmara...');

  // 1. Inserir parâmetro possui_anticamara se não existir
  console.log('Verificando parâmetro possui_anticamara...');
  const { data: paramExists } = await supabase
    .from('parametros_estufa')
    .select('id')
    .eq('nome_tecnico', 'possui_anticamara')
    .single();

  if (!paramExists) {
    const { error: paramErr } = await supabase
      .from('parametros_estufa')
      .insert({
        nome_tecnico: 'possui_anticamara',
        rotulo: 'Possui Anticâmara?',
        tipo: 'booleano',
        ativo: true
      });
    
    if (paramErr) {
      console.error('Erro ao criar parâmetro:', paramErr);
    } else {
      console.log('Parâmetro criado com sucesso!');
    }
  } else {
    console.log('Parâmetro já existia.');
  }

  // 2. Atualizar as regras de Anti-Camara para usar o novo parâmetro
  console.log('Atualizando regras de cálculo...');
  const { error: ruleErr } = await supabase
    .from('regras_calculo')
    .update({ condicao_aplicabilidade: 'possui_anticamara' })
    .in('produto_codigo', ['3150', '3160']);

  if (ruleErr) {
    console.error('Erro ao atualizar regras:', ruleErr);
  } else {
    console.log('Regras atualizadas com sucesso!');
  }

  console.log('Fim!');
}

fixAnticamara();
