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

const W = 37;
const H = 26;

const COPA        = { x: 1,  y: 3,  w: 9,  h: 8 };
const SALA_GRANDE = { x: 1,  y: 13, w: 9,  h: 9 };
const TIME_BLACK  = { x: 12, y: 4,  w: 16, h: 8 };
const CORREDOR    = { x: 12, y: 13, w: 16, h: 3 };
const LIDERANCA   = { x: 12, y: 17, w: 16, h: 6 };
const REUNIOES    = [
  { x: 29, y: 3,  w: 7, h: 6 },
  { x: 29, y: 10, w: 7, h: 6 },
  { x: 29, y: 17, w: 7, h: 6 },
];

// Onde cada pessoa senta.
//
// `nomes` e a lista de grafias aceitas: a pessoa digita o nome que quiser
// ao entrar no WorkAdventure, e nem sempre bate com o cadastro. Na sala ja
// apareceu "W. Coutinho" para quem o banco chama de "Coutinho", e "Bruna"
// para "Bruninha". Basta uma palavra bater.
//
// Lista vazia = mesa livre.
const MESAS_TIME_BLACK = [
  { x: 13, y: 5, nomes: ["Marcelo"] },
  { x: 17, y: 5, nomes: ["Giordanna", "Gii"] },
  { x: 21, y: 5, nomes: ["Coutinho", "W. Coutinho"] },
  { x: 25, y: 5, nomes: ["Bruninha", "Bruna"] },
  { x: 13, y: 8, nomes: [] },
  { x: 17, y: 8, nomes: ["Rudi Reis", "Rudi"] },
  { x: 21, y: 8, nomes: ["Julio", "Julio Raphael"] },
  { x: 25, y: 8, nomes: [] },
];
const MESAS_LIDERANCA = [
  { x: 13, y: 18, nomes: ["Raphael Teles", "Teles"] },
  { x: 17, y: 18, nomes: ["Raphael Amaral", "Amaral", "Raphinha"] },
  { x: 21, y: 18, nomes: ["Rafael Testa", "Raphael Testa", "Testa"] },
  { x: 25, y: 18, nomes: ["Bernard Malta", "Bernard"] },
];

// Quem enxerga o painel individual de qualquer mesa, nao so o proprio.
// Sao os role='gestao' do dashboard.
const GESTAO = ["Bernard Malta", "Rafael Testa", "Raphael Amaral", "Raphael Teles"];

const GONGO   = { x: 17, y: 13 };
const PLACAR  = { x: 21, y: 13 };
const SPAWN   = { x: 18, y: 15 };

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

// Carimbos extraidos do office.tmj e do conference.tmj do starter kit.
// Sao combinacoes que ja renderizam certo nos mapas oficiais.

const MESA = [                      // 3x2, mesa de escritorio individual
  [1652, 1653, 1654],
  [1662, 1663, 1664],
];
const CADEIRA = [[1474]];           // cadeira de escritorio, de frente pra mesa
const PLANTA = [[91], [103]];       // 1x2
const IMPRESSORA = [                // 3x2
  [2147483785, 2147483784, 2147483783],
  [2147483795, 2147483794, 2147483793],
];
const QUADRO = [                    // 3x3, quadro branco
  [142, 143, 144],
  [152, 153, 154],
  [162, 163, 164],
];
const MESA_CENTRO = [               // 2x2, mesinha de centro
  [1602, 1603],
  [1612, 1613],
];
const MESA_GRANDE = [               // 4x3, mesa de madeira da copa
  [307, 308, 309, 310],
  [319, 320, 321, 322],
  [331, 332, 333, 334],
];
const BALOES = [               // 2x2, marca provisoria do ponto do gongo
  [95, 96],
  [107, 108],
];
const FAIXA = [[1828, 1829, 1830, 1831, 1832]];  // 5x1, faixa na parede
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
murar(COPA, [[10, 6], [10, 7]]);
murar(SALA_GRANDE, [[10, 17], [10, 18]]);
REUNIOES.forEach((r) => murar(r, [[28, r.y + 2], [28, r.y + 3]]));

// 4. carpete cinza sob as areas de trabalho, como na sala do Gather
retangulo(pisoAlt, { x: TIME_BLACK.x, y: TIME_BLACK.y, w: TIME_BLACK.w, h: TIME_BLACK.h }, PISO_ALT);
retangulo(pisoAlt, { x: LIDERANCA.x, y: LIDERANCA.y, w: LIDERANCA.w, h: LIDERANCA.h }, PISO_ALT);

// 5. estacoes de trabalho: mesa individual com cadeira
[...MESAS_TIME_BLACK, ...MESAS_LIDERANCA].forEach((m) => {
  carimbar(moveis, MESA, m.x, m.y);
  carimbar(moveis, CADEIRA, m.x + 1, m.y + 2, { colide: false });
});

// 6. salas de reuniao e sala grande
REUNIOES.forEach((r) => carimbar(moveis, MESA_REUNIAO, r.x + 2, r.y + 1));
REUNIOES.forEach((r) => carimbar(moveis, PLANTA, r.x + r.w - 2, r.y + 1));
carimbar(moveis, MESA_REUNIAO, SALA_GRANDE.x + 2, SALA_GRANDE.y + 2);
carimbar(moveis, QUADRO, SALA_GRANDE.x + 3, SALA_GRANDE.y - 1);

// 7. copa: balcao, mesa de refeicao e sofa
carimbar(moveis, BALCAO, COPA.x, COPA.y);
carimbar(moveis, MESA_GRANDE, COPA.x + 4, COPA.y + 2);
carimbar(moveis, SOFA, COPA.x + 2, COPA.y + 6);
carimbar(moveis, MESA_CENTRO, COPA.x + 5, COPA.y + 6, { colide: false });
carimbar(moveis, PLANTA, COPA.x + 8, COPA.y + 1);

// 8. corredor de cima: quadro, impressora, estantes e plantas
carimbar(moveis, QUADRO, 13, 3);
carimbar(moveis, QUADRO, 24, 3);
carimbar(moveis, IMPRESSORA, 19, 3);
carimbar(moveis, PLANTA, 12, 3);
carimbar(moveis, PLANTA, 27, 3);
carimbar(moveis, FAIXA, 22, 3, { colide: false });

// 9. plantas espalhadas pelo salao
[[12, 11], [27, 11], [12, 23], [27, 23], [12, 16], [27, 16]].forEach(([x, y]) =>
  carimbar(moveis, PLANTA, x, y)
);

// 6. spawn
por(inicio, SPAWN.x, SPAWN.y, ZONA_START);
por(inicio, SPAWN.x + 1, SPAWN.y, ZONA_START);
[[SPAWN.x, SPAWN.y], [SPAWN.x + 1, SPAWN.y]].forEach(([x, y]) => por(colisoes, x, y, 0));

// 7. o corredor central e o gongo ficam livres de colisao
retangulo(colisoes, CORREDOR, 0);

// 8. marcas no chao onde ficam os pontos interativos.
// Sem isso o painel e o gongo sao areas invisiveis e ninguem acha.
// Sao tapetes: o movel de verdade voce coloca por cima, no editor inline.
retangulo(pisoAlt, { x: PLACAR.x, y: PLACAR.y, w: 6, h: 2 }, PISO_ALT);
retangulo(pisoAlt, { x: GONGO.x, y: GONGO.y, w: 2, h: 2 }, PISO_ALT);
carimbar(moveis, BALOES, GONGO.x, GONGO.y, { colide: false });
retangulo(pisoAlt, { x: LIDERANCA.x, y: LIDERANCA.y + LIDERANCA.h - 2, w: 6, h: 2 }, PISO_ALT);
[...MESAS_TIME_BLACK, ...MESAS_LIDERANCA].forEach((m) =>
  retangulo(pisoAlt, { x: m.x, y: m.y + 4, w: 4, h: 1 }, PISO_ALT)
);

// ---------------------------------------------------------------- AREAS
// Objetos nomeados. O script do mapa acha cada um pelo nome e desenha a placa.
const areas = [];
let id = 1;
// ATENCAO: `class: "area"` e obrigatorio.
// Sem isso o WorkAdventure trata o objeto como decoracao solta e nenhum
// WA.room.area.onEnter dispara — o script carrega mas nada acontece, sem
// erro nenhum no console. Foi o que segurou o projeto por dois dias.
const area = (nome, x, y, w, h, props = []) =>
  areas.push({
    id: id++,
    name: nome,
    type: "area",
    class: "area",
    x: x * 32, y: y * 32, width: w * 32, height: h * 32,
    visible: true, rotation: 0,
    properties: props,
  });

// Uma area por mesa. Chegar nela faz duas coisas no script: abre o painel
// individual (so para o dono) e habilita a buzina.
const texto = (nome, valor) => ({ name: nome, type: "string", value: valor });
let nMesa = 0;
[...MESAS_TIME_BLACK.map((m) => ({ ...m, time: "timeblack" })),
 ...MESAS_LIDERANCA.map((m) => ({ ...m, time: "lideranca" }))].forEach((m) => {
  nMesa++;
  area(`mesa-${nMesa}`, m.x, m.y, 4, 5, [
    texto("nomes", (m.nomes || []).join("|")),
    texto("time", m.time),
  ]);
});

area("placar-time", PLACAR.x, PLACAR.y, 6, 2);
area("gongo", GONGO.x, GONGO.y, 2, 2);
area("painel-marketing", LIDERANCA.x, LIDERANCA.y + LIDERANCA.h - 2, 6, 2);
REUNIOES.forEach((r, i) =>
  area(`sala-reuniao-${i + 1}`, r.x, r.y, r.w, r.h, [{ name: "silent", type: "bool", value: true }])
);
area("copa", COPA.x, COPA.y, COPA.w, COPA.h);
area("sala-grande", SALA_GRANDE.x, SALA_GRANDE.y, SALA_GRANDE.w, SALA_GRANDE.h,
  [{ name: "silent", type: "bool", value: true }]);

// ---------------------------------------------------------------- ARQUIVO
// Lista de tilesets e versao do Tiled. Ficava sendo lida do office.tmj do
// template, mas esse arquivo foi removido do repositorio — entao virou um
// arquivo proprio, sem dependencia externa.
const base = JSON.parse(fs.readFileSync(path.join(__dirname, "base.json"), "utf8"));

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
    // Sem mapImage por enquanto: o otimizador nao gera miniatura, e apontar
    // para um arquivo inexistente deixa icone quebrado na lista de salas.
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

// Coordenadas que o script do mapa precisa conhecer. Emitidas aqui para
// nao virarem numero magico duplicado em dois arquivos.
fs.writeFileSync(
  path.join(__dirname, "..", "src", "pontos.json"),
  JSON.stringify({ gongo: GONGO, placar: PLACAR, spawn: SPAWN }, null, 1)
);

const destino = path.join(__dirname, "..", "escritorio.tmj");
fs.writeFileSync(destino, JSON.stringify(mapa, null, 1));

// O script do mapa precisa saber de quem e cada mesa. Gerado aqui para que
// PLANTA continue sendo a unica fonte de verdade.
const mesas = [
  ...MESAS_TIME_BLACK.map((m) => ({ ...m, time: "timeblack" })),
  ...MESAS_LIDERANCA.map((m) => ({ ...m, time: "lideranca" })),
].map((m, i) => ({ area: `mesa-${i + 1}`, pessoa: m.pessoa, time: m.time }));

fs.writeFileSync(
  path.join(__dirname, "..", "src", "mesas.json"),
  JSON.stringify(
    [...MESAS_TIME_BLACK.map((m) => ({ ...m, time: "timeblack" })),
     ...MESAS_LIDERANCA.map((m) => ({ ...m, time: "lideranca" }))]
      .map((m, i) => ({ area: `mesa-${i + 1}`, nomes: m.nomes || [], time: m.time })),
    null, 1
  )
);
fs.writeFileSync(
  path.join(__dirname, "..", "src", "gestao.json"),
  JSON.stringify(GESTAO, null, 1)
);

const contar = (c) => c.filter(Boolean).length;
console.log(`escrito: ${path.relative(process.cwd(), destino)}`);
console.log(`grade:     ${W} x ${H} tiles  (${W * 32} x ${H * 32} px)`);
console.log(`piso:      ${contar(piso)}   piso alt: ${contar(pisoAlt)}`);
console.log(`paredes:   ${contar(paredes)}`);
console.log(`moveis:    ${contar(moveis)}`);
console.log(`colisoes:  ${contar(colisoes)}`);
console.log(`areas:     ${areas.length}  (${areas.filter((a) => a.name.startsWith("mesa-")).length} mesas)`);
