# Estufa 3D — fonte principal

Desde 17/11/2026 o **sistema é a fonte principal** do simulador 3D. O site arcoforte.com recebe uma cópia gerada daqui.

| Arquivo | O que é |
|---|---|
| `painel.html` | HTML do painel (etapas 1 a 7, botões, modal) |
| `estilo.css` | CSS do simulador |
| `motor-3d.js` | Motor 3D principal (Three.js r128) |
| `motor-auxiliar.js` | Funções auxiliares (portas, antecâmaras, vistas 2D etc.) |
| `cdn.html` | Scripts do Three.js e OrbitControls (jsDelivr) |
| `logo.webp` | Logo usada na faixa da marca e nas imagens |
| `sistema.css` / `sistema-ponte.js` | Só na versão do sistema: esconde orçamento/WhatsApp/compartilhar e abre em tela cheia |

## Como mudar
1. Edite os arquivos desta pasta.
2. Rode `npm run estufa3d` → atualiza `src/lib/estufa3d/engine-html.ts` (vai no commit).
3. Teste no menu Croquis → Estufa 3D.
4. Para levar ao site: use `scripts/estufa3d-site/` (gerado, fora do git):
   - `linha-94-painel.txt` → linha 94 dos snippets 10 (FONTE) e 6 (ativo)
   - `linhas-236-240-fonte-legivel.txt` → linhas 236–240 do snippet 10
   - `linhas-236-240-protegido.txt` → linhas 236–240 do snippet 6 (código embaralhado)
   Depois limpar o cache do LiteSpeed.
