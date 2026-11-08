import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
const result = await build({ entryPoints: ["tests/editor-preview.tsx"], bundle: true, write: false, platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' } });
const rawCss = await readFile("app/globals.css", "utf8");
const { css } = await postcss([tailwindcss({ content: ["./app/components/pressReleases/**/*.tsx", "./app/components/DirectoryImageCropper.tsx", "./tests/editor-preview.tsx"] })]).process(rawCss, { from: undefined });
createServer((req, res) => {
  if (req.url === "/editor.js") { res.setHeader("Content-Type", "text/javascript"); res.end(result.outputFiles[0].text); }
  else { res.setHeader("Content-Type", "text/html"); res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/editor.js"></script></body></html>`); }
}).listen(4173, "127.0.0.1");
