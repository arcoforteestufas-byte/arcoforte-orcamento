# Regras Completas de Cálculo — ArcoForte (para leitura por sistema/agente)

Versão: 02/08/2026. Cada linha é uma regra independente com ID estável (R001, R002...). Colunas: ID;Grupo;Posicao;Codigo;Produto;Formula_Qtd;Condicao;Observacao

R001;2. Postes;Postes de Canto;MANUAL;Poste (modelo à escolha do vendedor);4;sempre;Código depende do modelo escolhido
R002;2. Postes;Postes Laterais;MANUAL;Poste (modelo à escolha do vendedor);2*(postes_por_linha-2);sempre;
R003;2. Postes;Postes Frontais de Divisa Modular;MANUAL;Poste;( n_modulos-1)*2;n_modulos>1;
R004;2. Postes;Postes Internos de Divisa Modular;MANUAL;Poste;(n_modulos-1)*(postes_por_linha-2);n_modulos>1;
R005;2. Postes;Postes Frontais Topo de Arco;3120;Poste 5,50x100x50 GALV Topo de Arco;postes_por_arco_frontal*2*n_modulos;pe_direito==3;
R006;2. Postes;Postes Frontais Topo de Arco;3023;Poste 6,75x100x50 GALV Topo de Arco;postes_por_arco_frontal*2*n_modulos;pe_direito==4;
R007;2. Postes;Postes Frontais Topo de Arco;3416;Poste Duplo 8,00x100x100 GALV Topo de Arco;postes_por_arco_frontal*2*n_modulos;pe_direito==5;
R008;2. Postes;Perfil de Divisa;5084 ou 5078;Perfil Alumínio Duplo Maxx 6m;ver R058;n_divisas>0;
R009;3. Arcos;Arco Frontal;3012;Arco Frontal Calandrado 7m;n_modulos*2;arco_tipo=='simples' e arco_largura==7;
R010;3. Arcos;Arco Frontal;3013;Arco Frontal Calandrado 8m;n_modulos*2;arco_tipo=='simples' e arco_largura==8;
R011;3. Arcos;Arco Frontal;3384;Arco Duplo Frontal 7m;n_modulos*2;arco_tipo=='duplo' e arco_largura==7;
R012;3. Arcos;Arco Frontal;3109;Arco Duplo Frontal 8m;n_modulos*2;arco_tipo=='duplo' e arco_largura==8;
R013;3. Arcos;Arco Frontal;3386;Arco Duplo Frontal 10m;n_modulos*2;arco_tipo=='duplo' e arco_largura==10;
R014;3. Arcos;Arco Frontal;3165;Arco Lanternim Frontal 7m;n_modulos*2;arco_tipo=='lanternim' e arco_largura==7;
R015;3. Arcos;Arco Frontal;3110;Arco Lanternim Frontal 8m;n_modulos*2;arco_tipo=='lanternim' e arco_largura==8;
R016;3. Arcos;Arco Frontal;3043;Arco Lanternim Frontal 10m;n_modulos*2;arco_tipo=='lanternim' e arco_largura==10;
R017;3. Arcos;Arco Normal;3005;Arco Calandrado 7m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='simples' e arco_largura==7;
R018;3. Arcos;Arco Normal;3006;Arco Calandrado 8m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='simples' e arco_largura==8;
R019;3. Arcos;Arco Normal;3415;Arco Duplo 7m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='duplo' e arco_largura==7;
R020;3. Arcos;Arco Normal;3108;Arco Duplo 8m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='duplo' e arco_largura==8;
R021;3. Arcos;Arco Normal;3007;Arco Duplo 10m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='duplo' e arco_largura==10;
R022;3. Arcos;Arco Normal;3417;Arco Lanternim 7m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='lanternim' e arco_largura==7;
R023;3. Arcos;Arco Normal;3098;Arco Lanternim 8m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='lanternim' e arco_largura==8;
R024;3. Arcos;Arco Normal;3014;Arco Lanternim 10m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='lanternim' e arco_largura==10;
R025;3. Arcos;Arco Normal;3065;Arco Lanternim Leve 7m;(n_vaos-1)*n_modulos-n_divisas;arco_tipo=='lanternim_leve' e arco_largura==7;
R026;3. Arcos;Arco de Divisa;3407;Arco Duplo de Divisa 7m;n_divisas;arco_divisa_tipo=='duplo' e arco_largura==7;substitui um arco normal, não soma
R027;3. Arcos;Arco de Divisa;3408;Arco Duplo de Divisa 8m;n_divisas;arco_divisa_tipo=='duplo' e arco_largura==8;
R028;3. Arcos;Arco de Divisa;3409;Arco Duplo de Divisa 10m;n_divisas;arco_divisa_tipo=='duplo' e arco_largura==10;
R029;3. Arcos;Arco de Divisa;3420;Arco Lanternim de Divisa 7m;n_divisas;arco_divisa_tipo=='lanternim' e arco_largura==7;
R030;3. Arcos;Arco de Divisa;3421;Arco Lanternim de Divisa 8m;n_divisas;arco_divisa_tipo=='lanternim' e arco_largura==8;
R031;3. Arcos;Arco de Divisa;3422;Arco Lanternim de Divisa 10m;n_divisas;arco_divisa_tipo=='lanternim' e arco_largura==10;
R032;3. Arcos;Lateral Extra módulo lanternim;3034 ou 3035;Lateral Dupla/Simples;comprimento_do_modulo*2;arco_tipo=='lanternim';substitui dorsal
R033;4. Contravento;Contravento;3031;Contravento 3,85m;n_modulos*4;arco_largura==7 ou arco_largura==8;
R034;4. Contravento;Contravento;3032;Contravento 4,80m;n_modulos*4;arco_largura==10;
R035;5. Dorsal;Dorsal;3017;Dorsal 2pol c/ Emenda 6m;ceil(comprimento_estufa/6)*n_modulos;arco_tipo!='lanternim';
R036;5. Dorsal;Emenda de Dorsal;3040;Emenda Tubo Dorsal 20cm;max(0,ceil(comprimento_estufa/6)-1)*n_modulos;arco_tipo!='lanternim';
R037;6. Encaixe Central;Encaixe Central;3027;Encaixe Central GALV;(n_vaos-1)*n_modulos-n_divisas;arco_tipo!='lanternim';CORRIGIDO 02/08/2026, já aplicado hoje
R038;7. Lateral/Calha;Lateral 1;3035;Lateral Simples 6m;ceil(comprimento_estufa/6) barras;fixacao_superior_lateral=='perfil_simples';
R039;7. Lateral/Calha;Lateral 1;3034;Lateral Dupla 6m;ceil(comprimento_estufa/6) barras;fixacao_superior_lateral=='perfil_duplo';
R040;7. Lateral/Calha;Lateral 1;5200;Calha Maxx Alumínio 6m;ceil(metros_calha_total/6) barras;fixacao_superior_lateral=='calha' e vao==3;
R041;7. Lateral/Calha;Lateral 1;5110;Calha Big Maxx Premium 8m;ceil(metros_calha_total/8) barras;fixacao_superior_lateral=='calha' e vao==4;
R042;7. Lateral/Calha;Lateral 2;mesmos códigos de R038-R041;mesma peça;mesma fórmula;mesma condição;Lateral 2 espelha Lateral 1
R043;7. Lateral/Calha;Calha Central;5200 ou 5110;Calha;metros_calha_total = comprimento_estufa*(linhas_laterais_com_calha+n_modulos-1);n_modulos>1;obrigatória com 2+ módulos
R044;7. Lateral/Calha;Frente/Fundo;3042;Frontal 50x30 7m;n_modulos*2;arco_largura==7;CORRIGIDO 02/08/2026, já aplicado hoje
R045;7. Lateral/Calha;Frente/Fundo;3015;Frontal 50x30 8m;n_modulos*2;arco_largura==8;CORRIGIDO 02/08/2026, já aplicado hoje
R046;7. Lateral/Calha;Frente/Fundo;3016;Frontal 50x30 10m;n_modulos*2;arco_largura==10;CORRIGIDO 02/08/2026, já aplicado hoje
R047;8. Emenda de Lateral;Emenda Lateral 1 e 2;3063;Kit Emenda Par 0,30cm;max(0,ceil(comprimento_estufa/6)-1)*2;fixacao_superior_lateral!='calha';Frente/Fundo nunca tem emenda agora
R048;9. Espera/Suportes de Calha;Espera de Arco;3018;Espera de Arco GALV;2*(n_vaos+1);fixacao_superior_lateral!='calha';
R049;9. Espera/Suportes de Calha;Suporte Calha Lateral Simples;3019;Suporte Calha Lateral Simples;2*((n_vaos+1)-2);fixacao_superior_lateral=='calha';
R050;9. Espera/Suportes de Calha;Entrada de Água;3089;Suporte Entrada Calha LD Direito;1;fixacao_superior_lateral=='calha';
R051;9. Espera/Suportes de Calha;Entrada de Água;3085;Suporte Entrada Calha LD Esquerdo;1;fixacao_superior_lateral=='calha';
R052;9. Espera/Suportes de Calha;Saída de Água;3093;Suporte Saída Água 150mm LD Direito;1;fixacao_superior_lateral=='calha';
R053;9. Espera/Suportes de Calha;Saída de Água;3094;Suporte Saída Água 150mm LD Esquerdo;1;fixacao_superior_lateral=='calha';
R054;9. Espera/Suportes de Calha;Suporte Calha Dupla Central;3020;Suporte Calha Dupla Central;(n_modulos-1)*((n_vaos+1)-2);n_modulos>1;
R055;9. Espera/Suportes de Calha;Entrada de Água Duplo;3090;Suporte Entrada Calha Duplo;n_modulos-1;n_modulos>1;
R056;9. Espera/Suportes de Calha;Saída de Água Duplo;3095;Suporte Saída Água 150mm Duplo;n_modulos-1;n_modulos>1;
R057;10. PU Selante;PU Selante;5024;PU Selante 40 CZA 400gr;ceil((comprimento_estufa/(vao*2))*n_linhas_calha/2.5);n_linhas_calha>0;
R058;11. Perfil Fixação Plásticos;Perfil Duplo cantos+divisa;5084 ou 5078;Perfil Alumínio Duplo Maxx 6m;ceil((altura_postes_canto*4+altura_postes_canto*n_divisas)/6) barras;fechamento_lateral==true;PENDÊNCIA - qtd real menor que fórmula em pedido real, investigar
R059;11. Perfil Fixação Plásticos;Perfil Simples mureta;5085;Perfil Alumínio Simples Maxx 6m;ceil((2*comprimento_estufa+2*largura_estufa)/6) barras;fixacao_inferior=='mureta';
R060;12. Mola de Fixação;Mola de Fixação;3049;Mola de Fixação 25m;ceil((soma_11_aplicacoes*1.10)/25) rolos;sempre;soma de 11 aplicações, ver manual seção 12
R061;13. Cabos de Aço;Cabo de Aço 3/16;5009;Cabo Aço Galv 3/16 4,8mm;soma de grupos *1.05 arredondado p/ múltiplo de 10;cabos_modo!='sem_cabo';
R062;13. Cabos de Aço;Esticador;5308/5309/5321;Esticador O-O;ceil(total_cabos*1.05);cabos_modo!='sem_cabo';
R063;13. Cabos de Aço;Kit Suporte Cabo;5309;Kit Suporte p/ Cabo de Aço 25un;ceil(total_suportes_com_5pct/25);cabos_modo!='sem_cabo';
R064;13. Cabos de Aço;Chumbador;3058;Chumbador;ceil(chumbadores_bruto*1.05);cabos_modo!='sem_cabo';
R065;14. Portas;Porta de Abrir;3033;Kit Porta de Abrir 2,00x1,00m;MANUAL, mínimo 1 se houver fechamento lateral;manual;
R066;14. Portas;Porta de Correr;3039;Kit Porta de Correr 1,20x2,00m;MANUAL;manual;
R067;14. Portas;Porta de Correr Dupla;3073;Kit Porta de Correr 2,10x3,00m;MANUAL;manual;
R068;14.1 Anti-câmara;Anti-Câmara Frontal;3150;Anti-Câmara 4L x 3C x 3A Frontal;MANUAL;manual;nunca estimar
R069;14.1 Anti-câmara;Anti-Câmara Lateral;3160;Anti-Câmara 3x3 4A Lateral;MANUAL;manual;

Pendências sem fórmula ainda (não implementar, só documentar como aviso): parafusos de montagem, cobertura em filme/tela, saída central 3086, sistema de cortina lateral móvel (1254/3155/3388/3423/4151), kits de parafuso extras 5075/5067/5274.
