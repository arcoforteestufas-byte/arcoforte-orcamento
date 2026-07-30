const fs = require('fs');

const data = JSON.parse(fs.readFileSync('planilha_formulas.json', 'utf8'));

// 1. Mapear as células que têm valor direto ou fórmulas base
const cellMap = {};
data.forEach(item => {
  cellMap[item.celula] = item.formula || item.valor;
});

const paramMap = {
  'INICIO!A4': 'n_modulos',
  'INICIO!B4': 'largura_modulo',
  'INICIO!C4': '(n_vaos * vao)',
  'INICIO!D4': 'pe_direito',
  'INICIO!K7': 'tipo_arco',
  'INICIO!K8': 'tipo_poste',
  'INICIO!K9': 'calha_lateral',
  'INICIO!K10': 'postes_frontais_duplos',
  'INICIO!K11': 'postes_topo_duplos',
  'INICIO!K12': 'fixacao_inferior',
  'INICIO!K13': 'n_divisas',
  'INICIO!K14': 'postes_divisa_duplos',
  'INICIO!K15': 'fechamento_lateral',
  'INICIO!K16': 'tipo_cobertura',
  'INICIO!K17': 'portas_correr',
  'INICIO!K18': 'qual_porta',
  'INICIO!K19': 'modelo_cabo',
  'INICIO!K20': 'travamentos_x'
};

function translateFormula(f) {
  if (typeof f === 'number') return String(f);
  if (!f || !f.startsWith('=')) return f;
  
  let expr = f.substring(1); // remove '='

  // Replace Excel functions
  expr = expr.replace(/SUM\(([^)]+)\)/g, '($1)');
  expr = expr.replace(/ROUNDUP\(([^,]+),\s*0\)/g, 'ceil($1)');
  expr = expr.replace(/FLOOR\(([^,]+),\s*0\.5\)/g, 'floor($1*2)/2');
  expr = expr.replace(/INT\(([^)]+)\)/g, 'floor($1)');
  
  // Replace AND / OR inside IF recursively - Simplistic approach
  // This is hard to do with regex perfectly, so we do it roughly.
  // Actually, expr-eval supports `and` and `or`, but Excel uses `AND(A, B)` vs JS `A and B`.
  
  // Replace params
  for (const [xl, js] of Object.entries(paramMap)) {
    expr = expr.split(xl).join(js);
  }
  
  // Replace references to other cells (e.g. C4) with their expressions!
  // Limit to columns B,C,D,E,F,G rows 1-200
  const cellRegex = /\b([B-G][0-9]{1,3})\b/g;
  let matches;
  let safety = 0;
  while ((matches = cellRegex.exec(expr)) !== null && safety < 10) {
    const cellId = matches[1];
    if (cellMap[cellId]) {
      const cellVal = translateFormula(cellMap[cellId]);
      expr = expr.split(cellId).join(`(${cellVal})`);
    } else {
      expr = expr.split(cellId).join(`(0)`);
    }
    cellRegex.lastIndex = 0;
    safety++;
  }

  // Replace '=' in conditions with '=='
  // But not <= or >=
  expr = expr.replace(/(?<![<>])=(?![=])/g, '==');
  
  // Replace text "SIM" / "NÃO" with true/false for booleans? 
  // No, the engine evaluates strings if they are surrounded by quotes.
  // Excel strings are already surrounded by double quotes.
  
  return expr;
}

let result = '';
data.forEach(item => {
  if (item.formula) {
    const trans = translateFormula(item.formula);
    result += `${item.celula}: ${trans}\n\n`;
  }
});

fs.writeFileSync('translated_formulas.txt', result);
console.log('Salvo em translated_formulas.txt');
