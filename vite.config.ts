import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "supabase",
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 20,
            },
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 15,
            },
            { name: "vendor", test: /node_modules/, priority: 10 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    {
      name: "arc-shell",
      apply: "build",
      closeBundle() {
        const assets = readdirSync("dist/assets").map((f) => "/assets/" + f);
        const shell = [
          "/index.html",
          "/manifest.webmanifest",
          "/icon.svg",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
          "/icons/icon-maskable-512.png",
          ...assets,
        ];
        const fingerprint = createHash("sha256");
        for (const path of shell)
          fingerprint.update(readFileSync("dist" + path));
        const version = fingerprint.digest("hex").slice(0, 16);
        const sw = readFileSync("public/sw.js", "utf8")
          .replace("__APP_SHELL__", JSON.stringify(shell))
          .replace("__CACHE_NAME__", `arc-shell-${version}`);
        writeFileSync("dist/sw.js", sw);
      },
    },
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
