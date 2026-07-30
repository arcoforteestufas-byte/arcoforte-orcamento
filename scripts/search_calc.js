const fs = require('fs');
const calc = JSON.parse(fs.readFileSync('calc_data.json'));

console.log('--- SEARCHING FOR PARAFUSO, TELA, CABO ---');
for (let i = 0; i < calc.length; i++) {
  const row = calc[i] || [];
  if (row.length === 0) continue;
  const str = JSON.stringify(row).toLowerCase();
  if (str.includes('parafuso') || str.includes('tela') || str.includes('cabo') || str.includes('brocante')) {
    console.log(`Row ${i}:`, JSON.stringify(row));
  }
}
