const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\Bruno\\Desktop\\ArcoForte Orçamento\\arcoforte-orcamento\\ORÇAMENTO ARCOFORTE.xlsx';
const workbook = XLSX.readFile(filePath, { cellFormula: true });
const sheetInicio = workbook.Sheets['INICIO'];

const inicioVals = [];
for (let cellAddress in sheetInicio) {
  if (cellAddress[0] === '!') continue;
  const cell = sheetInicio[cellAddress];
  if (cell && cell.v !== undefined && cell.v !== '') {
    inicioVals.push({ celula: cellAddress, valor: cell.v });
  }
}
fs.writeFileSync('planilha_inicio.json', JSON.stringify(inicioVals, null, 2));
console.log('Salvo em planilha_inicio.json');
