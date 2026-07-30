require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncParams() {
  console.log('Iniciando sincronização de parâmetros...');

  const params = [
    { nome_tecnico: 'tipo_poste', rotulo: 'Tipo de Poste', tipo: 'selecao', opcoes: JSON.stringify(["100X50 GALVANIZADO", "EUCALIPTO"]), ativo: true },
    { nome_tecnico: 'postes_frontais_duplos', rotulo: 'Postes Frontais e Canto Baixos (Frente/Fundo) Duplos?', tipo: 'booleano', opcoes: null, ativo: true },
    { nome_tecnico: 'postes_topo_duplos', rotulo: 'Postes Frontais Topo Duplos?', tipo: 'booleano', opcoes: null, ativo: true },
    { nome_tecnico: 'postes_divisa_duplos', rotulo: 'Os postes da divisa são duplos?', tipo: 'booleano', opcoes: null, ativo: true },
    { nome_tecnico: 'qual_porta', rotulo: 'Qual Porta?', tipo: 'selecao', opcoes: JSON.stringify(["CORRER 1,20 X 2,00", "ABRIR"]), ativo: true },
    { nome_tecnico: 'tipo_cobertura', rotulo: 'Tipo de Cobertura', tipo: 'selecao', opcoes: JSON.stringify(["FILME", "SEM COBERTURA", "SOMBRITE"]), ativo: true },
    { nome_tecnico: 'calha_lateral', rotulo: 'Tem Calha Lateral?', tipo: 'selecao', opcoes: JSON.stringify(["LATERAL DUPLA", "LATERAL SIMPLES", "SIM", "NÃO"]), ativo: true },
    { nome_tecnico: 'modelo_cabo', rotulo: 'Modelo Cabo de Aço', tipo: 'selecao', opcoes: JSON.stringify(["COMPLETO", "APENAS INTERNO", "SEM CABO DE AÇO"]), ativo: true },
    { nome_tecnico: 'tipo_arco', rotulo: 'Tipo de Arco', tipo: 'selecao', opcoes: JSON.stringify(["LEVE", "DUPLO", "LANTERNIN", "SIMPLES"]), ativo: true }
  ];

  for (const param of params) {
    const { data: exists } = await supabase.from('parametros_estufa').select('id').eq('nome_tecnico', param.nome_tecnico).single();
    
    if (exists) {
      await supabase.from('parametros_estufa').update({
        rotulo: param.rotulo,
        tipo: param.tipo,
        opcoes: param.opcoes
      }).eq('id', exists.id);
      console.log(`Atualizado: ${param.nome_tecnico}`);
    } else {
      await supabase.from('parametros_estufa').insert(param);
      console.log(`Inserido: ${param.nome_tecnico}`);
    }
  }

  console.log('Parâmetros sincronizados!');
}

syncParams();
