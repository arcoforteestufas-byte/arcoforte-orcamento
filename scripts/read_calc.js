const fs = require('fs');

const calc = JSON.parse(fs.readFileSync('calc_data.json'));
console.log('--- CALC DATA ---');
for (let i = 0; i < Math.min(100, calc.length); i++) {
  if (calc[i] && calc[i].length > 0 && calc[i].some(v => v !== null)) {
    console.log(`Row ${i}:`, JSON.stringify(calc[i]));
  }
}
