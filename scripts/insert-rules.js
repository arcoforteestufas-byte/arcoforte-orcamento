const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltam chaves do Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const csv = `Grupo;Posicao;Codigo;Produto;Formula_Qtd;Condicao;Observacao
1. Postes;Canto;3021;Poste 3,80x100x50 GALV;4;pe_direito == 3;
1. Postes;Canto;3022;Poste 4,80x100x50 GALV;4;pe_direito == 4;
1. Postes;Canto;3104;Poste 6,00x100x50 GALV;4;pe_direito == 5;
1. Postes;Lateral 1 e 2;3021;Poste 3,80x100x50 GALV;(n_vaos - 1) * 2;pe_direito == 3;
1. Postes;Lateral 1 e 2;3022;Poste 4,80x100x50 GALV;(n_vaos - 1) * 2;pe_direito == 4;
1. Postes;Lateral 1 e 2;3104;Poste 6,00x100x50 GALV;(n_vaos - 1) * 2;pe_direito == 5;
1. Postes;Interno Divisa Modular;3021;Poste Simples GALV;(n_vaos - 1) * (n_modulos - 1);n_modulos > 1 and pe_direito == 3;
1. Postes;Interno Divisa Modular;3022;Poste Simples GALV;(n_vaos - 1) * (n_modulos - 1);n_modulos > 1 and pe_direito == 4;
1. Postes;Interno Divisa Modular;3104;Poste Simples GALV;(n_vaos - 1) * (n_modulos - 1);n_modulos > 1 and pe_direito == 5;
1. Postes;Frontal Divisa Modular;3021;Poste Simples GALV;(n_modulos - 1) * 2;n_modulos > 1 and pe_direito == 3;
1. Postes;Frontal Divisa Modular;3022;Poste Simples GALV;(n_modulos - 1) * 2;n_modulos > 1 and pe_direito == 4;
1. Postes;Frontal Divisa Modular;3104;Poste Simples GALV;(n_modulos - 1) * 2;n_modulos > 1 and pe_direito == 5;
1. Postes;Topo de Arco;3120;Poste Topo de Arco Simples GALV;2;tipo_arco == 'simples' and pe_direito == 3;
1. Postes;Topo de Arco;3104;Poste Topo de Arco Simples GALV;2;tipo_arco == 'simples' and pe_direito == 4;
1. Postes;Topo de Arco;3023;Poste Topo de Arco Simples GALV;2;tipo_arco == 'simples' and pe_direito == 5;
1. Postes;Topo de Arco;3419;Poste Topo de Arco Duplo GALV;4;tipo_arco != 'simples' and pe_direito == 3;
1. Postes;Topo de Arco;3124;Poste Topo de Arco Duplo GALV;4;tipo_arco != 'simples' and pe_direito == 4;
1. Postes;Topo de Arco;3070;Poste Topo de Arco Duplo GALV;4;tipo_arco != 'simples' and pe_direito == 5;
1. Postes;Divisa (largura);3021;Poste de Divisa;n_divisas * (n_modulos + 1);n_divisas > 0 and pe_direito == 3;
1. Postes;Divisa (largura);3022;Poste de Divisa;n_divisas * (n_modulos + 1);n_divisas > 0 and pe_direito == 4;
1. Postes;Divisa (largura);3104;Poste de Divisa;n_divisas * (n_modulos + 1);n_divisas > 0 and pe_direito == 5;
2. Arcos;Arcos Internos;3006;Arco Simples 8m;(n_vaos - 1) * n_modulos;tipo_arco == 'simples' and largura_modulo == 8;
2. Arcos;Arcos Internos;3415;Arco Duplo 7m;(n_vaos - 1) * n_modulos;tipo_arco == 'duplo' and largura_modulo == 7;
2. Arcos;Arcos Internos;3108;Arco Duplo 8m;(n_vaos - 1) * n_modulos;tipo_arco == 'duplo' and largura_modulo == 8;
2. Arcos;Arcos Internos;3007;Arco Duplo 10m;(n_vaos - 1) * n_modulos;tipo_arco == 'duplo' and largura_modulo == 10;
2. Arcos;Arcos Lanternim;3098;Arco Lanternim 8m;(n_vaos - 1) * n_modulos;tipo_arco == 'lanternim' and largura_modulo == 8;
2. Arcos;Arcos Lanternim;3014;Arco Lanternim 10m;(n_vaos - 1) * n_modulos;tipo_arco == 'lanternim' and largura_modulo == 10;
2. Arcos;Frontal;3012;Arco Frontal Simples 7m;2;tipo_arco == 'simples' and largura_modulo == 7;
2. Arcos;Frontal;3013;Arco Frontal Simples 8m;2;tipo_arco == 'simples' and largura_modulo == 8;
2. Arcos;Frontal;3109;Arco Frontal Duplo 8m;2;tipo_arco == 'duplo' and largura_modulo == 8;
2. Arcos;Frontal;3386;Arco Frontal Duplo 10m;2;tipo_arco == 'duplo' and largura_modulo == 10;
2. Arcos;Frontal;3165;Arco Frontal Lanternim 7m;2;tipo_arco == 'lanternim' and largura_modulo == 7;
2. Arcos;Frontal;3110;Arco Frontal Lanternim 8m;2;tipo_arco == 'lanternim' and largura_modulo == 8;
2. Arcos;Frontal;3043;Arco Frontal Lanternim 10m;2;tipo_arco == 'lanternim' and largura_modulo == 10;
2. Arcos;Divisa;3407;Arco Duplo de Divisa;n_divisas;tipo_arco == 'duplo' and n_divisas > 0 and largura_modulo == 7;
2. Arcos;Divisa;3408;Arco Duplo de Divisa;n_divisas;tipo_arco == 'duplo' and n_divisas > 0 and largura_modulo == 8;
2. Arcos;Divisa;3409;Arco Duplo de Divisa;n_divisas;tipo_arco == 'duplo' and n_divisas > 0 and largura_modulo == 10;
2. Arcos;Divisa;3420;Arco Lanternim de Divisa;n_divisas;tipo_arco == 'lanternim' and n_divisas > 0 and largura_modulo == 7;
2. Arcos;Divisa;3421;Arco Lanternim de Divisa;n_divisas;tipo_arco == 'lanternim' and n_divisas > 0 and largura_modulo == 8;
2. Arcos;Divisa;3422;Arco Lanternim de Divisa;n_divisas;tipo_arco == 'lanternim' and n_divisas > 0 and largura_modulo == 10;
3. Dorsal/Contravento/Encaixe;Topo (por modulo);3017;Dorsal 2 6m;ceil((comprimento_estufa * n_modulos) / 6);tipo_arco != 'lanternim';
3. Dorsal/Contravento/Encaixe;Cabeceiras;3031;Contravento 3,85m;4 * n_modulos;largura_modulo == 7 or largura_modulo == 8;
3. Dorsal/Contravento/Encaixe;Cabeceiras;3032;Contravento 4,80m;4 * n_modulos;largura_modulo == 10;
3. Dorsal/Contravento/Encaixe;Arco Interno;3027;Encaixe Central GALV;(n_vaos - 1) * n_modulos - n_divisas;tipo_arco != 'lanternim';
4. Lateral/Calha;Lateral 1 e 2 (superior);3035;Lateral Perfil Simples 6m;ceil(comprimento_estufa / 6);cobertura == true and fechamento_lateral == false;
4. Lateral/Calha;Lateral 1 e 2 (superior);3034;Lateral Perfil Duplo 6m;ceil(comprimento_estufa / 6);fechamento_lateral == true;
4. Lateral/Calha;Calha Lateral;5200;Calha Maxx 6m;ceil(comprimento_estufa / 6);calha_lateral == true and vao == 3;
4. Lateral/Calha;Calha Lateral;5110;Calha Big Maxx 8m;ceil(comprimento_estufa / 8);calha_lateral == true and vao == 4;
4. Lateral/Calha;Calha Central;5200;Calha Maxx 6m;ceil((comprimento_estufa * (n_modulos - 1)) / 6);n_modulos > 1 and vao == 3;
4. Lateral/Calha;Calha Central;5110;Calha Big Maxx 8m;ceil((comprimento_estufa * (n_modulos - 1)) / 8);n_modulos > 1 and vao == 4;
4. Lateral/Calha;Frente/Fundo;3042;Frontal 50x30;n_modulos * 2;largura_modulo == 7;
4. Lateral/Calha;Frente/Fundo;3015;Frontal 50x30;n_modulos * 2;largura_modulo == 8;
4. Lateral/Calha;Frente/Fundo;3016;Frontal 50x30;n_modulos * 2;largura_modulo == 10;
4. Lateral/Calha;Fixacao Inferior (Mureta);5085;Perfil Aluminio Simples 6m;ceil((comprimento_estufa * 2 + (n_modulos * largura_modulo) * 2) / 6);fixacao_inferior == 'mureta';
5. Emendas/Suportes;Emenda Lateral;3063;Kit Emenda Par;max(0, ceil(comprimento_estufa / 6) - 1) * 2;fechamento_lateral == true;
5. Emendas/Suportes;Espera de Arco;3018;Espera de Arco GALV;2 * (n_vaos + 1);calha_lateral == false;
5. Emendas/Suportes;Suporte Calha Lateral;3019;Suporte Calha Lateral GALV;(n_vaos - 1) * 2;calha_lateral == true;
5. Emendas/Suportes;Suporte Entrada Agua D;3089;Suporte Entrada Agua Direito;1;calha_lateral == true;
5. Emendas/Suportes;Suporte Entrada Agua E;3085;Suporte Entrada Agua Esquerdo;1;calha_lateral == true;
5. Emendas/Suportes;Suporte Saida Agua D;3093;Suporte Saida Agua Direito;1;calha_lateral == true;
5. Emendas/Suportes;Suporte Saida Agua E;3094;Suporte Saida Agua Esquerdo;1;calha_lateral == true;
5. Emendas/Suportes;Suporte Calha Dupla Central;3020;Suporte Calha Dupla Central;n_modulos - 1;n_modulos > 1;
5. Emendas/Suportes;Suporte Entrada Duplo;3090;Suporte Entrada Agua Duplo;n_modulos - 1;n_modulos > 1;
5. Emendas/Suportes;Suporte Saida Duplo;3095;Suporte Saida Agua Duplo;n_modulos - 1;n_modulos > 1;
5. Emendas/Suportes;PU Selante;5024;PU Selante 400gr;ceil((comprimento_estufa / (vao * 2) * n_modulos) / 2.5);calha_lateral == true or n_modulos > 1;
6. Mola;Lateral Superior;3049;Mola de Fixacao 25m;ceil((comprimento_estufa * (cobertura == true and fechamento_lateral == true ? 4 : 2)) / 25);cobertura == true or fechamento_lateral == true;
6. Mola;Frontal Superior;3049;Mola de Fixacao 25m;(n_modulos * largura_modulo) * (cobertura == true and fechamento_lateral == true ? 4 : 2);true;
6. Mola;Postes de Canto;3049;Mola de Fixacao 25m;(pe_direito * 4) * 2;true;
6. Mola;Portas;3049;Mola de Fixacao 25m;25 * portas_abrir + 25 * portas_correr;portas_abrir > 0 or portas_correr > 0;
6. Mola;Arcos Frontais;3049;Mola de Fixacao 25m;(largura_modulo * 1.10) * 4;true;
7. Cabos de Aco;Internos;5009;Cabo de Aco 3/16;(n_vaos - 1) * n_modulos;true;
7. Cabos de Aco;Lateral 1 e 2;5009;Cabo de Aco 3/16;(n_vaos + 1) * 2;true;
7. Cabos de Aco;Divisa Modular Frontal;5009;Cabo de Aco 3/16;(n_modulos - 1) * 2;n_modulos > 1;
7. Cabos de Aco;Topo de Arco;5009;Cabo de Aco 3/16;4;true;
7. Cabos de Aco;Travamento em X;5009;Cabo de Aco 3/16;(n_modulos + 1) * travamentos_x * 2;travamentos_x > 0;
7. Cabos de Aco;Kit Suporte;5309;Kit Suporte 25un;ceil((((n_vaos - 1) * n_modulos * 2) + ((n_vaos + 1) * 2) + ((n_modulos - 1) * 2) + 4) * 1.05 / 25);true;
7. Cabos de Aco;Kit Esticador;5308;Kit Esticador;ceil((((n_vaos - 1) * n_modulos) + ((n_vaos + 1) * 2) + ((n_modulos - 1) * 2) + 4 + ((n_modulos + 1) * travamentos_x * 2)) * 1.05);true;
7. Cabos de Aco;Chumbador;3058;Chumbador;ceil((((n_vaos + 1) * 2) + ((n_modulos - 1) * 2) + 4) * 1.05);true;
8. Portas;Cabeceira/Lateral;3033;Kit Porta de Abrir 2,00x1,00;portas_abrir;portas_abrir > 0;
8. Portas;Cabeceira/Lateral;3039;Kit Porta de Correr 1,20x2,00;portas_correr;portas_correr > 0;
8. Portas;Cabeceira/Lateral;3073;Kit Porta de Correr 2,10x3,00;portas_correr;portas_correr > 0;
9. Parafusos/Diversos;Geral;5107;Kit Parafuso 3x5/16;ceil((n_vaos * n_modulos) / 2);true;
9. Parafusos/Diversos;Geral;5114;Kit Parafuso 1x5/16;ceil((n_vaos * n_modulos) / 1.5);true;
9. Parafusos/Diversos;Frontal;3150;Anti-Camara Frontal;2;n_modulos > 1;
9. Parafusos/Diversos;Lateral;3160;Anti-Camara Lateral;2;n_modulos > 1;
10. Fechamento Lateral (Telas);Laterais;5050;Tela Ginegar;(n_vaos * vao) * 2;tela_lateral == true;
10. Fechamento Lateral (Telas);Frente;5050;Tela Ginegar;n_modulos * largura_modulo;tela_lateral == true;
10. Fechamento Lateral (Telas);Fundo;5050;Tela Ginegar;n_modulos * largura_modulo;tela_lateral == true;
11. Cobertura (Filmes);Teto;FILME-XXX;Filmes diversos;PENDENTE;PENDENTE;`.split('\n').filter(Boolean).slice(1);

const groups = {
  '1': '10000000-0000-0000-0000-000000000001',
  '2': '20000000-0000-0000-0000-000000000002',
  '3': '30000000-0000-0000-0000-000000000003',
  '4': '40000000-0000-0000-0000-000000000004',
  '5': '50000000-0000-0000-0000-000000000005',
  '6': '60000000-0000-0000-0000-000000000006',
  '7': '70000000-0000-0000-0000-000000000007',
  '8': '80000000-0000-0000-0000-000000000008',
  '9': '90000000-0000-0000-0000-000000000009',
  '10': 'a0000000-0000-0000-0000-000000000010',
  '11': 'b0000000-0000-0000-0000-000000000011',
};

const posIdMap = {};
let uuidCounter = 200;

function getPosId(groupNum, posName) {
  const key = groupNum + '-' + posName;
  if (!posIdMap[key]) {
    const hex = uuidCounter.toString(16).padStart(12, '0');
    posIdMap[key] = `${groupNum.padStart(8, '0')}-0000-0000-0000-${hex}`;
    uuidCounter++;
  }
  return posIdMap[key];
}

async function run() {
  console.log("Iniciando inserção via API...");
  
  for (const line of csv) {
    const parts = line.split(';');
    const groupStr = parts[0].split('.')[0].trim();
    const groupId = groups[groupStr];
    const posName = parts[1].trim();
    const prodCode = parts[2].trim();
    const prodName = parts[3].trim();
    const formula = parts[4].trim();
    const cond = parts[5].trim();
    
    const posId = getPosId(groupStr, posName);
    
    if (prodCode !== 'TELA-XXX' && prodCode !== 'FILME-XXX') {
      await supabase.from('produtos').upsert({ codigo: prodCode, descricao: prodName, unidade: 'un', preco_unitario: 0 });
    }
    
    await supabase.from('posicoes').upsert({ id: posId, grupo_id: groupId, nome: posName });
    
    if (formula !== 'PENDENTE' && cond !== 'PENDENTE') {
      await supabase.from('regras_calculo').insert({
        posicao_id: posId,
        produto_codigo: prodCode,
        formula_quantidade: formula,
        condicao_aplicabilidade: cond,
        unidade_medida: 'un',
        regra_arredondamento: 'nenhum'
      });
    }
  }

  console.log("Finalizado!");
}

run();
