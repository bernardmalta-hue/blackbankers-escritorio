/*
 * confete.ts — chuva de confete em volta de quem comemorou.
 *
 * O WorkAdventure nao tem API de particula. O que ele tem e WA.room.setTiles,
 * que troca tiles do mapa em tempo real. Entao o confete e feito pintando
 * tiles em volta da pessoa e apagando alguns segundos depois.
 *
 * O problema: o id do tile muda a cada publicacao. O otimizador reempacota
 * os tilesets e renumera tudo, entao nao da para gravar um numero fixo aqui.
 *
 * A solucao: no inicio, lemos o mapa e pegamos o id que esta desenhado nos
 * baloes do gongo — uma coordenada que a gente conhece. Seja qual for a
 * numeracao daquela publicacao, aquele id existe e desenha um balao.
 */

import pontos from "./pontos.json";

const CAMADA = "above1"; // acima do piso e dos moveis, abaixo dos avatares
const DURACAO_MS = 4500;

// Posicoes relativas a pessoa. Espalhadas e assimetricas de proposito:
// um anel perfeito parece decoracao, disperso parece festa.
const PADRAO: Array<[number, number]> = [
  [-2, -1], [2, -1], [-1, -2], [1, -2],
  [-3, 0], [3, 0], [0, -3],
  [-2, 1], [2, 1], [-1, 2], [1, 2],
];

let tileConfete: number | null = null;

/* Descobre um id de tile valido para a publicacao atual. */
export async function prepararConfete(): Promise<boolean> {
  try {
    const mapa = (await WA.room.getTiledMap()) as unknown as {
      width: number;
      layers: Array<{ name: string; type: string; data?: number[]; layers?: unknown[] }>;
    };
    const planas: Array<{ name: string; type: string; data?: number[] }> = [];
    const achatar = (ls: unknown[]) =>
      (ls as Array<{ name: string; type: string; data?: number[]; layers?: unknown[] }>).forEach((l) =>
        l.type === "group" && l.layers ? achatar(l.layers) : planas.push(l)
      );
    achatar(mapa.layers);

    const moveis = planas.find((l) => l.name === "furniture1");
    if (!moveis?.data) return false;

    const id = moveis.data[pontos.gongo.y * mapa.width + pontos.gongo.x];
    if (!id) return false;
    tileConfete = id;
    return true;
  } catch (e) {
    console.warn("[Black Bankers] confete indisponivel:", e);
    return false;
  }
}

/* xTile e yTile em tiles, nao em pixels. */
export function soltarConfete(xTile: number, yTile: number): void {
  if (tileConfete === null) return;

  const pintar = PADRAO.map(([dx, dy]) => ({
    x: xTile + dx,
    y: yTile + dy,
    tile: tileConfete as number,
    layer: CAMADA,
  }));
  const limpar = pintar.map((t) => ({ ...t, tile: null }));

  try {
    WA.room.setTiles(pintar);
    window.setTimeout(() => WA.room.setTiles(limpar), DURACAO_MS);
  } catch (e) {
    console.warn("[Black Bankers] nao consegui soltar confete:", e);
  }
}
