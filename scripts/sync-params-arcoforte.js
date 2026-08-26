require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parametros novos usados nas formulas de docs/regras-completas-arcoforte.md.
// Nenhum booleano - tudo selecao (texto) ou numero, conforme decidido em 06/08/2026.
// Os 5 campos especiais do formulario (pe_direito, n_modulos, largura_modulo, vao,
// n_vaos/comprimento_estufa derivados) NAO entram aqui - ja existem no orcamento-form.tsx.
async function syncParams() {
    console.log('Iniciando sincronizacao dos parametros ArcoForte (regras 06/08/2026)...');

    const params = [
        { nome_tecnico: 'tipo_arco', rotulo: 'Tipo de Arco', tipo: 'selecao', opcoes: JSON.stringify(["SIMPLES", "DUPLO", "LANTERNIM"]), ativo: true },
        { nome_tecnico: 'n_divisas', rotulo: 'Nº de Divisas (lateral/cobertura)', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'n_divisas_frente_fundo', rotulo: 'Nº de Divisas (frente/fundo)', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'fixacao_superior', rotulo: 'Fixação Superior', tipo: 'selecao', opcoes: JSON.stringify(["CALHA", "PERFIL SIMPLES", "PERFIL DUPLO"]), ativo: true },
        { nome_tecnico: 'fixacao_inferior', rotulo: 'Fixação Inferior', tipo: 'selecao', opcoes: JSON.stringify(["MURETA", "ENTERRADA"]), ativo: true },
        { nome_tecnico: 'cobertura', rotulo: 'Cobertura de Teto', tipo: 'selecao', opcoes: JSON.stringify(["SIM", "NAO"]), ativo: true },
        { nome_tecnico: 'fechamento_material', rotulo: 'Material de Fechamento Lateral/Frente-Fundo', tipo: 'selecao', opcoes: JSON.stringify(["NENHUM", "TELA", "FILME"]), ativo: true },
        { nome_tecnico: 'tela_largura_rolo', rotulo: 'Largura do Rolo de Tela (m)', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'fechamento_divisa_perfil', rotulo: 'Perfil na Divisa do Fechamento', tipo: 'selecao', opcoes: JSON.stringify(["MOLAS JUNTAS", "MOLAS SEPARADAS"]), ativo: true },
        { nome_tecnico: 'meia_lua_material', rotulo: 'Material da Meia Lua', tipo: 'selecao', opcoes: JSON.stringify(["AUTOMATICO", "FORCAR FILME"]), ativo: true },
        { nome_tecnico: 'modo_cabos', rotulo: 'Modo de Cabos de Aço', tipo: 'selecao', opcoes: JSON.stringify(["COMPLETO", "PERSONALIZADO", "APENAS INTERNO", "SEM CABO"]), ativo: true },
        { nome_tecnico: 'travamentos_x', rotulo: 'Nº de Travamentos em X (por vão)', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'portas_abrir', rotulo: 'Portas de Abrir 2,00x1,00m', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'portas_correr_pequena', rotulo: 'Portas de Correr 1,20x2,00m', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'portas_correr_grande', rotulo: 'Portas de Correr 2,10x3,00m', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'anticamara_frontal', rotulo: 'Anti-Câmara Frontal', tipo: 'numero', opcoes: null, ativo: true },
        { nome_tecnico: 'anticamara_lateral', rotulo: 'Anti-Câmara Lateral', tipo: 'numero', opcoes: null, ativo: true },
    ];

    for (const param of params) {
        const { data: exists } = await supabase.from('parametros_estufa').select('id').eq('nome_tecnico', param.nome_tecnico).single();

        if (exists) {
            await supabase.from('parametros_estufa').update({
                rotulo: param.rotulo,
                tipo: param.tipo,
                opcoes: param.opcoes,
                ativo: param.ativo,
            }).eq('id', exists.id);
            console.log(`Atualizado: ${param.nome_tecnico}`);
        } else {
            await supabase.from('parametros_estufa').insert(param);
            console.log(`Inserido: ${param.nome_tecnico}`);
        }
    }

    console.log('Parametros ArcoForte sincronizados! (17 parametros)');
}

syncParams();
