import { build } from "esbuild";
await build({
  entryPoints: ["src/bug/main.js"],
  bundle: true,
  outfile: "dist/bug.js",
  sourcemap: true,
  minify: true,
  target: "es2020",
  alias: { cannon: "./src/lib/cannon/cannon.js" },
  external: ["/assets/*"],
  legalComments: "eof",
  logLevel: "info",
});
