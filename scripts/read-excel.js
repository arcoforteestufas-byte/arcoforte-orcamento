const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\Bruno\\Desktop\\ArcoForte Orçamento\\arcoforte-orcamento\\ORÇAMENTO ARCOFORTE.xlsx';

console.log(`Lendo arquivo: ${filePath}`);
const workbook = XLSX.readFile(filePath);

console.log('\n--- Abas encontradas ---');
console.log(workbook.SheetNames.join(', '));

const summary = {};

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length > 0) {
    summary[sheetName] = {
      linhas_total: data.length,
      cabecalho: data[0],
      amostra: data.slice(1, 4) // Pega as 3 primeiras linhas de dados
    };
  } else {
    summary[sheetName] = "Aba vazia";
  }
});

fs.writeFileSync('planilha_summary.json', JSON.stringify(summary, null, 2));
console.log('\nResumo salvo em planilha_summary.json');
