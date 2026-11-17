// Gera o simulador 3D a partir da FONTE em src/lib/estufa3d/fonte/.
//   node scripts/gerar-estufa3d.mjs   (ou: npm run estufa3d)
// Saídas:
//   1) src/lib/estufa3d/engine-html.ts      -> versão do sistema (menu Croquis), vai no commit
//   2) scripts/estufa3d-site/*.txt           -> linhas prontas para o snippet do site arcoforte.com
//      (fonte-legivel = snippet "FONTE" id 10 · protegido = snippet ativo id 6). Fora do git.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const F = (n) => path.join(raiz, "src/lib/estufa3d/fonte", n)
const ler = (n) => fs.readFileSync(F(n), "utf-8").replace(/\r\n/g, "\n").replace(/\n+$/, "")

const painel = ler("painel.html")
const estilo = ler("estilo.css")
const cdn = ler("cdn.html")
const aux = ler("motor-auxiliar.js")
const motor = ler("motor-3d.js")
const LOGO = "/wp-content/uploads/2026/02/Logo.webp"

// ---------- 1) Sistema ----------
const logoData = "data:image/webp;base64," + fs.readFileSync(F("logo.webp")).toString("base64")
const html = [
  "<!doctype html>",
  '<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Estufa 3D</title><style>' + ler("sistema.css") + "</style></head><body>",
  painel,
  "<style>" + estilo + "</style>",
  cdn,
  "<script>" + aux + "</script>",
  "<script>" + motor + "</script>",
  "<script>" + ler("sistema-ponte.js") + "</script>",
  "</body></html>",
  "",
].join("\n").split(LOGO).join(logoData)

const ts = `// Simulador 3D da estufa (mesmo motor do arcoforte.com/estufa3d.admin).
// Arquivo GERADO: não edite à mão. Edite src/lib/estufa3d/fonte/ e rode \`npm run estufa3d\`.
// Servido só para usuários logados em /api/estufa3d.
/* eslint-disable */
export const ESTUFA3D_HTML: string = ${JSON.stringify(html)};
`
fs.writeFileSync(path.join(raiz, "src/lib/estufa3d/engine-html.ts"), ts)

// ---------- 2) Site (WordPress) ----------
const CHAVE = "arcoforte.com"
const proteger = (js) => {
  const u = Buffer.from(js, "utf-8")
  const b = Buffer.alloc(u.length)
  for (let i = 0; i < u.length; i++) b[i] = u[i] ^ ((CHAVE.charCodeAt(i % CHAVE.length) + i * 7) & 255)
  return '<script>(function(){var k=location.hostname.replace(/^www\\./,""),d=atob("' + b.toString("base64") +
    '"),b=new Uint8Array(d.length);for(var i=0;i<d.length;i++)b[i]=d.charCodeAt(i)^((k.charCodeAt(i%k.length)+i*7)&255);try{(0,eval)(new TextDecoder().decode(b))}catch(x){}})();</script>'
}
const dir = path.join(raiz, "scripts/estufa3d-site")
fs.mkdirSync(dir, { recursive: true })
const linha94 = "\t?>" + painel + "<?php"
const linhas236a240 = (a, m) => ["\t?><style>" + estilo + "</style>", cdn, a, m].join("\n")
fs.writeFileSync(path.join(dir, "linha-94-painel.txt"), linha94 + "\n")
fs.writeFileSync(path.join(dir, "linhas-236-240-fonte-legivel.txt"), linhas236a240("<script>" + aux + "</script>", "<script>" + motor + "</script>") + "\n")
fs.writeFileSync(path.join(dir, "linhas-236-240-protegido.txt"), linhas236a240(proteger(aux), proteger(motor)) + "\n")

console.log(`Estufa 3D gerada: sistema ${(html.length / 1024).toFixed(0)} KB · site em scripts/estufa3d-site/`)
