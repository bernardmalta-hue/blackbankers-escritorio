/*
 * supabase.ts — ligacao ao vivo com o dashboard.
 *
 * A chave publicavel abaixo fica visivel: este repositorio e publico e o
 * script roda no navegador de cada pessoa. Isso e o modelo normal do
 * Supabase — a chave nao da acesso a nada por si so, quem decide e o RLS.
 *
 * Do banco inteiro, esta chave enxerga UMA tabela: escritorio_eventos, e
 * so as ultimas 24 horas dela. Ela contem apenas o que ja vai aparecer
 * escrito na parede da sala — nome, cor, caricatura e valor. Nada de
 * appointments, payments, leads ou qualquer coisa que identifique cliente.
 */

import { createClient } from "@supabase/supabase-js";

const URL = "https://ufsupofuypwlfdmeatiq.supabase.co";
const CHAVE = "sb_publishable_yg2YTcTHgW5SZ-q2VpIMdw_NzP9f2Ak";

export type EventoEscritorio = {
  id: number;
  tipo: "agendamento" | "venda";
  quem: string;
  cor: string | null;
  caricatura_url: string | null;
  valor: number | null;
  quem_prevendas: string | null;
  caricatura_prevendas: string | null;
  appointment_id: number | null;
  criado_em: string;
};

const cliente = createClient(URL, CHAVE, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

/*
 * Chama `aoReceber` para cada evento novo.
 *
 * Cada pessoa na sala recebe o mesmo evento do Supabase, entao a
 * comemoracao acontece na tela de todo mundo sem precisar de broadcast do
 * WorkAdventure. Quem entrar depois nao recebe os antigos.
 */
export function ouvirEventos(aoReceber: (e: EventoEscritorio) => void): () => void {
  const canal = cliente
    .channel("escritorio-black-bankers")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "escritorio_eventos" },
      (payload) => aoReceber(payload.new as EventoEscritorio)
    )
    .subscribe((status) =>
      console.info("[Black Bankers] canal do dashboard:", status)
    );

  return () => {
    cliente.removeChannel(canal);
  };
}

/* Lista de hoje, para os paineis da barra lateral. */
export async function eventosDeHoje(): Promise<EventoEscritorio[]> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const { data, error } = await cliente
    .from("escritorio_eventos")
    .select("*")
    .gte("criado_em", inicio.toISOString())
    .order("criado_em", { ascending: false });
  if (error) {
    console.warn("[Black Bankers] nao consegui ler os eventos de hoje:", error.message);
    return [];
  }
  return (data ?? []) as EventoEscritorio[];
}
