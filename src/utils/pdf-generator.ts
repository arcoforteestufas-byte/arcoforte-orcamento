import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ItemOrcamento } from "./engine"

export function agruparItensOrcamento(itens: ItemOrcamento[]): ItemOrcamento[] {
  const map = new Map<string, ItemOrcamento>()

  for (const item of itens) {
    const key = `${item.grupo_id}_${item.produto_codigo}`
    const existing = map.get(key)
    if (existing) {
      existing.quantidade_final += item.quantidade_final
      existing.valor_total += item.valor_total
      existing.peso_bruto_total += (item.peso_bruto_total || 0)
      existing.peso_liquido_total += (item.peso_liquido_total || 0)
    } else {
      map.set(key, { ...item })
    }
  }

  const grouped = Array.from(map.values())
  return grouped.sort((a, b) => {
    if (a.grupo_nome < b.grupo_nome) return -1
    if (a.grupo_nome > b.grupo_nome) return 1
    if (a.produto_descricao < b.produto_descricao) return -1
    if (a.produto_descricao > b.produto_descricao) return 1
    return 0
  })
}

export function gerarPDFOrcamento(orcamento: any, itens: ItemOrcamento[], agrupado: boolean = true) {
  const doc = new jsPDF()
  const nomeCliente = orcamento.clientes?.nome || 'Não informado'
  
  // Cores da Marca
  const corPrimaria: [number, number, number] = [217, 112, 33] // Laranja ArcoForte
  
  // Cabeçalho Colorido
  doc.setFillColor(...corPrimaria)
  doc.rect(0, 0, 210, 25, 'F')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(`Orçamento ArcoForte`, 14, 17)
  
  // Info Básica
  let currentY = 35
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  
  // Bloco Para: Cliente
  doc.setFont('helvetica', 'bold')
  doc.text('Para:', 14, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(nomeCliente, 25, currentY)
  
  const docCliente = orcamento.clientes?.documento ? ` - Doc: ${orcamento.clientes.documento}` : ''
  const cidCliente = orcamento.clientes?.cidade_uf ? ` - ${orcamento.clientes.cidade_uf}` : ''
  doc.text(`${docCliente}${cidCliente}`, 14, currentY + 5)
  
  // Bloco Status / Data
  doc.setFont('helvetica', 'bold')
  doc.text(`Orçamento nº:`, 120, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${orcamento.id.split('-')[0].toUpperCase()}`, 150, currentY)
  
  doc.setFont('helvetica', 'bold')
  doc.text(`Emissão:`, 120, currentY + 5)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(orcamento.criado_em).toLocaleDateString('pt-BR'), 150, currentY + 5)
  
  if (orcamento.data_validade) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Validade:`, 120, currentY + 10)
    doc.setFont('helvetica', 'normal')
    const validadeFormatada = new Date(orcamento.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')
    doc.text(validadeFormatada, 150, currentY + 10)
  }

  currentY += 20

  // Descrição da proposta
  if (orcamento.descricao_proposta) {
    doc.setFont('helvetica', 'bold')
    doc.text('Descrição da Proposta:', 14, currentY)
    doc.setFont('helvetica', 'normal')
    const splitDesc = doc.splitTextToSize(orcamento.descricao_proposta, 180)
    doc.text(splitDesc, 14, currentY + 5)
    currentY += 10 + (splitDesc.length * 4)
  }

  // Tabela
  const itensParaProcessar = agrupado ? agruparItensOrcamento(itens) : itens
  const tableData: any[] = []
  const grupos = Array.from(new Set(itensParaProcessar.map(i => i.grupo_nome)))
  
  let totalPesoBruto = 0
  let totalPesoLiquido = 0

  for (const grupo of grupos) {
    tableData.push([
      { content: grupo.toUpperCase(), colSpan: 5, styles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' } }
    ])
    
    const itensDoGrupo = itensParaProcessar.filter(i => i.grupo_nome === grupo)
    
    for (const item of itensDoGrupo) {
      const valorTotal = isNaN(item.valor_total) ? 0 : item.valor_total
      const precoUnit = isNaN(item.preco_unitario) ? 0 : item.preco_unitario
      const pesoB = item.peso_bruto_total || 0
      const pesoL = item.peso_liquido_total || 0
      
      totalPesoBruto += pesoB
      totalPesoLiquido += pesoL

      const nomeExibicao = agrupado 
        ? `${item.produto_codigo} - ${item.produto_descricao}`
        : `${item.produto_codigo} - ${item.produto_descricao}\nLocal: ${item.posicao_nome}`

      tableData.push([
        nomeExibicao,
        `${item.quantidade_final} ${item.unidade}`,
        pesoB > 0 ? `${pesoB.toFixed(2)} kg` : '-',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoUnit),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)
      ])
    }
  }

  const subtotal = orcamento.valor_total || 0
  const desconto = Number(orcamento.desconto) || 0
  const frete = Number(orcamento.frete) || 0
  const outrasDespesas = Number(orcamento.outras_despesas) || 0
  const totalLiquido = subtotal - desconto + frete + outrasDespesas

  autoTable(doc, {
    startY: currentY,
    head: [['Material', 'Qtd', 'Peso Bruto', 'Valor Un.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: corPrimaria },
    styles: { fontSize: 8 },
    columnStyles: {
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 }
    }
  })

  currentY = (doc as any).lastAutoTable.finalY + 10

  // Resumo Financeiro
  doc.setFontSize(10)
  
  // Pesos
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo de Pesos', 14, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Peso Bruto Total: ${totalPesoBruto.toFixed(2)} kg`, 14, currentY + 6)
  doc.text(`Peso Líquido Total: ${totalPesoLiquido.toFixed(2)} kg`, 14, currentY + 12)

  // Financeiro
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo Financeiro', 120, currentY)
  doc.setFont('helvetica', 'normal')
  
  doc.text('Subtotal dos Itens:', 120, currentY + 6)
  doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal), 180, currentY + 6, { align: 'right' })
  
  if (desconto > 0) {
    doc.text('Desconto:', 120, currentY + 12)
    doc.setTextColor(220, 38, 38) // red
    doc.text(`- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(desconto)}`, 180, currentY + 12, { align: 'right' })
    doc.setTextColor(40, 40, 40)
  }
  
  if (frete > 0) {
    doc.text('Frete:', 120, currentY + 18)
    doc.text(`+ ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(frete)}`, 180, currentY + 18, { align: 'right' })
  }
  
  if (outrasDespesas > 0) {
    doc.text('Outras Despesas:', 120, currentY + 24)
    doc.text(`+ ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(outrasDespesas)}`, 180, currentY + 24, { align: 'right' })
  }
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...corPrimaria)
  doc.text('TOTAL LÍQUIDO:', 120, currentY + 32)
  doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLiquido), 180, currentY + 32, { align: 'right' })

  currentY += 45

  // Logística e Pagamento
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  
  if (orcamento.forma_pagamento || orcamento.tipo_frete || orcamento.endereco_entrega) {
    doc.setFont('helvetica', 'bold')
    doc.text('Condições Comerciais e Entrega', 14, currentY)
    doc.setFont('helvetica', 'normal')
    
    let logY = currentY + 6
    if (orcamento.forma_pagamento) {
      doc.text(`Forma de Pagamento: ${orcamento.forma_pagamento}`, 14, logY)
      logY += 5
    }
    if (orcamento.tipo_frete) {
      doc.text(`Tipo de Frete: ${orcamento.tipo_frete}`, 14, logY)
      logY += 5
    }
    if (orcamento.endereco_entrega) {
      doc.text(`Endereço de Entrega: ${orcamento.endereco_entrega}`, 14, logY)
    }
  }

  // Assinaturas no final
  if (currentY > 230) {
    doc.addPage()
    currentY = 20
  } else {
    currentY += 40
  }

  doc.line(14, currentY, 80, currentY)
  doc.text('Vendedor (ArcoForte)', 14, currentY + 5)

  doc.line(114, currentY, 190, currentY)
  doc.text('Assinatura do Cliente', 114, currentY + 5)
  doc.text(`Local e Data: ___________________, ____/____/______`, 114, currentY + 12)

  const fileName = `Orcamento_${nomeCliente ? nomeCliente.replace(/\s+/g, '_') : 'ArcoForte'}_${new Date().getTime()}.pdf`
  doc.save(fileName)
}
