import assert from "node:assert/strict";
import fs from "node:fs";

// Keep the existing build/verify:export entry points, but export only the move
// notice. Vite's inherited public directory also contains historical app files.
const root = new URL("../../dist/", import.meta.url);
const allowed = ["favicon.svg", "index.html"];
const checkOnly = process.argv.includes("--check");

if (!checkOnly) {
  for (const name of fs.readdirSync(root)) {
    if (!allowed.includes(name)) {
      fs.rmSync(new URL(name, root), { recursive: true, force: true });
    }
  }
}

assert.deepEqual(fs.readdirSync(root).sort(), allowed, "Unexpected export files");
for (const name of allowed) {
  assert(fs.statSync(new URL(name, root)).isFile(), `${name} must be a file`);
}

const html = fs.readFileSync(new URL("index.html", root), "utf8");
assert.match(html, /<title>swornbyswarm<\/title>/);
assert.match(html, /<link rel="canonical" href="https:\/\/sworn\.sites\.imd\.fun\/"\s*\/>/);
assert.match(html, /window\.location\.replace\(destination\)/);
assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel="stylesheet"/i);
assert.doesNotMatch(html, /api\.imd\.fun|\bfetch\s*\(|XMLHttpRequest|wagmi|viem|window\.ethereum/);
const bytes = allowed.reduce((total, name) => total + fs.statSync(new URL(name, root)).size, 0);
console.log(`Verified redirect export: ${allowed.length} files, ${bytes} bytes`);
