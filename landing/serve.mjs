// Tiny static server for the Lumi landing page.
// `node serve.mjs` → http://localhost:4173
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT) || 4173;
const ROOT = dirname(fileURLToPath(import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    let url = (req.url || "/").split("?")[0];
    if (url === "/" || url.endsWith("/")) url += "index.html";

    // Prevent path traversal
    if (url.includes("..")) {
      res.writeHead(400).end("bad request");
      return;
    }

    const filePath = resolve(ROOT, "." + url);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }

    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end('<!doctype html><body style="font-family:sans-serif;padding:40px;"><h1>404</h1><a href="/">Home</a></body>');
  }
}).listen(PORT, () => {
  console.log(`Lumi landing serving on http://localhost:${PORT}`);
});
