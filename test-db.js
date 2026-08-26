require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('parametros_estufa').select('nome_tecnico, ativo');
    if (error) {
        console.error("ERRO:", error);
    } else {
        console.log("Parâmetros no DB:");
        data.forEach(d => console.log(`- ${d.nome_tecnico}: ativo=${d.ativo}`));
    }
}

check();
