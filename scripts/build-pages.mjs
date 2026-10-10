import { build } from "esbuild";
import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
await rm("out", { recursive: true, force: true });
await mkdir("out/assets", { recursive: true });
await cp("public", "out", { recursive: true });
await writeFile("out/assets/site.css", (await Promise.all(["app/globals.css","app/showroom.css","app/articles/articles.css"].map(p=>readFile(p,"utf8")))).join("\n"));
const common = {
  bundle: true, minify: true, format: "esm", jsx: "automatic", target: "es2022",
  alias: { "next/image": path.resolve("pages-runtime/image.tsx"), "next/link": path.resolve("pages-runtime/link.tsx") },
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }
};
await build({ ...common, entryPoints: ["pages-runtime/client.tsx"], outfile: "out/assets/client.js", platform: "browser" });
await build({ ...common, entryPoints: ["pages-runtime/prerender.tsx"], outfile: ".pages-build/prerender.cjs", platform: "node", format: "cjs" });
const { compileTemplates } = createRequire(import.meta.url)(path.resolve(".pages-build/prerender.cjs"));
await build({ ...common, entryPoints: ["pages-runtime/worker.tsx"], outfile: "out/_worker.js", platform: "browser", conditions: ["workerd", "browser"],
  define: { ...common.define, __PDCAR_TEMPLATES__: JSON.stringify(compileTemplates()) }
});
await writeFile("out/_routes.json", JSON.stringify({ version: 1, include: ["/", "/cars/*", "/sell-car", "/articles", "/articles/*", "/article-admin", "/api/*", "/robots.txt", "/sitemap.xml"], exclude: [] }));
await writeFile("out/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n/assets/*\n  Cache-Control: public, max-age=0, must-revalidate\n  X-Content-Type-Options: nosniff\n");
await writeFile("out/404.html", '<!doctype html><html lang="th"><meta charset="utf-8"><title>ไม่พบหน้า | PD Car Center</title><h1>ไม่พบหน้า</h1><a href="/">PD Car Center</a></html>');
console.log("Built native Pages Functions and static assets in out/");
