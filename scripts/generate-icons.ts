import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
mkdirSync("public/icons", { recursive: true });
const svg = readFileSync("public/icon.svg");
await Promise.all(
  [192, 512].map((size) =>
    sharp(svg).resize(size, size).png().toFile(`public/icons/icon-${size}.png`),
  ),
);
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0B0D10" },
})
  .composite([
    {
      input: await sharp(svg).resize(400, 400).png().toBuffer(),
      left: 56,
      top: 56,
    },
  ])
  .png()
  .toFile("public/icons/icon-maskable-512.png");
