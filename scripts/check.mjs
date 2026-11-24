#!/usr/bin/env node
/**
 * Static sanity checks for the generated, multilingual site.
 *
 * Usage: node scripts/check.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");
const DATA = JSON.parse(fs.readFileSync(path.join(SRC, "data.json"), "utf8"));
const I18N = JSON.parse(fs.readFileSync(path.join(SRC, "i18n.json"), "utf8"));
const LOCALES = I18N.locales.filter((item) => item.enabled);
const FILES = Object.fromEntries(
  I18N.locales.map((item) => [
    item.code,
    JSON.parse(fs.readFileSync(path.join(SRC, "locales", `${item.code}.json`), "utf8")),
  ])
);

const errors = [];
const warnings = [];

function hrefFor(code, pathname) {
  const config = I18N.locales.find((item) => item.code === code);
  const match = pathname.match(/^\/(?:id|es|pt-br)(?=\/|$)/);
  const clean = match ? pathname.slice(match[0].length) || "/" : pathname;
  if (!config.prefix) return clean;
  return clean === "/" ? config.prefix : `${config.prefix}${clean}`;
}

function urlFor(code, pathname) {
  const localized = hrefFor(code, pathname);
  return `${DATA.site.url}${localized === "" || localized === "/" ? "" : localized}`;
}

function fileFor(code, pathname) {
  const localized = hrefFor(code, pathname);
  const relative = localized === "" || localized === "/" ? "index.html" : `${localized.slice(1)}.html`;
  return path.join(DIST, relative);
}

function keyPaths(value, prefix = "") {
  const out = [];
  for (const [key, child] of Object.entries(value || {})) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) out.push(...keyPaths(child, next));
    else out.push(next);
  }
  return out;
}

function valueAt(object, keyPath) {
  return keyPath.split(".").reduce((value, part) => (value == null ? undefined : value[part]), object);
}

if (!fs.existsSync(DIST)) {
  console.error("check: dist/ is missing; run npm run build first.");
  process.exit(1);
}

// Locale key parity and empty values.
const referenceKeys = keyPaths(FILES[I18N.default]);
for (const item of I18N.locales) {
  const keys = keyPaths(FILES[item.code]);
  const missing = referenceKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !referenceKeys.includes(key));
  if (missing.length) errors.push(`${item.code}: missing keys: ${missing.slice(0, 8).join(", ")}`);
  if (extra.length) warnings.push(`${item.code}: extra keys: ${extra.slice(0, 8).join(", ")}`);
  for (const key of keys) {
    const value = valueAt(FILES[item.code], key);
    if (typeof value === "string" && !value.trim()) errors.push(`${item.code}: empty key ${key}`);
    if (Array.isArray(value) && value.some((entry) => typeof entry === "string" && !entry.trim())) {
      errors.push(`${item.code}: empty array entry at ${key}`);
    }
  }
}

const canonicalRoutes = [
  "/", "/journey", "/gallery", "/discography", "/fan-notes", "/sources", "/about",
  ...DATA.eras.map((era) => `/journey/${era.id}`),
  ...DATA.eras.map((era) => `/gallery/${era.id}`),
  ...DATA.albums.map((album) => `/discography/${album.id}`),
];

const englishLeak = [
  "Begin the journey", "Browse the gallery", "Inside the archive", "Copy credit",
  "Previous photograph", "Next photograph", "Close photograph", "At a glance",
  "No official tracklist yet", "Photograph pending", "Source file", "Full credits and licences",
  "Change language", "Tracklist", "About this release", "Editorial rules",
  ">Released<", ">Tracks<", ">Chart peak<", ">Standard tracks<", ">Deluxe tracks<",
  ">Producers<", ">Length<", "as of 24 November 2026",
  "aria-label=\"Breadcrumb\"", "aria-label=\"Chapters\"", "aria-label=\"Open photograph:",
  "title=\"Lizzy to Lana feed\"",
  " in photographs", " credited photographs", " credited photograph<",
  " references</span>", " photo credits", ">Checked ", "Gallery · ",
  "Part of the ", "Date, place, photographer",
  ">Gallery</a>", ">Journey</a>", ">Discography</a>", "Open the gallery",
  ">All photographs<", " gallery</strong>", "in chronological order",
  "Described as provisional", "until a final tracklist",
  ">Studio album<", ">Spoken-word album<", ">Short film / soundtrack<", ">Upcoming album<",
  ">Upcoming studio album<", ">Official site<", ">Untitled companion album<",
  ">Spoken word / poetry<", "philosophy", "Title, tracklist, and release date TBA",
  "and the Netherlands",
];
const englishMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const sharedMonths = { en: [], id: ["April","September","October","November","December"], es: [], "pt-br": [] };
function englishDatePatternFor(code) {
  const months = englishMonths.filter((month) => !(sharedMonths[code] || []).includes(month));
  if (!months.length) return null;
  return new RegExp(`\\b\\d{1,2}\\s+(${months.join("|")})\\s+\\d{4}\\b|\\b(${months.join("|")})\\s+\\d{4}\\b`);
}

for (const item of LOCALES) {
  const titles = new Map();
  const descriptions = new Map();

  for (const route of canonicalRoutes.concat(["/search", "/404"])) {
    const file = fileFor(item.code, route);
    if (!fs.existsSync(file)) {
      errors.push(`${item.code}${route}: missing page`);
      continue;
    }
    const html = fs.readFileSync(file, "utf8");
    const label = `${item.code}${route}`;

    if (!html.includes(`<html lang="${item.code}"`)) errors.push(`${label}: wrong html lang`);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
    const canonical = html.match(/<link rel="canonical" href="([^"]*)">/)?.[1];
    if (!title) errors.push(`${label}: missing title`);
    if (!description) errors.push(`${label}: missing description`);
    if (canonical !== urlFor(item.code, route)) errors.push(`${label}: wrong canonical ${canonical}`);
    if (title && titles.has(title)) errors.push(`${label}: duplicate title with ${titles.get(title)}`);
    if (description && descriptions.has(description)) warnings.push(`${label}: duplicate description`);
    if (title) titles.set(title, label);
    if (description) descriptions.set(description, label);

    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(
      (match) => ({ code: match[1], href: match[2] })
    );
    const expected = LOCALES.map((lang) => ({ code: lang.hreflang, href: urlFor(lang.code, route) })).concat({
      code: "x-default",
      href: urlFor(I18N.default, route),
    });
    if (alternates.length !== expected.length) errors.push(`${label}: hreflang count ${alternates.length}`);
    for (const entry of expected) {
      if (!alternates.some((alt) => alt.code === entry.code && alt.href === entry.href)) {
        errors.push(`${label}: missing hreflang ${entry.code}`);
      }
    }

    const ogLocale = html.match(/<meta property="og:locale" content="([^"]+)">/)?.[1];
    if (ogLocale !== item.intl.replace("-", "_")) errors.push(`${label}: wrong og:locale`);

    for (const match of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = match[0];
      if (!/alt="/.test(tag)) errors.push(`${label}: image without alt`);
      if (!/width="/.test(tag) || !/height="/.test(tag)) errors.push(`${label}: image without dimensions`);
    }

    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
      const href = match[1];
      if (/^\/(?:(?:id|es|pt-br)\/)?(?:assets|pagefind|feed\.xml|sitemap\.xml|robots\.txt|site\.webmanifest|favicon\.svg)/.test(href)) continue;
      if (href.startsWith("/404")) continue;
      const matchPrefix = href.match(/^\/(id|es|pt-br)(?=\/|$)/);
      const withoutPrefix = matchPrefix ? href.slice(matchPrefix[0].length) || "/" : href;
      const candidate = withoutPrefix === "/"
        ? path.join(DIST, "index.html")
        : path.join(DIST, `${href.slice(1)}.html`);
      const prefixedCandidate = path.join(DIST, `${href.slice(1)}.html`);
      if (!fs.existsSync(candidate) && !fs.existsSync(prefixedCandidate)) {
        errors.push(`${label}: broken internal link ${href}`);
      }
    }

    if (item.code !== I18N.default) {
      const plain = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "");
      for (const phrase of englishLeak) {
        if (plain.includes(phrase)) errors.push(`${label}: untranslated English phrase "${phrase}"`);
      }
      const datePattern = englishDatePatternFor(item.code);
      if (datePattern && datePattern.test(plain)) errors.push(`${label}: untranslated English date`);
      if (html.includes('"inLanguage":"en"')) errors.push(`${label}: JSON-LD inLanguage not localized`);
    }
  }
}

const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
for (const item of LOCALES) {
  for (const route of canonicalRoutes) {
    if (!sitemap.includes(urlFor(item.code, route))) errors.push(`sitemap: missing ${item.code}${route}`);
  }
}
const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
for (const item of LOCALES) {
  const target = `${item.prefix || ""}/search`;
  if (!robots.includes(`Disallow: ${target}`)) errors.push(`robots: missing ${target}`);
}

if (errors.length) {
  console.error(`check: ${errors.length} errors`);
  errors.slice(0, 60).forEach((error) => console.error(" -", error));
  process.exit(1);
}
if (warnings.length) {
  console.warn(`check: ${warnings.length} warnings`);
  warnings.slice(0, 20).forEach((warning) => console.warn(" -", warning));
}
console.log(
  `check: ${LOCALES.length} locales, ${canonicalRoutes.length + 2} routes each, metadata and links pass`
);
