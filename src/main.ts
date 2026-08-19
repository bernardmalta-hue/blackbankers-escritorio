/// <reference types="@workadventure/iframe-api-typings" />

/*
 * Escritorio Black Bankers — comportamento do mapa.
 *
 *   1. Metas    — painel pequeno de meta do mes e do dia, sempre na tela.
 *   2. Paineis  — placar do time e marketing abrem ao chegar perto.
 *                 O painel individual so abre para o dono da mesa: este
 *                 script roda no navegador de cada pessoa, entao o
 *                 navegador dos outros nem recebe o dado.
 *   3. Gongo    — na sua mesa ou no gongo do corredor, ESPACO comemora.
 *                 Cada um escolhe o proprio som pelo botao na barra.
 *
 * Os numeros ainda sao de exemplo. Ver public/painel/dados-demo.js.
 */

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import mesas from "./mesas.json";
import { FAMILIAS, familiaEscolhida, guardarEscolha, proximaFamilia, sortearArquivo, type Familia } from "./sons";
import { sequenciaVenda, duracaoTotal, faixaPorValor, NOME_FAIXA, AGENDAMENTO, type Etapa } from "./escalas";

type Mesa = { area: string; pessoa: string | null; time: string };
type Comemoracao = { quem: string; time: string; arquivo: string };

// A raiz do mapa so pode ser lida depois do onInit. O script roda a partir
// de assets/, entao caminho relativo apontaria para o lugar errado.
let RAIZ = "";

const EVENTO = "black-bankers-comemoracao";
const EVENTO_RICO = "black-bankers-venda";

type ComemoracaoRica = {
  quem: string;
  tipo: "venda" | "agendamento";
  titulo: string;
  etapas: Etapa[];
  duracao: number;
};
const DURACAO_FAIXA = 9000;

// ------------------------------------------------------------------ paineis

const abertos = new Map<string, { close: () => void }>();

async function abrirPainel(
  chave: string,
  arquivo: string,
  posicao: { vertical: "top" | "middle" | "bottom"; horizontal: "left" | "middle" | "right" },
  tamanho: { height: string; width: string }
) {
  if (abertos.has(chave)) return;
  try {
    const site = await WA.ui.website.open({
      url: RAIZ + "painel/" + arquivo,
      position: posicao,
      size: tamanho,
      visible: true,
      allowApi: false,
      allowPolicy: "",
    });
    abertos.set(chave, site);
  } catch (e) {
    console.error("[Black Bankers] nao consegui abrir", arquivo, e);
  }
}

function fecharPainel(chave: string) {
  const site = abertos.get(chave);
  if (!site) return;
  site.close();
  abertos.delete(chave);
}

// ------------------------------------------------------------- comemoracao

const carregados = new Map<string, ReturnType<typeof WA.sound.loadSound>>();
let faixaAberta = false;

function tocar(arquivo: string, volume = 0.55) {
  let audio = carregados.get(arquivo);
  if (!audio) {
    audio = WA.sound.loadSound(RAIZ + "som/" + arquivo);
    carregados.set(arquivo, audio);
  }
  audio.play({ volume });
}

function celebrar(dados: Comemoracao) {
  tocar(dados.arquivo);

  if (faixaAberta) return;
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

function tocarSequencia(etapas: Etapa[]) {
  etapas.forEach((e) =>
    e.atrasoMs === 0
      ? tocar(e.arquivo, e.volume)
      : window.setTimeout(() => tocar(e.arquivo, e.volume), e.atrasoMs)
  );
}

/*
 * Venda de closer: mesma escala da TV ao vivo. O valor decide o tambor, e o
 * tambor decide quanto tempo a coisa toda dura.
 */
export function comemorarVenda(quem: string, valor: number) {
  const { faixa, etapas } = sequenciaVenda(valor);
  const dados: ComemoracaoRica = {
    quem: quem || "Alguém",
    tipo: "venda",
    titulo: `${NOME_FAIXA[faixa]} — ${quem}`,
    etapas,
    duracao: duracaoTotal(faixa),
  };
  WA.event.broadcast(EVENTO_RICO, dados);
  celebrarRico(dados);
}

/* Agendamento de pre-vendas: som unico, faixa curta. */
export function comemorarAgendamento(quem: string) {
  const dados: ComemoracaoRica = {
    quem: quem || "Alguém",
    tipo: "agendamento",
    titulo: `${quem} agendou`,
    etapas: [AGENDAMENTO],
    duracao: 5000,
  };
  WA.event.broadcast(EVENTO_RICO, dados);
  celebrarRico(dados);
}

function celebrarRico(d: ComemoracaoRica) {
  tocarSequencia(d.etapas);
  if (faixaAberta) return;
  faixaAberta = true;
  WA.ui.banner.openBanner({
    id: "comemoracao",
    text: d.titulo,
    bgColor: d.tipo === "venda" ? "#e8b64c" : "#3fbf7f",
    textColor: "#14120e",
    closable: true,
  });
  window.setTimeout(() => {
    WA.ui.banner.closeBanner();
    faixaAberta = false;
  }, d.duracao);
}

function comemorar(quem: string, time: string) {
  // sorteia na hora e manda o arquivo junto, para todos ouvirem o mesmo
  const dados: Comemoracao = { quem: quem || "Alguém", time, arquivo: sortearArquivo(familiaEscolhida()) };
  WA.event.broadcast(EVENTO, dados);
  celebrar(dados); // quem tocou tambem ve, sem esperar o retorno do servidor
}

// -------------------------------------------------------------- identidade

// "Bernard" tem que casar com "Bernard Malta". Compara sem acento, sem
// diferenca de maiuscula, e aceita que um nome seja o comeco do outro.
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function mesmaPessoa(dono: string | null, jogador: string): boolean {
  if (!dono || !jogador) return false;
  const a = normalizar(dono);
  const b = normalizar(jogador);
  return a === b || a.startsWith(b + " ") || b.startsWith(a + " ");
}

// -------------------------------------------------------------------- mesas

function ligarMesa(mesa: Mesa, eu: string) {
  const minha = mesmaPessoa(mesa.pessoa, eu);
  let acao: { remove: () => void } | undefined;

  WA.room.area.onEnter(mesa.area).subscribe(() => {
    if (minha) {
      abrirPainel(
        "individual",
        `individual.html?nome=${encodeURIComponent(eu)}`,
        { vertical: "middle", horizontal: "right" },
        { height: "44vh", width: "23vw" }
      );
    }
    acao = WA.ui.displayActionMessage({
      message: `Aperte ESPAÇO para comemorar (${familiaEscolhida().nome})`,
      callback: () => comemorar(eu, mesa.time),
    });
  });

  WA.room.area.onLeave(mesa.area).subscribe(() => {
    if (minha) fecharPainel("individual");
    acao?.remove();
    acao = undefined;
  });
}

// ------------------------------------------------------------------- inicio

WA.onInit()
  .then(() => {
    RAIZ = WA.room.mapURL.replace(/[^/]*$/, "");
    const eu = WA.player.name ?? "";
    console.info("[Black Bankers] pronto para", eu, "| raiz:", RAIZ);

    // 1. Metas sempre visiveis, cantinho de baixo, fora do caminho
    abrirPainel(
      "metas",
      "metas.html",
      { vertical: "bottom", horizontal: "left" },
      { height: "17vh", width: "15vw" }
    );

    // 2. Placar completo do time, ao chegar perto
    WA.room.area.onEnter("placar-time").subscribe(() =>
      abrirPainel("time", "time.html",
        { vertical: "middle", horizontal: "right" },
        { height: "52vh", width: "24vw" })
    );
    WA.room.area.onLeave("placar-time").subscribe(() => fecharPainel("time"));

    // 3. Marketing, na sala de gestao
    WA.room.area.onEnter("painel-marketing").subscribe(() =>
      abrirPainel("marketing", "marketing.html",
        { vertical: "middle", horizontal: "right" },
        { height: "44vh", width: "24vw" })
    );
    WA.room.area.onLeave("painel-marketing").subscribe(() => fecharPainel("marketing"));

    // 4. O gongo do corredor
    let acaoGongo: { remove: () => void } | undefined;
    WA.room.area.onEnter("gongo").subscribe(() => {
      acaoGongo = WA.ui.displayActionMessage({
        message: `Aperte ESPAÇO para bater o gongo (${familiaEscolhida().nome})`,
        callback: () => comemorar(eu, "sala"),
      });
    });
    WA.room.area.onLeave("gongo").subscribe(() => {
      acaoGongo?.remove();
      acaoGongo = undefined;
    });

    // 5. Cada mesa
    (mesas as Mesa[]).forEach((m) => ligarMesa(m, eu));

    // 6. Comemoracao disparada por outra pessoa
    WA.event.on(EVENTO).subscribe((evento) => celebrar(evento.data as Comemoracao));
    WA.event.on(EVENTO_RICO).subscribe((evento) => celebrarRico(evento.data as ComemoracaoRica));

    // Ganchos para o dia em que o Supabase estiver ligado. Por enquanto dao
    // para testar a escala inteira pelo console do navegador:
    //   __bb.venda("Rudi Reis", 12000)   -> lendaria
    //   __bb.agendamento("Mari")
    (window as unknown as Record<string, unknown>).__bb = {
      venda: (quem: string, valor: number) => comemorarVenda(quem, valor),
      agendamento: (quem: string) => comemorarAgendamento(quem),
      faixa: (valor: number) => faixaPorValor(valor),
    };

    // 7. Botao para escolher o som: cada clique passa para o proximo da lista
    //    e toca uma previa, para a pessoa ouvir antes de decidir.
    const botaoSom = (familia: Familia) => {
      try {
        WA.ui.actionBar.addButton({
          id: "escolher-som",
          label: `Som: ${familia.nome}`,
          callback: () => {
            const novo = proximaFamilia(familiaEscolhida());
            guardarEscolha(novo.id);
            tocar(sortearArquivo(novo), 0.4); // previa, para ouvir antes de decidir
            WA.ui.actionBar.removeButton("escolher-som");
            botaoSom(novo);
          },
        });
      } catch (e) {
        console.warn("[Black Bankers] barra de acao indisponivel:", e);
      }
    };
    botaoSom(familiaEscolhida());

    console.info(
      "[Black Bankers]", FAMILIAS.length, "familias de som | atual:", familiaEscolhida().nome
    );

    bootstrapExtra()
      .then(() => console.info("[Black Bankers] scripting api extra pronta"))
      .catch((e) => console.error(e));
  })
  .catch((e) => console.error(e));

export {};
