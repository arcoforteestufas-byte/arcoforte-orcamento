const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const uzData = JSON.parse(fs.readFileSync('planilha_uz.json', 'utf8'));
const translatedText = fs.readFileSync('translated_formulas.txt', 'utf8');

// Parse translated_formulas.txt into a dictionary
const calcFormulas = {};
translatedText.split('\n\n').forEach(block => {
  if (!block.trim()) return;
  const parts = block.split(': ');
  if (parts.length >= 2) {
    const cell = parts[0].trim();
    const formula = parts.slice(1).join(': ').trim();
    calcFormulas[cell] = formula;
  }
});

async function importRules() {
  console.log('Iniciando importação de TODAS as regras...');
  
  // Apagar regras antigas (opcional, ou podemos apenas fazer upsert. Vamos apagar para limpar)
  // await supabase.from('regras_calculo').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  let successCount = 0;
  
  for (const item of uzData) {
    if (!item.codigo || item.codigo === '0000' || item.codigo === 'CODIGO SENSIO') continue;
    
    let formulaFinal = item.formula_qtd;
    if (!formulaFinal) continue;
    
    // Remover '=' inicial
    if (formulaFinal.startsWith('=')) formulaFinal = formulaFinal.substring(1);
    
    // Substituir referências como CALC!C12 pelas fórmulas traduzidas
    const calcRegex = /CALC!([A-Z][0-9]{1,3})/g;
    let matches;
    let hasCalcRef = false;
    while ((matches = calcRegex.exec(formulaFinal)) !== null) {
      hasCalcRef = true;
      const cellId = matches[1];
      if (calcFormulas[cellId]) {
        formulaFinal = formulaFinal.split(`CALC!${cellId}`).join(`(${calcFormulas[cellId]})`);
      } else {
        formulaFinal = formulaFinal.split(`CALC!${cellId}`).join(`(0)`);
      }
      calcRegex.lastIndex = 0; // reset
    }

    // Se a formula do UZ tiver IF de parametros INICIO, precisamos traduzir tbm (ex K8="NÃO")
    formulaFinal = formulaFinal.replace(/K8/g, 'tipo_poste');
    formulaFinal = formulaFinal.replace(/K9/g, 'calha_lateral');
    formulaFinal = formulaFinal.replace(/K10/g, 'postes_frontais_duplos');
    formulaFinal = formulaFinal.replace(/K11/g, 'postes_topo_duplos');
    formulaFinal = formulaFinal.replace(/K12/g, 'fixacao_inferior');
    formulaFinal = formulaFinal.replace(/K15/g, 'fechamento_lateral');
    formulaFinal = formulaFinal.replace(/K16/g, 'tipo_cobertura');
    formulaFinal = formulaFinal.replace(/K19/g, 'modelo_cabo');
    
    // IF to if/else not needed since engine.ts now has IF() function!
    formulaFinal = formulaFinal.replace(/(?<![<>])=(?![=])/g, '=='); // == for comparisons

    // Criar uma posição genérica se não tiver
    // Vamos colocar todos no Grupo 9 (Diversos) para não ter erro de FK, ou mapear heurística
    // Para simplificar, vou usar o ID do Grupo 9 que está no seed
    const grupoDiversosId = '90000000-0000-0000-0000-000000000009';
    
    const { data: pos } = await supabase.from('posicoes').insert({
      grupo_id: grupoDiversosId,
      nome: item.descricao.substring(0, 50)
    }).select().single();

    if (pos) {
      await supabase.from('regras_calculo').insert({
        posicao_id: pos.id,
        produto_codigo: String(item.codigo),
        formula_quantidade: formulaFinal,
        condicao_aplicabilidade: 'true',
        unidade_medida: 'un',
        regra_arredondamento: 'cima'
      });
      successCount++;
    }
  }
  
  console.log(`Sucesso! ${successCount} regras de cálculo inseridas no banco.`);
}

importRules();
