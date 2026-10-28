# agnogad · less weight. ship more.

A single-page bio and portfolio for **agnogad**, built as plain HTML, CSS and
JavaScript. A three.js particle galaxy assembles into a cube as you scroll
through the hero; the rest is a dark, lime-accented reading page for the work,
the numbers, the toolkit and the contact links.

There is no framework, no build step and no package manager. Every asset is
local, including three.js and the fonts. Without JavaScript the page is fully
readable and the hero is a clean dark panel; with JavaScript and WebGL, the
galaxy renders, and reduced-motion users get one static assembled frame.

## Run it

From this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>. Any static server works. Opening `index.html`
directly mostly works too, but the self-hosted ES modules and the Clipboard API
are happiest over HTTP.

## Design system

| Token | Value |
| --- | --- |
| Page | `#07080a` |
| Panel | `#0a0c0e` / `#0d1013` |
| Paper | `#f2f1ea` |
| Accent | `#d8ff3e` |
| Display | Clash Display 500/600/700 |
| Body | Switzer 400/500/700 |
| Code / terminal | JetBrains Mono 400/500 |

Change the palette and type scale in `:root` at the top of
`assets/css/style.css`. The layout uses a 1320px measure, a fluid gutter, and
CSS custom properties for the hero's scroll progress (`--p`).

## Edit the content

| What | Where |
| --- | --- |
| Bio, projects, stats, receipts, links | `index.html` |
| Colours, type, spacing, responsive rules | `assets/css/style.css` |
| Menu, reveals, counters, copy, tilt | `assets/js/main.js` |
| Hero galaxy, cube, camera, labels | `assets/js/scene.js` |
| Screenshots | `assets/img/` |
| Fonts | `assets/fonts/` |
| three.js r186 | `assets/vendor/three.module.min.js` + `three.core.js` |

The copy is based on the three files in `infos/`. That folder is source
material, not part of the site; it does not need to ship.

### Hero scene

`scene.js` builds a 4,200-point cloud on desktop (2,600 on mobile), morphs it
into the cube over the hero's scroll range, and adds a lime core, a wireframe,
two orbital rings and a faint floor grid. The important knobs are near the top:
`POINTS`, `CUBE`, `ACCENT`, `PAPER`; the camera and group positions are in
`layout()`. With `prefers-reduced-motion: reduce`, it draws one static assembled
frame and stops. If WebGL cannot start, the `no-webgl` class collapses the hero
to one screen and hides the canvas.

The vendored three.js build is split in two files. Keep both
`three.module.min.js` and `three.core.js` next to each other; the first imports
the second by relative path.

### Discord placeholder

Discord is the one intentional placeholder. There is no public URL on file, so
it is a non-link card reading **link to come**, not an invented address. When a
URL exists, change the surrounding `<div class="contact-card contact-card--soon">`
to an `<a class="contact-card" href="...">` and replace the note in `index.html`.

All other destinations are real: GitHub, X, r/rust, dev.to, the agno repository,
the docs, crates.io, the XERJ profile, the PixiAnime organisation and the
Kütüphanem and Turkish-SkyStream repositories.

## Assets

- `agno-docs.webp`: the live [agno docs](https://agno-docs.pages.dev) hero.
- `agno-crate.webp`: the [crates.io package page](https://crates.io/crates/agno).
- `agno-article.webp`: the [dev.to write-up](https://dev.to/agnogad/i-built-a-static-site-generator-in-rust-because-astro-felt-slow-3fbf).
- `xerj-record.webp`: the [XERJ Corpus Hub profile](https://hub.xerj.org/contributors/agnogad).

The screenshots are of public pages, captured in October 2026. No stock imagery
and no invented project screenshots.

Fonts: **Clash Display** and **Switzer** by the Indian Type Foundry, free
licence via Fontshare; **JetBrains Mono** by JetBrains under the SIL Open Font
License. The licence for each remains with its foundry. three.js is MIT.

## Interaction and accessibility

- Semantic landmarks, a skip link, visible focus states, and comfortable hit
  areas on the primary controls.
- The mobile menu closes on Escape, restores focus to the toggle, locks body
  scroll, makes the page behind inert, and returns to the desktop nav on resize.
- The install command copies through the Clipboard API, with a legacy fallback
  and a selected-command fallback; success is announced in an ARIA live region.
- The stat counters finish at the real figures and are already correct in the
  HTML for users without JavaScript.
- Motion is transform/opacity only. `prefers-reduced-motion: reduce` disables the
  intro, reveals, ticker, counter animation and the 3D loop.
- The page has no horizontal overflow at 1440, 768 or 390px and no external
  runtime requests.

## Deploy

Pushes to `main` on [GitHub](https://github.com/agnogad/portfolio) deploy
automatically to Cloudflare Pages.

| Setting | Value |
| --- | --- |
| Production URL | <https://agnogad.my.id> |
| Pages project | `agnogad` (`agnogad.pages.dev`) |
| Build command | `mkdir -p dist && cp -r index.html assets dist/` |
| Build output | `dist` |
| Custom domain | `agnogad.my.id` |

The build publishes only `index.html` and `assets/`. The `infos/` folder stays
in the repository as source material and is not served. No server code, no
tracking, no third-party requests.

The `agnogad.my.id` zone is on Cloudflare. If the Pages custom domain is not
attached automatically, add a proxied CNAME in that zone:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `@` (`agnogad.my.id`) | `agnogad.pages.dev` | Proxied |

Then add `agnogad.my.id` under the project's **Custom domains** settings. The
Pages project must also have access to `agnogad/portfolio` in its GitHub App
installation for pushes to trigger builds.
