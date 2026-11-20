# Peças 3D ArcoForte

Modelos das peças da estufa em separado, para vídeo de montagem e manual.
Medidas reais conferidas pelo Bruno em 19/11/2026. Os modelos `.glb` e `.stl` estão em **metros**.

| Peça | Código | Arquivos |
|---|---|---|
| Suporte de calha lateral simples (1 espera de arco) | 3019 | `suporte-calha-3019.glb`, `.stl`, imagens `-perspectiva/-frente/-baixo.png` |
| Suporte de calha dupla central (2 esperas de arco) | 3020 | `suporte-calha-3020.glb`, `.stl`, imagens `-perspectiva/-frente/-baixo.png` |

- **.glb**: modelo 3D com cor e materiais (aço galvanizado, solda, furos). Abre no Blender, no visualizador 3D do Windows e em editores de vídeo com 3D.
- **.stl**: só a forma, sem cor (para impressão 3D ou CAD).
- **.png**: imagens com fundo transparente, prontas para o manual ou para o vídeo.
- **visualizador-suportes-calha.html**: abre no navegador; mostra as duas peças com as letras das medidas, o poste, a calha e o arco.

## Medidas (cm)
A 15 (comprimento do berço) · B 10 (fundo) · M 4 (chanfro) · D 35° (ângulo do chanfro) · C 5,5 (lateral reta) ·
E 0,3 (chapa) · F 4,2 (diâmetro do tubo) · G 15 / N 11,5 (tubo, lado de baixo / de cima) · H 50° (inclinação) ·
I 9 (abas) · J 3 (largura das abas) · K 10 (entre as abas) · 10 furos.

---

## Espera de arco 3018 (laterais sem calha) e perfil de alumínio duplo 5084

| Peça | Código | Arquivos |
|---|---|---|
| Espera de arco (chapa no lado de fora do poste) | 3018 | `espera-arco-3018.glb`, `.stl`, imagens `-perspectiva/-fora/-dentro/-montada.png` |
| Perfil de alumínio duplo, molas juntas (lateral) | 5084 | `perfil-aluminio-5084.glb`, `.stl` (trecho de 1 m), `perfil-5084-corte.png` |

- **visualizador-espera-arco-3018.html**: abre no navegador; mostra a 3018 no poste, com a lateral, o perfil duplo de molas separadas, o parafuso autobrocante e as letras das medidas.
- Na estufa 3D, a lateral aparece com perfil duplo de **molas separadas** (dois canais, uma mola em cada). A mudança é só visual: códigos e cálculos do orçamento não mudaram.
- A 3018 vai na face de fora do poste. O primeiro furo é o da lateral, e a lateral fica do lado de fora da chapa.

### Medidas 3018 (cm)
Chapa: A 15,5 · B 3 · E 0,4 · C 4 · D 35° ·
Furos: Q 3 · R 1,5 · S 6,5 ·
Montagem: T 6 · W 1,5 · U 3 ·
Tubo: F 4,5 · G 16.

---

## Perfil de alumínio duplo, molas separadas (código 5075, barra de 6 m)

| Peça | Código | Arquivos |
|---|---|---|
| Perfil em U duplo: fundo reto, 3 paredes retas com bordas dobradas, 2 canais (uma mola em cada) | 5075 | `perfil-aluminio-5075.glb`, `.stl` (trecho de 1 m), `perfil-5075-corte.png` |

Medidas aproximadas (cm), pela proporção da foto: largura 4,4 · altura 1,3. É o perfil que aparece na lateral da estufa 3D.

## Lateral 50 × 30 com perfil duplo de molas separadas (código 3034)

| Peça | Código | Arquivos |
|---|---|---|
| Metalon 50 × 30 galvanizado, chapa 1,25 mm, barra de 6 m, com o perfil 5075 no lado de fora | 3034 | `lateral-3034.glb`, `.stl` (trecho de 1 m), imagens `-perspectiva/-corte/-fora.png`, `visualizador-lateral-3034.html` |

## Calha de alumínio (código a definir)

| Peça | Arquivos |
|---|---|
| Calha com fundo reto, cantos chanfrados e um canal de mola no alto de cada parede, aberto para o meio da calha | `calha.glb`, `.stl` (trecho de 1 m), imagens `-perspectiva/-corte/-cima.png`, `visualizador-calha.html` (com as molas) |

Medidas aproximadas (cm), tiradas do berço dos suportes 3019/3020 para encaixar nele: largura em cima 15,8 · fundo 9,2 · altura 7,2 · canais de mola com 2,1 entre as abas e abas de 1,3.

## Catálogo

- **catalogo-pecas-3d.html**: abre no navegador (precisa de internet para carregar o 3D). Uma ficha por peça, com o modelo para girar, código, onde vai, medidas e arquivos.
