import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "@playwright/test";

const root = new URL("../../", import.meta.url);
const out = new URL("test/scratch/redirect/", root);
const html = await fs.readFile(new URL("dist/index.html", root));
const favicon = await fs.readFile(new URL("dist/favicon.svg", root));
const destination = "https://sworn.sites.imd.fun/";
const sentence = "This page served Sworn's first public version (swarm launch #2404). Sworn now lives at sworn.sites.imd.fun.";
await fs.mkdir(out, { recursive: true });

// /inspect/ serves identical export bytes. Its response policy pauses the inline
// script for visual/keyboard inspection; JS remains enabled, so noscript is inert.
// Redirect and no-JS tests below use /preview/ without that policy.
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  res.setHeader("Cache-Control", "no-store");
  if (path === "/before") {
    res.setHeader("Content-Type", "text/html");
    return res.end("<!doctype html><title>Previous page</title><p>Previous page</p>");
  }
  if (["/preview/", "/preview/index.html", "/inspect/"].includes(path)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (path === "/inspect/") res.setHeader("Content-Security-Policy", "script-src 'none'");
    return res.end(html);
  }
  if (["/preview/favicon.svg", "/inspect/favicon.svg"].includes(path)) {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.end(favicon);
  }
  res.writeHead(404).end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const results = [];
const record = (browser, name, details = {}) => {
  results.push({ browser, name, passed: true, ...details });
  console.log(`PASS ${browser}: ${name}`);
};

function contrast(foreground, background) {
  const luminance = (rgb) => rgb.match(/\d+/g).slice(0, 3).map(Number)
    .map((value) => value / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(foreground), b = luminance(background);
  return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
}

async function contextFor(browser, options = {}) {
  const context = await browser.newContext(options);
  const unexpected = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(base + "/")) return route.continue();
    if (url.startsWith(destination)) {
      return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Navigation destination</title><p>Navigation destination</p>" });
    }
    unexpected.push(url);
    return route.abort();
  });
  return { context, unexpected };
}

try {
  const engines = process.argv.includes("--chromium-only")
    ? [["Chromium", chromium]]
    : [["Chromium", chromium], ["WebKit", webkit]];
  for (const [name, engine] of engines) {
    const browser = await engine.launch({ headless: true });
    try {
      const { context, unexpected } = await contextFor(browser);
      const page = await context.newPage();
      const scriptErrors = [];
      const consoleErrors = [];
      page.on("pageerror", (error) => scriptErrors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

      const hashes = ["", "#/", "#/explorer", "#/mint", "#/wallet", "#/catalog", "#/how-it-works", "#/integrate", "#/mint?currency=ETH#add-traits", "#encoded%20route%2Fkept"];
      for (const hash of hashes) {
        await page.goto(base + "/before");
        await page.goto(base + "/preview/?old=query" + hash, { waitUntil: "commit" });
        await page.waitForURL(destination + hash);
        assert.equal(page.url(), destination + hash);
        await page.goBack();
        assert.equal(page.url(), base + "/before", "Back must skip the redirect page");
      }
      record(name, "immediate hash-preserving redirect and Back skips the move page", { routes: hashes.length });
      await page.goto(base + "/preview/index.html#/wallet", { waitUntil: "commit" });
      await page.waitForURL(destination + "#/wallet");
      record(name, "index.html entry also preserves its hash");
      assert.deepEqual(scriptErrors, []);
      assert.deepEqual(consoleErrors, []);
      record(name, "redirect sessions have no console errors or uncaught script errors");
      assert.deepEqual(unexpected, []);
      await context.close();

      const noJS = await contextFor(browser, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const fallback = await noJS.context.newPage();
      const started = performance.now();
      await fallback.goto(base + "/preview/#/wallet", { waitUntil: "domcontentloaded" });
      assert.equal(await fallback.locator("h1").textContent(), "Sworn has moved");
      assert.equal(await fallback.locator("p").textContent(), sentence);
      assert.equal(await fallback.getByRole("link", { name: "Open Sworn" }).getAttribute("href"), destination);
      await fallback.screenshot({ path: fileURLToPath(new URL(`${name.toLowerCase()}-no-js.png`, out)) });
      await fallback.waitForURL(destination);
      const refreshMs = Math.round(performance.now() - started);
      assert(refreshMs >= 850, `Refresh was early: ${refreshMs}ms`);
      record(name, "no-JavaScript refresh goes to the base URL after one second", { refreshMs });
      await fallback.goto(base + "/preview/", { waitUntil: "domcontentloaded" });
      await fallback.getByRole("link", { name: "Open Sworn" }).click({ noWaitAfter: true });
      await fallback.waitForURL(destination);
      record(name, "manual Open Sworn link works without JavaScript");
      assert.deepEqual(noJS.unexpected, []);
      await noJS.context.close();

      const inspect = await contextFor(browser);
      const view = await inspect.context.newPage();
      const failed = [];
      const resources = [];
      view.on("requestfailed", (request) => failed.push(request.url()));
      view.on("response", (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
      view.on("request", (request) => resources.push(request.url()));
      await view.goto(base + "/inspect/");
      assert.equal(await view.title(), "swornbyswarm");
      assert.equal(await view.locator("h1").count(), 1);
      assert.equal(await view.locator("p").count(), 1);
      assert.equal(await view.locator("a").count(), 1);
      assert.equal(await view.locator("p").textContent(), sentence);
      assert.equal(await view.locator("link[rel=canonical]").getAttribute("href"), destination);
      assert.equal(await view.locator("meta[property='og:image']").getAttribute("content"), "./favicon.svg");
      const iconResponse = await inspect.context.request.get(base + "/inspect/favicon.svg");
      assert.equal(iconResponse.status(), 200);

      const geometry = [];
      for (const width of [320, 390, 768, 1440]) {
        await view.setViewportSize({ width, height: 844 });
        const values = await view.evaluate(() => {
          const action = document.querySelector("a");
          const box = action.getBoundingClientRect();
          const heading = getComputedStyle(document.querySelector("h1"));
          const body = getComputedStyle(document.body);
          return {
            width: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            actionBottom: box.bottom,
            actionHeight: box.height,
            headingSize: heading.fontSize,
            bodySize: body.fontSize,
            fontFamily: body.fontFamily,
            color: body.color,
            background: getComputedStyle(document.documentElement).backgroundColor,
            linkColor: getComputedStyle(action).color,
          };
        });
        assert(values.scrollWidth <= width, `Overflow at ${width}`);
        assert(values.actionBottom <= 844, `Action below first screen at ${width}`);
        assert(values.actionHeight >= 44);
        geometry.push(values);
        await view.screenshot({ path: fileURLToPath(new URL(`${name.toLowerCase()}-${width}.png`, out)), fullPage: true });
      }
      record(name, "responsive fallback and first-screen action", { geometry });

      const background = geometry[0].background;
      const ratios = {
        text: contrast(geometry[0].color, background),
        link: contrast(geometry[0].linkColor, background),
      };
      await view.locator("a").hover();
      const hoverColor = await view.locator("a").evaluate((a) => getComputedStyle(a).color);
      assert.equal(hoverColor, "rgb(219, 254, 230)");
      ratios.hover = contrast(hoverColor, background);
      await view.mouse.down();
      const activeColor = await view.locator("a").evaluate((a) => getComputedStyle(a).color);
      assert.equal(activeColor, "rgb(217, 224, 218)");
      await view.mouse.move(0, 0);
      await view.mouse.up();
      for (const ratio of Object.values(ratios)) assert(ratio >= 4.5);
      record(name, "hover, active and rendered color contrast", { ratios });

      // Start a fresh document so the earlier mouse test has not advanced the
      // browser's sequential focus position past the page's only link.
      await view.goto(base + "/inspect/");
      await view.setViewportSize({ width: 390, height: 844 });
      await view.keyboard.press("Tab");
      assert.equal(await view.locator("a").evaluate((a) => a === document.activeElement), true);
      const focus = await view.locator("a").evaluate((a) => ({ outline: getComputedStyle(a).outlineStyle, width: getComputedStyle(a).outlineWidth }));
      assert.equal(focus.outline, "solid");
      assert.equal(focus.width, "2px");
      await view.screenshot({ path: fileURLToPath(new URL(`${name.toLowerCase()}-focus.png`, out)) });
      await view.keyboard.press("Enter");
      await view.waitForURL(destination);
      record(name, "keyboard focus and Enter activate the fallback link", { focus });

      await view.goto(base + "/inspect/");
      await view.setViewportSize({ width: 320, height: 844 });
      await view.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const resized = await view.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert(resized.scrollWidth <= resized.width);
      await view.screenshot({ path: fileURLToPath(new URL(`${name.toLowerCase()}-text-200.png`, out)), fullPage: true });
      record(name, "200% text resize at 320px reflows without horizontal overflow");
      assert.deepEqual(failed, []);
      assert.deepEqual(inspect.unexpected, []);
      assert(resources.every((url) => url.startsWith(base + "/") || url.startsWith(destination)));
      record(name, "no missing resources, RPC, wallet, analytics or API requests");
      await inspect.context.close();
    } finally {
      await browser.close();
    }
  }

  if (process.argv.includes("--taste")) {
    const probe = fileURLToPath(new URL(".imd/reads/skills/design-critic/scripts/taste.mjs", root));
    const module = fileURLToPath(new URL("../node_modules/playwright/index.mjs", import.meta.url));
    const child = spawn(process.execPath, [probe, base + "/inspect/", "--out", "test/scratch/taste", "--offline"], {
      cwd: fileURLToPath(root), env: { ...process.env, IMD_PLAYWRIGHT: module }, stdio: "inherit",
    });
    const code = await new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
    results.push({ name: "taste@1 on unchanged HTML with script paused by test response policy", exitCode: code });
  }
  await fs.writeFile(new URL("results.json", out), JSON.stringify(results, null, 2) + "\n");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
