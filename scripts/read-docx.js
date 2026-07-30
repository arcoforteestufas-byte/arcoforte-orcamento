const mammoth = require('mammoth');
const fs = require('fs');

mammoth.extractRawText({ path: "Manual_Regras_Orcamento_Estufas_ArcoForte.docx" })
  .then(function(result){
      const text = result.value; 
      fs.writeFileSync('manual_regras.txt', text);
      console.log('Conteúdo do docx salvo em manual_regras.txt');
  })
  .done();
