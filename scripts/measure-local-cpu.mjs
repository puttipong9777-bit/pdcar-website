// Local CPU comparison only. No Cloudflare quota or live data claims.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { car, env } from "../tests/fixtures.mjs";

const [bundle = "out/_worker.js", output = "artifacts/local-cpu-current.json"] = process.argv.slice(2);
const { handleRequest } = await import(pathToFileURL(resolve(bundle)));
const results = [];
const samples = 100;
for (const count of [1, 10, 50, 100, 250]) {
  // Identical fixture shape across versions; only ID/slug change per car.
  const rows = Array.from({ length: count }, (_, i) => car({ car_id: `PD${i}`, website_slug: `car-${i}` }));
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    const offset = Number(url.searchParams.get("offset"));
    const limit = Number(url.searchParams.get("limit"));
    return Response.json(url.searchParams.has("or") ? rows.slice(0, 1) : rows.slice(offset, offset + limit));
  };
  for (const [name, path, method] of [["home", "/", "GET"], ["detail", "/cars/car-0", "GET"], ["home-head", "/", "HEAD"], ["sitemap", "/sitemap.xml", "GET"]]) {
    const times = [];
    let firstCpuMs;
    for (let i = 0; i < samples + 10; i++) {
      const start = process.cpuUsage();
      const response = await handleRequest(new Request(`https://www.pdcarcenter.com${path}`, { method }), env);
      if (response.status !== 200) throw new Error(`Unexpected benchmark status ${response.status}`);
      await response.text();
      const elapsed = process.cpuUsage(start);
      const ms = (elapsed.user + elapsed.system) / 1000;
      if (i === 0) firstCpuMs = ms;
      if (i >= 10) times.push(ms);
    }
    times.sort((a, b) => a - b);
    results.push({ cars: count, route: name, firstCpuMs, medianCpuMs: times[49], p95CpuMs: times[94] });
  }
}
writeFileSync(output, JSON.stringify({
  note: "Node process CPU including fixture fetch/JSON. Not Cloudflare CPU metering or Free acceptance. Ten warmup requests then 100 samples per case; sequential single process, no network.",
  node: process.version, samples,
  bundleSha256: createHash("sha256").update(readFileSync(bundle)).digest("hex"),
  fixtureSha256: createHash("sha256").update(readFileSync(new URL("../tests/fixtures.mjs", import.meta.url))).digest("hex"),
  results
}, null, 2) + "\n");
console.log(JSON.stringify(results.filter((row) => row.route === "home")));
process.exit(0);
