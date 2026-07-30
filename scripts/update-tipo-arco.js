require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateTipoArco() {
  console.log('Atualizando opções de Tipo de Arco para bater 100% com a planilha...');

  const { error } = await supabase
    .from('parametros_estufa')
    .update({
      opcoes: JSON.stringify(["LANTERNIN", "DUPLO", "LEVE"])
    })
    .eq('nome_tecnico', 'tipo_arco');
    
  if (error) {
    console.error('Erro ao atualizar tipo_arco:', error);
  } else {
    console.log('Tipo de Arco atualizado com sucesso!');
  }
}

updateTipoArco();
