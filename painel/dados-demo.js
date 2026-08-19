/*
 * dados-demo.js — numeros de exemplo para os paineis.
 *
 * TROCAR DEPOIS: este arquivo e o unico ponto que os paineis consultam.
 * Quando o Supabase estiver liberado, substitua `buscar()` por uma leitura
 * da view publica do placar. A assinatura das funcoes nao muda, entao os
 * tres paineis continuam funcionando sem alteracao.
 */

const DEMO = {
  time: {
    mesValor: 119127,
    mesMeta: 400000,
    diaValor: 16853,
    diaMeta: 17391,
    ticket: 5179,
    conversao: 43,
    vendasMes: 23,
    diasUteis: 9,
    diasTotais: 23,
  },
  pessoas: {
    "Rudi Reis":     { valor: 55329, meta: 62000, vendas: 10, posicao: 1 },
    "Mari":          { valor: 39619, meta: 35000, vendas: 5,  posicao: 2 },
    "Raphinha":      { valor: 31700, meta: 30000, vendas: 6,  posicao: 3 },
    "Testa":         { valor: 22150, meta: 33000, vendas: 4,  posicao: 4 },
    "Tati Arruda":   { valor: 14900, meta: 33000, vendas: 3,  posicao: 5 },
    "Bernard Malta": { valor: 27430, meta: 30000, vendas: 5,  posicao: 6 },
  },
  marketing: {
    investido: 48200,
    leads: 887,
    cpl: 54,
    agendamentos: 164,
    custoAgendamento: 294,
    roas: 2.47,
  },
};

const ESPERA = 120; // finge latencia de rede pra o painel nao piscar

export function buscar(o) {
  return new Promise((r) => setTimeout(() => r(DEMO[o]), ESPERA));
}

export function buscarPessoa(nome) {
  return new Promise((r) =>
    setTimeout(() => r(DEMO.pessoas[nome] || null), ESPERA)
  );
}

export const ehDemo = true;

export const reais = (n) =>
  "R$ " + Math.round(n).toLocaleString("pt-BR");

// So abrevia acima de 100 mil. Abaixo disso o arredondamento para milhar
// perde informacao que importa: um ticket de R$ 5.179 nao pode virar "R$ 5K".
export const reaisCurto = (n) =>
  n >= 100000 ? "R$ " + Math.round(n / 1000) + "K" : reais(n);

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export function faixa(p) {
  if (p >= 100) return "ok";
  if (p >= 60) return "ritmo";
  return "atras";
}
