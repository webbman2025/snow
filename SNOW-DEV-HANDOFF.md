# Snow overlay — developer handoff (3HK EN home)

Use this doc when integrating Christmas snow onto the **real** production home at  
https://www.three.com.hk/en/home.html — **not** by replacing production HTML with the UAT package in this repo.

## What to send stakeholders in one message

You can share **only**:

1. **Repo:** https://github.com/webbman2025/snow  
2. **This file:** `SNOW-DEV-HANDOFF.md` (same repo, root)  
3. **Live demos (optional but recommended):**  
   - Day: https://snow-flame-kappa.vercel.app/christmas/home.html  
   - Night: https://snow-flame-kappa.vercel.app/christmas/home2.html  

That is enough. Devs copy **assets** and wire **markup + tags** into their existing home template. They do **not** deploy the whole `christmas/` UAT tree to production.

---

## Do / don’t

| Do | Don’t |
|----|--------|
| Copy snow **assets** into your CDN/deploy path | Replace production `index.html` with UAT `christmas/index.html` |
| Add markup + CSS/JS links to the **current** home shell | Ship frozen UAT `static/js/main.js` or change React routes unless platform owns it |
| Use `home2` as a **pattern** for night mode only | Copy `<base href="/christmas/">` or UAT-only `history.replaceState` hacks |
| Keep existing page text colours; night uses `home-night.css` canvas | Recolour titles/body for night |

---

## Files to integrate (copy from this repo)

| File | Role |
|------|------|
| `assets/css/home-snowfall-w3bits.css` | Falling flakes (CSS animations) |
| `assets/css/home-snow-accumulate.css` | Pile, scrub, cursor, mobile shovel, `--snow-fall-speed` |
| `assets/js/home-snow-accumulate.js` | Pile bins, touch scrub, flake landing |
| `assets/images/snow-shovel-cursor.png` | Custom cursor + mobile shovel image |
| `assets/css/home-night.css` | **Night only** — starfield behind content column |
| `assets/html/w3bits-snowfall.html` | Reference: 250 `.snowflake` nodes (or generate fewer in JS) |

Optional reference (flake source): `assets/css/css-snowfall-w3bits.css` — not required if you use `home-snowfall-w3bits.css`.

---

## Integration checklist (production home template)

### A — Day snow (default)

- [ ] Deploy the five asset files above under your public `/assets/` path (or equivalent CDN).
- [ ] In the **production home HTML template** (shell that serves `/en/home.html`), immediately after `<body>`:
  - [ ] `<div id="snow-pile" class="snow-pile" aria-hidden="true"></div>`
  - [ ] `.snowfall-overlay` > `.snowfall` > **250** × `<div class="snowflake"></div>` (see `assets/html/w3bits-snowfall.html` or UAT `index.html`).
- [ ] Before `</body>` (or with other global CSS):
  - [ ] `<link href="/assets/css/home-snowfall-w3bits.css" rel="stylesheet">`
  - [ ] `<link href="/assets/css/home-snow-accumulate.css" rel="stylesheet">` (+ cache-bust query if needed)
- [ ] Last scripts before `</body>`:
  - [ ] `<script src="/assets/js/home-snow-accumulate.js" defer></script>`
- [ ] Confirm paths are **site-root absolute** (`/assets/...`) like the live site — not UAT `/christmas/` base paths.
- [ ] QA: desktop shovel cursor near pile; mobile finger swipe clears pile; `prefers-reduced-motion` hides pile (CSS).

### B — Night variant (same JS; extra CSS + markup)

Only what differs from day — **do not** maintain two full HTML pages.

- [ ] On `<html>`: add class `night-sky` when night mode is on (CMS flag, date range, or `?theme=night`).
- [ ] After `<body>`, **before** `#snow-pile`: paste `#night-sky` block from UAT `christmas/home2.html` (stars + sparks).
- [ ] Extra stylesheet: `<link href="/assets/css/home-night.css" rel="stylesheet">`
- [ ] Keep **same** `home-snow-accumulate.js` — no second script.
- [ ] Recommended production pattern: one URL ` /en/home.html` + feature flag; optional alias `/en/home-night.html` that sets `night-sky` only.

### C — UAT-only (skip on www.three.com.hk)

- [ ] `serve-uat.py` / Vercel rewrites / `history.replaceState` for `/christmas/` — **not for production**
- [ ] Extra SPA route `home2.html` in bundled `main.js` — only needed for Vercel demo

---

## Minimal diff: UAT `index.html` (day) vs `home2.html` (night)

Same React shell, APIs, and snow engine. **Only four kinds of change:**

| # | Where | Day (`index.html`) | Night (`home2.html`) |
|---|--------|-------------------|----------------------|
| 1 | `<html>` | `<html lang="en">` | `<html lang="en" class="night-sky">` |
| 2 | Start of `<body>` | Starts with `#snow-pile` | Inserts `#night-sky` block **above** `#snow-pile` |
| 3 | `<head>` CSS | snowfall + accumulate | **+** `home-night.css` |
| 4 | Scripts | `home-snow-accumulate.js` | **identical** |

Everything else (GTM, `#root`, `static/js/main.js`, APIs) should match your **current** production home — not a wholesale copy from this repo.

### Night-only markup (copy structure from `christmas/home2.html`)

```html
<!-- On <html>: class="night-sky" when night mode enabled -->
<div id="night-sky" aria-hidden="true">
  <!-- night-stars a/b/c, night-glow, night-spark spans — see home2.html in repo -->
</div>
<div id="snow-pile" class="snow-pile" aria-hidden="true"></div>
<!-- ... existing snowfall-overlay unchanged ... -->
```

### Head tags (day vs night)

**Day:**

```html
<link href="/assets/css/home-snowfall-w3bits.css" rel="stylesheet">
<link href="/assets/css/home-snow-accumulate.css" rel="stylesheet">
<script src="/assets/js/home-snow-accumulate.js" defer></script>
```

**Night adds one line:**

```html
<link href="/assets/css/home-night.css" rel="stylesheet">
```

### Tuning without code changes

In `home-snow-accumulate.css`, `:root` includes:

- `--snow-fall-speed` — `5` ≈ 80% slower fall (5× W3Bits duration; current UAT value)
- `--snow-pile-max-vh` — max pile height (default `5` = 5vh)

Bump `?v=` on CSS/JS links after deploy when caches are sticky.

---

## Behaviour summary (for QA)

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Snowfall | CSS flakes | Fewer flakes (JS limits) |
| Pile | Flakes accumulate at bottom | Same |
| Clear snow | Hover/drag with shovel cursor | Finger drag; shovel image follows finger |
| Cleared areas | Stay empty until a flake lands there | Same |
| Night | Purple starfield in **side gutters** (wide); content stays on light `#root` canvas | Same readability rules via `home-night.css` |

---

## Contact / scope

Snow is an **overlay** on the existing EN home React app. Platform/web own where the home template lives and CDN paths. This package does not change plan copy, prices, or JSON-LD.

For questions, compare behaviour to the Vercel demos above before diffing full HTML files.