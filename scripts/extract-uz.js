const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\Bruno\\Desktop\\ArcoForte Orçamento\\arcoforte-orcamento\\ORÇAMENTO ARCOFORTE.xlsx';
const workbook = XLSX.readFile(filePath, { cellFormula: true });
const sheetInicio = workbook.Sheets['INICIO'];

const output = [];

// Procurar de U8 até Z100
for (let row = 6; row <= 100; row++) {
  const codeCell = sheetInicio['U' + row];
  const descCell = sheetInicio['V' + row];
  const qtyCell = sheetInicio['X' + row]; // A imagem mostra QUNT na col D (se A=U, B=V, C=W, D=X)
  
  if (codeCell && codeCell.v) {
    output.push({
      row: row,
      codigo: codeCell.v,
      descricao: descCell ? descCell.v : '',
      quantidade: qtyCell ? qtyCell.v : '',
      formula_qtd: qtyCell && qtyCell.f ? '=' + qtyCell.f : null
    });
  }
}

fs.writeFileSync('planilha_uz.json', JSON.stringify(output, null, 2));
console.log('Salvo em planilha_uz.json');
