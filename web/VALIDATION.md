# swornbyswarm redirect validation

Worker observations on 2026-10-25. These are local checks, not independent
certification or a claim that the hosted name has already been updated.

## Scope and decisions

The active site is the move notice in `web/index.html`, exported to `dist/`.
The new site destination is exactly `https://sworn.sites.imd.fun/`. All visible
copy is the assigned copy, with one heading, one paragraph and one link. The
original palette, monospace stack and favicon are retained. The old app modules
remain source history and are not imported or shipped by this entry point.

The explicit restriction to `web/` and `dist/` takes precedence over the generic
request to update repository-root `DESIGN.md`. The current design documentation
is therefore `web/DESIGN.md`; the root document is unchanged. Package manifests,
lockfile, Vite configuration, contracts and dependency sources are unchanged.
No ignore-file change, new submodule, RPC read, signing, analytics or publication
command was needed.

## Requirement checks

| Requirement | Result and evidence |
| --- | --- |
| Exact title `swornbyswarm` | Met; source and exported HTML, static test and browser title check |
| Immediate JavaScript redirect, own hash, no added history entry | Met; exact production script exercised for 12 hashes in the VM; Chromium followed 10 hash cases and Back returned directly to the previous page |
| No-JavaScript redirect after one second, base destination | Met; head `noscript` refresh has exact `1;url=...` content; real JS-disabled navigation observed at 1,213ms from initial navigation start, including test/browser overhead |
| Fixed canonical destination | Met; source/export assertions and browser DOM inspection |
| Exact heading, paragraph and Open Sworn label/destination | Met; static and rendered assertions; VM verifies hash is appended to the link before replacement |
| Minimal export | Met; only `index.html` (2,377 bytes) and unchanged `favicon.svg` (306 bytes); no directories, app assets, ABIs, data or deployment manifest |
| First phone screen and responsiveness | Met in Chromium; heading, full paragraph and action visible at 390×844; action bottom 296.19px, hit target 44px high; also checked 320, 768 and 1440px |
| Metadata and relative runtime assets | Met; title, description, favicon, og:title, og:image; favicon and OG image reuse `./favicon.svg` |
| Rebuild instructions, design and review record | Met inside allowed `web/` paths; see README.md, DESIGN.md and this file |
| Same hosted site name | Export remains at repository-root `dist/`; hosting the next version of the existing name occurs after submission |

## Commands and actual results

Commands below are from the repository root unless shown with `cd web`.

| Command | Result |
| --- | --- |
| `cd web && npm ci --ignore-scripts --no-audit --no-fund` | Passed; 72 packages installed from the existing lockfile; cache kept outside the submission |
| `cd web && npm run typecheck` | Passed, exit 0; existing TypeScript project, `tsc --noEmit` |
| `npm run build --prefix web` | Passed, exit 0, including final rebuild; offline pinned-ABI preflight, Vite 8.3.5, redirect-only export verification |
| `npm run verify:export --prefix web` | Passed, exit 0; two files, 2,683 bytes |
| `node --test web/tests/redirect.test.mjs` | Passed; 3 tests, 0 failed; export/copy/metadata, plus direct execution of the exact shipped script across 12 hash cases |
| `node --check web/scripts/manifest.mjs` and `node --check web/tests/redirect-browser.mjs` | Passed, exit 0 |
| `node web/tests/redirect-browser.mjs --chromium-only` | Passed, exit 0; 10 scenario groups, including console and resource checks |
| `git diff --check` | Passed, exit 0 |

Playwright browser binaries were downloaded to temporary storage. During this
run browser commands used `PLAYWRIGHT_BROWSERS_PATH` to select that temporary
installation; no binaries, caches or runtime libraries are delivery assets.

The browser test hosts the real exported bytes under `/preview/` inside a
bounded foreground process. It fulfills destination navigation with an inert
HTML response and rejects any other external request. It never contacts the
new site's service or a chain/API. Chromium checked the empty hash, root,
Explorer, Mint, Wallet, Catalog, How it works, Integrate, a query plus nested
anchor and an encoded hash. It also checked the `/preview/index.html` entry.
Back skipped the redirect on every route. Real JavaScript-disabled visits
refreshed and activated the plain link. JavaScript navigation had no console
errors or uncaught script errors.

For visual and keyboard inspection only, `/inspect/` serves identical export
bytes with a response CSP `script-src 'none'`. This pauses the redirect while
keeping `noscript` inert. That inspection response deliberately produces a CSP
console message; it is not a production header. The ordinary behavior tests
use `/preview/` without the policy. No missing/failed local resources or HTTP
errors were observed. The local favicon was fetched successfully under the
subpath. No RPC, wallet, analytics or API requests were made.

Screenshots produced and actually inspected:
`test/scratch/redirect/chromium-320.png`, `chromium-390.png`,
`chromium-1440.png`, `chromium-focus.png` and `chromium-text-200.png`.
Additional screenshots and `results.json` remain in that scratch directory.
The scratch files are excluded from submission by the assignment.

## Better Interface: six-domain review

The pinned Better Interface workflow, all six core domain sections and its
documentation method were read and applied during implementation. Original
notices and licenses remain in `web/LICENSES/Better-Interface.txt`.

| Domain | Coverage, findings and result |
| --- | --- |
| Accessibility — Checked | Native main, h1 and anchor, accessible action name, Tab/Enter and visible 2px focus outline; 44px link target. Source: `web/index.html:65`, `web/index.html:81`, `web/index.html:88`. Keyboard and focused screenshot passed. Screen-reader and forced-colors checks were not performed. |
| Layout — Checked | Single column, logical properties, flexible measure and normal document flow. `web/index.html:47`. No overflow at 320/390/768/1440; required content/action present on first 390px screen. 200% text resizing at 320px reflowed. Native browser zoom and an RTL mirror were not checked. |
| Writing — Checked | Exact assigned copy at `web/index.html:89`; one clear verb-first native link. No additional marketing copy, directions, dialogs or controls. Static and DOM assertions passed. |
| Typography — Checked | Original system monospace, two sizes (34px and 15px), weights 600/400, readable line height, balanced heading and wrapping. `web/index.html:31`. Reviewed phone/desktop screenshots and enlarged text. System fallback face varies by device; no downloaded font is involved. |
| Colors — Checked | Existing dark hex tokens at `web/index.html:27`. Rendered background rgb(10,10,10); text contrast 14.73:1, green link 14.50:1, pale hover 18.23:1. Focus/active use text color. Link remains underlined. Only the existing dark theme is supported. |
| UI — Checked | One restrained text action with verified rest, hover, active and keyboard-focus states; no enclosures, art, loaders, transitions or animation. `web/index.html:65`. Dialogs, forms, wallet states and animation checks are not applicable. |

Resolved implementation findings:

- **High — `web/index.html:88`:** the old entry booted the full application.
  Replaced it with the exact move notice and synchronous hash-preserving
  history replacement (`web/index.html:94`). Static execution and real browser
  navigation/Back checks passed.
- **High — `web/scripts/manifest.mjs:10`:** inherited Vite public copying and
  the old manifest writer would leave the retired app's ABI, art, data and
  deployment metadata in the export. The final build now removes everything
  outside the exact two-file allowlist, and `--check` verifies without mutation.
  Final export verification and filesystem inspection passed.

No applicable unresolved visual or interaction finding was observed in the
checked Chromium states. The first implementation of the browser harness had
two harness assumptions corrected: history length after traversing existing
forward entries, and Tab order after a prior mouse-focus test. The page itself
required no change for those corrections; final assertions test Back behavior
and start keyboard inspection in a fresh document.

## Pinned design probe

The unmodified probe was run directly on `dist/` with `--offline`. The immediate
redirect left its measurement page empty after the destination was blocked;
its render/share failures and other empty-page measurements are not a valid
visual assessment of this notice.

It was then run from `node web/tests/redirect-browser.mjs --chromium-only --taste`
against `/inspect/`, with the same production HTML and the response policy
described above. `IMD_PLAYWRIGHT` selected the installed Playwright module.
The probe itself was not edited. Output: `test/scratch/taste/taste.json` and
screenshots under `test/scratch/taste/shots/`.

**15 of 16 checks passed.** Rendering, layout, targets, contrast, casing,
tracking, eyebrows, type sizes, glyphs, slogans, repetition, copy budget, chrome,
motion and share metadata passed. The only failure was `type-faces` for the
existing monospace paragraph. The brief explicitly says “in the colours and
type the site already uses”, so that measured exception is preserved. One
family, two weights and two type sizes were measured; there is no font excess.

## Limitations and completion

- WebKit's launch was attempted after downloading its browser. It exited 1
  because required host libraries, including `libgtk-4.so.1`, were unavailable.
  WebKit/Safari and physical-device checks are **not performed**, not passes.
- No screen-reader session, automated accessibility audit, native 200% zoom,
  forced-colors session, RTL localization or external social-crawler test was
  performed. The recorded 200% check is text resizing, not native zoom.
- `og:image` reuses the local SVG favicon to honor the export file budget;
  social platforms that require a raster image may not show a thumbnail.
- Destination service availability was not tested; test interception verifies
  the exact navigation URL and preserves isolation from the destination's app.
- The inherited dapp suites were not run: their wallet/ABI/UI assertions apply
  to the retired application. The current redirect has its own targeted suite.

Complete for the stated redirect scope, with the browser and documentation-path
limitations above. No question, credential or private requester value is needed.

Final export SHA-256:

- `index.html`: `b2e47efb678fad0186305e15a70e8338d4d60d28f3fb36ae8c7ced780b7f2694`
- `favicon.svg`: `1f745a9a1e2db3fcdb9d06c7b14f230c49dec80ad6bfdf51f33c81e6e8a6abd6`
