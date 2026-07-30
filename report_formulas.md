# Relatório de Fórmulas por Seção

## CALCULO DE ARCOS
- **F3**: Valor: 12 | Fórmula: `=SUM((INICIO!C4/3-1)*INICIO!A4)-C6`

## ARCO INTERNO
- **B4**: Valor: 7 | Fórmula: `=(INICIO!B4)`
- **C4**: Valor: 12 | Fórmula: `=SUM((INICIO!C4/3-1)*INICIO!A4)-C6`
- **B100**: Valor: 0 | Fórmula: `=IF(AND(INICIO!K7="LANTERNIN", INICIO!K8="NÃO"), 6,
 IF(AND(INICIO!K7="LANTERNIN", INICIO!K8="SIM"), 4,
 IF(AND(INICIO!K7="DUPLO", INICIO!K8="NÃO"), 4,
 IF(AND(INICIO!K7="DUPLO", INICIO!K8="SIM"), 2,0))))`
- **F100**: Valor: 0 | Fórmula: `=IF(OR(INICIO!K8="EUCALIPTO", INICIO!K10="SIM"),
   IF(AND(INICIO!K9="CALHA", OR(INICIO!K19="SEM CABO DE AÇO", INICIO!K19="APENAS INTERNO")),
      4*1,
      4*2),
   0)`
- **B124**: Valor: 48 | Fórmula: `=IF(INICIO!K7="LANTERNIN", C4*20, IF(INICIO!K7="DUPLO", C4*7, IF(INICIO!K7="LEVE", C4*4,0)))`

## ARCO FRONTAL
- **B5**: Valor: 7 | Fórmula: `=(INICIO!B4)`
- **C5**: Valor: 4 | Fórmula: `=SUM(2*INICIO!A4)`

## ARCO DE DIVISA 
- **B6**: Valor: 7 | Fórmula: `=(INICIO!B4)`
- **C6**: Valor: 0 | Fórmula: `=IF(INICIO!K13>0, INICIO!K13*INICIO!A4,0)`
- **B7**: Valor: INTERNO: 12 | Fórmula: `=IF(INICIO!K13<=0, "INTERNO: "&C4, "INTERNO: "&C4-C6)`
- **C7**: Valor: FRONTAL: 4 | Fórmula: `="FRONTAL: "&C5`
- **F7**: Valor: 42 | Fórmula: `=SUM(INICIO!C4*INICIO!A4)`
- **B8**: Valor: 16 | Fórmula: `=SUM(C4:C6)`
- **F8**: Valor: 7 | Fórmula: `=SUM(F7/6)`

## POSTES INTERNOS
- **B12**: Valor: 3.8 | Fórmula: `=IF(INICIO!D4=3, 3.8, IF(INICIO!D4=4, 4.8, IF(INICIO!D4=5, 6, "Altura inválida")))`
- **C12**: Valor: 18 | Fórmula: `=IF(INICIO!A4>0, ((INICIO!C4 / 3) + 1) * (INICIO!A4 + 1) - (C13), "Informe valores válidos")-C15`
- **E12**: Valor: 3.5 | Fórmula: `=FLOOR(INICIO!C4/6, 0.5)`
- **F12**: Valor: 2 | Fórmula: `=INICIO!A4`
- **G12**: Valor: 3 | Fórmula: `=IF(E12>1, ROUNDUP(E12-1, 0), 0)`

## POSTES FRONTAIS BAIXOS
- **B13**: Valor: 3.8 | Fórmula: `=IF(INICIO!D4=3, 3.8, IF(INICIO!D4=4, 4.8, IF(INICIO!D4=5, 6, "Altura inválida")))`
- **C13**: Valor: 6 | Fórmula: `=SUM((INICIO!A4+1)*2)`
- **B104**: Valor: 8 | Fórmula: `=IF(AND(INICIO!A4>1, INICIO!K10="NÃO"), ((INICIO!A4-1)*2)*4,0)`
- **F104**: Valor: false | Fórmula: `=IF(OR(INICIO!K8="EUCALIPTO", INICIO!K10="SIM"), IF(OR(INICIO!K7="DUPLO", INICIO!K7="LANTERNIN"), B8*2))`

## POSTES FRONTAIS TOPO
- **B14**: Valor: 5.5 | Fórmula: `=IF(INICIO!D4=3, 5.5, IF(INICIO!D4=4, 6.75, IF(INICIO!D4=5, 8, "Altura inválida")))`
- **C14**: Valor: 4 | Fórmula: `=IF(OR(INICIO!K7="LANTERNIN", INICIO!K7="DUPLO"),INICIO!A4*4,INICIO!A4*2)`
- **G14**: Valor: 6 | Fórmula: `=SUM(F12*G12)`
- **B105**: Valor: 12 | Fórmula: `=IF(INICIO!K11="NÃO",C14*3,0)`
- **F105**: Valor: 0 | Fórmula: `=IF(OR(INICIO!K8="EUCALIPTO", INICIO!K10="SIM"), (INICIO!C4/3+1)*2,0)`

## POSTE DE DIVISA
- **B15**: Valor: 3.8 | Fórmula: `=IF(INICIO!D4=3, 3.8, IF(INICIO!D4=4, 4.8, IF(INICIO!D4=5, 6, "Altura inválida")))`
- **C15**: Valor: 0 | Fórmula: `=IF(INICIO!K13=1, INICIO!K13*INICIO!A4+1, IF(INICIO!K13=2,INICIO!K13*INICIO!A4+2, IF(INICIO!K13=3,INICIO!K13*INICIO!A4+3, IF(INICIO!K13=4,INICIO!K13*INICIO!A4+4, IF(INICIO!K13=5,INICIO!K13*INICIO!A4+5, IF(INICIO!K13=6,INICIO!K13*INICIO!A4+6, IF(INICIO!K13=7,INICIO!K13*INICIO!A4+7,IF(INICIO!K13=8,INICIO!K13*INICIO!A4+8,IF(INICIO!K13=9,INICIO!K13*INICIO!A4+9, IF(INICIO!K13=10,INICIO!K13*INICIO!A4+10, IF(INICIO!K13=11,INICIO!K13*INICIO!A4+11, IF(INICIO!K13=12,INICIO!K13*INICIO!A4+12, IF(INICIO!K13=13,INICIO!K13*INICIO!A4+13, IF(INICIO!K13=14,INICIO!K13*INICIO!A4+14, IF(INICIO!K13=15,INICIO!K13*INICIO!A4+15, IF(INICIO!K13=16,INICIO!K13*INICIO!A4+16,IF(INICIO!K13=17,INICIO!K13*INICIO!A4+17, IF(INICIO!K13=18,INICIO!K13*INICIO!A4+18, IF(INICIO!K13=19,INICIO!K13*INICIO!A4+19, IF(INICIO!K13=20,INICIO!K13*INICIO!A4+20, IF(INICIO!K13=22,INICIO!K13*INICIO!A4+21,IF(INICIO!K13=22,INICIO!K13*INICIO!A4+22, IF(INICIO!K13=23,INICIO!K13*INICIO!A4+23, IF(INICIO!K13=24,INICIO!K13*INICIO!A4+24, IF(INICIO!K13=25,INICIO!K13*INICIO!A4+25, IF(INICIO!K13=26,INICIO!K13*INICIO!A4+26, IF(INICIO!K13=27,INICIO!K13*INICIO!A4+27, IF(INICIO!K13=28,INICIO!K13*INICIO!A4+28, IF(INICIO!K13=29,INICIO!K13*INICIO!A4+29, IF(INICIO!K13=30,INICIO!K13*INICIO!A4+30,0))))))))))))))))))))))))))))))`

## CABEÇA DA ESTUFA
- **B22**: Valor: 8 | Fórmula: `=SUM(4*INICIO!A4)`
- **C22**: Valor: 3,8 | Fórmula: `=IF((INICIO!B4<=8),"3,8","4,8")`
- **F22**: Valor: 0 | Fórmula: `=IF(INICIO!K9="NÃO", FLOOR(INICIO!C4/6, 0.5),0)`
- **G22**: Valor: 0 | Fórmula: `=IF(F22>1, ROUNDUP(F22-1, 0), 0)*2`
- **F23**: Valor: 2 | Fórmula: `=FLOOR((INICIO!B4*INICIO!A4)/6, 0.5)`
- **G23**: Valor: 2 | Fórmula: `=IF( INICIO!A4=1,0, IF(F23>1, ROUNDUP(F23-1, 0), 0)*2)`
- **F24**: Valor: 3.5 | Fórmula: `=IF(INICIO!K12="SIM", 0, FLOOR(INICIO!C4/6, 0.5))`
- **G24**: Valor: 6 | Fórmula: `=IF(F24="", "", IF(F24>1, ROUNDUP(F24-1, 0), 0)*2)`
- **B25**: Valor: QUANTIDADE: 8 | Fórmula: `="QUANTIDADE: "&B22`
- **C25**: Valor: TAMANHOS: 3,8 | Fórmula: `="TAMANHOS: "&C22`
- **F25**: Valor: 0 | Fórmula: `=IF(INICIO!K12="LATERAL SIMPLES", FLOOR((INICIO!B4 * INICIO!A4) / 6, 0.5),0)`
- **G25**: Valor: 0 | Fórmula: `=IF(F25="","", IF(F25>1, ROUNDUP(F25-1, 0), 0)*2)`
- **G26**: Valor: 8 | Fórmula: `=IF(AND(G24="", G25=""), SUM(G22:G23), SUM(G22:G25))`

## LATERAIS SUPERIORES 
- **B30**: Valor: 84 | Fórmula: `=IF(AND(INICIO!K16<>"SEM COBERTURA", INICIO!K15="SIM"), 
    (INICIO!C4*2)*2, 
    IF(INICIO!K16="SIM", 
        INICIO!C4*2, 
        IF(INICIO!K15="SIM", 
            INICIO!C4*2, 
            0
        )
    )
)`
- **F30**: Valor: 12 | Fórmula: `=TEXT(INICIO!D4*4, "0")`

## FRONTAIS SUPERIORES 
- **B31**: Valor: 56 | Fórmula: `=IF(AND(INICIO!K16<>"SEM COBERTURA", INICIO!K15="SIM"), ((INICIO!B4*INICIO!A4)*2)*2, IF(INICIO!K16="SIM", (INICIO!B4*INICIO!A4)*2, IF(INICIO!K15="SIM", INICIO!B4*INICIO!A4)*2))`
- **F31**: Valor: 2 | Fórmula: `=SUM(F30/6)`

## CALHAS CENTRO
- **B32**: Valor: 42 | Fórmula: `=IF(AND(INICIO!K16<>"SEM COBERTURA", B72>0), (B72*INICIO!C4)*2 ,0)`
- **F32**: Valor: 0 | Fórmula: `=IF(INICIO!C4>=100, 4, IF(INICIO!C4>=51, 2, 0))`

## ARCOS FRONTAIS
- **B33**: Valor: 61.6 | Fórmula: `=IF(AND(INICIO!K16<>"SEM COBERTURA", INICIO!K15="SIM"), ((((INICIO!B4*0.1)+INICIO!B4)*INICIO!A4)*2)*2,0)`
- **F33**: Valor: 0 | Fórmula: `=IF(INICIO!B4*INICIO!A4>=100,4, IF(INICIO!B4*INICIO!A4>=51,2,0))`

## LATERAIS INFERIORES
- **B34**: Valor: 42 | Fórmula: `=IF(OR(INICIO!K12="MURETA C/ PERFIL", INICIO!K12="LATERAL SIMPLES"), INICIO!C4*2,0)`

## FRONTAIS INFERIORES 
- **B35**: Valor: 28 | Fórmula: `=IF(OR(INICIO!K12="MURETA C/ PERFIL", INICIO!K12="LATERAL SIMPLES"),(INICIO!B4*INICIO!A4)*2,0)`
- **F35**: Valor: 2 | Fórmula: `=SUM(F31+F32+F33)`

## POSTES DOS CANTOS
- **B36**: Valor: 24 | Fórmula: `=SUM(4*INICIO!D4)*2`
- **F36**: Valor: 2 | Fórmula: `=IF(INICIO!K15="SIM", ROUNDUP(F35, 0),0)`

## PORTAS
- **B37**: Valor: 25 | Fórmula: `=IF(INICIO!K17>0,INICIO!K17*25,0)`

## POSTE DO ARCO DE DIVISA (SE TIVER)
- **B38**: Valor: 0 | Fórmula: `=IF(INICIO!K13>0,((INICIO!D4 *2)*2)* INICIO!K13,0)`

## ARCO DE DIVISA (SE TIVER)
- **B39**: Valor: 0 | Fórmula: `=IF(INICIO!K13>0, ((((INICIO!B4*0.1)+INICIO!B4)*2)*INICIO!A4)*INICIO!K13, 0)`

## MARGEM DE ERRO 10% ACIMA
- **B40**: Valor: 36.26 | Fórmula: `=SUM(B30:B39)*0.1`
- **A41**: Valor: 398.86 | Fórmula: `=SUM(B30:B40)`
- **B41**: Valor: 15.9544 | Fórmula: `=SUM(B30:B40)/25`
- **C41**: Valor: 16 | Fórmula: `=ROUNDUP(B41, 0)`

## LATERAL COM PERFIL
- **G45**: Valor: 28 | Fórmula: `=SUM(INICIO!B4*INICIO!A4)*2`

## LATERAL SUPERIOR 
- **B46**: Valor: #REF! | Fórmula: `=IF(#REF!="LATERAL DUPLA", "DUPLO", IF(#REF!="NÃO","SIMPLES"))`
- **C46**: Valor: 42 | Fórmula: `=IF(INICIO!K9="SIM", 0, (INICIO!C4*2))`
- **D46**: Valor: 7 | Fórmula: `=C46/6`
- **G46**: Valor: 42 | Fórmula: `=SUM(INICIO!C4*2)`

## FRENTE E FUNDO SUPERIOR 
- **B47**: Valor: #REF! | Fórmula: `=IF(#REF!="SIM", "DUPLO", IF(#REF!="NÃO","SIMPLES"))`
- **C47**: Valor: 28 | Fórmula: `=SUM((INICIO!B4*INICIO!A4)*2)`
- **D47**: Valor: 4.666666667 | Fórmula: `=C47/6`
- **G47**: Valor: 11.66666667 | Fórmula: `=SUM(G45+G46)/6`
- **C48**: Valor: 70 | Fórmula: `=SUM(C46:C47)`
- **D48**: Valor: 11.66666667 | Fórmula: `=C48/6`
- **G48**: Valor: 0 | Fórmula: `=IF(AND(INICIO!K15="SIM", INICIO!K9="CALHA"), ROUNDUP(G47, 0),0)`

## LATERAIS INFERIOR 
- **C49**: Valor: 42 | Fórmula: `=IF(INICIO!K9="SIM", 0, (INICIO!C4*2))`
- **D49**: Valor: 7 | Fórmula: `=C49/6`

## FRENTE E FUNDO INFERIOR
- **C50**: Valor: 28 | Fórmula: `=IF(INICIO!K9="SIM", 0, ((INICIO!B4*INICIO!A4)*2))`
- **D50**: Valor: 4.666666667 | Fórmula: `=C50/6`
- **C51**: Valor: 70 | Fórmula: `=SUM(C49:C50)`
- **D51**: Valor: 11.66666667 | Fórmula: `=C51/6`

## LATERAIS
- **B65**: Valor: 0 | Fórmula: `=IF(INICIO!K9="CALHA", (INICIO!C4/3-1)*2, 0)`
- **F65**: Valor: 16 | Fórmula: `=IF(INICIO!K9<>"CALHA",(INICIO!C4/3+1)*2, 0)`
- **B67**: Valor: 0 | Fórmula: `=(B65)`
- **F67**: Valor: 16 | Fórmula: `=(F65)`

## LATERAIS 
- **C71**: Valor: 0 | Fórmula: `=IF(INICIO!K9="SIM", INICIO!C4*2,0)`
- **F71**: Valor: 6 | Fórmula: `=IF(INICIO!A4>1,(INICIO!C4/3+1-2)*(INICIO!A4-1),0)`
- **B72**: Valor: 1 | Fórmula: `=IF(INICIO!A4>1, INICIO!A4-1,0)`
- **C72**: Valor: 21 | Fórmula: `=IF(INICIO!A4>1, (INICIO!A4-1)*INICIO!C4,0)`
- **C73**: Valor: 21 | Fórmula: `=SUM(C71+C72)`
- **F73**: Valor: 6 | Fórmula: `=F71`
- **C74**: Valor: 3.5 | Fórmula: `=FLOOR(C73/6, 0.5)`

## FIREITA
- **B80**: Valor: 1 | Fórmula: `=IF(INICIO!A4>1,INICIO!A4-1,0)`
- **F80**: Valor: 1 | Fórmula: `=IF(INICIO!A4>1,INICIO!A4-1,0)`

## QUANIDADE DE SAIDAS
- **B85**: Valor: 0 | Fórmula: `=IF(INICIO!C4<51,0,(INT((INICIO!C4-51)/30)+1)*(INICIO!A4+1))`
- **E85**: Valor: 5.25 | Fórmula: `=SUM((INICIO!C4/12)*(INICIO!A4+1))`
- **F85**: Valor: 6 | Fórmula: `=ROUNDUP(E85, 0)`
- **B86**: Valor: 0 | Fórmula: `=B85`
- **F88**: Valor: 6 | Fórmula: `=F85`

## ARCO FRONTAL 
- **B99**: Valor: 0 | Fórmula: `=IF(AND(INICIO!K7="LANTERNIN", INICIO!K8="NÃO"), 6,
 IF(AND(INICIO!K7="LANTERNIN", INICIO!K8="SIM"), 4,
 IF(AND(INICIO!K7="DUPLO", INICIO!K8="NÃO"), 4,
 IF(AND(INICIO!K7="DUPLO", INICIO!K8="SIM"), 2,
 IF(AND(INICIO!K7="LEVE", INICIO!K8="NÃO"), 2,
 IF(AND(INICIO!K7="LEVE", INICIO!K8="SIM"), 2,
 0))))))`
- **F99**: Valor: 0 | Fórmula: `=IF(AND(INICIO!K8="EUCALIPTO", INICIO!K9="LATERAL SIMPLES"), (2*(INICIO!C4/3-1))*(INICIO!A4+1),
 IF(AND(INICIO!K8="EUCALIPTO", INICIO!K9="LATERAL DUPLA"), (2*(INICIO!C4/3-1))*(INICIO!A4+1),
 IF(AND(INICIO!K8="EUCALIPTO", INICIO!K19="COMPLETO"), (2*(INICIO!C4/3-1))*(INICIO!A4+1),
 IF(AND(INICIO!K8="EUCALIPTO", INICIO!K19="APENAS INTERNO"), (2*(INICIO!C4/3-1))*(INICIO!A4+1),
 IF(AND(INICIO!K8="EUCALIPTO", INICIO!K19="SEM CABO DE AÇO"), (INICIO!C4/3-1)*(INICIO!A4+1),
 0)))))`
- **B123**: Valor: 24 | Fórmula: `=IF(INICIO!K7="LANTERNIN", 20*C5, IF(INICIO!K7="DUPLO", 7*C5, IF(INICIO!K7="LEVE", 6*C5,0)))`

## POSTES LINHA LATERAL
- **B101**: Valor: 0 | Fórmula: `=IF(INICIO!K10="NÃO",
   IF(AND(INICIO!K9="SIM", INICIO!K19="COMPLETO"), 4*((INICIO!C4/3-1)*2),
   IF(AND(INICIO!K9="SIM", INICIO!K19="APENAS INTERNO"), 3*((INICIO!C4/3-1)*2),
   IF(AND(INICIO!K9="NÃO", INICIO!K19="COMPLETO"), 4*((INICIO!C4/3-1)*2),
   IF(AND(INICIO!K9="NÃO", INICIO!K19="APENAS INTERNO"), 4*((INICIO!C4/3-1)*2),
   IF(AND(INICIO!K9="SIM", INICIO!K19="SEM CABO DE AÇO"), 2*((INICIO!C4/3-1)*2),
   0))))),)`
- **F101**: Valor: 0 | Fórmula: `=IF(
  OR(INICIO!K8="EUCALIPTO", INICIO!K10="SIM"),
  IF(
    INICIO!A4>1,
    IF(
      INICIO!K19="COMPLETO",
      ((INICIO!A4-1)*2)*3,
      (INICIO!A4-1)*2
    ),
    0
  ),
  0
)`

## POSTES LINHA CENTRAL
- **B102**: Valor: 44 | Fórmula: `=IF(INICIO!K10="NÃO", IF(AND(INICIO!A4>1, INICIO!K19="SEM CABO DE AÇO"), 2*((INICIO!C4/3-1)*INICIO!A4-1), IF(AND(INICIO!A4>1, INICIO!K19="COMPLETO"), 4*((INICIO!C4/3-1)*INICIO!A4-1), IF(AND(INICIO!A4>1, INICIO!K19="APENAS INTERNO "), 4*((INICIO!C4/3-1)*INICIO!A4-1),0))),0)`
- **F102**: Valor: false | Fórmula: `=IF(OR(INICIO!K8="EUCALIPTO", INICIO!K11="SIM"), IF(INICIO!K19="COMPLETO",C14*4,C14*2))`

## POSTES CONTO
- **B103**: Valor: 8 | Fórmula: `=IF(INICIO!K10="NÃO", IF(AND(INICIO!K9="SIM", INICIO!K19="COMPLETO"), 3*4, 2*4), 0)`
- **F103**: Valor: 0 | Fórmula: `=IF(OR(INICIO!K8="EUCALIPTO", INICIO!K10="SIM"),4,0)`

## CALHAS LATERIAS POSTES INTERNOS 
- **B106**: Valor: 0 | Fórmula: `=IF(INICIO!K9="SIM",((INICIO!C4/3-1)*2)*8,0)`
- **F106**: Valor: false | Fórmula: `=IF(OR(INICIO!K8="EUCALIPTO", INICIO!K10="SIM"), (C13+C14)*2)`

## CALHAS MEIO POSTES INTERNOS 
- **B107**: Valor: 48 | Fórmula: `=IF(INICIO!A4>1,((INICIO!C4/3-1)*(INICIO!A4-1))*8,0)`

## ENTRADA E SAIDA DE CALHA LATERAL
- **B108**: Valor: 0 | Fórmula: `=IF(INICIO!K9="SIM", 4*4,0)`
- **F108**: Valor: 0 | Fórmula: `=SUM(F99:F106)`

## ENTRADA E SAIDA DE CALHA MEIO
- **B109**: Valor: 8 | Fórmula: `=IF(INICIO!A4>1,((INICIO!A4-1)*2)*4,0)`
- **F109**: Valor: 0 | Fórmula: `=ROUNDUP((F99+F100+F101+F102+F103+F104+F105+F106)/5, 0)`

## CONTRAVENTO 
- **B110**: Valor: 0 | Fórmula: `=IF(AND(INICIO!B4>4, INICIO!K8="SIM"),B22*1, IF(AND(INICIO!B4>4, INICIO!K8="NÃO"),B22*2,0))`
- **F110**: Valor: 0 | Fórmula: `=SUM(F109*10)`

## ARCO DE DIVISA
- **B111**: Valor: false | Fórmula: `=IF(INICIO!K13>0,INICIO!K13*4)`

## 10% A MAIS
- **B112**: Valor: 12.8 | Fórmula: `=SUM(B99:B111)*0.1`
- **A114**: Valor: 140.8 | Fórmula: `=SUM(B99:B113)`
- **B114**: Valor: 5.632 | Fórmula: `=(A114/25)`
- **C114**: Valor: 6 | Fórmula: `=ROUNDUP(B114, 0)`

## EMENDA DA DORSAL
- **B125**: Valor: 12 | Fórmula: `=IF(OR(INICIO!K7="DUPLO", INICIO!K7="LEVE"), G14*2,0)`

## LATERAL SUPERIOR
- **B126**: Valor: 0 | Fórmula: `=IF(INICIO!K9="NÃO", (INICIO!C4/3+1)*2,0)`

## FRONTAL  SUPERIOR (POSTE AÇO)
- **B127**: Valor: 0 | Fórmula: `=IF(INICIO!K8="NÃO", C13+C14,0)`

## LATERAL INFERIOR (POSTE AÇO)
- **B128**: Valor: 0 | Fórmula: `=IF(AND(INICIO!K8="NÃO",INICIO!K12="LATERAL SIMPLES"),(INICIO!C4/3+1)*2,0)`

## FRONTAL INFERIOR (POSTEAÇO)
- **B129**: Valor: 0 | Fórmula: `=IF(AND(INICIO!K8<>"EUCALIPTO", INICIO!K12="LATERAL SIMPLES"), C13+C14,0)`
- **B131**: Valor: 84 | Fórmula: `=SUM(B123:B130)`
- **C131**: Valor: 4 | Fórmula: `=ROUNDUP(B131/25, 0)`

## INTERNO
- **B146**: Valor: 48 | Fórmula: `=IF(INICIO!K19="COMPLETO", F159*4, IF(INICIO!K19="APENAS INTERNO ",F159*4,0))`
- **F146**: Valor: 12 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!C4/3-1)*2,0)`
- **B159**: Valor: 12 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!C4/3-1)*INICIO!A4, IF(INICIO!K19="APENAS INTERNO ",(INICIO!C4/3-1)*INICIO!A4,0))`
- **F159**: Valor: 12 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!C4/3-1)*INICIO!A4, IF(INICIO!K19="APENAS INTERNO ",(INICIO!C4/3-1)*INICIO!A4,0))`
- **G159**: Valor: 96 | Fórmula: `=IF(B4=10,11*F159, IF(B4=8,9*F159, IF(B4=7,8*F159)))`
- **B175**: Valor: 24 | Fórmula: `=IF(INICIO!K19="COMPLETO", F159*2, IF(INICIO!K19="APENAS INTERNO ",F159*2,0))`
- **F175**: Valor: 23 | Fórmula: `=IF(INICIO!K16<>"SEM COBERTURA", IF(INICIO!K13>0,(INICIO!C4+2)+INICIO!K13*2,INICIO!C4+2),0)`

## EXT LATERAL
- **B147**: Valor: 48 | Fórmula: `=IF(INICIO!K19="COMPLETO", F160*4,0)`
- **F147**: Valor: 2 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!A4-1)*2,0)`
- **B160**: Valor: 12 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!C4/3-1)*2,0)`
- **F160**: Valor: 12 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!C4/3-1)*2,0)`
- **G160**: Valor: 60 | Fórmula: `=IF(INICIO!D4=5,7*F160, IF(INICIO!D4=4,6*F160, IF(INICIO!D4=3,5*F160)))`
- **B176**: Valor: 24 | Fórmula: `=IF(INICIO!K19="COMPLETO", F160*2,0)`

## EXT FRONTAL BAIXO
- **B148**: Valor: 8 | Fórmula: `=IF(INICIO!K19="COMPLETO", F161*4,0)`
- **F148**: Valor: 8 | Fórmula: `=IF(INICIO!K19="COMPLETO", 8,0)`
- **B161**: Valor: 2 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!A4-1)*2,0)`
- **F161**: Valor: 2 | Fórmula: `=IF(INICIO!K19="COMPLETO", (INICIO!A4-1)*2,0)`
- **G161**: Valor: 10 | Fórmula: `=IF(INICIO!D4=5,7*F161, IF(INICIO!D4=4,6*F161, IF(INICIO!D4=3,5*F161)))`
- **B177**: Valor: 4 | Fórmula: `=IF(INICIO!K19="COMPLETO", F161*2,0)`

## EXT CANTO 
- **B149**: Valor: 32 | Fórmula: `=IF(INICIO!K19="COMPLETO", F162*4,0)`
- **F149**: Valor: 4 | Fórmula: `=IF(INICIO!K19="COMPLETO", C14,0)`
- **B162**: Valor: 8 | Fórmula: `=IF(INICIO!K19="COMPLETO", 8,0)`
- **F162**: Valor: 8 | Fórmula: `=IF(INICIO!K19="COMPLETO", 8,0)`
- **G162**: Valor: 40 | Fórmula: `=IF(INICIO!D4=5,7*F162, IF(INICIO!D4=4,6*F162, IF(INICIO!D4=3,5*F162)))`
- **B178**: Valor: 8 | Fórmula: `=IF(INICIO!K19="COMPLETO", F162,0)`

## EXT FRONTAL TOPO
- **B150**: Valor: 16 | Fórmula: `=IF(INICIO!K19="COMPLETO", F163*4,0)`
- **F150**: Valor: 26 | Fórmula: `=SUM(F146:F149)`
- **B163**: Valor: 4 | Fórmula: `=IF(INICIO!K19="COMPLETO", C14,0)`
- **F163**: Valor: 4 | Fórmula: `=IF(INICIO!K19="COMPLETO", C14,0)`
- **G163**: Valor: 32 | Fórmula: `=IF(INICIO!D4=5,10*F163, IF(INICIO!D4=4,8*F163, IF(INICIO!D4=3,8*F163)))`
- **B179**: Valor: 4 | Fórmula: `=IF(INICIO!K19="COMPLETO", F163,0)`

## X ENTRE OS POSTES
- **B151**: Valor: 0 | Fórmula: `=IF(INICIO!K20>0,F164*4,0)`
- **B152**: Valor: 152 | Fórmula: `=SUM(B146:B151)`
- **B164**: Valor: 0 | Fórmula: `=IF(INICIO!K20>0,(INICIO!A4+1)*INICIO!K20,0)`
- **F164**: Valor: 0 | Fórmula: `=IF(INICIO!K20>0,(INICIO!A4+1)*INICIO!K20,0)`
- **G164**: Valor: 0 | Fórmula: `=IF(INICIO!D4=5,(7*2)*F164, IF(INICIO!D4=4,(6*2)*F164, IF(INICIO!D4=3,(5*2)*F164)))`
- **B166**: Valor: 38 | Fórmula: `=SUM(B159:B165)`
- **G167**: Valor: 238 | Fórmula: `=SUM(G158:G166)`
- **B180**: Valor: 0 | Fórmula: `=IF(INICIO!K20>0,F164*2,0)`
- **B182**: Valor: 64 | Fórmula: `=SUM(B175:B181)`
- **F184**: Valor: 44 | Fórmula: `=IF(INICIO!K15="SIM", IF(INICIO!K13>0, ((INICIO!C4+1)*2)+(INICIO!K13*2),(INICIO!C4+1)*2),0)`
- **F185**: Valor: 15 | Fórmula: `=IF(INICIO!K15="SIM",
   IF(INICIO!A4*INICIO!B4>=100, (INICIO!A4*INICIO!B4+4),
   IF(INICIO!A4*INICIO!B4>=80,  (INICIO!A4*INICIO!B4+3),
   IF(INICIO!A4*INICIO!B4>=51,  (INICIO!A4*INICIO!B4+2),
                                (INICIO!A4*INICIO!B4+1)))),
0)`
- **F186**: Valor: 15 | Fórmula: `=IF(INICIO!K15="SIM",
   IF(INICIO!A4*INICIO!B4>=100, (INICIO!A4*INICIO!B4+4),
   IF(INICIO!A4*INICIO!B4>=80,  (INICIO!A4*INICIO!B4+3),
   IF(INICIO!A4*INICIO!B4>=51,  (INICIO!A4*INICIO!B4+2),
                                (INICIO!A4*INICIO!B4+1)))),
0)`
- **B201**: Valor: TELA OPTINET 40 MESH GINEGAR (5 METROS) | Fórmula: `=IF(NOT(ISBLANK(INICIO!I25)), INICIO!I25, INICIO!I26)`
- **C201**: Valor: 3 | Fórmula: `=INICIO!D4`
- **D201**: Valor: 5 | Fórmula: `=IFERROR(VLOOKUP(B201, 'BD-TELAS'!B:C, 2, FALSE), "")`
- **E201**: Valor: 42 | Fórmula: `=2 * INICIO!B4 * INICIO!D4`
- **F201**: Valor: 0 | Fórmula: `=IF(C201 > D201, ROUNDUP(C201 / D201, 0) - 1, 0)`
- **G201**: Valor: 21.56 | Fórmula: `=IFERROR(VLOOKUP(B201, 'BD-TELAS'!B:G, 6, FALSE), "")`
- **H201**: Valor: 905.52 | Fórmula: `=E201 * G201`
- **I201**: Valor: 0 | Fórmula: `=F201 * E201 * 2.5`
- **J201**: Valor: 905.52 | Fórmula: `=H201 + I201`
- **B202**: Valor: TELA OPTINET 40 MESH GINEGAR (5 METROS) | Fórmula: `=IF(NOT(ISBLANK(INICIO!I25)), INICIO!I25, INICIO!I27)`
- **C202**: Valor: 3 | Fórmula: `=INICIO!D4`
- **D202**: Valor: 5 | Fórmula: `=IFERROR(VLOOKUP(B202, 'BD-TELAS'!B:C, 2, FALSE), "")`
- **E202**: Valor: 63 | Fórmula: `=INICIO!C4 * INICIO!D4`
- **F202**: Valor: 0 | Fórmula: `=IF(C202 > D202, ROUNDUP(C202 / D202, 0) - 1, 0)`
- **G202**: Valor: 21.56 | Fórmula: `=IFERROR(VLOOKUP(B202, 'BD-TELAS'!B:G, 6, FALSE), "")`
- **H202**: Valor: 1358.28 | Fórmula: `=E202 * G202`
- **I202**: Valor: 0 | Fórmula: `=F202 * E202 * 2.5`
- **J202**: Valor: 1358.28 | Fórmula: `=H202 + I202`
- **B203**: Valor: TELA OPTINET 40 MESH GINEGAR (5 METROS) | Fórmula: `=IF(NOT(ISBLANK(INICIO!I25)), INICIO!I25, INICIO!I28)`
- **C203**: Valor: 3 | Fórmula: `=INICIO!D4`
- **D203**: Valor: 5 | Fórmula: `=IFERROR(VLOOKUP(B203, 'BD-TELAS'!B:C, 2, FALSE), "")`
- **E203**: Valor: 63 | Fórmula: `=INICIO!C4 * INICIO!D4`
- **F203**: Valor: 0 | Fórmula: `=IF(C203 > D203, ROUNDUP(C203 / D203, 0) - 1, 0)`
- **G203**: Valor: 21.56 | Fórmula: `=IFERROR(VLOOKUP(B203, 'BD-TELAS'!B:G, 6, FALSE), "")`
- **H203**: Valor: 1358.28 | Fórmula: `=E203 * G203`
- **I203**: Valor: 0 | Fórmula: `=F203 * E203 * 2.5`
- **J203**: Valor: 1358.28 | Fórmula: `=H203 + I203`
- **B204**: Valor: TELA OPTINET 40 MESH GINEGAR (5 METROS) | Fórmula: `=IF(NOT(ISBLANK(INICIO!I25)), INICIO!I25, INICIO!I29)`
- **C204**: Valor: 3 | Fórmula: `=INICIO!D4`

