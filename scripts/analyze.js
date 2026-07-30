const fs = require('fs');

const calc = JSON.parse(fs.readFileSync('calc_data.json'));
console.log('CALC Headers:', calc[0]);
console.log('CALC Row 1:', calc[1]);
console.log('CALC Row 2:', calc[2]);

const inicio = JSON.parse(fs.readFileSync('inicio_data.json'));
console.log('\nINICIO data sample:');
for (let i = 0; i < 15; i++) {
  if (inicio[i]) console.log(`Row ${i}:`, inicio[i]);
}

const catalogs = JSON.parse(fs.readFileSync('catalog_data.json'));
console.log('\nCATALOGO Headers:', catalogs['CATALOGO'][0]);
console.log('CATALOGO Row 1:', catalogs['CATALOGO'][1]);

console.log('\nBD-ESTRUTURA Headers:', catalogs['BD-ESTRUTURA'][0]);
console.log('BD-ESTRUTURA Row 1:', catalogs['BD-ESTRUTURA'][1]);
