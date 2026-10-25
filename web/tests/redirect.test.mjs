import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { test } from "node:test";

const root = new URL("../../dist/", import.meta.url);
const html = fs.readFileSync(new URL("index.html", root), "utf8");
const destination = "https://sworn.sites.imd.fun/";
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

test("the export contains only the page and original favicon", () => {
  assert.deepEqual(fs.readdirSync(root).sort(), ["favicon.svg", "index.html"]);
  assert.equal(
    fs.readFileSync(new URL("favicon.svg", root), "utf8"),
    fs.readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8"),
  );
  assert.equal(scripts.length, 1);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel="stylesheet"/i);
  assert.doesNotMatch(html, /api\.imd\.fun|\bfetch\s*\(|XMLHttpRequest|ethereum|wagmi|viem/i);
});

test("copy, metadata, canonical URL and no-script refresh are exact", () => {
  assert.match(html, /<title>swornbyswarm<\/title>/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1>Sworn has moved<\/h1>/);
  assert.match(html, /<p>This page served Sworn's first public version \(swarm launch #2404\)\. Sworn now lives at sworn\.sites\.imd\.fun\.<\/p>/);
  assert.match(html, /<a id="open-sworn" href="https:\/\/sworn\.sites\.imd\.fun\/">Open Sworn<\/a>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sworn\.sites\.imd\.fun\/"\s*\/>/);
  assert.match(html, /<noscript>\s*<meta http-equiv="refresh" content="1;url=https:\/\/sworn\.sites\.imd\.fun\/"\s*\/>\s*<\/noscript>/);
  for (const field of ['name="description"', 'property="og:title"', 'property="og:image"']) {
    assert(html.includes(field), `${field} missing`);
  }
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"\s*\/>/);
  assert.match(html, /<meta property="og:image" content="\.\/favicon\.svg"\s*\/>/);
});

test("the exact production script updates the link before one immediate history replacement", () => {
  for (const hash of ["", "#", "#/", "#/explorer", "#/mint", "#/wallet", "#/catalog", "#/how-it-works", "#/integrate", "#/mint?currency=ETH#add-traits", "#encoded%20route%2Fkept", "#https://example.org/"]) {
    const events = [];
    const link = {};
    Object.defineProperty(link, "href", {
      set(value) { events.push(["link", value]); },
    });
    const context = {
      document: {
        getElementById(id) {
          assert.equal(id, "open-sworn");
          return link;
        },
      },
      window: { location: { hash, replace(url) { events.push(["replace", url]); } } },
    };
    // No timers, network, storage, wallet or history mutation API is provided.
    vm.runInNewContext(scripts[0][1], context, { timeout: 1000 });
    assert.deepEqual(events, [["link", destination + hash], ["replace", destination + hash]]);
  }
});
