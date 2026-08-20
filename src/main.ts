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
import gestao from "./gestao.json";
import pontos from "./pontos.json";
import {
  sequenciaVenda, duracaoVenda, sequenciaAgendamento, DURACAO_AGENDAMENTO,
  faixaPorValor, NOME_FAIXA, type Etapa,
} from "./escalas";
import { prepararConfete, soltarConfete } from "./confete";
import { ouvirEventos, type EventoEscritorio } from "./supabase";

type Mesa = { area: string; nomes: string[]; time: string };

// A raiz do mapa so pode ser lida depois do onInit. O script roda a partir
// de assets/, entao caminho relativo apontaria para o lugar errado.
let RAIZ = "";

const EVENTO_RICO = "black-bankers-venda";

type ComemoracaoRica = {
  quem: string;
  tipo: "venda" | "agendamento";
  titulo: string;
  etapas: Etapa[];
  duracao: number;
  x: number; // em tiles, para o confete cair em volta de quem comemorou
  y: number;
};

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

/* getPosition devolve pixels; o mapa raciocina em tiles de 32. */
async function minhaPosicaoEmTiles(): Promise<{ x: number; y: number }> {
  try {
    const p = await WA.player.getPosition();
    return { x: Math.round(p.x / 32), y: Math.round(p.y / 32) };
  } catch {
    return { x: 0, y: 0 };
  }
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
export async function comemorarVenda(quem: string, valor: number) {
  const { faixa, etapas } = sequenciaVenda(valor);
  const onde = await minhaPosicaoEmTiles();
  const dados: ComemoracaoRica = {
    quem: quem || "Alguém",
    tipo: "venda",
    titulo: `${NOME_FAIXA[faixa]} — ${quem}`,
    etapas,
    duracao: duracaoVenda(faixa),
    ...onde,
  };
  WA.event.broadcast(EVENTO_RICO, dados);
  celebrarRico(dados);
}

/* Agendamento de pre-vendas: som unico, faixa curta. */
export async function comemorarAgendamento(quem: string) {
  const onde = await minhaPosicaoEmTiles();
  const dados: ComemoracaoRica = {
    quem: quem || "Alguém",
    tipo: "agendamento",
    titulo: `${quem} agendou uma reunião`,
    etapas: sequenciaAgendamento(),
    duracao: DURACAO_AGENDAMENTO,
    ...onde,
  };
  WA.event.broadcast(EVENTO_RICO, dados);
  celebrarRico(dados);
}

/*
 * Abre a faixa visual no topo. Fica so o tempo da comemoracao e some — a
 * metade de baixo da tela continua livre para andar enquanto isso.
 */
async function abrirComemoracao(e: EventoEscritorio, faixa: string, ms: number) {
  const p = new URLSearchParams({
    tipo: e.tipo,
    quem: e.quem,
    valor: String(e.valor ?? 0),
    cor: e.cor ?? "#C9A227",
    cara: e.caricatura_url ?? "",
    faixa,
    prevendas: e.quem_prevendas ?? "",
    carapre: e.caricatura_prevendas ?? "",
  });
  fecharPainel("comemoracao");
  await abrirPainel("comemoracao", "comemoracao.html?" + p.toString(),
    { vertical: "top", horizontal: "middle" }, { height: "34vh", width: "74vw" });
  window.setTimeout(() => fecharPainel("comemoracao"), ms);
}

/* Evento vindo do dashboard: e a mesma venda que a TV anuncia. */
function celebrarDoDashboard(e: EventoEscritorio) {
  const posicao = { x: pontos.gongo.x, y: pontos.gongo.y };
  if (e.tipo === "agendamento") {
    tocarSequencia(sequenciaAgendamento());
    soltarConfete(posicao.x, posicao.y);
    abrirComemoracao(e, "pequeno", DURACAO_AGENDAMENTO);
    return;
  }
  const { faixa, etapas } = sequenciaVenda(e.valor ?? 0);
  tocarSequencia(etapas);
  soltarConfete(posicao.x, posicao.y);
  abrirComemoracao(e, faixa, duracaoVenda(faixa));
}

function celebrarRico(d: ComemoracaoRica) {
  tocarSequencia(d.etapas);
  soltarConfete(d.x, d.y);
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

// -------------------------------------------------------------- identidade

/*
 * Quem e quem.
 *
 * A pessoa digita o nome que quiser ao entrar, e raramente e igual ao
 * cadastro: ja apareceu "W. Coutinho" para "Coutinho" e "Bruna" para
 * "Bruninha". Entao comparamos palavra a palavra, sem acento.
 *
 * O porem: existem tres Raphaeis no time — Teles, Amaral e Testa. Casar
 * por qualquer palavra abriria o painel do Amaral para o Teles. Por isso
 * so valem as palavras que identificam UMA pessoa: "raphael" aparece em
 * tres mesas e e descartada; "teles", "amaral" e "testa" identificam.
 */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const palavras = (s: string): string[] =>
  normalizar(s).split(/[^a-z0-9]+/).filter((p) => p.length >= 3);

const quantasMesas = new Map<string, number>();
(mesas as Mesa[]).forEach((m) =>
  new Set(m.nomes.flatMap(palavras)).forEach((p) =>
    quantasMesas.set(p, (quantasMesas.get(p) ?? 0) + 1)
  )
);

const distintivas = (m: Mesa): Set<string> =>
  new Set(m.nomes.flatMap(palavras).filter((p) => quantasMesas.get(p) === 1));

function mesmaPessoa(m: Mesa, jogador: string): boolean {
  if (!m.nomes.length || !jogador) return false;
  const minhas = distintivas(m);
  return palavras(jogador).some((p) => minhas.has(p));
}

/* Gestao ve o painel de qualquer mesa, nao so o proprio. */
function ehGestao(jogador: string): boolean {
  const meu = palavras(jogador);
  return (gestao as string[]).some((g) => {
    const dele = palavras(g).filter((p) => quantasMesas.get(p) === 1);
    return dele.some((p) => meu.includes(p));
  });
}

// -------------------------------------------------------------------- mesas

function ligarMesa(mesa: Mesa, eu: string, gestor: boolean) {
  const minha = mesmaPessoa(mesa, eu);
  const podeVer = minha || (gestor && mesa.nomes.length > 0);
  let acao: { remove: () => void } | undefined;

  WA.room.area.onEnter(mesa.area).subscribe(() => {
    if (podeVer) {
      abrirPainel(
        "individual",
        `individual.html?nome=${encodeURIComponent(mesa.nomes[0] ?? eu)}`,
        { vertical: "middle", horizontal: "right" },
        { height: "44vh", width: "23vw" }
      );
    }
    acao = WA.ui.displayActionMessage({
      message: "Aperte ESPAÇO para avisar que você agendou",
      callback: () => comemorarAgendamento(eu),
    });
  });

  WA.room.area.onLeave(mesa.area).subscribe(() => {
    if (podeVer) fecharPainel("individual");
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
        message: "Aperte ESPAÇO para bater o gongo",
        callback: () => comemorarAgendamento(eu),
      });
    });
    WA.room.area.onLeave("gongo").subscribe(() => {
      acaoGongo?.remove();
      acaoGongo = undefined;
    });

    // 5. Cada mesa
    const gestor = ehGestao(eu);
    console.info("[Black Bankers]", eu, gestor ? "(gestão: vê todos os painéis)" : "(vê só o próprio painel)");
    (mesas as Mesa[]).forEach((m) => ligarMesa(m, eu, gestor));

    // 6. Comemoracao disparada por outra pessoa
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


    // Botao de agendar: e o evento que o pre-vendas dispara varias vezes por
    // dia. Fica na barra porque exigir que a pessoa ande ate um lugar para
    // registrar cada agendamento seria atrito demais.
    try {
      WA.ui.actionBar.addButton({
        id: "agendei",
        label: "Agendei",
        bgColor: "#3fbf7f",
        textColor: "#0d1a14",
        toolTip: "Avisa a sala que você marcou uma reunião",
        callback: () => comemorarAgendamento(eu),
      });
    } catch (e) {
      console.warn("[Black Bankers] botao de agendamento indisponivel:", e);
    }

    // 8. Liga no dashboard: agendamento e venda passam a comemorar sozinhos.
    ouvirEventos((e) => {
      console.info("[Black Bankers] evento do dashboard:", e.tipo, e.quem, e.valor ?? "");
      celebrarDoDashboard(e);
    });

    prepararConfete().then((ok) =>
      console.info("[Black Bankers] confete", ok ? "pronto" : "indisponivel")
    );


    // 9. Camera: sem isto o mapa inteiro cabe na tela e o personagem fica
    //    minusculo. A largura menor que a altura desloca o foco para a
    //    direita, compensando a barra lateral que cobre o quarto esquerdo.
    WA.player.getPosition().then((p) =>
      WA.camera.set(Math.round(p.x), Math.round(p.y), 640, 420, false, true)
    ).catch(() => undefined);
    WA.camera.followPlayer(true);

    bootstrapExtra()
      .then(() => console.info("[Black Bankers] scripting api extra pronta"))
      .catch((e) => console.error(e));
  })
  .catch((e) => console.error(e));

export {};
