import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { car, env } from "../tests/fixtures.mjs";

const [before, after, output = "artifacts/cpu-paired-node22.json"] = process.argv.slice(2);
if (!before || !after) throw new Error("Usage: node scripts/compare-local-cpu.mjs BEFORE_BUNDLE AFTER_BUNDLE [OUTPUT]");
const handlers = await Promise.all([before, after].map(async (file) => (await import(pathToFileURL(resolve(file)))).handleRequest));
const results = [];
for (const count of [1, 10, 50, 100, 250]) {
  const rows = Array.from({ length: count }, (_, i) => car({ car_id: `PD${i}`, website_slug: `car-${i}` }));
  globalThis.fetch = async (input) => {
    const url = new URL(input), offset = Number(url.searchParams.get("offset")), limit = Number(url.searchParams.get("limit"));
    return Response.json(url.searchParams.has("or") ? rows.slice(0, 1) : rows.slice(offset, offset + limit));
  };
  for (const [route, path] of [["home", "/"], ["detail", "/cars/car-0"]]) {
    const timings = [[], []], first = [];
    for (let sample = 0; sample < 110; sample++) {
      // Alternating adjacent measurements reduce sequential-run host/JIT/GC bias.
      for (const version of sample % 2 ? [1, 0] : [0, 1]) {
        const start = process.cpuUsage();
        const response = await handlers[version](new Request(`https://www.pdcarcenter.com${path}`), env);
        if (response.status !== 200) throw new Error(`Unexpected status ${response.status}`);
        await response.text();
        const elapsed = process.cpuUsage(start), ms = (elapsed.user + elapsed.system) / 1000;
        if (sample === 0) first[version] = ms;
        if (sample >= 10) timings[version].push(ms);
      }
    }
    const summarize = (version) => {
      const values = timings[version].sort((a, b) => a - b);
      return { firstCpuMs: first[version], medianCpuMs: values[49], p95CpuMs: values[94] };
    };
    results.push({ cars: count, route, before: summarize(0), after: summarize(1) });
  }
}
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
writeFileSync(output, JSON.stringify({
  note: "Paired Node process CPU, alternating order, 10 warmups + 100 measured pairs per case. Includes mock JSON/fetch/Response text consumption; not Cloudflare metering. Synthetic inventory sizes; actual live stock count unknown.",
  node: process.version, beforeBundleSha256: hash(before), afterBundleSha256: hash(after),
  fixtureSha256: hash(new URL("../tests/fixtures.mjs", import.meta.url)), results
}, null, 2) + "\n");
console.log(JSON.stringify(results.filter((r) => r.route === "home")));
process.exit(0);
