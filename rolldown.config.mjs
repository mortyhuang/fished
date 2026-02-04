import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.js",
  platform: "node",
  external: ["react-devtools-core"],
  output: {
    dir: "dist",
    entryFileNames: "index.js",
    format: "esm",
    banner: "#!/usr/bin/env node",
  },
  outputOptions: {
    codeSplitting: false,
  },
});
