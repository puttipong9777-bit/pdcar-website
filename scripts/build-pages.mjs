import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
await rm("out", { recursive: true, force: true });
await mkdir("out/assets", { recursive: true });
await cp("public", "out", { recursive: true });
await cp("app/globals.css", "out/assets/site.css");
const common = {
  bundle: true, minify: true, format: "esm", jsx: "automatic", target: "es2022",
  alias: { "next/image": path.resolve("pages-runtime/image.tsx"), "next/link": path.resolve("pages-runtime/link.tsx") },
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }
};
await build({ ...common, entryPoints: ["pages-runtime/client.tsx"], outfile: "out/assets/client.js", platform: "browser" });
await build({ ...common, entryPoints: ["pages-runtime/worker.tsx"], outfile: "out/_worker.js", platform: "browser", conditions: ["workerd", "browser"] });
await writeFile("out/_routes.json", JSON.stringify({ version: 1, include: ["/", "/cars/*", "/api/health", "/robots.txt", "/sitemap.xml"], exclude: [] }));
await writeFile("out/_headers", "/assets/*\n  Cache-Control: public, max-age=0, must-revalidate\n  X-Content-Type-Options: nosniff\n");
await writeFile("out/404.html", '<!doctype html><html lang="th"><meta charset="utf-8"><title>ไม่พบหน้า | PD Car Center</title><h1>ไม่พบหน้า</h1><a href="/">PD Car Center</a></html>');
console.log("Built native Pages Functions and static assets in out/");
