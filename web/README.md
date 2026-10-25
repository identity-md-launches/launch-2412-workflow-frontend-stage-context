# swornbyswarm redirect

This site's current entry point is the minimal move notice in `web/index.html`.
It redirects to **https://sworn.sites.imd.fun/**, where Sworn version 2 lives.
The page retains the original dark colors, monospace type and favicon.

With JavaScript, the inline script first adds the incoming hash to **Open Sworn**,
then immediately calls `window.location.replace` with the same destination. Back
therefore skips the move notice. With JavaScript disabled, a head-level
`noscript` meta refresh navigates to the base destination after one second; the
ordinary link also works. The title remains exactly `swornbyswarm` and the
canonical URL always points to the new site's root.

## Install, rebuild and preview

Use Node 22.12 or newer and npm 10 or newer. From the repository root:

```sh
cd web
npm ci
npm run typecheck
npm run build
npm run verify:export
node --test tests/redirect.test.mjs
npm run preview
```

Open the local URL printed by Vite. `npm run dev` previews the source instead.
Every preview redirects immediately as intended.

The existing package manifest, lockfile and Vite configuration are unchanged.
The inherited production command still performs its offline pinned-ABI preflight
before building. `scripts/manifest.mjs` now finishes the redirect export by
removing the former app's public files and asserting the final file allowlist.
Its `--check` mode, invoked by `verify:export`, only validates and never deletes.
No chain or API read is part of this build.

The final `dist/` consists of **only `index.html` and `favicon.svg`**. The page's
CSS and redirect script are inline. The favicon and `og:image` use the relative
URL `./favicon.svg`; there are no external fonts, runtime packages, wallet code,
RPC reads, analytics or calls to `api.imd.fun` in the export. The previous app
modules and public source files remain historical inputs, outside the page's
dependency graph. They are not served by the export. Rebuilding produces the
same two-file site under the existing `swornbyswarm` site name.

## Interaction checks

From `web/`, install the test browsers and validate the production export:

```sh
npx playwright install chromium webkit
node tests/redirect-browser.mjs
```

Actual local results: production build, typecheck, export verification, three
static tests and ten Chromium scenario groups passed. Layouts were checked at
320, 390, 768 and 1440px, plus 200% text resizing. WebKit could not launch because
host libraries were missing; `node tests/redirect-browser.mjs --chromium-only`
selects the available engine. The pinned design probe passed 15/16 checks with
the redirect paused for inspection; its monospace-prose warning is an explicit
exception because this brief preserves the existing type. See the validation
record for the precise test setup and remaining limitations.

The browser check manages its own temporary static server at a gateway-style
subpath. It checks Chromium and WebKit navigation, hash preservation, browser
history, the real one-second no-JavaScript refresh, manual and keyboard link
activation, metadata, local resources, responsive layouts and rendered contrast.
The destination is fulfilled by the test so no external site, RPC or API is
contacted. Visual checks serve the **unchanged production HTML** with a
test-response CSP that pauses its inline script; JavaScript remains enabled so
the `noscript` refresh is inert. Ordinary redirect checks have no such policy.
Screenshots and machine-readable observations go only to `test/scratch/redirect/`.
These scratch files are not part of the delivery.

The earlier application suites describe the retired dapp and are historical,
not checks for this redirect. Current results, review coverage and
limitations are in [VALIDATION.md](VALIDATION.md). The final design is documented
in [DESIGN.md](DESIGN.md) inside `web/`, honoring this task's restriction against
changes outside `web/` and `dist/`. The root design document is historical.
