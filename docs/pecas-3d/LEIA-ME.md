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
| Calha com fundo reto, cantos chanfrados e um perfil duplo de molas juntas (tipo 5084) no alto de cada parede, pelo lado de dentro | `calha.glb`, `.stl` (trecho de 1 m), imagens `-perspectiva/-corte/-cima.png`, `visualizador-calha.html` (com as molas) |

Medidas (cm) conferidas pelo Bruno em 20/11/2026: A largura em cima 17 · B fundo 10 · C altura total 9 · D altura da parede reta 7,5 · perfil de molas juntas com fundo de 3 (conferido), abertura 2,1 e altura 1,25.

## Encaixe dorsal frontal com chapa (código 3028)

| Peça | Código | Arquivos |
|---|---|---|
| Dois tubos galvanizados soldados em ângulo reto, com chapa de fixação por baixo | 3028 | `encaixe-dorsal-3028.glb`, `.stl`, imagens `-perspectiva/-cima/-baixo/-lado.png`, `visualizador-encaixe-dorsal-3028.html` |

Faz parte do arco frontal: já vem com ele e **não é somado no cálculo da estufa**.

Medidas aproximadas (cm), tiradas das fotos: tubos Ø 5,5 · tubo deitado 10 (com furo) · tubo em pé 10 (conferido, com furo a 1,5 da chapa) · chapa 3,2 × 16 × 0,3 com 2 furos.

## Encaixe de contravento (código 3026)

| Peça | Código | Arquivos |
|---|---|---|
| Tubo galvanizado com furo passante e chapa de fixação soldada na lateral | 3026 | `encaixe-contravento-3026.glb`, `.stl`, imagens `-perspectiva/-cima/-ponta.png`, `visualizador-encaixe-contravento-3026.html` |

Faz parte do arco frontal: já vem com ele e **não é somado no cálculo da estufa**.

Medidas (cm): tubo Ø 5,7 × 10 (conferido) com furo passante de 1,1 · chapa de 2 mm (conferida), 2,9 × 5,8 (pelas fotos), com 1 furo.

## Arco frontal duplo 8 m (código 3109)

| Conjunto | Código | Arquivos |
|---|---|---|
| Arco frontal duplo 8 m com o encaixe dorsal 3028 no topo e uma espera de contravento 3026 de cada lado | 3109 | `arco-frontal-3109.glb`, imagens `-frente/-perspectiva/-topo/-lado.png`, `visualizador-arco-frontal-3109.html` |

O arco vem da estufa 3D (mesmo formato do sistema), sozinho, como sai da fábrica: arco, trava de arco e reforços em tubo de 2" (conferido), com o 3028 e os dois 3026. Sem dorsal, frontal e contravento. O 3026 fica no encontro da trava de arco com o arco, com a chapa para dentro do arco. A trava de arco, o reforço (diagonal) e o contravento têm a ponta amassada (aba arredondada com furo oblongo) e são parafusados juntos nessa chapa. No arco duplo, a ponta do contravento é dobrada para deitar na chapa e aproveitar o mesmo parafuso (conferido).

## Catálogo

- **catalogo-pecas-3d.html**: abre no navegador (precisa de internet para carregar o 3D). Uma ficha por peça, com o modelo para girar, código, onde vai, medidas e arquivos.


> 20/11/2026: perfil 5084 (molas juntas) refeito com 3 cm de largura no fundo, conferido pelo Bruno.
