/*
 * gerar-mapa.js — monta o escritorio Black Bankers em formato Tiled (.tmj)
 *
 * Por que um gerador e nao um arquivo desenhado a mao: o mapa tem quase 2000
 * tiles por camada. Ajustar posicao de area ou fileira de mesas na mao seria
 * inviavel. Aqui voce muda um numero no bloco PLANTA e regenera.
 *
 *   node tools/gerar-mapa.js
 *
 * Os IDs de tile abaixo foram extraidos do office.tmj do starter kit oficial,
 * entao sao combinacoes que ja sabemos que renderizam certo.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------- PLANTA
// Mesma logica da sala do Gather: Time Black em cima, Lideranca embaixo,
// gongo no corredor entre as duas, copa na esquerda, salas de reuniao na
// direita, sala grande embaixo.

const W = 50;
const H = 38;

const COPA        = { x: 1,  y: 3,  w: 10, h: 12 };
const TIME_BLACK  = { x: 13, y: 4,  w: 24, h: 11 };
const CORREDOR    = { x: 13, y: 16, w: 24, h: 4  };
const LIDERANCA   = { x: 13, y: 21, w: 24, h: 9  };
const SALA_GRANDE = { x: 1,  y: 26, w: 10, h: 10 };
const REUNIOES    = [
  { x: 39, y: 3,  w: 10, h: 7 },
  { x: 39, y: 11, w: 10, h: 7 },
  { x: 39, y: 19, w: 10, h: 7 },
  { x: 39, y: 27, w: 10, h: 7 },
];

// Onde cada pessoa senta. A placa individual nasce na linha logo abaixo.
const MESAS_TIME_BLACK = [
  { x: 15, y: 5 }, { x: 21, y: 5 }, { x: 27, y: 5 }, { x: 33, y: 5 },
  { x: 15, y: 11 }, { x: 21, y: 11 }, { x: 27, y: 11 }, { x: 33, y: 11 },
];
const MESAS_LIDERANCA = [
  { x: 15, y: 22 }, { x: 21, y: 22 }, { x: 27, y: 22 }, { x: 33, y: 22 },
];

const GONGO   = { x: 24, y: 17 };
const PLACAR  = { x: 28, y: 17 };
const SPAWN   = { x: 24, y: 20 };

// ---------------------------------------------------------------- TILES
const PISO        = 725;   // piso interno principal
const PISO_ALT    = 735;   // piso da copa, pra diferenciar o ambiente
const GRAMA       = 2461;  // externo

const P_CANTO_NO  = 403;   // canto noroeste
const P_CANTO_NE  = 404;   // canto nordeste
const P_TOPO      = 479;   // topo horizontal
const P_FACE_A    = 578;   // face da parede, linha 1
const P_FACE_B    = 603;   // face da parede, linha 2 (rodape)
const P_VERT      = 477;   // parede vertical
const P_VERT_FIM  = 680;   // pe da parede vertical
const P_T         = 535;   // T: parede interna encontrando o topo

const ZONA_START  = 2;     // WA_Special_Zones
const ZONA_COLL   = 3;

// Carimbos extraidos do office.tmj (null = celula vazia)
const BAIA = [                      // 4x4, duas pessoas frente a frente
  [1494, 1569, 1569, 1495],
  [null, 1569, 1569, null],
  [1494, 1569, 1569, 1495],
  [null, 1579, 1579, null],
];
const MESA_REUNIAO = [              // 6x5, seis lugares
  [1496, 1497, 1496, 1497, 1496, 1497],
  [1509, 1510, 1509, 1510, 1509, 1510],
  [1567, 1570, 1570, 1570, 1570, 1568],
  [1577, 1580, 1580, 1580, 1580, 1578],
  [1511, 1512, 1511, 1512, 1511, 1512],
];
const SOFA = [                      // 4x2
  [1375, 1376, 1376, 1377],
  [1388, 1389, 1389, 1390],
];
const BALCAO = [                    // 2x5, copa
  [1627, 1628],
  [1637, 1638],
  [1647, 1648],
  [1657, null],
  [1667, 1668],
];
const ESTANTE = [                   // 3x3
  [142, 143, 144],
  [152, 153, 154],
  [162, 163, 164],
];

// ---------------------------------------------------------------- TELA
const novaCamada = () => new Array(W * H).fill(0);
const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const por = (c, x, y, v) => { if (dentro(x, y) && v) c[y * W + x] = v; };
const ler = (c, x, y) => (dentro(x, y) ? c[y * W + x] : 0);

const piso = novaCamada();
const pisoAlt = novaCamada();
const paredes = novaCamada();
const moveis = novaCamada();
const acima = novaCamada();
const colisoes = novaCamada();
const inicio = novaCamada();

function retangulo(c, r, v) {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) por(c, x, y, v);
}

function carimbar(camada, stamp, x0, y0, { colide = true } = {}) {
  stamp.forEach((linha, dy) =>
    linha.forEach((v, dx) => {
      if (!v) return;
      por(camada, x0 + dx, y0 + dy, v);
      if (colide) por(colisoes, x0 + dx, y0 + dy, ZONA_COLL);
    })
  );
}

// Parede em volta de um retangulo. `portas` sao coordenadas a deixar abertas.
function murar(r, portas = []) {
  const aberto = new Set(portas.map(([x, y]) => x + "," + y));
  const x0 = r.x - 1, x1 = r.x + r.w, y0 = r.y - 1, y1 = r.y + r.h;
  for (let x = x0; x <= x1; x++) {
    for (const [y, tile] of [[y0, P_TOPO], [y1, P_TOPO]]) {
      if (aberto.has(x + "," + y)) continue;
      por(paredes, x, y, tile);
      por(colisoes, x, y, ZONA_COLL);
    }
  }
  for (let y = y0; y <= y1; y++) {
    for (const x of [x0, x1]) {
      if (aberto.has(x + "," + y)) continue;
      por(paredes, x, y, P_VERT);
      por(colisoes, x, y, ZONA_COLL);
    }
  }
  por(paredes, x0, y0, P_CANTO_NO);
  por(paredes, x1, y0, P_CANTO_NE);
  por(paredes, x0, y1, P_VERT_FIM);
  por(paredes, x1, y1, P_VERT_FIM);
}

// ---------------------------------------------------------------- MONTAGEM

// 1. externo e piso
retangulo(piso, { x: 0, y: 0, w: W, h: H }, GRAMA);
retangulo(piso, { x: 1, y: 3, w: W - 2, h: H - 4 }, PISO);
retangulo(pisoAlt, COPA, PISO_ALT);
retangulo(pisoAlt, SALA_GRANDE, PISO_ALT);

// 2. casca do predio: 3 linhas de parede em cima, laterais e base
for (let x = 0; x < W; x++) {
  por(paredes, x, 0, x === 0 ? P_CANTO_NO : x === W - 1 ? P_CANTO_NE : P_TOPO);
  por(paredes, x, 1, P_FACE_A);
  por(paredes, x, 2, P_FACE_B);
  por(paredes, x, H - 1, P_TOPO);
  [0, 1, 2, H - 1].forEach((y) => por(colisoes, x, y, ZONA_COLL));
}
for (let y = 3; y < H - 1; y++) {
  por(paredes, 0, y, P_VERT);
  por(paredes, W - 1, y, P_VERT);
  por(colisoes, 0, y, ZONA_COLL);
  por(colisoes, W - 1, y, ZONA_COLL);
}

// 3. divisorias internas
murar(COPA, [[11, 8], [11, 9]]);
murar(SALA_GRANDE, [[11, 30], [11, 31]]);
REUNIOES.forEach((r, i) => murar(r, [[38, r.y + 2], [38, r.y + 3]]));

// 4. mesas de trabalho
[...MESAS_TIME_BLACK, ...MESAS_LIDERANCA].forEach((m) => carimbar(moveis, BAIA, m.x, m.y));

// 5. mobilia das salas
REUNIOES.forEach((r) => carimbar(moveis, MESA_REUNIAO, r.x + 2, r.y + 1));
carimbar(moveis, MESA_REUNIAO, SALA_GRANDE.x + 2, SALA_GRANDE.y + 2);
carimbar(moveis, BALCAO, COPA.x + 1, COPA.y + 1);
carimbar(moveis, SOFA, COPA.x + 4, COPA.y + 8);
carimbar(moveis, ESTANTE, 34, 3);
carimbar(moveis, ESTANTE, 17, 3);

// 6. spawn
por(inicio, SPAWN.x, SPAWN.y, ZONA_START);
por(inicio, SPAWN.x + 1, SPAWN.y, ZONA_START);
[[SPAWN.x, SPAWN.y], [SPAWN.x + 1, SPAWN.y]].forEach(([x, y]) => por(colisoes, x, y, 0));

// 7. o corredor central e o gongo ficam livres de colisao
retangulo(colisoes, CORREDOR, 0);

// ---------------------------------------------------------------- AREAS
// Objetos nomeados. O script do mapa acha cada um pelo nome e desenha a placa.
const areas = [];
let id = 1;
const area = (nome, x, y, w, h, props = []) =>
  areas.push({
    id: id++,
    name: nome,
    type: "",
    class: "",
    x: x * 32, y: y * 32, width: w * 32, height: h * 32,
    visible: true, rotation: 0,
    properties: props,
  });

MESAS_TIME_BLACK.forEach((m, i) => area(`placa-timeblack-${i + 1}`, m.x, m.y + 4, 4, 1));
MESAS_LIDERANCA.forEach((m, i) => area(`placa-lideranca-${i + 1}`, m.x, m.y + 4, 4, 1));
area("placar-time", PLACAR.x, PLACAR.y, 6, 2);
area("gongo", GONGO.x, GONGO.y, 2, 2);
REUNIOES.forEach((r, i) =>
  area(`sala-reuniao-${i + 1}`, r.x, r.y, r.w, r.h, [{ name: "silent", type: "bool", value: true }])
);
area("copa", COPA.x, COPA.y, COPA.w, COPA.h);
area("sala-grande", SALA_GRANDE.x, SALA_GRANDE.y, SALA_GRANDE.w, SALA_GRANDE.h,
  [{ name: "silent", type: "bool", value: true }]);

// ---------------------------------------------------------------- ARQUIVO
const base = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "office.tmj"), "utf8"));

const camada = (nome, data, extra = {}) => ({
  id: 0, name: nome, type: "tilelayer", visible: true, opacity: 1,
  x: 0, y: 0, width: W, height: H, data, ...extra,
});
const grupo = (nome, layers) => ({
  id: 0, name: nome, type: "group", visible: true, opacity: 1, x: 0, y: 0, layers,
});

const mapa = {
  compressionlevel: -1,
  width: W, height: H, tilewidth: 32, tileheight: 32,
  infinite: false, orientation: "orthogonal", renderorder: "right-down",
  tiledversion: base.tiledversion, version: base.version,
  type: "map", nextlayerid: 100, nextobjectid: id + 1,
  tilesets: base.tilesets,
  properties: [
    { name: "mapName", type: "string", value: "Black Bankers" },
    { name: "mapDescription", type: "string", value: "Escritorio virtual do time comercial Black Bankers" },
    { name: "mapImage", type: "string", value: "escritorio.png" },
    { name: "mapCopyright", type: "string", value: "Tilesets: WorkAdventure (https://WorkAdventu.re) - CC-BY-SA 3.0" },
    { name: "script", type: "string", value: "src/main.ts" },
  ],
  layers: [
    camada("start", inicio),
    camada("collisions", colisoes),
    grupo("floor", [camada("floor1", piso), camada("floor2", pisoAlt)]),
    grupo("walls", [camada("walls1", paredes)]),
    grupo("furniture", [camada("furniture1", moveis)]),
    { id: 0, name: "floorLayer", type: "objectgroup", visible: true, opacity: 1,
      x: 0, y: 0, draworder: "topdown", objects: areas },
    grupo("above", [camada("above1", acima)]),
  ],
};

// numera as camadas
let lid = 1;
(function numerar(ls) { ls.forEach((l) => { l.id = lid++; if (l.layers) numerar(l.layers); }); })(mapa.layers);
mapa.nextlayerid = lid;

const destino = path.join(__dirname, "..", "escritorio.tmj");
fs.writeFileSync(destino, JSON.stringify(mapa, null, 1));

const contar = (c) => c.filter(Boolean).length;
console.log(`escrito: ${path.relative(process.cwd(), destino)}`);
console.log(`grade:     ${W} x ${H} tiles  (${W * 32} x ${H * 32} px)`);
console.log(`piso:      ${contar(piso)}   piso alt: ${contar(pisoAlt)}`);
console.log(`paredes:   ${contar(paredes)}`);
console.log(`moveis:    ${contar(moveis)}`);
console.log(`colisoes:  ${contar(colisoes)}`);
console.log(`areas:     ${areas.length}  (${areas.filter((a) => a.name.startsWith("placa-")).length} placas individuais)`);
