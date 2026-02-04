#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const URL =
  "https://raw.githubusercontent.com/lanceliao/china-holiday-calender/master/holidayAPI.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../data/holidayAPI.json");

async function main() {
  const res = await fetch(URL, {
    headers: { "User-Agent": "fished-holiday-updater" },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  JSON.parse(text);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, text, "utf8");
  console.log(`Updated: ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
