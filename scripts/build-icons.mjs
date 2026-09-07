// Gera o ícone do navegador a partir da marca oficial.
//
// `docs/design-system/brand/app-icon-origem.png` é um recorte da prancha de
// identidade e carrega o cinza da composição em volta do quadrado branco. O
// README dos assets pede versões isoladas para uso em favicon, e é isso que
// este script faz: apara o cinza, sobra a marca com fundo transparente, e ela é
// recomposta sobre um quadrado branco arredondado desenhado aqui.
//
// Rode `npm run build:icons` quando a marca mudar. A saída é versionada, então
// o build não depende de gerar imagem.

import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const ORIGEM = "docs/design-system/brand/app-icon-origem.png";
const RAIO = 0.22; // proporção do lado, medida no ícone original
const MARGEM = 0.17; // respiro entre a marca e a borda do quadrado

/** Quadrado branco arredondado, o fundo do ícone de aplicativo da marca. */
function fundo(lado, arredondado) {
  const r = arredondado ? Math.round(lado * RAIO) : 0;
  return Buffer.from(
    `<svg width="${lado}" height="${lado}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${lado}" height="${lado}" rx="${r}" ry="${r}" fill="#ffffff"/>
     </svg>`,
  );
}

async function gerar(destino, lado, arredondado) {
  const marca = await sharp(ORIGEM)
    // O limiar separa o cinza da prancha (242,243,244) do branco do quadrado.
    .trim({ threshold: 12 })
    .resize(Math.round(lado * (1 - MARGEM * 2)), null, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  await sharp(fundo(lado, arredondado))
    .composite([{ input: marca, gravity: "center" }])
    .png()
    .toFile(destino);
  console.log(`${destino}  ${lado}x${lado}`);
}

/**
 * ICO com PNGs embutidos, um por tamanho. O formato aceita PNG desde o Vista, e
 * escrever o cabeçalho à mão evita mais uma dependência só para seis bytes.
 */
async function gerarIco(destino, tamanhos) {
  const imagens = [];
  for (const lado of tamanhos) {
    const marca = await sharp(ORIGEM)
      .trim({ threshold: 12 })
      .resize(Math.round(lado * (1 - MARGEM * 2)), null, { kernel: "lanczos3" })
      .png()
      .toBuffer();
    imagens.push({
      lado,
      dados: await sharp(fundo(lado, true))
        .composite([{ input: marca, gravity: "center" }])
        .png()
        .toBuffer(),
    });
  }

  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0); // reservado
  cabecalho.writeUInt16LE(1, 2); // 1 = ícone
  cabecalho.writeUInt16LE(imagens.length, 4);

  let deslocamento = 6 + imagens.length * 16;
  const entradas = imagens.map(({ lado, dados }) => {
    const entrada = Buffer.alloc(16);
    entrada.writeUInt8(lado >= 256 ? 0 : lado, 0);
    entrada.writeUInt8(lado >= 256 ? 0 : lado, 1);
    entrada.writeUInt8(0, 2); // paleta
    entrada.writeUInt8(0, 3); // reservado
    entrada.writeUInt16LE(1, 4); // planos
    entrada.writeUInt16LE(32, 6); // bits por pixel
    entrada.writeUInt32LE(dados.length, 8);
    entrada.writeUInt32LE(deslocamento, 12);
    deslocamento += dados.length;
    return entrada;
  });

  writeFileSync(
    destino,
    Buffer.concat([cabecalho, ...entradas, ...imagens.map((i) => i.dados)]),
  );
  console.log(`${destino}  ${tamanhos.join(", ")}`);
}

await gerar("src/app/icon.png", 256, true);
// A Apple aplica o próprio arredondamento, então aqui o quadrado é reto.
await gerar("src/app/apple-icon.png", 180, false);
await gerarIco("src/app/favicon.ico", [16, 32, 48]);
