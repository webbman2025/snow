# 3HK Christmas snow UAT

Static deploy of the Christmas homepage with snowfall, snow-pile scrub, and shovel cursor (`home.html`) plus the night-sky variant (`home2.html`).

## Live URLs

**Production:** https://snow-flame-kappa.vercel.app

| Page | URL |
|------|-----|
| Day (default snow) | https://snow-flame-kappa.vercel.app/christmas/home.html |
| Night sky + stars | https://snow-flame-kappa.vercel.app/christmas/home2.html |

Shortcuts:

- https://snow-flame-kappa.vercel.app/home.html
- https://snow-flame-kappa.vercel.app/home2.html

**GitHub:** https://github.com/webbman2025/snow

## Local preview

```bash
cd christmas
./start-uat.sh
# http://127.0.0.1:8890/christmas/home.html
# http://127.0.0.1:8890/christmas/home2.html
```

## Contents

- `christmas/index.html` — SPA shell (routed as `home.html`)
- `christmas/home2.html` — night background variant
- `static/`, `assets/`, `3api/`, `media/` — required root paths for the React home app