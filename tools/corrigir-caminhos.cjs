/*
 * corrigir-caminhos.cjs — conserta separador de pasta nos mapas gerados.
 *
 * Rodar SEMPRE depois do buildmap e antes do upload.
 *
 * O otimizador de mapas monta o caminho do script com path.join. No Windows
 * isso produz "assets\src-main-xxxx.html" — com barra invertida. O
 * WorkAdventure trata esse valor como URL, e URL nao tem barra invertida,
 * entao o script nunca carrega e nada no mapa funciona: sem paineis, sem
 * buzina, sem comemoracao. E falha silenciosa, nao aparece erro no mapa.
 *
 * Quem builda no Linux nunca ve esse problema. Nos buildamos no Windows.
 */

const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");

if (!fs.existsSync(dist)) {
  console.error("dist/ nao existe. Rode o buildmap antes.");
  process.exit(1);
}

let corrigidos = 0;

for (const arquivo of fs.readdirSync(dist).filter((f) => f.endsWith(".tmj"))) {
  const caminho = path.join(dist, arquivo);
  const mapa = JSON.parse(fs.readFileSync(caminho, "utf8"));
  let mexeu = false;

  for (const prop of mapa.properties || []) {
    if (typeof prop.value === "string" && prop.value.includes("\\")) {
      const antes = prop.value;
      prop.value = prop.value.split("\\").join("/");
      console.log(`  ${arquivo}: ${prop.name}  ${antes} -> ${prop.value}`);
      mexeu = true;
    }
  }

  for (const ts of mapa.tilesets || []) {
    if (typeof ts.image === "string" && ts.image.includes("\\")) {
      ts.image = ts.image.split("\\").join("/");
      mexeu = true;
    }
  }

  if (mexeu) {
    fs.writeFileSync(caminho, JSON.stringify(mapa));
    corrigidos++;
  }
}

console.log(
  corrigidos ? `${corrigidos} mapa(s) corrigido(s).` : "nada a corrigir."
);
