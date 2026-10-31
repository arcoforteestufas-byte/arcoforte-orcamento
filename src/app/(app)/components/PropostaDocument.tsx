import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Svg, Polygon } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 65,
    paddingHorizontal: 35,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  pageCapa: {
    padding: 0,
    fontFamily: 'Helvetica',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
  },
  watermarkBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.15,
    objectFit: 'contain',
  },
  logoWatermark: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    width: '80%',
    opacity: 0.05,
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  capaContainer: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    width: 350,
  },
  capaTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  capaText: {
    fontSize: 13,
    marginBottom: 5,
    color: '#ffffff',
    lineHeight: 1.4,
  },
  capaRedText: {
    fontSize: 13,
    marginBottom: 5,
    color: '#ff2222',
    fontWeight: 'bold',
    lineHeight: 1.4,
  },
  capaLabel: {
    fontWeight: 'bold',
  },
  logoCapa: {
    position: 'absolute',
    top: 30,
    right: 30,
    width: 250,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 35,
    right: 35,
    textAlign: 'center',
    fontSize: 8,
    color: '#888888',
    fontWeight: 'normal',
    lineHeight: 1.2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.5,
  },
  orangeLetter: {
    color: '#d97021',
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginBottom: 15,
    marginTop: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderTop: '1pt solid #000',
    borderBottom: '1pt solid #000',
    borderLeft: '1pt solid #000',
    borderRight: '1pt solid #000',
    marginTop: -1,
  },
  tableHeader: {
    fontWeight: 'bold',
  },
  tableCol: {
    borderRight: '1pt solid #000',
    padding: 5,
    justifyContent: 'center',
  },
  col1: { width: '10%', textAlign: 'center' },
  col2: { width: '45%' },
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '15%', textAlign: 'center' },
  col5: { width: '15%', textAlign: 'center' },
  
  colFrente1: { width: '70%', textAlign: 'center', fontWeight: 'bold' },
  colFrente2: { width: '30%', textAlign: 'center', fontWeight: 'bold' },

  totalRow: {
    flexDirection: 'row',
    fontWeight: 'bold',
    borderTop: '1pt solid #000',
    borderBottom: '1pt solid #000',
    borderLeft: '1pt solid #000',
    borderRight: '1pt solid #000',
    marginTop: -1,
  },
  totalLabel: {
    width: '85%',
    textAlign: 'center',
    paddingRight: 10,
    borderRight: '1pt solid #000',
    padding: 5,
  },
  totalValue: {
    width: '15%',
    textAlign: 'center',
    padding: 5,
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  signatureLine: {
    width: '45%',
    borderTop: '1pt solid #000',
    textAlign: 'center',
    paddingTop: 5,
  }
});

const Footer = () => (
  <Text style={styles.footer} fixed>
    ARCO FORTE ESTUFAS AGRÍCOLAS{'\n'}
    AVENIDA PEDRO LUDOVICO, QD A LT 14 A JARDIM ANA CLAUDIA, ANÁPOLIS-GO CEP 75135866{'\n'}
    CONTATO: RONILSON 62 992801691 ELIÉZER 62 992493471{'\n'}
    INSTAGRAM @ARCOFORTE E-MAIL ARCOFORTEESTUFAS@GMAIL.COM
  </Text>
);

const Watermark = () => (
  <Image src="/assets/logo-arcoforte.png" style={styles.logoWatermark} fixed />
);




export function PropostaDocument({ dados }: { dados: any }) {
  return (
    <Document>
      {/* PÁGINA 1: CAPA */}
      <Page size="A4" style={styles.pageCapa}>
        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
          <Image style={styles.bgImage} src={dados.configuracoes?.capa_pdf_url || "/assets/capa-estufa.jpg"} />
          
          <View style={styles.svgLayer}>
            <Svg viewBox="0 0 595 842" style={{ width: '100%', height: '100%' }}>
              <Polygon points="0,350 595,650 595,842 0,842" fill="#0a3a2a" />
              <Polygon points="400,842 595,550 595,842" fill="#ff5722" />
            </Svg>
          </View>
          
          <Image style={styles.logoCapa} src="/assets/logo-arcoforte.png" />

          <View style={styles.capaContainer}>
            <Text style={styles.capaTitle}>PROPOSTA</Text>
            <Text style={styles.capaText}>Arco forte:{'\n'}ARCOFORTE ESTRUTURAS AGRÍCOLAS{'\n'}CNPJ: 35.582.236/0001-68</Text>
            <Text style={[styles.capaText, { marginTop: 10 }]}>{dados.cabecalho.vendedorNome}</Text>
            <Text style={styles.capaText}>{dados.cabecalho.vendedorTelefone}</Text>
            <Text style={styles.capaRedText}>Nº do Pedido: {dados.cabecalho.orcamentoId}</Text>
            <Text style={styles.capaText}>Data: {dados.cabecalho.dataEmissao}</Text>
            <Text style={styles.capaRedText}>Validade: {dados.cabecalho.dataValidade}</Text>
            
            <View style={{ marginTop: 10 }}>
              <Text style={styles.capaText}><Text style={styles.capaLabel}>Contratante:</Text></Text>
              <Text style={styles.capaText}>Nome: {dados.cabecalho.clienteNome}</Text>
              <Text style={styles.capaText}>Contato: {dados.cabecalho.clienteContato}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* CONTEÚDO DA PROPOSTA (Fluxo contínuo) */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        {dados.configuracoes?.fundo_pdf_url && (
          <Image style={styles.watermarkBg} src={dados.configuracoes.fundo_pdf_url} fixed />
        )}
        <Footer />
        
        {/* FICHA TÉCNICA */}
        <Text style={styles.sectionTitle}>{dados.fichaTecnica.titulo}</Text>
        <Text style={styles.subTitle}>{dados.fichaTecnica.subtitulo}</Text>
        <Text style={styles.paragraph}>{dados.fichaTecnica.texto}</Text>
        
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, {width: '100%', textAlign: 'center', borderRight: 'none'}]}>DESCRIÇÃO DA ESTRUTURA E SUAS MEDIDAS</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={{ width: '50%', borderRight: '1pt solid #000' }}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCol, {width: '50%'}]}>ARCO FORTE DESCRIÇÃO</Text>
                <Text style={[styles.tableCol, {width: '25%'}]}>UNIT. (M)</Text>
                <Text style={[styles.tableCol, {width: '25%', borderRight: 'none'}]}>TOTAL</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, {width: '50%'}]}>LARGURA (L)</Text>
                <Text style={[styles.tableCol, {width: '25%'}]}>{dados.fichaTecnica.medidas.largura}</Text>
                <Text style={[styles.tableCol, {width: '25%', borderRight: 'none'}]}>{dados.fichaTecnica.medidas.larguraTotal} M</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, {width: '50%'}]}>COMPRIMENTO TOTAL (C)</Text>
                <Text style={[styles.tableCol, {width: '25%'}]}>{dados.fichaTecnica.medidas.comprimento}</Text>
                <Text style={[styles.tableCol, {width: '25%', borderRight: 'none'}]}>{dados.fichaTecnica.medidas.comprimentoTotal} M</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, {width: '50%'}]}>ALTURA LATERAL (A)</Text>
                <Text style={[styles.tableCol, {width: '25%'}]}>{dados.fichaTecnica.medidas.peDireito}</Text>
                <Text style={[styles.tableCol, {width: '25%', borderRight: 'none'}]}></Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, {width: '50%'}]}>ALTURA CENTRAL</Text>
                <Text style={[styles.tableCol, {width: '25%'}]}>{dados.fichaTecnica.medidas.alturaArco}</Text>
                <Text style={[styles.tableCol, {width: '25%', borderRight: 'none'}]}></Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, {width: '50%', borderBottom: 'none'}]}>ÁREA TOTAL (M2)</Text>
                <Text style={[styles.tableCol, {width: '25%', borderBottom: 'none'}]}></Text>
                <Text style={[styles.tableCol, {width: '25%', borderRight: 'none', borderBottom: 'none'}]}>{dados.fichaTecnica.medidas.areaTotal} M²</Text>
              </View>
            </View>
            <View style={{ width: '50%', justifyContent: 'center', alignItems: 'center' }}>
              <Image src={dados.fichaTecnica.croquiUrl || "/assets/capa-estufa.jpg"} style={{ width: '100%', height: 130, objectFit: 'contain', padding: 2 }} />
              <Text style={{ fontSize: 9, fontWeight: 'bold', textAlign: 'center' }}>IMAGEM MERAMENTE ILUSTRATIVA</Text>
            </View>
          </View>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, styles.colFrente1]}>NOSSAS ESTUFAS SÃO DE FACIL MONTAGEM, TUDO DE ENCAIXE.{'\n'}AX NA MONTAGEM COM VÍDEOS E MANUAIS DE MONTAGEM.</Text>
            <Text style={[styles.tableCol, styles.colFrente2, { borderRight: 'none' }]}>FRENTE E FUNDO DA ESTUFA</Text>
          </View>
          {dados.fichaTecnica.tabelaFrenteFundo.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCol, styles.colFrente1]}>{item.componente.toUpperCase()}</Text>
              <Text style={[styles.tableCol, styles.colFrente2, { borderRight: 'none' }]}>{item.especificacao.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* CARACTERÍSTICAS */}
        <Text style={styles.sectionTitle}>{dados.titulos?.caracteristicas || "Características da Estufa ArcoForte"}</Text>
        {dados.caracteristicasArray.map((p: string, i: number) => {
          // Destacar a primeira letra (A -, B -, etc)
          const match = p.match(/^([A-Z]\s?-|.[A-Z]\s?-)/);
          if (match) {
            const prefix = match[0];
            const rest = p.substring(prefix.length);
            return (
              <Text key={`carac-${i}`} style={styles.paragraph}>
                <Text style={styles.orangeLetter}>{prefix}</Text>{rest}
              </Text>
            );
          }
          return <Text key={`carac-${i}`} style={styles.paragraph}>{p}</Text>
        })}
        {/* REVESTIMENTOS E FINANCEIRO — mesmo estilo dos itens G/H acima (não é um título de seção novo) */}
        <Text style={styles.paragraph}>
          <Text style={styles.orangeLetter}>{dados.titulos?.revestimentos || "I - "}</Text>
          {!dados.titulos?.revestimentos && "REVESTIMENTOS"}
        </Text>
        <Text style={styles.paragraph}>•COBERTURAS: {dados.revestimentos.cobertura}</Text>
        <Text style={styles.paragraph}>• LATERAL: {dados.revestimentos.lateral}</Text>
        <Text style={styles.paragraph}>•FRONTAL: {dados.revestimentos.frontal}</Text>
        <Text style={styles.paragraph}>• MEIA LUA: {dados.revestimentos.meiaLua}</Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCol, { width: '55%' }]}>
              <Text>DESCRIÇÃO</Text>
              <Text>ESTUFA COMPLETA</Text>
            </View>
            <Text style={[styles.tableCol, { width: '15%', textAlign: 'center' }]}>QTD</Text>
            <Text style={[styles.tableCol, { width: '30%', textAlign: 'center', borderRight: 'none' }]}>VALOR</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.tableCol, { width: '55%', alignItems: 'center' }]}>
              <Text>{dados.fichaTecnica.subtitulo}</Text>
              <Text>{dados.fichaTecnica.medidas.areaTotal} M²</Text>
            </View>
            <Text style={[styles.tableCol, { width: '15%', textAlign: 'center' }]}>1</Text>
            <View style={[styles.tableCol, { width: '30%', alignItems: 'center', borderRight: 'none' }]}>
              <Text style={{ color: '#d97021', fontWeight: 'bold' }}>{dados.financeiro.valorEstruturaStr}</Text>
              <Text style={{ fontSize: 8 }}>*MONTAGEM NÃO INCLUSA*</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCol, { width: '55%' }]}>FRETE{dados.cabecalho.clienteCidade ? ` ATÉ A CIDADE (${dados.cabecalho.clienteCidade})` : ''}</Text>
            <Text style={[styles.tableCol, { width: '15%', textAlign: 'center' }]}>1</Text>
            <Text style={[styles.tableCol, { width: '30%', textAlign: 'center', borderRight: 'none' }]}>{dados.financeiro.freteStr}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VALOR TOTAL</Text>
            <Text style={[styles.totalValue, { color: '#d97021' }]}>{dados.financeiro.totalLiquidoStr}</Text>
          </View>
        </View>

        <Text style={[styles.paragraph, { fontWeight: 'bold' }]}>{dados.pagamento.finame}</Text>
        <Text style={styles.paragraph}>{dados.pagamento.varianteSelecionada}</Text>
        {/* CLÁUSULAS */}
        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>{dados.titulos?.clausulas || "Condições Gerais"}</Text>
        {dados.clausulasArray.map((p: string, i: number) => (
          <Text key={`clausulas-${i}`} style={styles.paragraph}>{p}</Text>
        ))}
        {/* RESPONSABILIDADES */}
        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>{dados.titulos?.responsabilidades || "RESPONSABILIDADES DAS PARTES:"}</Text>
        {dados.responsabilidadesPartesArray.map((p: string, i: number) => {
          // Subtítulos ("RESPONSABILIDADES DA CONTRATANTE" / "...DA ARCO FORTE") ficam centralizados e em negrito
          if (p === p.toUpperCase() && p.startsWith('RESPONSABILIDADES DA')) {
            return <Text key={`resp-${i}`} style={styles.subTitle}>{p}</Text>
          }
          const match = p.match(/^([A-Z]\s?-|.[A-Z]\s?-)/);
          if (match) {
            const prefix = match[0];
            const rest = p.substring(prefix.length);
            return (
              <Text key={`resp-${i}`} style={styles.paragraph}>
                <Text style={styles.orangeLetter}>{prefix}</Text>{rest}
              </Text>
            );
          }
          return <Text key={`resp-${i}`} style={styles.paragraph}>{p}</Text>
        })}
        {/* GARANTIAS + EXCLUSÕES (mesma seção contínua, igual à proposta padrão) */}
        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>{dados.titulos?.garantias || "GARANTIAS"}</Text>
        {dados.garantiasArray.map((p: string, i: number) => (
          <Text key={`garantia-${i}`} style={styles.paragraph}>{p}</Text>
        ))}
        {dados.exclusoesGarantiaArray.map((p: string, i: number) => (
          i === 0
            ? <Text key={`exclusao-${i}`} style={[styles.paragraph, styles.bold]}>{p}</Text>
            : <Text key={`exclusao-${i}`} style={styles.paragraph}>{p}</Text>
        ))}

        {/* Assinaturas */}
        <View style={styles.signatureContainer} wrap={false}>
          <View style={styles.signatureLine}>
            <Text>Vendedor (ArcoForte)</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>Assinatura do Cliente</Text>
            <Text style={{ fontSize: 8, marginTop: 5 }}>Local e Data: ___________________, ____/____/______</Text>
          </View>
        </View>

        <Text style={{ textAlign: 'center', marginTop: 40, fontSize: 16, fontWeight: 'bold', color: '#000' }}>
          DEUS É FIEL
        </Text>
      </Page>
    </Document>
  );
}
