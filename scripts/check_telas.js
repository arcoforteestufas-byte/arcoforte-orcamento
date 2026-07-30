const fs = require('fs');
const calc = JSON.parse(fs.readFileSync('calc_data.json'));

console.log('--- CALC ROWS 190-210 ---');
for (let i = 190; i <= 210; i++) {
  const row = calc[i] || [];
  if (row.length > 0) {
    console.log(`Row ${i}:`, JSON.stringify(row));
  }
}
