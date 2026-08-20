/*
 * escalas.ts — que som toca em cada evento, e por quanto tempo.
 *
 * As faixas e a sequencia de tres tempos sao REPLICA de faixaFromValor() e
 * do fluxo de celebracao-venda.tsx no dashboard. Nao ha regra nova aqui.
 *
 * Sao dois eventos, e eles precisam soar diferente o suficiente para alguem
 * de costas saber o que aconteceu sem olhar a tela:
 *
 *   AGENDAMENTO  uma buzina curta, so isso. Acontece muitas vezes por dia.
 *   VENDA        caixa registradora -> tambor da faixa -> buzina.
 *                O tambor e o que escala: 3s na venda pequena, 10s de
 *                suspense na lendaria.
 */

import { CAIXAS, BUZINAS, TAMBORES, sortear } from "./sons";

export type Faixa = "pequeno" | "medio" | "grande" | "epico" | "lendario";

// Copiado de faixaFromValor() do dashboard.
export function faixaPorValor(valor: number): Faixa {
  if (valor >= 10000) return "lendario";
  if (valor >= 8001) return "epico";
  if (valor >= 5001) return "grande";
  if (valor >= 3001) return "medio";
  return "pequeno";
}

export const NOME_FAIXA: Record<Faixa, string> = {
  pequeno: "Venda",
  medio: "Boa venda",
  grande: "Venda grande",
  epico: "Venda épica",
  lendario: "Venda lendária",
};

// Duracao real de cada tambor, pelo nome do arquivo original.
const MS_TAMBOR: Record<Faixa, number> = {
  pequeno: 3000, medio: 7000, grande: 10000, epico: 10000, lendario: 10000,
};
const MS_CAIXA = 3000;

export type Etapa = { arquivo: string; volume: number; atrasoMs: number };

export function sequenciaVenda(valor: number): { faixa: Faixa; etapas: Etapa[] } {
  const faixa = faixaPorValor(valor);
  return {
    faixa,
    etapas: [
      { arquivo: sortear(CAIXAS), volume: 0.5, atrasoMs: 0 },
      { arquivo: sortear(TAMBORES[faixa]), volume: 0.55, atrasoMs: MS_CAIXA },
      { arquivo: sortear(BUZINAS), volume: 0.6, atrasoMs: MS_CAIXA + MS_TAMBOR[faixa] },
    ],
  };
}

export function duracaoVenda(faixa: Faixa): number {
  return MS_CAIXA + MS_TAMBOR[faixa] + 4000;
}

/*
 * Agendamento: uma buzina so, mais baixa que a da venda. Estrutura curta
 * contra sequencia longa — e a diferenca que o ouvido percebe primeiro.
 */
export function sequenciaAgendamento(): Etapa[] {
  return [{ arquivo: sortear(BUZINAS), volume: 0.4, atrasoMs: 0 }];
}

export const DURACAO_AGENDAMENTO = 5000;
