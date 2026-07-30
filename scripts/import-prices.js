const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltam chaves do Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const catalogs = JSON.parse(fs.readFileSync('catalog_data.json'));

async function importCatalog(sheetName, codeIndex, descIndex, unitIndex, priceIndex, category) {
  const data = catalogs[sheetName];
  if (!data || data.length === 0) return 0;
  
  console.log(`\nImportando ${sheetName}...`);
  console.log('Headers:', data[0]);
  
  let upserted = 0;
  // Skip header (row 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[codeIndex]) continue;
    
    const codigo = String(row[codeIndex]).trim();
    const descricao = row[descIndex] ? String(row[descIndex]).trim() : '';
    const unidade = row[unitIndex] ? String(row[unitIndex]).trim() : 'UN';
    const preco_unitario = parseFloat(row[priceIndex]) || 0;
    
    // Ignore invalid rows
    if (!codigo || codigo === 'undefined' || codigo === '0000') continue;
    
    const { error } = await supabase.from('produtos').upsert(
      {
        codigo,
        descricao,
        unidade,
        preco_unitario,
        categoria: category,
        ativo: true
      },
      { onConflict: 'codigo' }
    );
    
    if (error) {
      console.error(`Erro ao importar ${codigo}:`, error.message);
    } else {
      upserted++;
    }
  }
  console.log(`Importado ${upserted} produtos de ${sheetName}`);
  return upserted;
}

async function run() {
  console.log("Iniciando importação de preços...");
  
  // BD-ESTRUTURA: CODIGO (0), DESCRICAO (1), UNIDADE (2), PRECO (3)
  await importCatalog('BD-ESTRUTURA', 0, 1, 2, 3, 'Estrutura');
  
  // Assuming BD-TELAS and BD-FILME follow a similar layout: Code, Desc, Unit, Price...
  // Let's assume indices 0, 1, 2, 3
  await importCatalog('BD-TELAS', 0, 1, 3, 4, 'Tela');
  await importCatalog('BD-FILME', 0, 1, 2, 3, 'Filme');
  
  console.log("\nProcesso finalizado!");
}

run();
