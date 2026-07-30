const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\Bruno\\Desktop\\ArcoForte Orçamento\\arcoforte-orcamento\\ORÇAMENTO ARCOFORTE.xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['CALC'];

const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
fs.writeFileSync('planilha_calc.json', JSON.stringify(data, null, 2));
console.log('Salvo em planilha_calc.json');
