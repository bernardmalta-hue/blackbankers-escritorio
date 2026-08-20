/*
 * sons.ts — biblioteca de audio do escritorio.
 *
 * Um sistema so, e ele e o do dashboard. Os arquivos aqui sao copia de
 * public/sounds/tv do blackdashnovo.
 *
 * Existia antes um seletor de som pessoal, com opcoes sintetizadas por
 * codigo. Foi removido: conviver com a escala do dashboard deixava a mesma
 * acao soando de dois jeitos diferentes dependendo de quem disparou, e
 * ninguem conseguia mais dizer o que tinha acontecido so de ouvir.
 *
 * Se a regra mudar no dashboard, muda aqui tambem — senao o escritorio e a
 * TV passam a contar historias diferentes sobre a mesma venda.
 */

export const CAIXAS = [
  "caixa/1.mp3", "caixa/2.mp3", "caixa/3.mp3",
  "caixa/4.mp3", "caixa/5.mp3", "caixa/6.mp3",
];

export const BUZINAS = [
  "buzina/1.mp3", "buzina/2.mp3", "buzina/3.mp3", "buzina/4.mp3",
];

export const TAMBORES: Record<string, string[]> = {
  pequeno: ["tambor/pequeno.mp3"],
  medio: ["tambor/medio.mp3"],
  grande: ["tambor/grande.mp3", "tambor/grande2.mp3"],
  epico: ["tambor/epico.mp3"],
  lendario: ["tambor/lendario.mp3"],
};

export const sortear = (lista: string[]): string =>
  lista[Math.floor(Math.random() * lista.length)];
