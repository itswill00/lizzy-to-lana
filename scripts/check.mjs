#!/usr/bin/env node
/**
 * Static sanity checks for the generated site: unique metadata, valid
 * internal links and assets, alt text, dimensions, and English routes.
 *
 * Usage: node scripts/check.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data.json"), "utf8"));

const errors = [];
const warnings = [];
const pages = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "pagefind") continue;
      walk(full);
    } else if (entry.name.endsWith(".html")) {
      pages.push(full);
    }
  }
}

function routeToFile(href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return null;
  if (clean === "/") return path.join(DIST, "index.html");
  if (clean.startsWith("/assets/") || clean.startsWith("/pagefind/")) {
    return path.join(DIST, clean);
  }
  if (clean === "/favicon.svg" || clean === "/site.webmanifest") {
    return path.join(DIST, clean);
  }
  if (clean === "/404") return path.join(DIST, "404.html");
  const candidate = path.join(DIST, `${clean.replace(/^\//, "")}.html`);
  if (fs.existsSync(candidate)) return candidate;
  const index = path.join(DIST, clean.replace(/^\//, ""), "index.html");
  if (fs.existsSync(index)) return index;
  return null;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return match ? match[1] : null;
}

if (!fs.existsSync(DIST)) {
  console.error("check: dist/ is missing; run npm run build first.");
  process.exit(1);
}

walk(DIST);

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(DIST, file);

  if (!/<html lang="en"/.test(html)) errors.push(`${relative}: missing <html lang="en">`);

  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]*)">/)?.[1];
  const ogImage = html.match(/<meta property="og:image" content="([^"]*)">/)?.[1];

  if (!title) errors.push(`${relative}: missing title`);
  if (!description) errors.push(`${relative}: missing meta description`);
  if (!canonical) errors.push(`${relative}: missing canonical`);
  if (!ogImage) errors.push(`${relative}: missing og:image`);

  if (title) {
    if (titles.has(title)) errors.push(`${relative}: duplicate title with ${titles.get(title)}`);
    titles.set(title, relative);
  }
  if (description) {
    if (descriptions.has(description)) {
      warnings.push(`${relative}: duplicate description with ${descriptions.get(description)}`);
    }
    descriptions.set(description, relative);
  }
  if (canonical) {
    if (canonicals.has(canonical)) errors.push(`${relative}: duplicate canonical with ${canonicals.get(canonical)}`);
    canonicals.set(canonical, relative);
    if (!canonical.startsWith(DATA.site.url)) errors.push(`${relative}: canonical is not absolute`);
  }

  if (ogImage) {
    const ogPath = ogImage.replace(DATA.site.url, "");
    if (!fs.existsSync(path.join(DIST, ogPath))) errors.push(`${relative}: og image missing (${ogPath})`);
  }

  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = match[0];
    if (!attr(tag, "alt") && !/alt=""/.test(tag)) errors.push(`${relative}: image without alt`);
    if (!attr(tag, "width") || !attr(tag, "height")) {
      errors.push(`${relative}: image without width/height`);
    }
  }

  for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    const href = match[1];
    if (href.startsWith("/assets/og/")) continue;
    if (href.startsWith("/pagefind/")) continue;
    if (href === "/search") continue;
    if (!routeToFile(href)) errors.push(`${relative}: broken internal link ${href}`);
  }

  for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of match[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (!url) continue;
      if (!fs.existsSync(path.join(DIST, url))) {
        errors.push(`${relative}: missing srcset file ${url}`);
      }
    }
  }

  if (/lang="id"/.test(html)) errors.push(`${relative}: Indonesian lang attribute remains`);
  if (/href="\/(perjalanan|galeri|diskografi|catatan-fan|sumber|tentang-situs)/.test(html)) {
    errors.push(`${relative}: links to an Indonesian legacy route`);
  }
}

const credits = DATA.photos.filter((photo) => !photo.placeholder);
for (const photo of credits) {
  for (const field of ["credit", "source", "license", "licenseUrl"]) {
    if (!photo[field]) errors.push(`photo ${photo.id}: missing ${field}`);
  }
  if (!photo.source.startsWith("https://commons.wikimedia.org/")) {
    errors.push(`photo ${photo.id}: source is not a Wikimedia Commons file page`);
  }
}

for (const album of DATA.albums) {
  if (!DATA.eras.some((era) => era.id === album.era)) {
    errors.push(`album ${album.id}: unknown era ${album.era}`);
  }
}

console.log(`check: ${pages.length} HTML pages, ${titles.size} unique titles`);
for (const warning of warnings) console.log(`warning: ${warning}`);
for (const error of errors) console.log(`error: ${error}`);

if (errors.length) {
  console.error(`check: ${errors.length} error(s)`);
  process.exit(1);
}

console.log("check: all internal links, assets, metadata, and image attributes pass");
