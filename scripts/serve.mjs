#!/usr/bin/env node
/**
 * Minimal local server that mirrors the production nginx rules:
 * clean URLs without trailing slashes, flat .html files, a themed 404.
 *
 * Usage: node scripts/serve.mjs [port]
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.argv[2] || process.env.PORT || 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".pf_meta": "application/octet-stream",
  ".pagefind": "application/wasm",
};

function resolve(pathname) {
  if (pathname === "/") return "index.html";

  const clean = pathname.replace(/^\/+/, "");
  if (clean.includes("..")) return null;

  const direct = path.join(DIST, clean);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return clean;

  if (!path.extname(clean)) {
    const html = `${clean}.html`;
    if (fs.existsSync(path.join(DIST, html))) return html;
  }

  const index = path.join(clean, "index.html");
  if (fs.existsSync(path.join(DIST, index))) return index;

  return null;
}

const server = http.createServer((request, response) => {
  const parsed = new URL(request.url || "/", "http://localhost");
  let pathname;

  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  if (pathname !== "/" && pathname.endsWith("/")) {
    response.writeHead(301, {
      Location: `${pathname.replace(/\/+$/, "")}${parsed.search}`,
    });
    response.end();
    return;
  }

  const relative = resolve(pathname);
  const notFound = relative === null;
  const prefix = (pathname.match(/^\/(id|es|pt-br)(?=\/|$)/) || [])[1];
  const notFoundFile = prefix ? `${prefix}/404.html` : "404.html";
  const file = path.join(DIST, notFound ? notFoundFile : relative);

  fs.readFile(file, (error, contents) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Server error");
      return;
    }

    const type = TYPES[path.extname(file)] || "application/octet-stream";
    response.writeHead(notFound ? 404 : 200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (request.method === "HEAD") response.end();
    else response.end(contents);
  });
});

server.listen(PORT, () => {
  console.log(`serve: http://localhost:${PORT} (dist/)`);
});
