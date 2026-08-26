"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function syncParametrosArcoforte() {
    try {
        const supabase = await createClient()

        const devParams = [
            { "nome_tecnico": "n_modulos", "rotulo": "Número de Módulos", "tipo": "numero", "opcoes": null, "ativo": true },
            { "nome_tecnico": "largura_modulo", "rotulo": "Largura do Módulo (m)", "tipo": "selecao", "opcoes": JSON.stringify(["7","8","10"]), "ativo": true },
            { "nome_tecnico": "n_vaos", "rotulo": "Número de Vãos", "tipo": "numero", "opcoes": null, "ativo": true },
            { "nome_tecnico": "vao", "rotulo": "Tamanho do Vão (m)", "tipo": "selecao", "opcoes": JSON.stringify(["3","4"]), "ativo": true },
            { "nome_tecnico": "pe_direito", "rotulo": "Pé-Direito (m)", "tipo": "selecao", "opcoes": JSON.stringify(["3","4","5"]), "ativo": true },
            { "nome_tecnico": "fechamento_lateral", "rotulo": "Fechamento Lateral", "tipo": "booleano", "opcoes": null, "ativo": true },
            { "nome_tecnico": "portas_correr", "rotulo": "Qtd Portas (Correr)", "tipo": "numero", "opcoes": null, "ativo": true },
            { "nome_tecnico": "calha_lateral", "rotulo": "Qual é a fixação superior?", "tipo": "selecao", "opcoes": JSON.stringify(["CALHA","LATERAL DUPLA","LATERAL SIMPLES"]), "ativo": true },
            { "nome_tecnico": "modelo_cabo", "rotulo": "Modelo Cabo de Aço", "tipo": "selecao", "opcoes": JSON.stringify(["COMPLETO","INTERNOS","LATERAL 1","LATERAL 2","FRONTAIS"]), "ativo": true },
            { "nome_tecnico": "tipo_poste", "rotulo": "Tipo de Poste", "tipo": "selecao", "opcoes": JSON.stringify(["100X50 GALVANIZADO","75X40 GALVANIZADO","EUCALIPTO"]), "ativo": true },
            { "nome_tecnico": "postes_frontais_duplos", "rotulo": "Postes Frontais e Canto Baixos (Frente/Fundo) Duplos?", "tipo": "booleano", "opcoes": null, "ativo": true },
            { "nome_tecnico": "postes_topo_duplos", "rotulo": "Postes Frontais Topo Duplos?", "tipo": "booleano", "opcoes": null, "ativo": true },
            { "nome_tecnico": "postes_divisa_duplos", "rotulo": "Os postes da divisa são duplos?", "tipo": "booleano", "opcoes": null, "ativo": true },
            { "nome_tecnico": "possui_anticamara", "rotulo": "Possui Anticâmara?", "tipo": "booleano", "opcoes": null, "ativo": true },
            { "nome_tecnico": "tipo_cobertura", "rotulo": "Tipo de Cobertura", "tipo": "selecao", "opcoes": JSON.stringify(["FILME","SEM COBERTURA","TELA"]), "ativo": true },
            { "nome_tecnico": "fixacao_inferior", "rotulo": "Tem Fixação Inferior?", "tipo": "booleano", "opcoes": null, "ativo": true },
            { "nome_tecnico": "tipo_fixacao_inferior", "rotulo": "Qual é a fixação inferior?", "tipo": "selecao", "opcoes": JSON.stringify(["LATERAL SIMPLES", "MURETA", "ENTERRADA"]), "ativo": true },
            { "nome_tecnico": "arco_divisa", "rotulo": "Tem Arco de Divisa?", "tipo": "booleano", "opcoes": null, "ativo": true },
            { "nome_tecnico": "tipo_arco", "rotulo": "Tipo de Arco", "tipo": "selecao", "opcoes": JSON.stringify(["SIMPLES", "DUPLO", "LANTERNIM"]), "ativo": true },
            { "nome_tecnico": "travamentos_x", "rotulo": "Nº de Travamentos em X (por vão)", "tipo": "numero", "opcoes": null, "ativo": true },
        ];

        let count = 0;

        for (const param of devParams) {
            const { data: exists } = await supabase.from('parametros_estufa').select('id').eq('nome_tecnico', param.nome_tecnico).single();

            if (exists) {
                await supabase.from('parametros_estufa').update({
                    rotulo: param.rotulo,
                    tipo: param.tipo,
                    opcoes: param.opcoes,
                    ativo: param.ativo,
                }).eq('id', exists.id);
            } else {
                await supabase.from('parametros_estufa').insert(param as any);
            }
            count++;
        }

        const nomesValidos = devParams.map(p => p.nome_tecnico);
        await supabase.from('parametros_estufa').delete().not('nome_tecnico', 'in', `(${nomesValidos.join(',')})`);

        revalidatePath('/admin/parametros')
        revalidatePath('/orcamentos/novo')
        
        return { success: true, message: `Foram sincronizados ${count} parâmetros com sucesso!` }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function seedParametrosFromMD(formData: FormData) {
    try {
        const supabase = await createClient()

        const file = formData.get('file') as File
        if (!file) throw new Error("Nenhum arquivo enviado")

        const fileContent = await file.text()
        const lines = fileContent.split('\n')
        
        const devParams = [
            { "nome_tecnico": "n_modulos", "rotulo": "Número de Módulos", "tipo": "numero", "opcoes": null, "ativo": true },
            { "nome_tecnico": "largura_modulo", "rotulo": "Largura do Módulo (m)", "tipo": "selecao", "opcoes": JSON.stringify(["7","8","10"]), "ativo": true },
            { "nome_tecnico": "n_vaos", "rotulo": "Número de Vãos", "tipo": "numero", "opcoes": null, "ativo": true },
            { "nome_tecnico": "vao", "rotulo": "Tamanho do Vão (m)", "tipo": "selecao", "opcoes": JSON.stringify(["3","4"]), "ativo": true },
            { "nome_tecnico": "pe_direito", "rotulo": "Pé-Direito (m)", "tipo": "selecao", "opcoes": JSON.stringify(["3","4","5"]), "ativo": true }
        ];

        const params: any[] = [...devParams];
        let isTable = false

        for (let line of lines) {
            line = line.trim()
            if (line.startsWith('| nome_tecnico |')) {
                isTable = true
                continue
            }
            if (isTable && line.startsWith('|---')) continue
            
            if (isTable && line.startsWith('|') && !line.startsWith('|-')) {
                const parts = line.split('|').map(p => p.trim())
                if (parts.length >= 5) {
                    const nome_tecnico = parts[1]
                    const rotulo = parts[2]
                    const tipoRaw = parts[3].toLowerCase()
                    
                    let tipo = 'numero'
                    if (tipoRaw.includes('sele')) tipo = 'selecao'
                    else if (tipoRaw.includes('bool') || tipoRaw.includes('check')) tipo = 'booleano'
                    
                    let opcoes = null
                    if (tipo === 'selecao' && parts[4] && parts[4] !== '—' && parts[4] !== '-') {
                        opcoes = JSON.stringify(parts[4].split(',').map(s => s.trim()))
                    }

                    if (nome_tecnico) {
                        params.push({
                            nome_tecnico,
                            rotulo,
                            tipo,
                            opcoes,
                            ativo: true
                        })
                    }
                }
            } else if (isTable && line === '') {
                isTable = false
            }
        }

        if (params.length === 0) {
            throw new Error("Nenhum parâmetro encontrado na tabela do arquivo.")
        }

        let count = 0;
        for (const param of params) {
            const { data: exists } = await supabase.from('parametros_estufa').select('id').eq('nome_tecnico', param.nome_tecnico).single();

            if (exists) {
                await supabase.from('parametros_estufa').update({
                    rotulo: param.rotulo,
                    tipo: param.tipo,
                    opcoes: param.opcoes,
                    ativo: param.ativo,
                }).eq('id', exists.id);
            } else {
                await supabase.from('parametros_estufa').insert(param as any);
            }
            count++;
        }

        revalidatePath('/admin/parametros')
        revalidatePath('/orcamentos/novo')
        
        return { success: true, message: `Foram carregados ${count} parâmetros do arquivo markdown com sucesso!` }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
