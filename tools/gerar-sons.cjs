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

const destino = path.join(__dirname, "..", "public", "som");
fs.mkdirSync(destino, { recursive: true });

for (const [nome, amostras] of [["buzina", buzina], ["gongo", gongo]]) {
  const arq = path.join(destino, nome + ".wav");
  fs.writeFileSync(arq, wav(amostras));
  const kb = (fs.statSync(arq).size / 1024).toFixed(0);
  console.log(`${nome}.wav  ${(amostras.length / TAXA).toFixed(2)}s  ${kb} KB`);
}
