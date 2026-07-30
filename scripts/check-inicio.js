const fs = require('fs');

const data = JSON.parse(fs.readFileSync('planilha_formulas.json', 'utf8'));
const inicioInputs = data.filter(item => item.celula.startsWith('INICIO!') || item.formula === null && item.celula.length <= 3); 
// Wait, the formulas json doesn't prefix sheet name for its own cells. The INICIO sheet inputs were NOT in 'CALC' sheet formulas.
// We only extracted formulas from 'CALC' sheet in the previous script!
