import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "dist");

await build({
  entryPoints: [resolve(__dirname, "build-entry/defuddle-entry.js")],
  bundle: true,
  format: "iife",
  globalName: "PineSnapDefuddle",
  outfile: resolve(outDir, "defuddle.bundle.js"),
  target: ["chrome120"],
  platform: "browser",
  sourcemap: true,
  minify: false,
  logLevel: "info",
});

console.log(`[build] defuddle bundle written to ${outDir}`);
