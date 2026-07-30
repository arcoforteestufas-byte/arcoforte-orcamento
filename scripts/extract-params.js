const fs = require('fs');

const data = JSON.parse(fs.readFileSync('planilha_inicio.json', 'utf8'));

// O bloco de condições começa na linha 6, coluna H e K.
// Vamos mapear todos os H_ e K_
const labels = {};
const values = {};

data.forEach(item => {
  const match = item.celula.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    const col = match[1];
    const row = parseInt(match[2]);
    if (col === 'H') labels[row] = item.valor;
    if (col === 'K') values[row] = item.valor;
  }
});

let output = '## Parâmetros Encontrados:\n';
Object.keys(labels).forEach(row => {
  if (values[row] !== undefined) {
    output += `- Linha ${row}: **${labels[row]}** -> ${values[row]}\n`;
  } else {
    output += `- Linha ${row}: **${labels[row]}** (Sem valor K)\n`;
  }
});

fs.writeFileSync('report_inicio_params.md', output);
console.log('Salvo em report_inicio_params.md');
