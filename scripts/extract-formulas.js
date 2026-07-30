const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\Bruno\\Desktop\\ArcoForte Orçamento\\arcoforte-orcamento\\ORÇAMENTO ARCOFORTE.xlsx';
const workbook = XLSX.readFile(filePath, { cellFormula: true });
const sheet = workbook.Sheets['CALC'];

const formulas = [];

for (let cellAddress in sheet) {
  if (cellAddress[0] === '!') continue; // Pular metadados (!ref, !merges, etc)
  
  const cell = sheet[cellAddress];
  if (cell && (cell.f || cell.v !== undefined)) {
    // Só pegar células que tem algum texto, numero ou formula
    // Ignorar células vazias
    if (cell.v !== '' && cell.v !== null) {
      formulas.push({
        celula: cellAddress,
        valor: cell.v,
        formula: cell.f ? '=' + cell.f : null
      });
    }
  }
}

// Ordenar por linha e depois por coluna
formulas.sort((a, b) => {
  const colA = a.celula.match(/[A-Z]+/)[0];
  const rowA = parseInt(a.celula.match(/\d+/)[0]);
  const colB = b.celula.match(/[A-Z]+/)[0];
  const rowB = parseInt(b.celula.match(/\d+/)[0]);
  
  if (rowA !== rowB) return rowA - rowB;
  return colA.localeCompare(colB);
});

fs.writeFileSync('planilha_formulas.json', JSON.stringify(formulas, null, 2));
console.log('Salvo em planilha_formulas.json com sucesso!');
