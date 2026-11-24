# 3HK Christmas snow UAT

Static deploy of the Christmas homepage with snowfall, snow-pile scrub, and shovel cursor (`home.html`), night-sky gutters (`home2.html`), and in-page night sky (`home3.html`).

## Live URLs

**Production:** https://snow-flame-kappa.vercel.app

| Page | URL |
|------|-----|
| Day (default snow) | https://snow-flame-kappa.vercel.app/christmas/home.html |
| Night sky + stars (gutters) | https://snow-flame-kappa.vercel.app/christmas/home2.html |
| Night in-page + stars (UAT) | https://snow-flame-kappa.vercel.app/christmas/home3.html |

Shortcuts:

- https://snow-flame-kappa.vercel.app/home.html
- https://snow-flame-kappa.vercel.app/home2.html
- https://snow-flame-kappa.vercel.app/home3.html

**GitHub:** https://github.com/webbman2025/snow

**Developer handoff (production integration):** see [`SNOW-DEV-HANDOFF.md`](./SNOW-DEV-HANDOFF.md) — share that file + the repo link with web/platform; do not ask them to replace `www.three.com.hk` HTML with the UAT zip.

## Local preview

```bash
cd christmas
./start-uat.sh
# http://127.0.0.1:8890/christmas/home.html
# http://127.0.0.1:8890/christmas/home2.html
# http://127.0.0.1:8890/christmas/home3.html
```

## Contents

- `christmas/index.html` — SPA shell (routed as `home.html`)
- `christmas/home2.html` — night background (viewport gutters)
- `christmas/home3.html` — night sky inside page canvas
- `assets/css/home-night-inpage.css` — home3 section titles + stars
- `static/`, `assets/`, `3api/`, `media/` — required root paths for the React home app