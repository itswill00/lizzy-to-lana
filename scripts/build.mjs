#!/usr/bin/env node
/**
 * Lizzy to Lana — static site builder.
 *
 * One JSON source (src/data.json) → every page, sitemap, robots file,
 * web manifest, hashed CSS/JS/fonts, responsive image markup, and a
 * Pagefind search index.
 *
 * Usage: node scripts/build.mjs
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

const data = JSON.parse(fs.readFileSync(path.join(SRC, "data.json"), "utf8"));
const site = data.site;

const eraById = Object.fromEntries(data.eras.map((era) => [era.id, era]));
const albumById = Object.fromEntries(data.albums.map((album) => [album.id, album]));
const photoById = Object.fromEntries(data.photos.map((photo) => [photo.id, photo]));
const refById = Object.fromEntries(data.references.map((ref) => [ref.id, ref]));

const routes = [];

/* --------------------------------------------------------------------------
   Small utilities
   -------------------------------------------------------------------------- */

const esc = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const attr = esc;

const sha1 = (value) => createHash("sha1").update(value).digest("hex").slice(0, 8);

const noteSlug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

function writeFile(relative, contents) {
  const target = path.join(DIST, relative);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, contents);
  return target;
}

function writeHashed(relativeDir, name, extension, contents) {
  const hash = sha1(contents);
  const filename = `${name}.${hash}.${extension}`;
  writeFile(path.join(relativeDir, filename), contents);
  return `/${relativeDir}/${filename}`;
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    cwd: ROOT,
    ...options,
  });
}

function jsonLdScript(object) {
  const json = JSON.stringify(object).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function pageTitle(title, isHome = false) {
  return isHome ? `${site.name} — ${site.tagline}` : `${title} · ${site.name}`;
}

function absolute(pathname) {
  return `${site.url}${pathname === "/" ? "" : pathname}`;
}

/* --------------------------------------------------------------------------
   Images
   -------------------------------------------------------------------------- */

let manifest = {};

function picture(photo, options = {}) {
  const meta = manifest[photo.id];
  if (!meta) throw new Error(`No image manifest entry for ${photo.id}`);

  const sizes = options.sizes || "100vw";
  const loading = options.loading || "lazy";
  const priority = options.fetchpriority ? ` fetchpriority="${options.fetchpriority}"` : "";
  const srcset = (key) =>
    meta.variants
      .filter((variant) => variant[key])
      .map((variant) => `${variant[key]} ${variant.w}w`)
      .join(", ");

  const fallback = meta.variants[Math.min(2, meta.variants.length - 1)].jpg;
  const lqip = meta.lqip
    ? ` style="background-image: url('data:image/jpeg;base64,${meta.lqip}')"`
    : "";
  const sources = [];

  if (meta.variants.some((variant) => variant.avif)) {
    sources.push(`<source type="image/avif" srcset="${srcset("avif")}" sizes="${sizes}">`);
  }
  sources.push(`<source type="image/webp" srcset="${srcset("webp")}" sizes="${sizes}">`);

  return `<picture${lqip}>${sources.join("")}<img src="${fallback}" srcset="${srcset(
    "jpg"
  )}" sizes="${sizes}" alt="${attr(photo.alt)}" width="${meta.width}" height="${meta.height}" loading="${loading}" decoding="async"${priority}></picture>`;
}

function creditLine(photo, options = {}) {
  if (!photo.credit) return "";
  const creator = options.link
    ? `<a href="${attr(photo.source)}" target="_blank" rel="noopener noreferrer">${esc(photo.credit)}</a>`
    : esc(photo.credit);
  const licence = options.link
    ? `<a href="${attr(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(photo.license)}</a>`
    : esc(photo.license);
  return `Photo: ${creator} · ${licence}`;
}

function creditText(photo) {
  return [photo.caption, `${photo.credit} · ${photo.license}`, photo.source]
    .filter(Boolean)
    .join("\n");
}

function copyButton(text, label, className = "copy-credit") {
  return `<button class="${className}" type="button" data-copy-credit data-copy-text="${attr(
    text
  )}" aria-label="${attr(label)}">Copy credit</button>`;
}

function contactLink(value, label) {
  if (/^https?:\/\//.test(value)) {
    return `<a href="${attr(value)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }
  return esc(value);
}

function eraPhoto(era) {
  for (const id of era.photoIds) {
    const photo = photoById[id];
    if (photo && !photo.placeholder && manifest[id]) return photo;
  }
  return null;
}

function photoTile(photo, options = {}) {
  const sizes =
    options.sizes || "(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw";
  const era = photo.era;

  if (photo.placeholder) {
    return `<div class="photo-tile photo-tile--placeholder" data-gallery-item data-era="${attr(era)}">
      <div class="photo-placeholder">
        <span class="photo-placeholder__mark" aria-hidden="true">?</span>
        <strong>Photograph pending</strong>
        <span>${esc(photo.caption)}</span>
        <span class="micro">${esc(photo.placeholderNote || "")}</span>
      </div>
    </div>`;
  }

  const meta = manifest[photo.id];
  if (!meta) throw new Error(`No image manifest entry for ${photo.id}`);

  return `<div class="photo-tile-wrap" data-gallery-item data-era="${attr(era)}">
  <button class="photo-tile" type="button" data-photo data-full="${attr(meta.largest.jpg)}" data-full-width="${meta.largest.w}" data-full-height="${
    meta.largest.h
  }" data-alt="${attr(photo.alt)}" data-caption="${attr(photo.caption)}" data-credit="${attr(
    photo.credit
  )}" data-license="${attr(photo.license)}" data-license-url="${attr(
    photo.licenseUrl
  )}" data-source="${attr(photo.source)}" aria-label="Open photograph: ${attr(photo.caption)}">
    ${picture(photo, { sizes, loading: options.loading || "lazy", fetchpriority: options.fetchpriority })}
    <span class="photo-tile__caption">${esc(photo.caption)}</span>
    <span class="photo-tile__credit">${esc(photo.credit)} · ${esc(photo.license)}</span>
  </button>
  ${copyButton(creditText(photo), `Copy credit for ${photo.caption}`, "copy-credit copy-credit--tile")}
</div>`;
}

function photoGrid(photos, options = {}) {
  if (!photos.length) return "";
  return `<div class="photo-grid${options.two ? " photo-grid--two" : ""}">${photos
    .map((photo, index) =>
      photoTile(photo, {
        sizes: options.sizes,
        loading: index === 0 ? "eager" : "lazy",
        fetchpriority: index === 0 ? "high" : undefined,
      })
    )
    .join("")}</div>`;
}

/* --------------------------------------------------------------------------
   Shared page furniture
   -------------------------------------------------------------------------- */

function navLink(item, currentPath) {
  const active =
    currentPath === item.href || currentPath.startsWith(`${item.href}/`);
  return `<a class="nav-link" href="${attr(item.href)}"${
    active ? ' aria-current="page"' : ""
  }>${esc(item.label)}</a>`;
}

function header(currentPath) {
  const menuLinks = [
    { label: "Home", href: "/" },
    ...data.nav,
    { label: "Search", href: "/search" },
  ];

  return `<header class="site-header" data-header data-pagefind-ignore>
  <div class="header-inner">
    <a class="brand" href="/" aria-label="${attr(site.name)} — home">
      <span class="brand-mark">${esc(site.name)}</span>
      <span class="brand-text">${esc(site.tagline)}</span>
    </a>
    <nav class="desktop-nav" aria-label="Primary">
      ${data.nav.map((item) => navLink(item, currentPath)).join("\n      ")}
      <a class="nav-link nav-search" href="/search" aria-label="Search the archive">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path></svg>
        <span>Search</span>
      </a>
    </nav>
    <button class="menu-toggle" type="button" data-menu-open aria-haspopup="dialog" aria-controls="site-menu">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
      Menu
    </button>
  </div>
</header>

<dialog class="menu-dialog" id="site-menu" aria-labelledby="menu-title" data-pagefind-ignore>
  <div class="menu-panel">
    <div class="menu-head">
      <span id="menu-title">Menu</span>
      <button class="menu-close" type="button" data-menu-close>Close</button>
    </div>
    <nav class="menu-nav" aria-label="Mobile">
      ${menuLinks
        .map(
          (item, index) =>
            `<a href="${attr(item.href)}">${esc(item.label)} <span>${String(index + 1).padStart(
              2,
              "0"
            )}</span></a>`
        )
        .join("\n      ")}
    </nav>
    <p class="menu-note">${esc(site.shortDisclaimer)}</p>
  </div>
</dialog>`;
}

function footer() {
  const year = site.updated.slice(0, 4);

  return `<footer class="site-footer" data-pagefind-ignore>
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/">
          <span class="brand-mark">${esc(site.name)}</span>
        </a>
        <p>${esc(data.footer.note)}</p>
      </div>
      ${data.footer.columns
        .map(
          (column) => `<div class="footer-col">
        <h2>${esc(column.title)}</h2>
        <ul>
          ${column.links
            .map(
              (link) =>
                `<li><a href="${attr(link.href)}"${
                  link.external ? ' target="_blank" rel="noopener noreferrer" data-external' : ""
                }>${esc(link.label)}</a></li>`
            )
            .join("\n          ")}
        </ul>
      </div>`
        )
        .join("\n      ")}
    </div>
    <div class="footer-bottom">
      <p class="footer-disclaimer">${esc(site.disclaimer)}</p>
      <p>© ${year} ${esc(site.name)} · <a href="/sources">Sources</a> · <a href="/about">About</a></p>
    </div>
  </div>
</footer>`;
}

function lightbox() {
  return `<dialog class="lightbox" id="lightbox" aria-labelledby="lightbox-title" data-pagefind-ignore>
  <div class="lightbox__inner">
    <div class="lightbox__media"><img id="lightbox-image" alt="" width="1200" height="1500"></div>
    <div class="lightbox__caption">
      <p class="lightbox__counter" id="lightbox-counter"></p>
      <h2 class="lightbox__title" id="lightbox-title"></h2>
      <p class="lightbox__credit" id="lightbox-credit"></p>
      <div class="lightbox__links" id="lightbox-links"></div>
      <button class="copy-credit copy-credit--inline" id="lightbox-copy" type="button" data-copy-credit>Copy credit</button>
    </div>
    <button class="lightbox__close" type="button" data-lightbox-close aria-label="Close photograph">×</button>
    <button class="lightbox__prev" type="button" data-lightbox-prev aria-label="Previous photograph">←</button>
    <button class="lightbox__next" type="button" data-lightbox-next aria-label="Next photograph">→</button>
  </div>
</dialog>`;
}

function breadcrumbs(items) {
  if (!items.length) return "";
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      ${items
        .map((item, index) => {
          const last = index === items.length - 1;
          if (last) return `<li><span aria-current="page">${esc(item.label)}</span></li>`;
          return `<li><a href="${attr(item.href)}">${esc(item.label)}</a></li>`;
        })
        .join("\n      ")}
    </ol>
  </nav>`;
}

function breadcrumbJsonLd(items, currentPath) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absolute(item.href || currentPath),
    })),
  };
}

function head(options) {
  const {
    pathname,
    title,
    description,
    og,
    noindex = false,
    extraHead = "",
    isHome = false,
  } = options;

  const canonical = absolute(pathname);
  const fullTitle = pageTitle(title, isHome);
  const ogImage = `${site.url}/assets/og/${og}.jpg`;

  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${attr(description)}">
  <link rel="canonical" href="${attr(canonical)}">
  <meta name="robots" content="${
    noindex ? "noindex, follow" : "index, follow, max-image-preview:large"
  }">
  <meta name="theme-color" content="#121726">
  <meta name="color-scheme" content="light">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${attr(site.name)}">
  <meta property="og:locale" content="en">
  <meta property="og:title" content="${attr(fullTitle)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(canonical)}">
  <meta property="og:image" content="${attr(ogImage)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${attr(`${fullTitle} — typographic card`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(fullTitle)}">
  <meta name="twitter:description" content="${attr(description)}">
  <meta name="twitter:image" content="${attr(ogImage)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/icons/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)} feed" href="/feed.xml">
  <link rel="preload" href="${assets.fonts.serif}" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${assets.fonts.sans}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${assets.css}">
  <script>document.documentElement.classList.add("js");</script>
  ${extraHead}`;
}

function layout(options) {
  const {
    pathname,
    title,
    description,
    og,
    noindex = false,
    bodyClass = "",
    crumbs = [],
    content,
    extraHead = "",
    extraScripts = "",
    structuredData = [],
    isHome = false,
  } = options;

  const crumbsJson = breadcrumbJsonLd(crumbs, pathname);
  const jsonLd = [...structuredData, ...(crumbsJson ? [crumbsJson] : [])];

  return `<!doctype html>
<html lang="en">
<head>
  ${head({ pathname, title, description, og, noindex, extraHead, isHome })}
  ${jsonLd.map(jsonLdScript).join("\n  ")}
</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ""}>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="reading-progress" aria-hidden="true"><span data-progress-bar></span></div>
  ${header(pathname)}
  <main id="main" class="page-main" tabindex="-1"${
    noindex ? " data-pagefind-ignore" : " data-pagefind-body"
  }>
${content}
  </main>
  ${footer()}
  ${lightbox()}
  ${extraScripts}
  <script src="${assets.js}" defer></script>
</body>
</html>
`;
}

function writeRoute(pathname, html) {
  const relative = pathname === "/" ? "index.html" : `${pathname.replace(/^\//, "")}.html`;
  writeFile(relative, html);
  routes.push(pathname);
}

function sectionHead(title, note, link) {
  return `<div class="section-head">
    <div>
      <h2>${esc(title)}</h2>
      ${note ? `<p>${esc(note)}</p>` : ""}
    </div>
    ${link ? `<a class="text-link" href="${attr(link.href)}">${esc(link.label)}</a>` : ""}
  </div>`;
}

function eraCard(era) {
  const photo = eraPhoto(era);
  return `<a class="era-card${photo ? "" : " era-card--type"}" href="/journey/${attr(era.id)}">
    ${
      photo
        ? `<div class="era-card__media">${picture(photo, {
            sizes: "(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw",
          })}</div><div class="era-card__shade"></div>`
        : `<span class="era-card__initial" aria-hidden="true">${esc(era.label.charAt(0))}</span>`
    }
    <div class="era-card__body">
      <p class="era-card__years">${esc(era.years)}</p>
      <h3>${esc(era.label)}</h3>
      <p>${esc(era.summary)}</p>
      <span class="text-link">Enter the chapter</span>
    </div>
  </a>`;
}

function albumCard(album) {
  const upcoming = album.status === "upcoming";
  return `<a class="album-card${upcoming ? " album-card--upcoming" : ""}" href="/discography/${attr(
    album.id
  )}">
    <div class="album-card__top">
      <span class="album-card__year">${esc(album.year)}</span>
      <span class="album-card__type">${esc(album.type)}</span>
    </div>
    <h3 class="album-card__title">${esc(album.title)}</h3>
    <p class="album-card__meta">${esc(album.released)}${
      upcoming && album.released !== "Unreleased" ? " · Unreleased" : ""
    }</p>
    <span class="album-card__initial" aria-hidden="true">${esc(album.title.charAt(0))}</span>
  </a>`;
}

function sourceList(ids) {
  const refs = ids.map((id) => refById[id]).filter(Boolean);
  if (!refs.length) return "";
  return `<ul class="source-list">
    ${refs
      .map(
        (ref) =>
          `<li><a href="${attr(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(
            ref.title
          )}</a><span>${esc(ref.publisher)}</span></li>`
      )
      .join("\n    ")}
  </ul>`;
}

function factList(facts) {
  return `<dl class="fact-list">${facts
    .map(
      (fact) =>
        `<div><dt>${esc(fact.label)}</dt><dd>${esc(fact.value)}</dd></div>`
    )
    .join("")}</dl>`;
}

function prevNext(previous, next, label) {
  if (!previous && !next) return "";
  return `<nav class="prev-next" aria-label="${attr(label)}">
    ${
      previous
        ? `<a href="${attr(previous.href)}"><span>Previous</span><strong>${esc(
            previous.label
          )}</strong></a>`
        : "<span></span>"
    }
    ${
      next
        ? `<a href="${attr(next.href)}"><span>Next</span><strong>${esc(next.label)}</strong></a>`
        : "<span></span>"
    }
  </nav>`;
}

/* --------------------------------------------------------------------------
   Assets
   -------------------------------------------------------------------------- */

const assets = {};

function buildAssets() {
  ensureDir(path.join(DIST, "assets", "fonts"));
  ensureDir(path.join(DIST, "assets", "css"));
  ensureDir(path.join(DIST, "assets", "js"));

  const fontFiles = {
    serif: "cormorant-garamond-latin",
    serifItalic: "cormorant-garamond-italic-latin",
    sans: "inter-latin",
    hand: "homemade-apple-latin",
  };

  for (const [key, name] of Object.entries(fontFiles)) {
    const buffer = fs.readFileSync(path.join(ROOT, "assets", "fonts", `${name}.woff2`));
    const hash = sha1(buffer);
    const filename = `${name}.${hash}.woff2`;
    writeFile(path.join("assets", "fonts", filename), buffer);
    assets.fonts = assets.fonts || {};
    assets.fonts[key] = `/assets/fonts/${filename}`;
  }

  let css = fs.readFileSync(path.join(SRC, "styles.css"), "utf8");
  css = css
    .replaceAll("__FONT_CORMORANT__", assets.fonts.serif)
    .replaceAll("__FONT_CORMORANT_ITALIC__", assets.fonts.serifItalic)
    .replaceAll("__FONT_INTER__", assets.fonts.sans)
    .replaceAll("__FONT_HAND__", assets.fonts.hand);

  assets.css = writeHashed("assets/css", "style", "css", css);

  const js = fs.readFileSync(path.join(SRC, "main.js"), "utf8");
  assets.js = writeHashed("assets/js", "main", "js", js);

  const lottie = fs.readFileSync(
    path.join(ROOT, "node_modules", "lottie-web", "build", "player", "lottie_light.min.js"),
    "utf8"
  );
  assets.lottie = writeHashed("assets/js", "lottie", "js", lottie);

  const orbit = fs.readFileSync(path.join(SRC, "lottie-orbit.json"), "utf8");
  assets.orbit = writeHashed("assets/data", "orbit", "json", orbit);

  writeFile("favicon.svg", fs.readFileSync(path.join(SRC, "favicon.svg")));

  writeFile(
    "site.webmanifest",
    JSON.stringify(
      {
        name: `${site.name} — ${site.tagline}`,
        short_name: site.name,
        description: site.description,
        start_url: "/",
        display: "standalone",
        background_color: "#121726",
        theme_color: "#121726",
        icons: [
          { src: "/assets/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
          { src: "/assets/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
          { src: "/assets/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      null,
      2
    )
  );
}

/* --------------------------------------------------------------------------
   Home
   -------------------------------------------------------------------------- */

function renderHome() {
  const home = data.home;
  const hero = photoById[home.heroPhoto];
  const highlights = home.highlights.map((id) => eraById[id]).filter(Boolean);
  const strip = home.galleryStrip.map((id) => photoById[id]).filter(Boolean);
  const featured = home.featuredAlbums.map((id) => albumById[id]).filter(Boolean);

  const content = `<section class="hero">
    <div class="hero__media">${picture(hero, {
      sizes: "100vw",
      loading: "eager",
      fetchpriority: "high",
    })}</div>
    <div class="hero__shade"></div>
    <div class="hero__inner">
      <div class="hero__content">
        <p class="eyebrow hero__eyebrow">${esc(home.eyebrow)}</p>
        <h1>${esc(home.title)}</h1>
        <span class="hero__subtitle">${esc(home.subtitle)}</span>
        <p class="hero__tagline">${esc(home.tagline)}</p>
        <div class="hero__actions">
          <a class="btn btn--primary" href="/journey">Begin the journey</a>
          <a class="btn btn--ghost" href="/gallery">Browse the gallery</a>
        </div>
        <a class="hero__scroll" href="#archive">Inside the archive</a>
      </div>
    </div>
    <div class="hero__aside" aria-hidden="true">
      <div class="lottie-orbit" data-lottie="${assets.orbit}" data-lottie-lib="${assets.lottie}"></div>
      <span>EST. 2026 · CHAPTER 01 / 09</span>
    </div>
    <p class="hero__credit">${creditLine(hero, { link: true })}</p>
  </section>

  <section class="section section--tight" id="archive">
    <div class="container">
      <dl class="stats">
        ${home.stats
          .map((stat) => `<div><dt>${esc(stat.value)}</dt><dd>${esc(stat.label)}</dd></div>`)
          .join("\n        ")}
      </dl>
    </div>
  </section>

  <section class="section">
    <div class="container home-intro">
      <div>
        <p class="eyebrow">The archive</p>
        <h2>${esc(home.sections.introTitle)}</h2>
        ${home.sections.introBody.map((paragraph) => `<p class="lede">${esc(paragraph)}</p>`).join("")}
      </div>
      <aside class="home-intro__aside">
        <h2 class="micro">${esc(home.sections.introAsideTitle)}</h2>
        <ul class="rules-list">
          ${data.fanNotes.rules.map((rule) => `<li>${esc(rule)}</li>`).join("\n          ")}
        </ul>
      </aside>
    </div>
  </section>

  <section class="section section--paper-2">
    <div class="container">
      ${sectionHead(home.sections.highlightsTitle, home.sections.highlightsNote, {
        label: "All nine chapters",
        href: "/journey",
      })}
      <div class="card-grid">
        ${highlights.map(eraCard).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead(home.sections.timelineTitle, "", {
        label: "Open the journey",
        href: "/journey",
      })}
      <ol class="timeline-preview">
        ${data.eras
          .map(
            (era) => `<li><a href="/journey/${attr(era.id)}">
              <span class="timeline-preview__year">${esc(era.years)}</span>
              <span class="timeline-preview__title">${esc(era.label)}</span>
              <span class="timeline-preview__arrow" aria-hidden="true">→</span>
            </a></li>`
          )
          .join("\n        ")}
      </ol>
    </div>
  </section>

  <section class="section section--paper-3">
    <div class="container">
      ${sectionHead(home.sections.galleryTitle, home.sections.galleryNote, {
        label: "See all photographs",
        href: "/gallery",
      })}
      <div class="gallery-strip">
        ${strip
          .map(
            (photo) => `<a class="gallery-strip__item" href="/gallery/${attr(photo.era)}">
              ${picture(photo, { sizes: "(max-width: 720px) 50vw, 25vw" })}
              <span class="gallery-strip__caption">${esc(photo.caption)}</span>
            </a>`
          )
          .join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead(home.sections.albumsTitle, home.sections.albumsNote, {
        label: "Full discography",
        href: "/discography",
      })}
      <div class="release-grid release-grid--four">
        ${featured.map(albumCard).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section section--dark home-closing">
    <div class="container">
      <p class="eyebrow">${esc(home.closing.kicker)}</p>
      <h2>${esc(home.closing.title)}</h2>
      <p class="lede">${esc(home.closing.body)}</p>
      <div class="link-row" style="margin-top: 1.6rem">
        ${home.closing.links
          .map(
            (link, index) =>
              `<a class="btn ${index === 0 ? "btn--light" : "btn--ghost"}" href="${attr(
                link.href
              )}">${esc(link.label)}</a>`
          )
          .join("\n        ")}
      </div>
    </div>
  </section>`;

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      alternateName: site.tagline,
      url: site.url,
      description: site.description,
      inLanguage: "en",
      dateModified: site.updated,
    },
  ];

  return layout({
    pathname: "/",
    title: site.name,
    description: site.description,
    og: "home",
    content,
    structuredData: structured,
    isHome: true,
  });
}

/* --------------------------------------------------------------------------
   Journey
   -------------------------------------------------------------------------- */

function renderJourney() {
  const page = data.pages.journey;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Journey" },
  ];

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(page.eyebrow)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lede">${esc(page.lede)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <ol class="journey-list">
        ${data.eras
          .map((era, index) => {
            const photo = eraPhoto(era);
            return `<li class="journey-item">
          <a class="journey-item__link" href="/journey/${attr(era.id)}">
            <span>
              <span class="journey-item__index">Chapter ${String(index + 1).padStart(2, "0")}</span>
              <span class="journey-item__year">${esc(era.years)}</span>
            </span>
            <span>
              <span class="journey-item__title">${esc(era.label)}</span>
              <span class="journey-item__summary">${esc(era.summary)}</span>
            </span>
            <span class="journey-item__thumb${photo ? "" : " journey-item__thumb--type"}">
              ${
                photo
                  ? picture(photo, { sizes: "(max-width: 900px) 100vw, 12rem" })
                  : `<span aria-hidden="true">${esc(era.label.charAt(0))}</span>`
              }
            </span>
          </a>
        </li>`;
          })
          .join("\n        ")}
      </ol>
      <p class="journey-note micro">${esc(page.note)}</p>
    </div>
  </section>`;

  return layout({
    pathname: "/journey",
    title: page.title,
    description: page.lede,
    og: "journey",
    crumbs,
    content,
  });
}

function renderEra(era, index) {
  const photo = eraPhoto(era);
  const albums = era.albums.map((id) => albumById[id]).filter(Boolean);
  const photos = era.photoIds.map((id) => photoById[id]).filter(Boolean);
  const previousEra = data.eras[index - 1];
  const nextEra = data.eras[index + 1];
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Journey", href: "/journey" },
    { label: era.label },
  ];

  const content = `<section class="page-hero page-hero--accent" style="--accent: ${attr(era.accent)}">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <div class="era-hero">
        <div class="era-hero__copy">
          <p class="era-hero__years">${esc(era.years)}</p>
          <p class="eyebrow">Chapter ${String(index + 1).padStart(2, "0")} · ${esc(era.label)}</p>
          <h1>${esc(era.title)}</h1>
          <p class="lede">${esc(era.lede)}</p>
          <div class="link-row" style="margin-top: 1.5rem">
            <a class="btn btn--primary" href="#releases">Releases in this chapter</a>
            <a class="btn btn--ghost" href="/gallery/${attr(era.id)}">Photographs</a>
          </div>
        </div>
        ${
          photo
            ? `<figure class="era-hero__media">
          ${picture(photo, { sizes: "(max-width: 900px) 100vw, 45vw", loading: "eager", fetchpriority: "high" })}
          <figcaption>${creditLine(photo, { link: true })}</figcaption>
        </figure>`
            : `<div class="era-hero__media era-hero__media--empty"><span>${esc(
                era.label
              )}<br><small>No licensed photograph yet</small></span></div>`
        }
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container era-layout">
      <div class="era-narrative">
        ${era.sections
          .map(
            (section) => `<section>
          <h2>${esc(section.heading)}</h2>
          ${section.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
        </section>`
          )
          .join("\n        ")}

        <section class="era-releases" id="releases">
          <h2>Releases in this chapter</h2>
          <div class="release-grid">
            ${albums.map(albumCard).join("\n            ")}
          </div>
        </section>

        <section class="era-photos">
          ${sectionHead("Photographs", `Images from the ${era.label} chapter.`, {
            label: "Open the gallery",
            href: `/gallery/${era.id}`,
          })}
          ${photoGrid(photos, {
            sizes: "(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw",
          })}
        </section>

        ${prevNext(
          previousEra ? { href: `/journey/${previousEra.id}`, label: previousEra.label } : null,
          nextEra ? { href: `/journey/${nextEra.id}`, label: nextEra.label } : null,
          "Previous and next chapters"
        )}
      </div>

      <aside class="era-aside">
        <nav class="chapter-rail fact-card" aria-label="Chapters">
          <p class="micro">Chapter ${String(index + 1).padStart(2, "0")} / ${String(
            data.eras.length
          ).padStart(2, "0")}</p>
          <ol>
            ${data.eras
              .map(
                (item, chapterIndex) =>
                  `<li><a href="/journey/${attr(item.id)}"${
                    chapterIndex === index ? ' aria-current="page"' : ""
                  } aria-label="${attr(item.label)}"><span></span></a></li>`
              )
              .join("")}
          </ol>
          <strong>${esc(era.label)}</strong>
        </nav>
        <div class="fact-card">
          <h2>At a glance</h2>
          ${factList(era.facts)}
        </div>
        <div class="fact-card">
          <h2>Start listening</h2>
          <ul class="listen-list">
            ${era.listening.map((item) => `<li>${esc(item)}</li>`).join("\n            ")}
          </ul>
        </div>
        <div class="fact-card">
          <h2>Releases</h2>
          <ul class="aside-links">
            ${albums
              .map(
                (album) =>
                  `<li><a href="/discography/${attr(album.id)}">${esc(album.title)}</a> <span>${esc(
                    album.year
                  )}</span></li>`
              )
              .join("\n            ")}
          </ul>
        </div>
        <div class="fact-card">
          <h2>Sources</h2>
          ${sourceList(era.sources)}
        </div>
      </aside>
    </div>
  </section>`;

  return layout({
    pathname: `/journey/${era.id}`,
    title: era.title,
    description: era.summary,
    og: `journey-${era.id}`,
    bodyClass: "",
    crumbs,
    content,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: era.title,
        description: era.summary,
        url: absolute(`/journey/${era.id}`),
        isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
        about: { "@type": "Person", name: "Lana Del Rey" },
      },
    ],
  });
}

/* --------------------------------------------------------------------------
   Gallery
   -------------------------------------------------------------------------- */

function renderGallery() {
  const page = data.pages.gallery;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Gallery" },
  ];
  const realPhotos = data.photos.filter((photo) => !photo.placeholder);

  const counts = Object.fromEntries(
    data.eras.map((era) => [
      era.id,
      data.photos.filter((photo) => photo.era === era.id).length,
    ])
  );

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(page.eyebrow)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lede">${esc(page.lede)}</p>
      <div class="page-hero__meta">
        <span>${realPhotos.length} credited photographs</span>
        <span>${data.eras.length} chapters</span>
        <span>Stored locally</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="filter-bar" data-filter-bar role="group" aria-label="Filter photographs by chapter">
        <button class="filter-chip" type="button" data-filter="all" aria-pressed="true">All <span>${
          data.photos.length
        }</span></button>
        ${data.eras
          .map(
            (era) =>
              `<button class="filter-chip" type="button" data-filter="${attr(
                era.id
              )}" aria-pressed="false">${esc(era.label)} <span>${counts[era.id]}</span></button>`
          )
          .join("\n        ")}
      </div>
      <p class="filter-status" data-filter-status role="status" aria-live="polite">Showing ${
        data.photos.length
      } items.</p>
      ${photoGrid(data.photos, {
        sizes: "(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw",
      })}
      <p class="gallery-note">${esc(page.note)} <a href="/sources">Full credits and licences</a>.</p>
    </div>
  </section>`;

  return layout({
    pathname: "/gallery",
    title: page.title,
    description: page.lede,
    og: "gallery",
    bodyClass: "gallery-page",
    crumbs,
    content,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        name: page.title,
        description: page.lede,
        url: absolute("/gallery"),
        about: { "@type": "Person", name: "Lana Del Rey" },
      },
    ],
  });
}

function renderGalleryEra(era, index) {
  const photos = data.photos.filter((photo) => photo.era === era.id);
  const real = photos.filter((photo) => !photo.placeholder);
  const previousEra = data.eras[index - 1];
  const nextEra = data.eras[index + 1];
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Gallery", href: "/gallery" },
    { label: era.label },
  ];
  const title = `${era.label} in photographs`;
  const description = `Photographs of Lana Del Rey from the ${era.label} era (${era.years}). Every image includes a named creator, source, and licence.`;

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">Gallery · ${esc(era.years)}</p>
      <h1>${esc(title)}</h1>
      <p class="lede">${esc(era.summary)}</p>
      <div class="page-hero__meta">
        <span>${real.length} credited ${real.length === 1 ? "photograph" : "photographs"}</span>
        <span><a href="/journey/${attr(era.id)}">Read the chapter</a></span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${photoGrid(photos, {
        sizes: "(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw",
      })}
      <p class="gallery-note">${esc(data.site.photoPolicy)} <a href="/sources">Full credits and licences</a>.</p>
      ${prevNext(
        previousEra
          ? { href: `/gallery/${previousEra.id}`, label: `${previousEra.label} gallery` }
          : { href: "/gallery", label: "All photographs" },
        nextEra ? { href: `/gallery/${nextEra.id}`, label: `${nextEra.label} gallery` } : null,
        "Previous and next galleries"
      )}
    </div>
  </section>`;

  return layout({
    pathname: `/gallery/${era.id}`,
    title,
    description,
    og: `gallery-${era.id}`,
    bodyClass: "gallery-page",
    crumbs,
    content,
  });
}

/* --------------------------------------------------------------------------
   Discography
   -------------------------------------------------------------------------- */

function renderDiscography() {
  const page = data.pages.discography;
  const released = data.albums.filter((album) => album.status !== "upcoming");
  const upcoming = data.albums.filter((album) => album.status === "upcoming");
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Discography" },
  ];

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(page.eyebrow)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lede">${esc(page.lede)}</p>
      <div class="page-hero__meta">
        <span>${released.length} released</span>
        <span>${upcoming.length} announced</span>
        <span>Standard editions</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead("Released", "Albums, EPs, a film, and a spoken-word record, in chronological order.")}
      <div class="release-grid">
        ${released.map(albumCard).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section section--paper-2">
    <div class="container">
      ${sectionHead("Announced, not yet heard", "Described as provisional until a final tracklist and release date are confirmed.")}
      <div class="release-grid">
        ${upcoming.map(albumCard).join("\n        ")}
      </div>
      <p class="journey-note micro">${esc(page.note)}</p>
    </div>
  </section>`;

  return layout({
    pathname: "/discography",
    title: page.title,
    description: page.lede,
    og: "discography",
    crumbs,
    content,
  });
}

function renderAlbum(album, index) {
  const era = eraById[album.era];
  const previousAlbum = data.albums[index - 1];
  const nextAlbum = data.albums[index + 1];
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Discography", href: "/discography" },
    { label: album.title },
  ];
  const title = album.title;
  const description = `${album.title} (${album.year}): ${album.summary}`;

  const tracklist = album.tracklist.length
    ? `<ol class="tracklist">
        ${album.tracklist
          .map(
            (track, trackIndex) => `<li>
          <span class="tracklist__num">${String(trackIndex + 1).padStart(2, "0")}</span>
          <span class="tracklist__title">${esc(track.title)}</span>
          <span class="tracklist__note">${esc(track.note || "")}</span>
        </li>`
          )
          .join("\n        ")}
      </ol>`
    : `<div class="empty-state">
        <strong>No official tracklist yet</strong>
        <p>${esc(album.tracklistNote)}</p>
      </div>`;

  const content = `<section class="release-hero" style="--accent: ${attr(era.accent)}">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(album.type)} · ${esc(era.label)}</p>
      <h1>${esc(title)}</h1>
      <p class="lede">${esc(album.summary)}</p>
      <ul class="release-meta">
        <li>${esc(album.released)}</li>
        <li>${esc(album.label)}</li>
        <li>${album.status === "upcoming" ? "Unreleased" : "Released"}</li>
      </ul>
    </div>
  </section>

  <section class="section">
    <div class="container release-layout">
      <div class="release-narrative">
        <h2>About this release</h2>
        ${album.narrative.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n        ")}

        <section class="tracklist-block">
          <h2>Tracklist</h2>
          <p>${esc(album.tracklistNote)}</p>
          ${tracklist}
        </section>

        ${prevNext(
          previousAlbum
            ? { href: `/discography/${previousAlbum.id}`, label: previousAlbum.title }
            : null,
          nextAlbum ? { href: `/discography/${nextAlbum.id}`, label: nextAlbum.title } : null,
          "Previous and next releases"
        )}
      </div>

      <aside class="release-aside">
        <div class="release-mark">
          <span class="release-mark__year">${esc(album.year)}</span>
          <span class="release-mark__type">${esc(album.type)}<br>${esc(album.label)}</span>
          <span class="release-mark__initial" aria-hidden="true">${esc(album.title.charAt(0))}</span>
        </div>
        <div class="fact-card">
          <h2>Details</h2>
          ${factList(album.facts)}
        </div>
        <a class="era-link-card" href="/journey/${attr(era.id)}">
          <span>Part of the ${esc(era.label)} chapter</span>
          <strong>${esc(era.title)}</strong>
        </a>
        <div class="fact-card">
          <h2>Sources</h2>
          ${sourceList(album.sources)}
        </div>
      </aside>
    </div>
  </section>`;

  return layout({
    pathname: `/discography/${album.id}`,
    title,
    description,
    og: `discography-${album.id}`,
    crumbs,
    content,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "MusicAlbum",
        name: album.title,
        url: absolute(`/discography/${album.id}`),
        byArtist: { "@type": "Person", name: "Lana Del Rey" },
        albumProductionType: album.type.includes("Studio") ? "StudioAlbum" : undefined,
        albumReleaseType: album.type.includes("EP") ? "EP" : "Album",
        numTracks: album.tracklist.length || undefined,
        ...(album.status !== "upcoming" ? { datePublished: album.year } : {}),
      },
    ],
  });
}

/* --------------------------------------------------------------------------
   Fan notes, sources, about, search, 404
   -------------------------------------------------------------------------- */

function renderFanNotes() {
  const notes = data.fanNotes;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Fan notes" },
  ];

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(notes.eyebrow)}</p>
      <h1>${esc(notes.title)}</h1>
      <p class="lede">${esc(notes.lede)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="notes-grid">
        ${notes.notes
          .map(
            (note) => `<article id="${attr(noteSlug(note.title))}" class="note-card${
              note.status === "placeholder" ? " note-card--placeholder" : ""
            }">
          <div class="note-card__meta">
            <span class="note-card__tag">${esc(note.tag)}</span>
            <span>${esc(note.date)}</span>
          </div>
          <h2>${esc(note.title)}</h2>
          ${note.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n          ")}
        </article>`
          )
          .join("\n        ")}
      </div>

      <div class="rules-block">
        <h2>House rules</h2>
        <ul class="rules-list">
          ${notes.rules.map((rule) => `<li>${esc(rule)}</li>`).join("\n          ")}
        </ul>
      </div>

      <div class="submit-card">
        <div>
          <h2>${esc(notes.submit.title)}</h2>
          <p>${esc(notes.submit.body)}</p>
          <span class="submit-card__contact">${contactLink(
            notes.submit.url,
            notes.submit.contact
          )}</span>
        </div>
        <a class="btn btn--light" href="/about#contact">Contact details</a>
      </div>
    </div>
  </section>`;

  return layout({
    pathname: "/fan-notes",
    title: notes.title,
    description: notes.lede,
    og: "fan-notes",
    crumbs,
    content,
  });
}

function renderSources() {
  const page = data.pages.sources;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Sources" },
  ];

  const groups = [];
  for (const ref of data.references) {
    let group = groups.find((item) => item.name === ref.category);
    if (!group) {
      group = { name: ref.category, refs: [] };
      groups.push(group);
    }
    group.refs.push(ref);
  }

  let counter = 0;
  const credits = data.photos.filter((photo) => !photo.placeholder);

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(page.eyebrow)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lede">${esc(page.lede)}</p>
      <div class="page-hero__meta">
        <span>${data.references.length} references</span>
        <span>${credits.length} photo credits</span>
        <span>Checked ${esc(site.updatedLabel)}</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="ref-groups">
        ${groups
          .map(
            (group) => `<section class="ref-group">
          <h2>${esc(group.name)}</h2>
          <ol class="ref-list">
            ${group.refs
              .map((ref) => {
                counter += 1;
                return `<li>
              <span class="ref-list__num">${String(counter).padStart(2, "0")}</span>
              <span class="ref-list__title"><a href="${attr(
                ref.url
              )}" target="_blank" rel="noopener noreferrer">${esc(ref.title)}</a></span>
              <span class="ref-list__meta">${esc(ref.publisher)} · accessed ${esc(ref.accessed)}</span>
              <span class="ref-list__note">${esc(ref.note)}</span>
            </li>`;
              })
              .join("\n            ")}
          </ol>
        </section>`
          )
          .join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section section--paper-2">
    <div class="container">
      ${sectionHead("Photograph credits", "Every image, its creator, its licence, and the file page it came from.")}
      <div class="credit-grid">
        ${credits
          .map(
            (photo) => `<article class="credit-card">
          ${picture(photo, { sizes: "80px" })}
          <div>
            <h3>${esc(photo.caption)}</h3>
            <p>${esc(photo.credit)} · ${esc(photo.license)}</p>
            <p><a href="${attr(photo.source)}" target="_blank" rel="noopener noreferrer">Original file page</a> · <a href="${attr(
              photo.licenseUrl
            )}" target="_blank" rel="noopener noreferrer">Licence</a></p>
          </div>
          ${copyButton(creditText(photo), `Copy credit for ${photo.caption}`)}
        </article>`
          )
          .join("\n        ")}
      </div>
      <p class="license-note">${esc(site.photoPolicy)} Licences used in this collection: CC BY 2.0, CC BY-SA 2.0, CC BY-SA 3.0, CC BY-SA 4.0, and CC BY 4.0. Creative Commons licences do not remove the need for attribution; each card links to the terms that apply.</p>
      <p class="journey-note micro">${esc(page.note)}</p>
    </div>
  </section>`;

  return layout({
    pathname: "/sources",
    title: page.title,
    description: page.lede,
    og: "sources",
    crumbs,
    content,
  });
}

function renderAbout() {
  const about = data.about;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "About" },
  ];

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(about.eyebrow)}</p>
      <h1>${esc(about.title)}</h1>
      <p class="lede">${esc(about.lede)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container about-layout">
      <div class="about-copy">
        ${about.sections
          .map(
            (section) => `<section>
          <h2>${esc(section.heading)}</h2>
          ${section.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
        </section>`
          )
          .join("\n        ")}
      </div>

      <aside class="about-aside">
        <div class="contact-box" id="contact">
          <h2>${esc(about.contact.label)}</h2>
          <p>Corrections, takedown requests, and licensed photograph offers:</p>
          <strong>${contactLink(about.contact.value, about.contact.action)}</strong>
          <small>${esc(about.contact.note)}</small>
        </div>
        <div class="fact-card">
          <h2>Colophon</h2>
          <ul class="colophon">
            ${about.colophon.map((item) => `<li>${esc(item)}</li>`).join("\n            ")}
          </ul>
        </div>
        <a class="era-link-card" href="/sources">
          <span>Verify a claim</span>
          <strong>Open the source list</strong>
        </a>
      </aside>
    </div>
  </section>

  <section class="section section--paper-2">
    <div class="container">
      <div class="disclaimer-box">
        <h2>Disclaimer</h2>
        <p>${esc(site.disclaimer)}</p>
        <p>This site is a non-commercial fan project. It does not host or distribute copyrighted audio, full lyrics, or paid artwork. Photographs are used under the open licences listed on each image, and are removed or corrected on request.</p>
      </div>
    </div>
  </section>`;

  return layout({
    pathname: "/about",
    title: about.title,
    description: about.lede,
    og: "about",
    crumbs,
    content,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: about.title,
        description: about.lede,
        url: absolute("/about"),
      },
    ],
  });
}

function renderSearch() {
  const page = data.search;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Search" },
  ];

  const content = `<section class="page-hero">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow" style="margin-top: 2rem">${esc(page.eyebrow)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lede">${esc(page.lede)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="search-shell">
        <div id="search"></div>
        <noscript>
          <div class="search-fallback">
            <p>Search needs JavaScript. Every page is still reachable without it:</p>
            <ul>
              <li><a href="/journey">Journey — all nine chapters</a></li>
              <li><a href="/discography">Discography — all sixteen releases</a></li>
              <li><a href="/gallery">Gallery — all photographs</a></li>
              <li><a href="/sources">Sources and credits</a></li>
            </ul>
          </div>
        </noscript>
        <div class="search-fallback" id="search-fallback" hidden>
          <p>The search index could not be loaded. Browse the <a href="/journey">journey</a>, the <a href="/discography">discography</a>, or the <a href="/gallery">gallery</a> instead.</p>
        </div>
        <p class="search-note micro">${esc(page.note)}</p>
      </div>
    </div>
  </section>`;

  return layout({
    pathname: "/search",
    title: page.title,
    description: page.lede,
    og: "search",
    noindex: true,
    crumbs,
    content,
    extraHead: `<link rel="stylesheet" href="/pagefind/pagefind-ui.css">
  <script src="/pagefind/pagefind-ui.js" defer></script>`,
  });
}

function renderNotFound() {
  const page = data.notFound;

  const content = `<section class="not-found">
    <div class="container">
      <div class="not-found__inner">
        <div class="not-found__orbit" aria-hidden="true"><div class="lottie-orbit" data-lottie="${assets.orbit}" data-lottie-lib="${assets.lottie}"></div></div>
        <p class="not-found__code" aria-hidden="true">404</p>
        <p class="eyebrow">${esc(page.eyebrow)}</p>
        <h1>${esc(page.title)}</h1>
        <p class="lede">${esc(page.lede)}</p>
        <p class="micro">${esc(page.note)}</p>
        <div class="not-found__links">
          <a class="btn btn--light" href="/journey">Open the journey</a>
          <a class="btn btn--ghost" href="/gallery">Browse the gallery</a>
          <a class="btn btn--ghost" href="/search">Search the archive</a>
        </div>
      </div>
    </div>
  </section>`;

  return layout({
    pathname: "/404",
    title: page.title,
    description: page.lede,
    og: "404",
    noindex: true,
    content,
  });
}

/* --------------------------------------------------------------------------
   Sitemap, robots, index
   -------------------------------------------------------------------------- */

function buildFeed() {
  const items = [];

  for (const note of data.fanNotes.notes) {
    items.push({
      title: note.title,
      link: `${site.url}/fan-notes#${noteSlug(note.title)}`,
      description: note.body[0] || note.tag,
      date: `${note.date} UTC`,
    });
  }

  for (const album of data.albums) {
    items.push({
      title: `${album.title} — ${album.type}`,
      link: `${site.url}/discography/${album.id}`,
      description: album.summary,
      date: `${album.year}-01-01`,
    });
  }

  items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(site.name)} — ${esc(site.tagline)}</title>
  <link>${esc(site.url)}/</link>
  <description>${esc(site.description)}</description>
  <language>en</language>
  <lastBuildDate>${new Date(site.updated).toUTCString()}</lastBuildDate>
  <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml" />
  ${items
    .map(
      (item) => `<item>
    <title>${esc(item.title)}</title>
    <link>${esc(item.link)}</link>
    <guid isPermaLink="true">${esc(item.link)}</guid>
    <pubDate>${new Date(item.date).toUTCString()}</pubDate>
    <description>${esc(item.description)}</description>
  </item>`
    )
    .join("\n  ")}
</channel>
</rss>
`;

  writeFile("feed.xml", xml);
}

function buildSitemap() {
  const entries = [];

  const add = (pathname, priority, changefreq = "monthly") => {
    entries.push({ pathname, priority, changefreq });
  };

  add("/", "1.0", "monthly");
  add("/journey", "0.9");
  for (const era of data.eras) add(`/journey/${era.id}`, "0.8");
  add("/gallery", "0.8");
  for (const era of data.eras) add(`/gallery/${era.id}`, "0.6");
  add("/discography", "0.9");
  for (const album of data.albums) add(`/discography/${album.id}`, "0.7");
  add("/fan-notes", "0.5");
  add("/sources", "0.5");
  add("/about", "0.5");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${esc(absolute(entry.pathname))}</loc>
    <lastmod>${site.updated}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  writeFile("sitemap.xml", xml);

  writeFile(
    "robots.txt",
    `User-agent: *
Allow: /
Disallow: /search
Disallow: /pagefind/

Sitemap: ${site.url}/sitemap.xml
`
  );
}

function buildIndex() {
  const links = [
    { href: "/journey", label: "Journey" },
    { href: "/gallery", label: "Gallery" },
    { href: "/discography", label: "Discography" },
    { href: "/fan-notes", label: "Fan notes" },
    { href: "/sources", label: "Sources" },
    { href: "/about", label: "About" },
    { href: "/search", label: "Search" },
  ];

  writeFile(
    "index.json",
    JSON.stringify(
      {
        site: { name: site.name, url: site.url, updated: site.updated, feed: "/feed.xml" },
        links,
        eras: data.eras.map((era) => ({
          id: era.id,
          label: era.label,
          years: era.years,
          url: `/journey/${era.id}`,
          gallery: `/gallery/${era.id}`,
        })),
        albums: data.albums.map((album) => ({
          id: album.id,
          title: album.title,
          year: album.year,
          type: album.type,
          status: album.status,
          url: `/discography/${album.id}`,
        })),
      },
      null,
      2
    )
  );
}

/* --------------------------------------------------------------------------
   Main
   -------------------------------------------------------------------------- */

function main() {
  console.log("build: cleaning dist/");
  fs.rmSync(DIST, { recursive: true, force: true });
  ensureDir(DIST);

  console.log("build: images");
  run("python3", ["scripts/images.py"]);

  console.log("build: og cards and icons");
  run("python3", ["scripts/og.py"]);

  manifest = JSON.parse(fs.readFileSync(path.join(SRC, "images.manifest.json"), "utf8"));

  console.log("build: assets");
  buildAssets();

  console.log("build: pages");
  writeRoute("/", renderHome());
  writeRoute("/journey", renderJourney());
  data.eras.forEach((era, index) => {
    writeRoute(`/journey/${era.id}`, renderEra(era, index));
  });
  writeRoute("/gallery", renderGallery());
  data.eras.forEach((era, index) => {
    writeRoute(`/gallery/${era.id}`, renderGalleryEra(era, index));
  });
  writeRoute("/discography", renderDiscography());
  data.albums.forEach((album, index) => {
    writeRoute(`/discography/${album.id}`, renderAlbum(album, index));
  });
  writeRoute("/fan-notes", renderFanNotes());
  writeRoute("/sources", renderSources());
  writeRoute("/about", renderAbout());
  writeRoute("/search", renderSearch());
  writeRoute("/404", renderNotFound());

  buildSitemap();
  buildFeed();
  buildIndex();

  const pagefindLocal = path.join(ROOT, "node_modules", ".bin", "pagefind");
  const pagefind = fs.existsSync(pagefindLocal)
    ? pagefindLocal
    : process.env.PAGEFIND || "pagefind";

  console.log("build: pagefind");
  try {
    run(pagefind, ["--site", DIST, "--force-language", "en"]);
  } catch (error) {
    console.error(
      "build: pagefind failed. Install it with `npm install` or set PAGEFIND=/path/to/pagefind."
    );
    throw error;
  }

  const htmlCount = routes.length;
  console.log(`build: ${htmlCount} pages written to ${DIST}`);
}

main();
