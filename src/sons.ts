/*
 * sons.ts — as familias de som da comemoracao e a escolha de cada pessoa.
 *
 * Cada familia tem varios arquivos. A cada comemoracao sorteamos um deles,
 * entao a mesma pessoa tocando dez vezes no dia nao ouve dez vezes o mesmo
 * audio. Foi assim que o dashboard ja fazia na tela da TV.
 *
 * Buzina, caixa registradora e tambor vieram do proprio dashboard
 * (public/sounds/tv). O resto e sintetizado em tools/gerar-sons.cjs.
 *
 * A escolha fica em WA.player.state: acompanha a pessoa, nao a maquina.
 */

export type Familia = { id: string; nome: string; arquivos: string[] };

export const FAMILIAS: Familia[] = [
  { id: "buzina", nome: "Buzina", arquivos: ["buzina/1.mp3", "buzina/2.mp3", "buzina/3.mp3", "buzina/4.mp3"] },
  { id: "caixa", nome: "Caixa registradora", arquivos: ["caixa/1.mp3", "caixa/2.mp3", "caixa/3.mp3", "caixa/4.mp3", "caixa/5.mp3", "caixa/6.mp3"] },
  { id: "tambor", nome: "Tambor", arquivos: ["tambor/pequeno.mp3", "tambor/medio.mp3"] },
  { id: "gongo", nome: "Gongo", arquivos: ["gongo.wav"] },
  { id: "sino", nome: "Sino", arquivos: ["sino.wav"] },
  { id: "fanfarra", nome: "Fanfarra", arquivos: ["fanfarra.wav"] },
  { id: "apito", nome: "Apito de estádio", arquivos: ["apito.wav"] },
  { id: "aplauso", nome: "Aplauso", arquivos: ["aplauso.wav"] },
];

// Tambores longos, para quando a venda for grande. Ainda nao ligados —
// esperam o valor da venda vir do Supabase.
export const TAMBOR_POR_PORTE: Record<string, string> = {
  grande: "tambor/grande.mp3",
  epico: "tambor/epico.mp3",
  lendario: "tambor/lendario.mp3",
};

const CHAVE = "somComemoracao";

export function familiaPorId(id: string | undefined): Familia {
  return FAMILIAS.find((f) => f.id === id) ?? FAMILIAS[0];
}

export function familiaEscolhida(): Familia {
  try {
    return familiaPorId(WA.player.state[CHAVE] as string | undefined);
  } catch {
    return FAMILIAS[0];
  }
}

export function sortearArquivo(f: Familia): string {
  return f.arquivos[Math.floor(Math.random() * f.arquivos.length)];
}

export function guardarEscolha(id: string): void {
  try {
    WA.player.state.saveVariable(CHAVE, id, {
      persist: true,
      public: true,
      scope: "world",
    });
  } catch {
    try {
      WA.player.state[CHAVE] = id;
    } catch {
      /* sem persistencia: vale so nesta sessao */
    }
  }
}

export function proximaFamilia(atual: Familia): Familia {
  const i = FAMILIAS.findIndex((f) => f.id === atual.id);
  return FAMILIAS[(i + 1) % FAMILIAS.length];
}
