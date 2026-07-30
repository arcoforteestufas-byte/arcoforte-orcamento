const { Parser } = require('expr-eval');
const parser = new Parser();
const expr = parser.parse("tipo_arco == 'LANTERNIN' ? 20 : (tipo_arco == 'DUPLO' ? 7 : 0)");
console.log(expr.evaluate({ tipo_arco: 'LANTERNIN' }));
console.log(expr.evaluate({ tipo_arco: 'DUPLO' }));
console.log(expr.evaluate({ tipo_arco: 'LEVE' }));
