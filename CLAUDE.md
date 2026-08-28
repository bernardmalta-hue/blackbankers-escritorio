# Convenções do projeto — Escritório (WorkAdventure)

## ⚠️ NUNCA leia `escritorio.tmj` inteiro

**Esta é a regra mais importante deste repositório.** Ignorá-la queima cota de tokens
absurdamente rápido — foi medido.

`escritorio.tmj` tem **7.479 linhas**, das quais **6.734 (90%) são linhas contendo apenas um
número de tile**. São 8 camadas de 962 tiles cada (mapa 37×26), escritas uma por linha.

| Ação | Custo |
| --- | ---: |
| Ler `escritorio.tmj` inteiro | **18.487 tokens** · 4 chamadas de `Read` · 90% números sem significado |
| Ler `tools/gerar-mapa.cjs` + `tools/base.json` | **4.580 tokens** · 100% semântico |
| Extrair só os objetos (o de-para) | **193 tokens** |

**95× de diferença** entre ler o arquivo e extrair o que se queria dele.

E o custo não é só na leitura: depois de lido, o arquivo **fica no contexto e é reenviado a
cada requisição seguinte**. Trinta chamadas de ferramenta depois de abrir o `.tmj` = **555 mil
tokens** só reenviando arrays de tile.

### Por que ele é assim

`tools/gerar-mapa.cjs:374` — `JSON.stringify(mapa, null, 1)`. O indent de 1 espaço explode
cada array de tiles em uma linha por número. É correto para o Tiled e para o diff do git; é
péssimo para um agente ler.

### O que fazer em vez disso

**1. O `.tmj` é saída, não fonte.** Para entender ou mudar o mapa, leia
`tools/gerar-mapa.cjs` e `tools/base.json`. É de lá que ele nasce.

**2. Nunca escreva o `.tmj` pela mão do agente.** Rode o gerador — ele já imprime o resumo:

```bash
node tools/gerar-mapa.cjs
# escrito: escritorio.tmj
# grade:     37 x 26 tiles  (1184 x 832 px)
# piso / paredes / moveis / colisoes / areas (N mesas)
```

Seis linhas (~50 tokens) em vez de 18.487.

**3. Para consultar o mapa, extraia — não leia.** O de-para de áreas (mesas, salas, gongo,
placar) sai assim:

```bash
python3 -c "
import json
d=json.load(open('escritorio.tmj'))
def objs(ls):
    for l in ls:
        if l.get('type')=='group': yield from objs(l.get('layers',[]))
        for o in (l.get('objects') or []): yield o
for o in sorted(objs(d['layers']), key=lambda o: o.get('name','')):
    if o.get('name'): print(f\"{o['name']:22s} tile ({int(o['x']//32)},{int(o['y']//32)})\")
"
```

São 20 objetos: 12 mesas, 3 salas de reunião, sala grande, copa, gongo, placar, painel.

**4. Se precisar mesmo de tiles**, filtre por camada com `jq` em vez de abrir o arquivo:

```bash
jq '.layers[] | select(.name=="collisions") | .data | length' escritorio.tmj
```

## Outros arquivos caros

| Arquivo | Tamanho | Regra |
| --- | ---: | --- |
| `package-lock.json` | 512 KB (~131k tokens) | nunca ler; use `jq` ou `npm ls` |
| `tilesets/*.png` | ~700 KB no total | são spritesheets — ler como imagem não diz nada útil (~4k tokens por nada) |
| `public/som/*.mp3` | ~2 MB | nunca; são áudio |

## Estrutura

- `tools/gerar-mapa.cjs` — **a fonte do mapa**. Gera `escritorio.tmj` a partir de `base.json`.
- `tools/base.json` — parâmetros do mapa.
- `src/` — runtime do WorkAdventure (`main.ts`, `sons.ts`, `supabase.ts`, `confete.ts`,
  `escalas.ts`) e os de-para em JSON (`mesas.json`, `gestao.json`, `pontos.json`).
- `escritorio.tmj` — **saída gerada**. Tratar como build artifact.
