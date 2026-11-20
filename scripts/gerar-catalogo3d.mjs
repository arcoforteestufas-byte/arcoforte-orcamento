// Gera src/lib/estufa3d/catalogo-html.ts a partir de docs/pecas-3d/catalogo-pecas-3d.html
// Rode: npm run catalogo3d (sempre que o catálogo de peças 3D mudar)
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const fonte = fs.readFileSync(path.join(raiz, "docs/pecas-3d/catalogo-pecas-3d.html"), "utf-8")
const corpo = fonte.replace(/^\s*<!doctype[^>]*>/i, "")
const html =
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex,nofollow">' +
  "<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>" +
  corpo + "</html>"
const ts = `// Catálogo de peças 3D (mesmo conteúdo de docs/pecas-3d/catalogo-pecas-3d.html).
// Arquivo GERADO: não edite à mão. Edite o catálogo e rode \`npm run catalogo3d\`.
// Servido só para usuários logados em /api/catalogo3d.
/* eslint-disable */
export const CATALOGO3D_HTML: string = ${JSON.stringify(html)};
`
fs.writeFileSync(path.join(raiz, "src/lib/estufa3d/catalogo-html.ts"), ts)
console.log(`Catálogo 3D gerado: ${(html.length / 1024).toFixed(0)} KB`)
