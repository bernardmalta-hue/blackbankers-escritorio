/*
 * sons.ts — a lista de sons da comemoracao e a escolha de cada pessoa.
 *
 * A escolha fica guardada no proprio jogador (WA.player.state), entao ela
 * acompanha a pessoa e nao o computador: entrou de outra maquina, o som
 * dela vem junto.
 */

export type Som = { id: string; nome: string; arquivo: string };

export const SONS: Som[] = [
  { id: "gongo", nome: "Gongo", arquivo: "gongo.wav" },
  { id: "buzina", nome: "Buzina", arquivo: "buzina.wav" },
  { id: "sino", nome: "Sino", arquivo: "sino.wav" },
  { id: "fanfarra", nome: "Fanfarra", arquivo: "fanfarra.wav" },
  { id: "caixa", nome: "Caixa registradora", arquivo: "caixa.wav" },
  { id: "apito", nome: "Apito de estádio", arquivo: "apito.wav" },
  { id: "aplauso", nome: "Aplauso", arquivo: "aplauso.wav" },
];

const CHAVE = "somComemoracao";

export function somPorId(id: string | undefined): Som {
  return SONS.find((s) => s.id === id) ?? SONS[0];
}

export function somEscolhido(): Som {
  try {
    return somPorId(WA.player.state[CHAVE] as string | undefined);
  } catch {
    return SONS[0];
  }
}

export function guardarEscolha(id: string): void {
  try {
    WA.player.state.saveVariable(CHAVE, id, {
      persist: true,
      public: true, // publico para que os outros ouçam o som de quem tocou
      scope: "world",
    });
  } catch {
    // Se o plano nao permitir variavel persistente, a escolha vale so na sessao.
    try {
      WA.player.state[CHAVE] = id;
    } catch {
      /* segue com o som padrao */
    }
  }
}

export function proximoSom(atual: Som): Som {
  const i = SONS.findIndex((s) => s.id === atual.id);
  return SONS[(i + 1) % SONS.length];
}
