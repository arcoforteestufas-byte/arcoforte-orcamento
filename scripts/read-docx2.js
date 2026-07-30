const mammoth = require('mammoth');
const fs = require('fs');

mammoth.extractRawText({ path: "Documentação de orçamento de estufa.docx" })
  .then(function(result){
      const text = result.value; 
      fs.writeFileSync('doc_orcamento.txt', text);
      console.log('Conteúdo salvo em doc_orcamento.txt');
  })
  .done();
