require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Deletando todas as regras do banco de dados...');
  const { data, error, count } = await supabase
    .from('regras_calculo')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('Erro ao deletar:', error);
  } else {
    console.log('Regras apagadas com sucesso.');
  }
}

run();
