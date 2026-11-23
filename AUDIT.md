# Audit — pre-rewrite baseline

**Date:** 24 November 2026  
**Scope:** current single-page site at `https://blog.wldnanatayya.com`  
**Status:** audit only. No site files were changed before this document was written. A baseline git commit (`81354c5`) and a filesystem backup (`/var/www/blog-backups/pre-rewrite.20261124.tar.gz`) were created first.

## Baseline measurements

| Check | Result |
|---|---|
| Lighthouse mobile | Performance **84**, Accessibility **97**, Best Practices **100**, SEO **100** |
| Core metrics | FCP 1.6 s, LCP 1.6 s, CLS 0, TBT **580 ms**, Speed Index 3.0 s |
| Horizontal overflow | None at 360 / 768 / 1280 / 1920 px |
| Console errors | None |
| Internal anchors | 8, all valid |
| External links | 16, mostly references + Google Fonts |
| Images | 18 local JPEGs, 3.8 MB total; 2 placeholders |
| Broken-image scan | Reported "broken" only because `loading="lazy"` images were below the fold — false positive, all files return 200 |

Screenshots: `/tmp/opencode/audit/before-{360,768,1280,1920}.png`. Raw Lighthouse JSON: `/tmp/opencode/audit/lh-before.json`.

---

## Findings, ordered by priority

### P0 — must fix

1. **Language and purpose mismatch.** The whole site is in Indonesian and the fan-notes section is framed as a personal diary. Latest requirement: this is a **public fanpage**, fully in **English**. All UI copy, narratives, meta, docs, and the fan section must be rewritten in English. Keep the disclaimer and the no-gossip/no-full-lyrics rules.

2. **Still one page.** Everything is in `index.html`. Required routes are missing: homepage, journey index, nine era pages, gallery index, nine era galleries, discography index, album pages, fan notes, sources, about, themed 404. Need a multi-page build.

3. **Data is split and partly hardcoded.** `images.json` holds eras/photos, `main.js` holds the discography array, `index.html` holds all era narratives and references. Requirement says one source of truth. Need structured JSON: eras, albums, photos, references.

4. **No atomic deploy / rollback path.** Current vhost root is a plain directory (`/var/www/blog.wldnanatayya.com`). Need a release directory + `current` symlink, old releases retained, vhost pointed at the symlink.

5. **Mobile performance below target (84 < 90).** TBT 580 ms comes from a large single-document DOM plus client-side rendering of all photos/cards. Multi-page split, self-hosted fonts, and precompressed assets should push it above 90.

### P1 — high

6. **No per-page SEO.** One `<title>`, one meta description, zero OG tags, zero canonical URLs, no `sitemap.xml`, no `robots.txt`. Each route needs unique title/description/OG/canonical. OG image must be original typography, not a photo.

7. **Fonts are third-party.** Google Fonts CSS + font files are loaded externally. Need self-hosted WOFF2 (`Cormorant Garamond`, `Inter`, `Homemade Apple`) with `font-display: swap` and preload.

8. **Images are not responsive.** JPEG-only, no WebP/AVIF, no `srcset`/`sizes`, gallery images have no intrinsic `width`/`height`. Convert to WebP + AVIF with 2–3 widths, emit `srcset`, keep aspect-ratio boxes to prevent layout shift.

9. **Lightbox keyboard support incomplete.** Escape works via native `<dialog>`; arrow-key navigation between photos is missing. Need previous/next with ArrowLeft/ArrowRight, visible focus states, and focus return to the trigger.

10. **Mobile/desktop layout needs a pass.** No overflow today, but the single-page timeline/gallery is dense; mobile nav has no explicit toggle, breadcrumbs are absent, and spacing/typography rhythm is inconsistent between sections. Need componentized layout and explicit 360/768/1280/1920 checks after the rewrite.

### P2 — medium

11. **Server hardening missing.** No security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`), no Brotli, and `Cache-Control: 7d` is applied to un-hashed filenames (stale-cache risk). Use hashed asset filenames with long cache, short cache for HTML/JSON.

12. **Search absent.** Requirement asks for client-side search across eras, albums, photos. Pagefind is the lightest fit for a static build.

13. **Content verification still needed.** Re-check album titles, years, era order, and date-sensitive `Stove` facts against Wikipedia + primary references. Mark anything unverified instead of guessing. No fabricated contact email — use a placeholder.

14. **Optional fan blog / RSS** is allowed but not mandatory. If added, keep it public-facing (community notes, not private diary) and generate RSS from Markdown.

### P3 — nice to have

15. **Transitions between pages** must be subtle. Per owner decision (2026-11-24), animations stay on for every visitor on every device — there is no `prefers-reduced-motion` opt-out and no hardware-based downgrade. Do not re-introduce autoplay music.

16. **Clean up dead files** (`netlify.toml`/`vercel.json` only if still useful), update README, keep `KEKURANGAN.md` (rename to English `NEEDS.md` or keep with English content).

---

## Constraints confirmed

- Domain `blog.wldnanatayya.com` must stay up; DNS must not be touched.
- Do not touch other vhosts, `/riff` proxy, SSH, firewall, or unrelated services.
- Only edit the blog vhost if needed; test `nginx -t` before reload.
- Photos only from clearly licensed sources, with credit/source/license. No scraping/hotlinking.
- Keep "unofficial fan site" disclaimer on every page.
- No gossip, no invented quotes, no full lyrics.
- No secrets or tokens in the repo.
