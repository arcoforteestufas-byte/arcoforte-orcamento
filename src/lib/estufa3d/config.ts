import type { ParametrosEstufa } from "@/utils/engine"

/** Configuração que o simulador 3D entende (mesmos nomes do motor do site). */
export type ConfigEstufa3D = Record<string, unknown>

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}
const ligado = (v: unknown) => v === true || v === "true" || v === "SIM" || v === "sim"

/**
 * Converte os parâmetros de um orçamento (parametros_utilizados) na configuração do 3D.
 * Só leva o que o 3D sabe desenhar; o resto o vendedor ajusta no próprio simulador.
 */
export function configDoOrcamento(p: ParametrosEstufa | null | undefined): ConfigEstufa3D {
  if (!p) return {}
  const cfg: ConfigEstufa3D = {}

  const lm = num(p["largura_modulo"])
  if (lm > 0) cfg.Lm = Math.round(lm)
  const nM = num(p["n_modulos"])
  if (nM > 0) cfg.nM = Math.round(nM)
  const nV = num(p["n_vaos"])
  if (nV > 0) cfg.nV = Math.round(nV)
  const vao = num(p["vao"])
  if (vao > 0) cfg.vao = vao >= 3.5 ? 4 : 3
  const pd = num(p["pe_direito"])
  if (pd > 0) cfg.PD = pd

  const arco = String(p["tipo_arco"] || "").toLowerCase()
  if (["simples", "duplo", "lanternim"].includes(arco)) cfg.arco = arco

  const cob = String(p["tipo_cobertura"] || "").toLowerCase()
  if (cob) {
    cfg.cob = true
    cfg.cobm = cob.includes("tela") ? "tela" : "filme"
  }

  if ("fechamento_lateral" in p) {
    if (ligado(p["fechamento_lateral"])) {
      const mat = String(p["tipo_fechamento_material"] || "").toLowerCase()
      cfg.fech = mat === "filme" ? "filme" : "tela"
    } else {
      cfg.fech = "nao"
    }
  }

  const div = num(p["n_divisas_por_modulo"])
  if (ligado(p["arco_divisa"]) && div > 0) cfg.div = Math.round(div)

  // Portas: frente e fundo alternados, no módulo 1
  const doors: { t: string; l: string; m: number; a: boolean }[] = []
  const add = (t: string, qtd: number, a = false, lateral = false) => {
    for (let i = 0; i < qtd && doors.length < 8; i++) {
      const l = lateral ? (i % 2 ? "l2" : "l1") : (doors.length % 2 ? "b" : "f")
      doors.push({ t, l, m: 1, a })
    }
  }
  const antF = Math.round(num(p["anticamara_frontal"]))
  const antL = Math.round(num(p["anticamara_lateral"]))
  add("3033", Math.max(0, Math.round(num(p["portas_abrir"])) - antF - antL))
  add("3039", Math.round(num(p["portas_correr_pequena"])))
  add("3073", Math.round(num(p["portas_correr_grande"])))
  add("3033", antF, true)
  add("3033", antL, true, true)
  if (doors.length) cfg.doors = doors

  return cfg
}

/** Monta o "#e=..." que o simulador lê ao abrir. */
export function hashDaConfig(cfg: ConfigEstufa3D): string {
  if (!cfg || !Object.keys(cfg).length) return ""
  const json = JSON.stringify(cfg)
  const b64 = typeof window === "undefined"
    ? Buffer.from(encodeURIComponent(json), "utf-8").toString("base64")
    : btoa(encodeURIComponent(json))
  return "#e=" + encodeURIComponent(b64)
}
