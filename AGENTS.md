## REGRAS OBRIGATÓRIAS DE ENTREGA (ler antes de qualquer tarefa)

1. Toda alteração de código termina com COMMIT. Uma tarefa só está concluída quando:
   a) `npx tsc --noEmit` roda sem erros;
   b) a versão em package.json foi aumentada em 1 no último número (ex.: 0.1.74 → 0.1.75);
   c) os arquivos alterados foram adicionados com `git add <arquivos>` (somente os arquivos da tarefa, nunca `git add .`);
   d) foi feito `git commit -m "tipo(area): descrição curta em português"`;
   e) `git status` foi conferido e não sobrou nenhum arquivo da tarefa sem commit.

2. NÃO execute `git push`. O terminal trava pedindo credencial. Ao terminar, avise o Bruno com esta mensagem:
   "Pronto. Commit <hash> na versão <versão>. Rode `git push origin main` no seu terminal e confira na produção se o rodapé mostra v<versão> · <hash>."

3. Arquivos que só mudaram a quebra de linha (CRLF/LF), sem mudança de conteúdo, não entram no commit.

4. Funcionar no localhost NÃO significa que está na produção. A produção (Vercel) só recebe o que tem commit e foi enviado com push. Nunca diga que algo "está na produção" sem esse fluxo.

5. Regras de cálculo, parâmetros e produtos NÃO são alterados por você, nem no código, nem direto no banco. Regras e parâmetros entram pelo "Pacote de Regras" (Configurações → Pacote de Regras). Produtos entram pela importação XLSX em Produtos.

6. Se criar um campo novo no formulário de orçamento que será usado em fórmulas, adicione o nome da variável em VARIAVEIS_FORMULARIO no arquivo src/lib/pacote-regras.ts e diga isso ao Bruno.

7. Se arquivos importados pelo código estiverem no .gitignore (ex.: *_data.json), avise antes de terminar, pois isso quebra o build na Vercel.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
