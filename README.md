# 3HK Christmas snow UAT

Static deploy of the Christmas homepage with snowfall, snow-pile scrub, and shovel cursor (`home.html`) plus the night-sky variant (`home2.html`).

## Live URLs

After deploy, use your Vercel production URL:

| Page | Path |
|------|------|
| Day (default snow) | `/christmas/home.html` |
| Night sky + stars | `/christmas/home2.html` |

Shortcuts (same pages):

- `/home.html`
- `/home2.html`

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