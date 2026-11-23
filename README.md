# Lizzy to Lana — A Fan Archive

A public-facing, fully English, multi-page fan archive of Lana Del Rey's recorded work. It is built from one JSON source into static HTML, CSS, and a small amount of JavaScript. There is no runtime framework, no tracking, and no client-side rendering requirement.

Live site: <https://blog.wldnanatayya.com>

## What is in the repository

| Path | Purpose |
|---|---|
| `src/data.json` | Single source of truth: site copy, nine eras, sixteen releases, photographs, references, and notes. |
| `src/styles.css` | Stylesheet with font placeholders replaced at build time. |
| `src/main.js` | Progressive enhancement: menu, gallery filters, lightbox, reveal effects, Pagefind init. |
| `src/favicon.svg` | Original typographic favicon; PNG variants are generated at build time. |
| `assets/img-src/` | Original licensed JPEG photographs. Never hotlinked. |
| `assets/fonts/` | Self-hosted WOFF2 fonts (SIL Open Font License). |
| `scripts/build.mjs` | Full build: images, OG cards, hashed assets, 43 pages, sitemap, robots, web manifest, Pagefind. |
| `scripts/images.py` | Responsive AVIF/WebP/JPEG variants plus tiny blur placeholders. |
| `scripts/og.py` | Typographic Open Graph cards and icon set. |
| `scripts/serve.mjs` | Local server that mirrors the clean-URL nginx rules. |
| `scripts/check.mjs` | Validates metadata, internal links, assets, image attributes, and image credits. |
| `deploy/nginx.conf` | Copy of the live vhost (root → `current` symlink). |
| `deploy/deploy.sh` | Build-aware atomic release swap. |
| `deploy/rollback.sh` | Point `current` at an older release. |
| `AUDIT.md` | Baseline audit findings. |
| `NEEDS.md` | Remaining photo and content placeholders. |

## Requirements

- Node.js 22+ and npm
- Python 3.11+
- Python packages: `Pillow`, `pillow-avif-plugin`, `fonttools`, `brotli` (see `requirements.txt`)
- Pagefind 1.6.0 (installed as a dev dependency)

```bash
python3 -m pip install -r requirements.txt
npm install
```

## Build and test

```bash
npm run build     # clean dist/, regenerate everything, run Pagefind
npm run check     # validate the generated site
npm run serve     # http://localhost:4173 with clean URLs and a themed 404

# Deploy the current dist/ atomically, then verify:
./deploy/deploy.sh
```

The build writes a complete site to `dist/`. Do not edit `dist/` by hand; edit `src/data.json` or the source files and rebuild.

## Routes

`/`, `/journey`, `/journey/[era]`, `/gallery`, `/gallery/[era]`, `/discography`, `/discography/[album]`, `/fan-notes`, `/sources`, `/about`, `/search`, and `/404`.

Indonesian legacy URLs are redirected with nginx 301s to their English equivalents.

## Editorial and photo rules

- No gossip, no speculation about private life, no fabricated quotes, no full lyrics.
- Unreleased records are marked provisional and checked against the date shown on the page.
- Every photograph is stored locally, credited, linked to its Wikimedia Commons file page, and used under a named Creative Commons licence.
- The site is unofficial and carries a disclaimer in the footer and on the About page.

## Deployment

Deployment uses a release directory and an atomic symlink swap. The old document root is kept as a backup.

```bash
# On the VPS, after copying dist/ to a new release directory:
./deploy/deploy.sh
```

The nginx vhost root is `/var/www/blog-releases/current`. Only this vhost should be changed.

## Rollback

Point `current` back to a previous release and reload nginx:

```bash
./deploy/rollback.sh <previous-release-name>
```

The pre-rewrite site also remains at `/var/www/blog.wldnanatayya.com` and in `/var/www/blog-backups/`.

## Placeholders to resolve

See `NEEDS.md`. The remaining placeholders are: two era photographs under a clear licence, the archive keeper's personal note, and the contact email address.
