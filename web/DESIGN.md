# swornbyswarm: implemented redirect design

## Overview

This page sends visitors of Sworn's first public version to Sworn version 2.
`web/index.html` is the complete active page: one heading, one paragraph and one
link in a single column. It preserves the existing terminal palette, system
monospace stack and favicon. There is no application shell or decorative art.

The assignment permits changes only inside `web/` and `dist/`; this document
therefore lives here. The existing repository-root `DESIGN.md` describes the
retired application and remains untouched.

## Colors

The active tokens are inline in `web/index.html`, copied from the site's
established `web/src/styles.css` palette.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0a0a0a` | Entire canvas |
| `--text` | `#d9e0da` | Heading, paragraph, active link, focus outline |
| `--accent` | `#00ff41` | Open Sworn link |
| `--shared` | `#dbfee6` | Link hover on devices that support hover |

This is the existing dark theme, using hex notation and `color-scheme: dark`.
The link is underlined so its affordance does not depend on color. There are no
status colors, additional surfaces or alternate theme controls. Measured
rendered contrast and limitations are recorded in `web/VALIDATION.md`.

## Typography

The family is `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
The browser uses its available system face; no font is downloaded.
Two size tokens are used, relative to the browser's default root size:

| Role | Token | Default size | Requested weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Heading | `--display` | `2.125rem` / 34px | 600 | 1.3 | -0.02em |
| Paragraph and link | `--prose` | `0.9375rem` / 15px | 400 | 1.6 | normal |

The heading uses `text-wrap: balance`. The content width caps ordinary lines
near 73 monospace characters at the default font size. `overflow-wrap:
break-word` permits the domain and enlarged text to reflow. No text is clipped
or ellipsized. The exact required copy retains the straight apostrophe in
`Sworn's`. Preserving the existing monospace overrides the design probe's
general preference for non-monospace prose.

## Layout

`main` has `max-inline-size: 44rem`, including its padding, and is centered with
`margin-inline: auto`. It has 24px inline padding and block padding
`clamp(40px, 12vh, 96px)`. The heading has 24px of trailing space; the paragraph
has 16px. The page uses normal document flow with no fixed heights or overlays.

There are no layout breakpoints: the single column naturally shrinks and wraps.
The heading and link stay near the top at narrow widths. Enlarging text grows
the content vertically; scrolling remains available. The viewport metadata
does not cap zoom. Browser coverage is recorded in `web/VALIDATION.md`.

## Elevation & Depth

The page is flat: no cards, borders, shadows, gradients or layers. The keyboard
focus outline is the only outlined UI treatment.

## Shapes

Open Sworn is a text link with an inline-flex hit area at least 44px high, an
underline offset of 4px and no button enclosure or radius. The original green
hive favicon remains unchanged in `web/public/favicon.svg` and `dist/favicon.svg`.

## Components

| Pattern | Source | Behavior |
| --- | --- | --- |
| Move notice | `web/index.html`, `main` | One native main landmark with one `h1` and one paragraph; exact assigned text |
| Open Sworn | `web/index.html`, `#open-sworn` | Native anchor; green at rest, pale green on hover, text color while active; Tab focus gets a 2px text-colored outline offset by 4px; Enter activates |
| Redirect | `web/index.html`, inline script | Adds `window.location.hash` to the fixed destination, updates the anchor, then calls `window.location.replace` synchronously |
| No-JavaScript fallback | `web/index.html`, head `noscript` | Meta refresh after one second to the fixed destination without a hash; the plain anchor remains available |

No loading, empty, transaction or error components are part of this page.
There is no animation or transition. The icon is also reused for `og:image`
within the export's strict two-file budget; social crawlers' SVG support is not
guaranteed.

## Do's and Don'ts

- Preserve the exact title, visible copy, destination and history-replacement
  behavior; use the existing tokens and native anchor.
- Keep the action in the first phone screen, allow wrapping and retain a
  visible keyboard focus outline.
- Preserve the two-file export and relative favicon URL. Do not reconnect the
  retired app, add interface elements, download fonts or introduce network reads.
- This is a move notice, so there is no recipe for adding another page or
  component to it. Any expansion requires a different assignment.

Design guidance attribution and licenses are retained in
`web/LICENSES/Better-Interface.txt`: Better Interface by Jakub Krehel (MIT,
commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and Impeccable documentation
guidance by Paul Bakaus (Apache-2.0,
commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`).
