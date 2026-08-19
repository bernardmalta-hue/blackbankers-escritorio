/*
 * gerar-sons.cjs — sintetiza os audios da comemoracao.
 *
 *   node tools/gerar-sons.cjs
 *
 * Gera WAV mono 16 bits em public/som/. Feito por codigo para nao depender
 * de arquivo de terceiro nem de licenca de banco de som.
 */

const fs = require("fs");
const path = require("path");

const TAXA = 22050;

function wav(amostras) {
  const n = amostras.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);          // tamanho do bloco fmt
  buf.writeUInt16LE(1, 20);           // PCM
  buf.writeUInt16LE(1, 22);           // mono
  buf.writeUInt32LE(TAXA, 24);
  buf.writeUInt32LE(TAXA * 2, 28);    // bytes por segundo
  buf.writeUInt16LE(2, 32);           // alinhamento
  buf.writeUInt16LE(16, 34);          // bits
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  amostras.forEach((v, i) => {
    const c = Math.max(-1, Math.min(1, v));
    buf.writeInt16LE(Math.round(c * 32000), 44 + i * 2);
  });
  return buf;
}

const render = (segundos, fn) => {
  const n = Math.floor(TAXA * segundos);
  return Array.from({ length: n }, (_, i) => fn(i / TAXA, i / n));
};

// Buzina: duas notas em quinta, onda quadrada suave, corte seco no fim.
const buzina = render(0.55, (t, p) => {
  const env = p < 0.04 ? p / 0.04 : p > 0.85 ? (1 - p) / 0.15 : 1;
  const quadrada = (f) => (Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1);
  const corpo = quadrada(440) * 0.5 + quadrada(660) * 0.35;
  return corpo * env * 0.45;
});

// Gongo: fundamental grave com parciais desafinadas e cauda longa.
const gongo = render(2.4, (t, p) => {
  const env = Math.exp(-2.6 * p) * (p < 0.005 ? p / 0.005 : 1);
  const parciais = [110, 274, 431, 592, 823];
  const pesos = [1, 0.55, 0.4, 0.22, 0.12];
  let v = 0;
  parciais.forEach((f, i) => {
    v += Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 0.5 * t) * 0.6) * pesos[i];
  });
  return (v / 2.3) * env * 0.7;
});

// Sino: parciais agudas e desafinadas, decaimento rapido.
const sino = render(1.6, (t, p) => {
  const env = Math.exp(-4.2 * p) * (p < 0.004 ? p / 0.004 : 1);
  const parciais = [880, 1320, 1980, 2640];
  const pesos = [1, 0.5, 0.28, 0.14];
  let v = 0;
  parciais.forEach((f, i) => (v += Math.sin(2 * Math.PI * f * t) * pesos[i]));
  return (v / 1.9) * env * 0.55;
});

// Fanfarra: arpejo maior subindo, onda dente de serra suavizada.
const fanfarra = render(1.1, (t, p) => {
  const notas = [523.25, 659.25, 783.99, 1046.5];
  const passo = Math.min(notas.length - 1, Math.floor(p * 4.4));
  const f = notas[passo];
  const dentro = (p * 4.4) % 1;
  const env = (dentro < 0.06 ? dentro / 0.06 : 1) * (1 - p * 0.35);
  const serra = 2 * ((t * f) % 1) - 1;
  return (serra * 0.5 + Math.sin(2 * Math.PI * f * t) * 0.5) * env * 0.4;
});

// Caixa registradora: dois toques agudos curtos, o classico "ka-ching".
const caixa = render(0.9, (t, p) => {
  const toque = (atraso, freq) => {
    const dt = t - atraso;
    if (dt < 0) return 0;
    const env = Math.exp(-13 * dt);
    return (Math.sin(2 * Math.PI * freq * dt) + Math.sin(2 * Math.PI * freq * 1.5 * dt) * 0.6) * env;
  };
  return (toque(0, 1200) + toque(0.11, 1600)) * 0.35;
});

// Apito de estadio: cluster de dente de serra com leve subida de tom.
const apito = render(1.2, (t, p) => {
  const env = p < 0.05 ? p / 0.05 : p > 0.8 ? (1 - p) / 0.2 : 1;
  const base = 392 * (1 + p * 0.04);
  let v = 0;
  [1, 1.005, 1.5, 2].forEach((m, i) => {
    v += (2 * ((t * base * m) % 1) - 1) * [0.5, 0.4, 0.25, 0.12][i];
  });
  return v * env * 0.35;
});

// Aplauso: rajadas de ruido filtrado. Pseudo-aleatorio com semente fixa
// para o arquivo sair identico a cada geracao.
let semente = 7;
const aleatorio = () => {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
};
let anterior = 0;
const aplauso = render(2.0, (t, p) => {
  const env = p < 0.08 ? p / 0.08 : Math.exp(-1.4 * (p - 0.08));
  const ruido = aleatorio() * 2 - 1;
  anterior = anterior * 0.55 + ruido * 0.45; // passa-baixa simples
  const tapas = aleatorio() > 0.93 ? 1.8 : 1;
  return anterior * env * tapas * 0.4;
});

const destino = path.join(__dirname, "..", "public", "som");
fs.mkdirSync(destino, { recursive: true });

for (const [nome, amostras] of [
  ["buzina", buzina],
  ["gongo", gongo],
  ["sino", sino],
  ["fanfarra", fanfarra],
  ["caixa", caixa],
  ["apito", apito],
  ["aplauso", aplauso],
]) {
  const arq = path.join(destino, nome + ".wav");
  fs.writeFileSync(arq, wav(amostras));
  const kb = (fs.statSync(arq).size / 1024).toFixed(0);
  console.log(`${nome}.wav  ${(amostras.length / TAXA).toFixed(2)}s  ${kb} KB`);
}
