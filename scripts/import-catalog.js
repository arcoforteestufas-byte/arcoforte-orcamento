require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importCatalog() {
  console.log('Lendo planilha Excel...');
  const workbook = XLSX.readFile('ORÇAMENTO ARCOFORTE.xlsx');
  
  // As abas são BD-ESTRUTURA, BD-TELAS, BD-FILME, CATALOGO
  // A aba CATALOGO unifica os códigos e labels.
  const sheet = workbook.Sheets['CATALOGO'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // rows[0] is header: ["code", "label", "unit", "price"]
  const produtos = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2 || !row[0]) continue;
    
    produtos.push({
      codigo: String(row[0]).trim(),
      descricao: String(row[1]).trim(),
      unidade: String(row[2] || 'un').trim().toLowerCase(),
      preco_unitario: Number(row[3]) || 0,
      ativo: true
    });
  }

  console.log(`Encontrados ${produtos.length} produtos no catálogo. Iniciando Upsert no banco...`);
  
  let count = 0;
  for (const prod of produtos) {
    const { error } = await supabase
      .from('produtos')
      .upsert(prod, { onConflict: 'codigo' });
      
    if (error) {
      console.error(`Erro ao importar ${prod.codigo}:`, error);
    } else {
      count++;
    }
  }

  console.log(`Importação de Produtos Concluída! ${count} produtos atualizados/inseridos com sucesso.`);
}

importCatalog();
