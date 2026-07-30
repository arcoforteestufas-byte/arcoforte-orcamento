const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use ANONYMOUS/PUBLIC key, NOT service role, to simulate RLS if we suspect RLS.
// But wait, server action uses user cookies. Let's just test the query first with service role.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const id = '3acbfa9e-aa70-4439-9b50-1bb9efda1fe5';
  const { data: orcamento, error: orcError } = await supabase
    .from('orcamentos')
    .select(`
      *,
      clientes ( nome, documento, cidade_uf )
    `)
    .eq('id', id)
    .single();

  console.log("OrcError:", orcError);
  console.log("Orcamento:", orcamento);
}
run();
