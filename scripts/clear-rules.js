const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltam chaves do Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Limpando regras e posicoes antigas...");
  await supabase.from('regras_calculo').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('posicoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Concluido. Agora você pode rodar insert-rules.js");
}

run();
