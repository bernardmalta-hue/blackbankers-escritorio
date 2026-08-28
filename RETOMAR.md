# Prompt para retomar — QG Black Bankers (WorkAdventure)

Cole o texto abaixo inteiro na primeira mensagem da sessão nova.

---

Estou continuando o **QG Black Bankers**: um escritório virtual em WorkAdventure que
espelha o dashboard comercial (Lovable + Supabase). O projeto está em
`C:\Users\Bernard\Downloads\Cruzamento base com clientes mapeados\blackbankers-escritorio`.
Não é um projeto git.

Leia este briefing inteiro antes de mexer em qualquer coisa. Ele existe porque quase tudo
aqui já foi descoberto do jeito difícil.

## Regras que não se negociam

- **Nada com custo.** Só plano gratuito, em tudo.
- **Fonte única com o dashboard.** Se um número ou uma regra muda num, muda no outro. Não
  quero as duas telas contando histórias diferentes sobre a mesma venda.
- **Protótipo antes de publicar.** Me mostre como vai ficar antes de subir.
- `MAP_STORAGE_API_KEY` vive em `.env.secret`. Nunca imprima o valor.
- `UPLOAD_DIRECTORY` **nunca** pode apontar para a raiz do armazenamento — o upload
  sobrescreve o diretório de destino inteiro. Hoje é `black-bankers-obra`.
- **Nunca rode `tools/mobiliar.cjs`** sem me avisar: ele reescreve o `.wam` inteiro e apaga
  a mobília que eu posicionei no editor.
- Publicar é `npm run publicar`. Ele já preserva o `.wam` do servidor.

## Como a coisa é montada

O `escritorio.tmj` é o mapa (tiles, colisões, áreas). O `escritorio.wam` é a **mobília que
eu arrasto no editor do WorkAdventure** — ele mora no servidor e é retirado do envio por
`tools/preservar-wam.cjs`. Não tente gerenciá-lo pelo repositório.

`src/main.ts` é o script do mapa. `public/painel/*` são as telas (barra lateral, faixa de
comemoração, bancada de testes). Ferramentas em `tools/`, todas comentadas explicando o
porquê de existirem.

Pipeline de geração do mapa: `tools/planta-wa.cjs` gera a planta, e depois rodam os
pós-passos — `tools/parede-branca.cjs` (cor das paredes) e `tools/audio-lideranca.cjs`
(quem ouve quem na sala da liderança). **Se regerar a planta, rode os pós-passos**, senão
o trabalho deles some sem erro nenhum.

## Armadilhas do WorkAdventure que já custaram caro

Estas eu descobri depurando. Não repita.

1. **Um painel não ganha `window.WA` de graça.** O script do *mapa* recebe a API injetada;
   um painel aberto por `openCoWebSite` é um site como outro qualquer e precisa carregar
   `https://play.workadventu.re/iframe_api.js`. O `allowApi` só autoriza a ponte, não a
   levanta. Sem isso, todo `if (window.WA)` falha em silêncio.
2. **`WA.players.configureTracking()` é obrigatório antes de `list()`.** Sem ele a lista vem
   vazia, sem erro.
3. **O personagem (Woka) de outra pessoa não existe na API.** Cada cliente publica o seu
   numa variável pública (`bb-woka`). Só funciona enquanto a pessoa está conectada — não há
   como mostrar o personagem de quem está offline sem gravar a imagem em algum servidor.
4. **O nome digitado na sala não é o do cadastro.** O Amaral entra como "Raphinha". Nenhuma
   comparação de texto casa os dois. A tradução está em `src/mesas.json` e o mapa publica o
   nome já resolvido em `bb-nome`.
5. **O `<iframe>` do WorkAdventure tem fundo branco próprio**, fora do nosso alcance. Um
   documento transparente aparece como tarja branca. Todo painel pinta o próprio fundo.
6. **`openCoWebSite` encolhe o canvas do jogo; `ui.website.open` flutua por cima.** A barra
   lateral usa o primeiro de propósito — flutuando, ela virava uma parede branca.
7. **O tamanho do painel é % do container do WorkAdventure**, não da janela (medido:
   1798×916 numa janela de 2133×1012). Layout em pixel fixo quebra em telas menores. A
   faixa de comemoração resolve desenhando em 1330×311 fixos e aplicando um `scale` único.
8. **Temporizadores dentro do iframe do jogo são estrangulados.** Animação tem que ser CSS.
   Elementos criados dentro de `setTimeout` podem nunca aparecer — foi assim que os fogos
   de artifício sumiram. `requestAnimationFrame` também não serve.
9. **O script do mapa roda num iframe escondido e não recebe tecla nenhuma.** O único
   atalho de teclado disponível é o ESPAÇO do `WA.ui.displayActionMessage`.
10. **Não existe API de Jitsi.** Não dá para entrar numa sala Jitsi por script, então não dá
    para trocar a tarja "Enter Jitsi" por um botão nosso na barra do topo.
11. **`silent` corta a conversa por proximidade**; a documentação não diz o que acontece se
    sobrepor com `jitsiRoom`. Por isso as áreas de silêncio da liderança são o *complemento
    exato* das áreas de conversa — nenhum tile é os dois.
12. **`buildmap` varre `**/*.tmj`.** Um `.tmj` perdido em qualquer pasta quebra o build.
    (Aconteceu duas vezes; por isso os snapshots são salvos como `.tmj.json`.)
13. **No `sharp`, `extend` e `extract` na mesma cadeia não rodam na ordem escrita** — ele
    tem ordem fixa e o extract vai antes. Separe em duas passagens.

## O que está no ar hoje

**Barra lateral** (`public/painel/lateral.html` + `dados.js` + `cards.js`): ranking de
vendas e pré-vendas lido do espelho `escritorio_placar` no Supabase
(`ufsupofuypwlfdmeatiq`). Avatar segue três níveis — personagem se a pessoa está na sala,
caricatura do cadastro se não está, silhueta na cor dela se nem isso. Rótulos do ranking:
Raphael Amaral aparece como **Raphinha**, Rafael Testa como **Testa**, Raphael Teles como
**Teles** (havia três "Raphael" indistinguíveis). **Mari** está fora do ranking de
propósito; o número macro do topo vem do agregado do dashboard e continua contando ela.

**Faixa de comemoração** (`public/painel/comemoracao.html`): três colunas — quem fez / o
fato / a outra ponta. Dispara por evento do Supabase (`escritorio_eventos`). Escala de som
em `src/escalas.ts`: caixa registradora 1/1/2/3/3 conforme a faixa, tambor da faixa, buzina
no reveal, e fanfarra (cortada em 3,3 s) só na épica e na lendária. Confete em duas ondas,
fogos na épica e lendária, dois bateristas animados que tocam exatamente durante o som do
tambor, e o valor crescendo até 150 px 1,5 s depois do reveal. A cauda da faixa é
**calculada**, não uma tabela na mão.

**Sala da liderança**: silêncio por padrão em todo tile que não é área de conversa; uma sala
de Jitsi por líder, na própria mesa (`ESPAÇO: falar com Bernard/Raphinha/Testa/Teles`); e um
canto em (35,6) com `ESPAÇO: conversa aberta` para quando é para todos.

**Barra do topo**: `⌖` volta para a minha mesa, `◧` recolhe a barra de resultados. Quando
uma conversa termina, aparece "Aperte ESPAÇO para voltar para a sua mesa" por 25 s.

## O que ficou em aberto

- **Personagem de quem está offline.** Hoje quem não está na sala aparece com a caricatura.
  Mostrar o personagem exigiria gravar as imagens numa tabela do Supabase, o que abre uma
  porta de escrita pública com a chave que já está no painel. **Não decidi ainda.**
- **Fanfarra.** O corte em 3,3 s cai com a música em volume cheio, no meio da frase; o fim
  natural é aos 4,5 s (`MS_FANFARRA` em `src/sons.ts`). E ela toca junto com a buzina por
  2,1 s. Preciso ouvir e decidir.
- **Cores da LIA e da Principia** nos selos de plataforma são escolhidas, não oficiais.
- **"O time não conseguia entrar na sala da liderança"** — não foi reproduzido. A porta é
  uma abertura de 2 tiles em (26,9)-(26,10), aberta no mapa de colisões e sem móvel em cima.
  Pode ter sido o efeito da área de Jitsi antiga, que já saiu.
- **Revogar a chave da API do Gather** em https://gather.town/apiKeys — pendência minha.
- Nada disso foi visto rodando dentro do jogo: a verificação foi por medição e conferência
  dos arquivos publicados.

## Como você deve trabalhar comigo

Comentário no código explica **por que**, não o que — e nomeia o que deu errado antes,
porque é isso que impede alguém de refazer o erro. Escreva em português. Antes de mudar
layout, me mostre um protótipo. E quando algo não der para verificar daqui, me diga
claramente em vez de afirmar que está funcionando.
