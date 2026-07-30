const xlsx = require('xlsx');
const fs = require('fs');

const path = 'C:\\\\Users\\\\Bruno\\\\Downloads\\\\ORÇAMENTO ARCOFORTE.xlsx';
try {
  const workbook = xlsx.readFile(path);
  console.log('Sheets found:', workbook.SheetNames);
  
  // Extract CALC sheet
  const calcSheet = workbook.Sheets['CALC'];
  if (calcSheet) {
    const calcData = xlsx.utils.sheet_to_json(calcSheet, { header: 1 });
    fs.writeFileSync('calc_data.json', JSON.stringify(calcData, null, 2));
    console.log('Saved CALC data to calc_data.json');
  }

  // Extract INICIO sheet
  const inicioSheet = workbook.Sheets['INICIO'];
  if (inicioSheet) {
    const inicioData = xlsx.utils.sheet_to_json(inicioSheet, { header: 1 });
    fs.writeFileSync('inicio_data.json', JSON.stringify(inicioData, null, 2));
    console.log('Saved INICIO data to inicio_data.json');
  }
  
  // Try finding catalog sheets
  const catalogs = ['CATALOGO', 'BD-ESTRUTURA', 'BD-TELAS', 'BD-FILME'];
  const catalogData = {};
  for (const cat of catalogs) {
    if (workbook.Sheets[cat]) {
      catalogData[cat] = xlsx.utils.sheet_to_json(workbook.Sheets[cat], { header: 1 });
      console.log(`Extracted ${cat} (${catalogData[cat].length} rows)`);
    }
  }
  fs.writeFileSync('catalog_data.json', JSON.stringify(catalogData, null, 2));
  console.log('Saved catalog data to catalog_data.json');
  
} catch (e) {
  console.error('Error reading file:', e);
}
