/// <reference types="@workadventure/iframe-api-typings" />

/*
 * Escritorio Black Bankers — comportamento do mapa.
 *
 * Tres coisas acontecem aqui:
 *
 *   1. Paineis  — abrem quando voce chega perto e fecham quando voce sai.
 *                 O painel individual so abre para o dono da mesa, porque
 *                 este script roda no navegador de cada pessoa: o
 *                 navegador dos outros nem recebe o dado.
 *
 *   2. Buzina   — na sua mesa, ESPACO toca a buzina e avisa a sala inteira.
 *
 *   3. Comemoracao — qualquer buzina toca o gongo, mostra a faixa e solta
 *                 confete na tela de todo mundo que estiver na sala.
 *
 * Os numeros ainda sao de exemplo. Ver public/painel/dados-demo.js.
 */

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import mesas from "./mesas.json";

type Mesa = { area: string; pessoa: string | null; time: string };

const BASE = "painel/";
const SOM_BUZINA = "som/buzina.wav";
const SOM_GONGO = "som/gongo.wav";
const EVENTO = "black-bankers-comemoracao";
const DURACAO_FAIXA = 9000;

type Comemoracao = { quem: string; time: string };

// Um painel aberto por vez em cada posicao da tela.
const abertos = new Map<string, { close: () => void }>();

async function abrirPainel(
  chave: string,
  arquivo: string,
  posicao: { vertical: "top" | "middle" | "bottom"; horizontal: "left" | "middle" | "right" },
  tamanho: { height: string; width: string }
) {
  if (abertos.has(chave)) return;
  const site = await WA.ui.website.open({
    url: BASE + arquivo,
    position: { vertical: posicao.vertical, horizontal: posicao.horizontal },
    size: tamanho,
    visible: true,
    allowApi: false,
    allowPolicy: "",
  });
  abertos.set(chave, site);
}

function fecharPainel(chave: string) {
  const site = abertos.get(chave);
  if (!site) return;
  site.close();
  abertos.delete(chave);
}

// ------------------------------------------------------------- comemoracao

let gongo: ReturnType<typeof WA.sound.loadSound> | undefined;
let buzina: ReturnType<typeof WA.sound.loadSound> | undefined;
let faixaAberta = false;

function celebrar(dados: Comemoracao) {
  gongo?.play({ volume: 0.55 });

  if (!faixaAberta) {
    faixaAberta = true;
    WA.ui.banner.openBanner({
      id: "comemoracao",
      text: `${dados.quem} bateu o gongo`,
      bgColor: "#e8b64c",
      textColor: "#14120e",
      closable: true,
    });
    window.setTimeout(() => {
      WA.ui.banner.closeBanner();
      faixaAberta = false;
    }, DURACAO_FAIXA);
  }
}

// -------------------------------------------------------------------- mesas

function ligarMesa(mesa: Mesa, eu: string) {
  const minha = !!mesa.pessoa && mesa.pessoa === eu;
  let acao: { remove: () => void } | undefined;

  WA.room.area.onEnter(mesa.area).subscribe(() => {
    if (minha) {
      abrirPainel(
        "individual",
        `individual.html?nome=${encodeURIComponent(eu)}`,
        { vertical: "middle", horizontal: "right" },
        { height: "42vh", width: "22vw" }
      );
    }

    // A buzina fica disponivel em qualquer mesa: quem esta sentado ali toca.
    acao = WA.ui.displayActionMessage({
      message: "Aperte ESPAÇO para bater o gongo",
      callback: () => {
        buzina?.play({ volume: 0.5 });
        const dados: Comemoracao = { quem: eu || "Alguém", time: mesa.time };
        WA.event.broadcast(EVENTO, dados);
        celebrar(dados); // quem tocou tambem ve, sem esperar o retorno
      },
    });
  });

  WA.room.area.onLeave(mesa.area).subscribe(() => {
    if (minha) fecharPainel("individual");
    acao?.remove();
    acao = undefined;
  });
}

// -------------------------------------------------------------------- inicio

WA.onInit()
  .then(() => {
    const eu = WA.player.name ?? "";
    console.info("[Black Bankers] escritorio pronto para", eu);

    gongo = WA.sound.loadSound(SOM_GONGO);
    buzina = WA.sound.loadSound(SOM_BUZINA);

    // Painel do time, no salao
    WA.room.area.onEnter("placar-time").subscribe(() =>
      abrirPainel("time", "time.html",
        { vertical: "middle", horizontal: "right" },
        { height: "52vh", width: "24vw" })
    );
    WA.room.area.onLeave("placar-time").subscribe(() => fecharPainel("time"));

    // Painel de marketing, na sala de gestao
    WA.room.area.onEnter("painel-marketing").subscribe(() =>
      abrirPainel("marketing", "marketing.html",
        { vertical: "middle", horizontal: "right" },
        { height: "44vh", width: "24vw" })
    );
    WA.room.area.onLeave("painel-marketing").subscribe(() => fecharPainel("marketing"));

    // O gongo do corredor tambem toca
    let acaoGongo: { remove: () => void } | undefined;
    WA.room.area.onEnter("gongo").subscribe(() => {
      acaoGongo = WA.ui.displayActionMessage({
        message: "Aperte ESPAÇO para bater o gongo",
        callback: () => {
          const dados: Comemoracao = { quem: eu || "Alguém", time: "sala" };
          WA.event.broadcast(EVENTO, dados);
          celebrar(dados);
        },
      });
    });
    WA.room.area.onLeave("gongo").subscribe(() => {
      acaoGongo?.remove();
      acaoGongo = undefined;
    });

    // Cada mesa
    (mesas as Mesa[]).forEach((m) => ligarMesa(m, eu));

    // Comemoracao disparada por outra pessoa
    WA.event.on(EVENTO).subscribe((evento) => {
      celebrar(evento.data as Comemoracao);
    });

    bootstrapExtra()
      .then(() => console.info("[Black Bankers] scripting api extra pronta"))
      .catch((e) => console.error(e));
  })
  .catch((e) => console.error(e));

export {};
