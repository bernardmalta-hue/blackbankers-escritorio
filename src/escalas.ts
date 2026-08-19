/*
 * escalas.ts — que som toca em cada evento.
 *
 * As faixas e a sequencia sao REPLICA do que o dashboard ja faz na TV ao
 * vivo (src/components/celebracao-venda.tsx). Nao inventamos nada aqui: se
 * a regra mudar la, muda aqui tambem, senao o escritorio e a TV passam a
 * contar historias diferentes sobre a mesma venda.
 *
 * VENDA (closer) — sequencia de tres tempos, como na TV:
 *     caixa registradora  ->  tambor da faixa  ->  buzina
 *   O tambor e o que escala: 3s na venda pequena, 10s de suspense na
 *   lendaria. Quem esta de costas sabe o tamanho da venda pelo tempo que
 *   o tambor demora.
 *
 * AGENDAMENTO (pre-vendas) — som unico, curto e claramente diferente.
 *   Acontece muitas vezes por dia; se soasse como venda, viciaria o ouvido
 *   do time e a venda deixaria de significar alguma coisa.
 */

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

const CAIXAS = ["caixa/1.mp3", "caixa/2.mp3", "caixa/3.mp3", "caixa/4.mp3", "caixa/5.mp3", "caixa/6.mp3"];
const BUZINAS = ["buzina/1.mp3", "buzina/2.mp3", "buzina/3.mp3", "buzina/4.mp3"];

const TAMBOR: Record<Faixa, string[]> = {
  pequeno: ["tambor/pequeno.mp3"],
  medio: ["tambor/medio.mp3"],
  grande: ["tambor/grande.mp3", "tambor/grande2.mp3"],
  epico: ["tambor/epico.mp3"],
  lendario: ["tambor/lendario.mp3"],
};

// Duracao real de cada tambor, pelo nome do arquivo original.
const MS_TAMBOR: Record<Faixa, number> = {
  pequeno: 3000,
  medio: 7000,
  grande: 10000,
  epico: 10000,
  lendario: 10000,
};

const MS_CAIXA = 3000;

const sortear = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];

export type Etapa = { arquivo: string; volume: number; atrasoMs: number };

// Monta a sequencia completa de uma venda, ja com os tempos de cada etapa.
export function sequenciaVenda(valor: number): { faixa: Faixa; etapas: Etapa[] } {
  const faixa = faixaPorValor(valor);
  return {
    faixa,
    etapas: [
      { arquivo: sortear(CAIXAS), volume: 0.5, atrasoMs: 0 },
      { arquivo: sortear(TAMBOR[faixa]), volume: 0.55, atrasoMs: MS_CAIXA },
      { arquivo: sortear(BUZINAS), volume: 0.6, atrasoMs: MS_CAIXA + MS_TAMBOR[faixa] },
    ],
  };
}

// Quanto tempo a faixa dourada fica na tela: ate o fim da buzina, mais folga.
export function duracaoTotal(faixa: Faixa): number {
  return MS_CAIXA + MS_TAMBOR[faixa] + 4000;
}

// Som fixo do agendamento. Leve e distinto de tudo que a venda usa.
export const AGENDAMENTO: Etapa = { arquivo: "sino.wav", volume: 0.35, atrasoMs: 0 };
