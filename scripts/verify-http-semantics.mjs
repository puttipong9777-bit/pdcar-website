import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { resolve } from "node:path";

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
    if (child.exitCode !== null) throw new Error(`Next exited with ${child.exitCode}\n${logs.slice(-4_000)}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  }
  throw new Error(`Timed out waiting for ${url}\n${logs.slice(-4_000)}`);
}

const mockPort = await freePort();
const appPort = await freePort();
const mock = http.createServer((_request, response) => {
  response.writeHead(503, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "synthetic upstream unavailable" }));
});
await new Promise((resolveListen) => mock.listen(mockPort, "127.0.0.1", resolveListen));

let logs = "";
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(appPort), "-H", "127.0.0.1"], {
  cwd: root,
  detached: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key",
    VEHICLE_DATA_TIMEOUT_MS: "250",
    SITE_ENV: "preview",
    SITE_ANALYTICS_ENABLED: "false"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
next.stdout.on("data", (chunk) => { logs += chunk; });
next.stderr.on("data", (chunk) => { logs += chunk; });

const base = `http://127.0.0.1:${appPort}`;
const report = { generatedAt: new Date().toISOString(), environment: "local synthetic upstream 503", checks: [] };
const check = (name, response, expectedStatus) => {
  assert.equal(response.status, expectedStatus, `${name} status`);
  report.checks.push({ name, status: response.status, retryAfter: response.headers.get("retry-after") });
};

try {
  await waitFor(`${base}/api/health`, next, logs);

  const home = await fetch(`${base}/`);
  check("home degraded response", home, 200);
  const homeBody = await home.text();
  assert.match(homeBody, /ข้อมูลสต็อกไม่พร้อมใช้งาน/);
  assert.doesNotMatch(homeBody, />0 คันในเว็บไซต์</);
  assert.doesNotMatch(homeBody, /ไม่พบรถที่ตรงกับตัวกรอง/);
  assert.doesNotMatch(homeBody, /ดึงข้อมูลกลับมาอัตโนมัติ/);

  const detail = await fetch(`${base}/cars/pd-synthetic-error`);
  check("vehicle detail upstream failure", detail, 500);

  const sitemap = await fetch(`${base}/sitemap.xml`);
  check("sitemap upstream failure", sitemap, 503);
  assert.equal(sitemap.headers.get("retry-after"), "60");

  const readiness = await fetch(`${base}/api/readiness`);
  check("readiness upstream failure", readiness, 503);
  assert.equal(readiness.headers.get("retry-after"), "60");

  const reportPathIndex = process.argv.indexOf("--report");
  if (reportPathIndex !== -1 && process.argv[reportPathIndex + 1]) {
    await writeFile(resolve(root, process.argv[reportPathIndex + 1]), `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  try { process.kill(-next.pid, "SIGTERM"); } catch {}
  await new Promise((resolveClose) => mock.close(resolveClose));
}
