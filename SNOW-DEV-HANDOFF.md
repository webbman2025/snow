# Snow overlay — developer handoff (3HK EN home)

Use this doc when integrating Christmas snow onto the **real** production home at  
https://www.three.com.hk/en/home.html — **not** by replacing production HTML with the UAT package in this repo.

**Canonical UAT reference:** `christmas/home3.html` (in-page night sky + tuned snow pile).  
**Canonical live demo:** https://snow-flame-kappa.vercel.app/christmas/home3.html

---

## What to send stakeholders in one message

You can share **only**:

1. **Repo:** https://github.com/webbman2025/snow  
2. **This file:** [`SNOW-DEV-HANDOFF.md`](SNOW-DEV-HANDOFF.md) (repo root)  
3. **Live demo (recommended):**  
   - **Night + snow (ship target):** https://snow-flame-kappa.vercel.app/christmas/home3.html  
   - Legacy UAT only: [day `home.html`](https://snow-flame-kappa.vercel.app/christmas/home.html), [gutter night `home2.html`](https://snow-flame-kappa.vercel.app/christmas/home2.html)

Devs copy **assets** and wire **markup + tags** into their existing home template. They do **not** deploy the whole `christmas/` UAT tree to production.

---

## home3 vs home / home2 (which pattern to ship)

| Variant | UAT file | Night layout | Snow pile profile | Use |
|---------|----------|--------------|-------------------|-----|
| **home3** | `christmas/home3.html` | Stars **inside** `#home-page-canvas` (`#night-sky-inpage`) | Reference bump lip + zone lifts | **Default for integration** |
| home (day) | `christmas/index.html` | None | Flat / procedural default | Day-only reference |
| home2 | `christmas/home2.html` | Stars in **viewport gutters** (`night-sky` + `home-night.css`) | Procedural bumps | Older night demo |

Production should follow **home3**: night sky behind the scrollable home content column, not only in side margins.

---

## Do / don’t

| Do | Don’t |
|----|--------|
| Use **`home3.html`** as the integration diff against your shell | Treat `home2` gutter night as the only night pattern |
| Copy snow **assets** into your CDN/deploy path | Replace production `index.html` with UAT `christmas/*.html` wholesale |
| Add `class="home3-inpage"` (or equivalent scoped tokens) **only** when this pile profile is enabled | Copy UAT `<base href="/christmas/">` or SPA `history.replaceState` hacks to www |
| Keep **same** `home-snow-accumulate.js` for day and night | Ship frozen UAT `static/js/main.js` unless platform owns the bundle |
| Bump `?v=` on CSS/JS after deploy | Rely on Git push alone for Vercel (re-run prod deploy if CDN lags) |

---

## Files to integrate (copy from this repo)

| File | Role |
|------|------|
| `assets/css/home-snowfall-w3bits.css` | Falling flakes (CSS animations) |
| `assets/css/home-snow-accumulate.css` | Pile, scrub, cursor, mobile shovel, CSS variables |
| `assets/js/home-snow-accumulate.js` | Pile bins, clip-path surface, touch scrub, flake landing |
| `assets/images/snow-shovel-cursor.png` | Custom cursor + mobile shovel image |
| `assets/css/home-night.css` | Shared night tokens / stars (also used by home2) |
| `assets/css/home-night-inpage.css` | **home3** — in-page canvas, stars, section title glow, **snow pile tuning** |
| `assets/html/w3bits-snowfall.html` | Reference: 250 `.snowflake` nodes (or generate fewer in JS) |

Optional flake source: `assets/css/css-snowfall-w3bits.css` — not required if you use `home-snowfall-w3bits.css`.

**UAT-only (Vercel / local):** `assets/js/uat-bootstrap.js`, `vercel.json` media proxies — skip on www.three.com.hk.

---

## Integration checklist (production home template) — home3 pattern

### A — Markup (compare `christmas/home3.html`)

- [ ] On `<html>`: `class="home3-inpage"` when night in-page + reference pile is on (or map tokens to your own scope class).
- [ ] **Before** React `#root`: wrap content in `#home-page-canvas.home-page-canvas--night-inpage` (see home3).
- [ ] Inside canvas, **before** `#root`: `#night-sky-inpage` with static star layers (`night-stars-a` … `night-stars-lower`, `night-shine-star--1` … `--6`) — copy from `home3.html` (no twinkle on home3 for GPU).
- [ ] After `<body>` (fixed stack): `#snow-pile`, then `.snowfall-overlay` > `.snowfall` > snowflakes (same as day UAT).
- [ ] Deploy assets under site-root `/assets/...` (absolute paths, not `/christmas/`).

### B — Stylesheets (order matters)

```html
<link href="/assets/css/home-snowfall-w3bits.css" rel="stylesheet">
<link href="/assets/css/home-snow-accumulate.css?v=…" rel="stylesheet">
<link href="/assets/css/home-night.css?v=…" rel="stylesheet">
<link href="/assets/css/home-night-inpage.css?v=…" rel="stylesheet">
```

Production can omit `home-night-inpage.css` only if you **port the same custom properties** to your own stylesheet (see tuning table below).

### C — Script

```html
<script src="/assets/js/home-snow-accumulate.js?v=…" defer></script>
```

One script for day and night; profile is CSS-driven (`--snow-pile-profile`).

### D — QA (home3 behaviour)

| Check | Expected |
|-------|----------|
| First paint | Pile visible at **5.25vh** prefill (`--snow-pile-start-vh`) |
| Snow lip shape | Reference profile: twin bumps left, mid dip, double bump right |
| Crest height | Left / mid / right **crests** ≈ **5.76vh** at current tuning (see below) |
| Desktop | Shovel cursor; drag clears snow along surface |
| Mobile | Finger shovel; fewer flakes |
| `prefers-reduced-motion` | Pile hidden (`home-snow-accumulate.css`) |
| Resize | Pile re-seeds from `start-vh` (JS `syncSeededPileToCaps`) |

---

## Snow pile tuning (home3 — `html.home3-inpage` in `home-night-inpage.css`)

Tune via CSS **without** editing JS when possible. Defaults below are the current ship values.

| Variable | Value | Meaning |
|----------|-------|---------|
| `--snow-pile-start-vh` | `5.25` | Initial pile depth on load (vh) |
| `--snow-pile-max-vh` | `5.25` | Max pile budget (vh) |
| `--snow-pile-profile` | `reference` | Art-directed Gaussian lip (`procedural` = legacy sine stacks) |
| `--snow-pile-bump-scale` | `1.22` | Amplifies reference shape |
| `--snow-pile-relief-envelope` | `1` | Per-bin caps follow profile (keeps bumps when “full”) |
| `--snow-pile-left-lift` | `1.491` | Left zone height scale (matches right crest) |
| `--snow-pile-mid-lift` | `1.754` | Centre zone height scale |
| `--snow-pile-smooth-radius` | `1` | Bin smoothing while accumulating |
| `--snow-pile-curve-smooth` | `2` | Clip-path contour blur (rounded valleys) |
| `--snow-pile-spread` | `0.04` | Neighbour spread on flake land (lower = lumpier) |

**Height math:** With `max-vh: 5.25`, the **tallest crest** (left, mid, or right) is about **5.25 × ~1.098 ≈ 5.76vh** of the viewport. Valleys between bumps remain lower by design.

**Global defaults** in `home-snow-accumulate.css` `:root` (other pages): `--snow-pile-max-vh: 5`, `--snow-pile-start-vh: 0`, `--snow-pile-profile: procedural`, lifts `1`.

Other useful `:root` vars (all pages):

- `--snow-fall-speed` — `5` ≈ 80% slower fall (5× W3Bits duration; UAT value)
- `--snow-pile-left-lift` / `--snow-pile-mid-lift` — only used when `--snow-pile-profile` is `reference`, `bump`, or `drift`

After changing tokens or JS, bump `?v=` on `home-night-inpage.css` and `home-snow-accumulate.js` in the shell (home3 uses `?v=peak-576` as of last tune).

---

## Local dev & Vercel

| Task | Command / note |
|------|----------------|
| Clone | `git clone https://github.com/webbman2025/snow.git` |
| Vercel prod alias | https://snow-flame-kappa.vercel.app |
| Default entry | `vercel.json` still maps `/` → `home.html`; use **`/christmas/home3.html`** for the ship target |
| Deploy | Push `main` **and** `vercel --prod` if the alias does not update (Git webhook can lag) |
| UAT trackers | Disabled on `*.vercel.app` / localhost via `__THREE_SNOW_UAT__` + `uat-bootstrap.js` in home3 |
| Broken images on UAT | `vercel.json` proxies `/media/*` and `/assets/images/*` to www when missing locally |

---

## Legacy: day / home2 diff (not the ship target)

### Day (`index.html`)

- No `home3-inpage`, no in-page night block.
- Snowfall + accumulate only.

### home2 (gutter night)

| # | Where | home (day) | home2 |
|---|--------|------------|-------|
| 1 | `<html>` | `lang="en"` | `class="night-sky"` |
| 2 | `<body>` top | `#snow-pile` | `#night-sky` (gutters) then pile |
| 3 | CSS | snowfall + accumulate | + `home-night.css` |
| 4 | JS | `home-snow-accumulate.js` | identical |

---

## Behaviour summary (for QA)

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Snowfall | CSS flakes | Fewer flakes (JS limits) |
| Pile | Flakes accumulate; clip-path lip | Same |
| Clear snow | Hover/drag shovel cursor | Finger drag + shovel widget |
| Cleared areas | Stay empty until a flake lands there | Same |
| home3 night | Purple in-page sky behind scrollable column; black section titles + white glow | Static stars (no pulse) |

---

## Contact / scope

Snow is an **overlay** on the existing EN home React app. Platform/web own the production shell and CDN paths. This package does not change plan copy, prices, or JSON-LD.

For questions, verify behaviour on **home3** Vercel first, then diff `christmas/home3.html` against your shell — not the full UAT tree.