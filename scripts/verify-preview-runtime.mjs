import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function waitFor(url, child, logs) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Worker exited with ${child.exitCode}\n${logs.slice(-8_000)}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return response;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  }
  throw new Error(`Timed out waiting for ${url}\n${logs.slice(-8_000)}`);
}

async function waitForExit(child, logs, label) {
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", resolveExit);
  });
  if (exitCode !== 0) throw new Error(`${label} exited with ${exitCode}\n${logs.slice(-8_000)}`);
}

function fixture() {
  const common = {
    color: "น้ำเงิน",
    mileage: 38_500,
    fuel_type: "hybrid",
    transmission: "automatic",
    website_published: true,
    website_featured: false,
    updated_at: "2026-10-31T00:00:00Z",
    public_description: "ข้อมูลสังเคราะห์สำหรับทดสอบ Preview เท่านั้น",
    photos: [{ fileId: "FILE-SYNTHETIC-1", isPrimary: true, sortOrder: 0 }]
  };
  return [
    {
      ...common,
      car_id: "PDPREVIEW1",
      website_slug: "pdpreview1",
      status: "available",
      brand: "Toyota",
      model: "Corolla Cross",
      variant: "Synthetic Preview",
      year: 2024,
      sale_price: 729_000,
      website_title: "Toyota Corolla Cross ข้อมูลสังเคราะห์"
    },
    {
      ...common,
      car_id: "PDPREVIEW2",
      website_slug: "pdpreview2",
      status: "reserved",
      brand: "Honda",
      model: "City",
      variant: "Synthetic Reserved",
      year: 2023,
      sale_price: 529_000,
      website_title: "Honda City จองแล้ว ข้อมูลสังเคราะห์"
    }
  ];
}

const mockPort = await freePort();
const workerPort = await freePort();
const temporary = await mkdtemp(join(os.tmpdir(), "pdcar-preview-runtime-"));
const previewVars = {
  SITE_ENV: "preview",
  SITE_ANALYTICS_ENABLED: "false",
  SITE_ADMIN_ENABLED: "false",
  ARTICLE_APPROVAL_ENABLED: "false",
  ARTICLE_DAILY_CRON_ENABLED: "false",
  ARTICLE_LINE_POSTBACK_ENABLED: "false",
  VEHICLE_MEDIA_TIMEOUT_MS: "500",
  NEXT_PUBLIC_ERP_URL: `http://127.0.0.1:${mockPort}`,
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-public-key",
  NEXT_PUBLIC_VEHICLE_IMAGE_BASE_URL: `http://127.0.0.1:${mockPort}/images`
};

const stalledResponses = new Set();
const mock = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  if (request.url === "/api/public/vehicle-images/FILE-STALL") {
    stalledResponses.add(response);
    request.once("close", () => stalledResponses.delete(response));
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": "image/jpeg" });
    response.flushHeaders();
    return;
  }
  if (request.url === "/api/public/vehicle-images/FILE-OVERSIZE") {
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Length": String(9 * 1024 * 1024), "Content-Type": "image/jpeg" });
    response.end("synthetic declared oversize");
    return;
  }
  if (request.url === "/api/public/vehicle-images/FILE-MISSING") {
    response.writeHead(404, { "Cache-Control": "no-store", "Content-Type": "application/json" });
    response.end('{"error":"synthetic missing image"}');
    return;
  }
  if (request.url?.startsWith("/api/public/vehicle-images/")) {
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": "image/svg+xml", ETag: '"synthetic-v1"' });
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#0c3158"/><text x="80" y="160" fill="white" font-size="64">ERP AUTHORITY</text></svg>');
    return;
  }
  if (request.url?.startsWith("/images/")) {
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": "image/svg+xml" });
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#0c3158"/><text x="80" y="160" fill="white" font-size="64">SYNTHETIC PREVIEW</text></svg>');
    return;
  }
  response.writeHead(200, { "Content-Range": "0-1/2", "Content-Type": "application/json" });
  response.end(JSON.stringify(request.url?.includes("public_vehicle_listings") ? fixture() : []));
});
await new Promise((resolveListen) => mock.listen(mockPort, "127.0.0.1", resolveListen));

let buildLogs = "";
let workerLogs = "";
let worker;
try {
  const build = spawn("npm", ["run", "build:cloudflare"], {
    cwd: root,
    env: { ...process.env, ...previewVars },
    stdio: ["ignore", "pipe", "pipe"]
  });
  build.stdout.on("data", (chunk) => { buildLogs += chunk; });
  build.stderr.on("data", (chunk) => { buildLogs += chunk; });
  await waitForExit(build, buildLogs, "OpenNext build");

  const configPath = join(temporary, "wrangler.preview-runtime.json");
  await writeFile(configPath, `${JSON.stringify({
    name: "pdcar-preview-runtime-local",
    main: resolve(root, "cloudflare/worker.mjs"),
    compatibility_date: "2026-10-13",
    compatibility_flags: ["nodejs_compat"],
    assets: { directory: resolve(root, ".open-next/assets"), binding: "ASSETS" },
    vars: previewVars
  }, null, 2)}\n`);

  worker = spawn(resolve(root, "node_modules/.bin/wrangler"), [
    "dev",
    "--config", configPath,
    "--local",
    "--ip", "127.0.0.1",
    "--port", String(workerPort)
  ], {
    cwd: root,
    detached: true,
    env: { ...process.env, XDG_CONFIG_HOME: join(temporary, "xdg") },
    stdio: ["ignore", "pipe", "pipe"]
  });
  worker.stdout.on("data", (chunk) => { workerLogs += chunk; });
  worker.stderr.on("data", (chunk) => { workerLogs += chunk; });

  const base = `http://127.0.0.1:${workerPort}`;
  await waitFor(`${base}/api/health`, worker, workerLogs);

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-robots-tag"), "noindex, nofollow");

  const robots = await fetch(`${base}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.equal(robots.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(await robots.text(), /Disallow: \/$/m);

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.equal(home.headers.get("x-robots-tag"), "noindex, nofollow");
  const html = await home.text();
  assert.match(html, /Toyota Corolla Cross ข้อมูลสังเคราะห์/);
  assert.match(html, /Honda City จองแล้ว ข้อมูลสังเคราะห์/);
  assert.doesNotMatch(html, /connect\.facebook\.net|fbevents\.js|data-site-analytics="enabled"/);

  const detail = await fetch(`${base}/cars/pdpreview1`);
  assert.equal(detail.status, 200);
  assert.equal(detail.headers.get("x-robots-tag"), "noindex, nofollow");
  const detailHtml = await detail.text();
  assert.match(detailHtml, /PDPREVIEW1/);
  assert.match(detailHtml, /ข้อมูลสังเคราะห์สำหรับทดสอบ Preview เท่านั้น/);

  const media = await fetch(`${base}/media/vehicle-images/FILE-SYNTHETIC-1`);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("x-pdcar-image-source"), "erp-authority");
  assert.equal(media.headers.get("x-pdcar-media-outcome"), "current");
  assert.equal(media.headers.get("x-robots-tag"), "noindex, nofollow");
  const missingMedia = await fetch(`${base}/media/vehicle-images/FILE-MISSING`);
  assert.equal(missingMedia.status, 404);
  assert.equal(missingMedia.headers.get("x-pdcar-media-outcome"), "not-public");
  const stalledMedia = await fetch(`${base}/media/vehicle-images/FILE-STALL`);
  assert.equal(stalledMedia.status, 504);
  assert.equal(stalledMedia.headers.get("x-pdcar-media-outcome"), "body-timeout");
  const oversizeMedia = await fetch(`${base}/media/vehicle-images/FILE-OVERSIZE`);
  assert.equal(oversizeMedia.status, 502);
  assert.equal(oversizeMedia.headers.get("x-pdcar-media-outcome"), "body-too-large");

  const admin = await fetch(`${base}/api/admin/media`, { method: "POST" });
  assert.equal(admin.status, 503);
  assert.equal(admin.headers.get("x-robots-tag"), "noindex, nofollow");

  const sourceConfig = await readFile(resolve(root, "wrangler.jsonc"), "utf8");
  assert.match(sourceConfig, /"previews"\s*:\s*\{/);
  const report = {
    environment: "local OpenNext build served by Wrangler workerd with synthetic HTTP fixtures; not a remote Cloudflare Preview",
    checks: [
      "health noindex",
      "robots disallow",
      "synthetic available and reserved inventory",
      "detail route",
      "ERP-authoritative media plus missing, stalled and oversized bodies fail closed",
      "tracking disabled",
      "admin disabled",
      "no production data bindings in local config"
    ],
    statuses: {
      health: health.status,
      robots: robots.status,
      home: home.status,
      detail: detail.status,
      media: media.status,
      missingMedia: missingMedia.status,
      stalledMedia: stalledMedia.status,
      oversizeMedia: oversizeMedia.status,
      admin: admin.status
    }
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  if (worker?.pid) {
    try { process.kill(-worker.pid, "SIGTERM"); } catch {}
  }
  for (const response of stalledResponses) response.destroy();
  await new Promise((resolveClose) => mock.close(resolveClose));
  await rm(temporary, { recursive: true, force: true });
}
