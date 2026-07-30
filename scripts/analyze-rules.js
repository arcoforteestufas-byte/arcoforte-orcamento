const fs = require('fs');

const data = JSON.parse(fs.readFileSync('planilha_formulas.json', 'utf8'));
let currentSection = 'INICIO';
const sections = {};

// Função auxiliar para ver se uma célula parece um cabeçalho de seção
function isSectionHeader(val) {
  if (typeof val === 'string' && val.toUpperCase() === val && val.length > 5 && !val.includes('TOTAL') && !val.includes('QUANTIDADE')) {
    return true;
  }
  return false;
}

data.forEach(item => {
  if (item.celula.startsWith('A') && isSectionHeader(item.valor)) {
    currentSection = item.valor;
  }
  
  if (!sections[currentSection]) {
    sections[currentSection] = [];
  }
  
  if (item.formula) {
    sections[currentSection].push({
      cel: item.celula,
      val: item.valor,
      form: item.formula
    });
  }
});

let report = '# Relatório de Fórmulas por Seção\n\n';

for (const sec in sections) {
  if (sections[sec].length > 0) {
    report += `## ${sec}\n`;
    sections[sec].forEach(f => {
      report += `- **${f.cel}**: Valor: ${f.val} | Fórmula: \`${f.form}\`\n`;
    });
    report += '\n';
  }
}

fs.writeFileSync('report_formulas.md', report);
console.log('Salvo em report_formulas.md');
