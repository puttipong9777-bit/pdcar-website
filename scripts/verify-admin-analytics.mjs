import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, process.argv[2] || "/tmp/pdcar-admin-analytics-evidence");

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

async function waitFor(url, child, logs, timeout = 120_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Process exited with ${child.exitCode}\n${logs()}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error(`Timed out waiting for ${url}\n${logs()}`);
}

function connectCdp(url) {
  return new Promise((resolveConnect, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map(); let id = 0;
    socket.addEventListener("error", reject, { once: true });
    socket.addEventListener("open", () => resolveConnect({
      call(method, params = {}) {
        return new Promise((resolveCall, rejectCall) => {
          const callId = ++id; pending.set(callId, { resolveCall, rejectCall });
          socket.send(JSON.stringify({ id: callId, method, params }));
        });
      },
      close() { socket.close(); }
    }), { once: true });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const item = pending.get(message.id); pending.delete(message.id);
      if (message.error) item.rejectCall(new Error(message.error.message)); else item.resolveCall(message.result);
    });
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitForExpression(cdp, expression) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const inventoryPort = await freePort();
const appPort = await freePort();
const chromePort = await freePort();
const userData = await mkdtemp(join(os.tmpdir(), "pdcar-admin-chrome-"));
const inventory = http.createServer((_request, response) => {
  response.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Range": "0-2/3", "Content-Type": "application/json" });
  response.end(JSON.stringify([
    { car_id: "PD0025", website_slug: "pd0025", website_published: true, status: "available", website_title: "Synthetic PD0025", brand: "Honda", model: "City", year: 2021, sale_price: 389000, photos: [] },
    { car_id: "PD0028", website_slug: "pd0028", website_published: true, status: "available", website_title: "Synthetic PD0028", brand: "Toyota", model: "Yaris", year: 2022, sale_price: 448000, photos: [] },
    { car_id: "PD0002", website_slug: "pd0002", website_published: true, status: "available", website_title: "Synthetic PD0002", brand: "Mazda", model: "2", year: 2020, sale_price: 289000, photos: [] }
  ]));
});
await new Promise((resolveListen) => inventory.listen(inventoryPort, "127.0.0.1", resolveListen));

let nextLogs = ""; let chromeLogs = ""; let chrome; let cdp;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(appPort), "-H", "127.0.0.1"], {
  cwd: root, detached: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${inventoryPort}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key",
    SITE_ENV: "preview",
    SITE_ADMIN_ENABLED: "true",
    ADMIN_PASSWORD_HASH: "synthetic-page-gate-only",
    ADMIN_SESSION_SECRET: "synthetic-session-secret-32-characters-minimum",
    SITE_ANALYTICS_ENABLED: "false"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
next.stdout.on("data", (chunk) => { nextLogs += chunk; });
next.stderr.on("data", (chunk) => { nextLogs += chunk; });

try {
  await mkdir(output, { recursive: true });
  await waitFor(`http://127.0.0.1:${appPort}/api/health`, next, () => nextLogs.slice(-4_000));
  chrome = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${chromePort}`, `--user-data-dir=${userData}`, "about:blank"], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
  chrome.stdout.on("data", (chunk) => { chromeLogs += chunk; });
  chrome.stderr.on("data", (chunk) => { chromeLogs += chunk; });
  await waitFor(`http://127.0.0.1:${chromePort}/json/version`, chrome, () => chromeLogs.slice(-4_000), 30_000);
  const target = await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(`http://127.0.0.1:${appPort}/admin`)}`, { method: "PUT" }).then((response) => response.json());
  cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.call("Page.enable"); await cdp.call("Runtime.enable");
  await waitForExpression(cdp, `Boolean(document.querySelector('.admin-login input'))`);

  await evaluate(cdp, `(() => {
    const originalFetch = window.fetch.bind(window);
    const totals = (visitors, pageViews, vehicleViews, phoneClicks, lineClicks) => ({ visitors, pageViews, vehicleViews, phoneClicks, lineClicks, contactClicks: phoneClicks + lineClicks });
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
      if (url === '/api/admin/session') return new Response(JSON.stringify({ authenticated: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url === '/api/article-approval/admin') return new Response(JSON.stringify({ articles: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url === '/api/admin/dashboard') {
        const days = [1,7,14,30].includes(body.windowDays) ? body.windowDays : 14;
        const end = '2026-11-01'; const start = days === 30 ? '2026-10-03' : days === 14 ? '2026-10-19' : days === 7 ? '2026-10-26' : end;
        const metrics = {
          generatedAt: '2026-11-01T16:00:00.000Z', timezone: 'Asia/Bangkok', windowDays: days, windowStart: start, windowEnd: end,
          today: totals(12, 30, 18, 3, 5), yesterday: totals(9, 22, 13, 2, 2), last7Days: totals(55, 130, 77, 11, 19),
          daily: Array.from({ length: days }, (_, index) => ({ day: new Date(Date.UTC(2026, 10, 1 - (days - 1 - index))).toISOString().slice(0,10), ...totals(2 + index % 8, 4 + index, 2 + index % 5, index % 2, index % 3) })),
          topVehicles: [
            { carId: 'PD0028', views: 31, gallerySwipes: 12, phoneClicks: 4, lineClicks: 9, contactClicks: 13 },
            { carId: 'PD0025', views: 24, gallerySwipes: 8, phoneClicks: 6, lineClicks: 5, contactClicks: 11 },
            { carId: 'PD0002', views: 17, gallerySwipes: 4, phoneClicks: 1, lineClicks: 5, contactClicks: 6 }
          ],
          topPages: [{ path: '/cars/pd0028', views: 31 }, { path: '/cars/pd0025', views: 24 }],
          sources: [
            { source: 'facebook', medium: 'organic_social', campaign: 'pd0028_a', visitors: 18, pageViews: 35, vehicleViews: 28, phoneClicks: 3, lineClicks: 7 },
            { source: 'line', medium: 'messaging', campaign: 'pd0025_a', visitors: 12, pageViews: 22, vehicleViews: 17, phoneClicks: 4, lineClicks: 8 },
            { source: 'untagged', medium: 'none', campaign: 'none', visitors: 25, pageViews: 73, vehicleViews: 32, phoneClicks: 4, lineClicks: 4 }
          ]
        };
        return new Response(JSON.stringify({ analyticsEnabled: true, metrics }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    };
    const input = document.querySelector('.admin-login input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'synthetic-password-123456789'); input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await evaluate(cdp, `document.querySelector('form.admin-login').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`);
  await waitForExpression(cdp, `Boolean(document.querySelector('.attribution-card')) && document.body.innerText.includes('กด LINE')`);

  const widths = [];
  for (const width of [390, 768, 1165, 1440]) {
    await cdp.call("Emulation.setDeviceMetricsOverride", { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 900 });
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    const dimensions = await evaluate(cdp, `({ viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, sourceTableScrolls: document.querySelector('.attribution-card .admin-table').scrollWidth >= document.querySelector('.attribution-card .admin-table').clientWidth })`);
    assert.ok(dimensions.scrollWidth <= dimensions.viewport + 1, `${width}px admin has no page-level horizontal overflow`);
    widths.push({ width, ...dimensions });
    if (width === 390 || width === 1440) {
      const screenshot = await cdp.call("Page.captureScreenshot", { format: "png", fromSurface: true });
      await writeFile(join(output, `pdcar-admin-analytics-${width}.png`), Buffer.from(screenshot.data, "base64"));
    }
  }

  await evaluate(cdp, `(() => { const select = document.querySelector('.dashboard-window select'); select.value = '30'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await waitForExpression(cdp, `document.body.innerText.includes('รถที่ลูกค้าสนใจใน 30 วัน')`);
  const labels = await evaluate(cdp, `({
    hasThaiTimezone: document.body.innerText.includes('Asia/Bangkok'),
    hasPhoneAndLine: document.body.innerText.includes('กดโทร') && document.body.innerText.includes('กด LINE'),
    hasSources: document.body.innerText.includes('facebook') && document.body.innerText.includes('organic_social') && document.body.innerText.includes('PD0028_A'),
    hasHonestUntaggedLabel: document.body.innerText.includes('ไม่ติดแท็ก / ไม่ทราบแหล่งที่มา'),
    hasPrivacyNote: document.body.innerText.includes('ไม่เก็บ URL เต็ม')
  })`);
  assert.deepEqual(labels, { hasThaiTimezone: true, hasPhoneAndLine: true, hasSources: true, hasHonestUntaggedLabel: true, hasPrivacyNote: true });

  const report = { environment: "local Next development server with synthetic public inventory and browser-intercepted synthetic admin responses; no production reads or writes", widths, labels, selectedWindowDays: 30 };
  await writeFile(join(output, "admin-analytics-browser.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  cdp?.close();
  if (chrome?.pid) try { process.kill(-chrome.pid, "SIGTERM"); } catch {}
  if (next.pid) try { process.kill(-next.pid, "SIGTERM"); } catch {}
  await new Promise((resolveClose) => inventory.close(resolveClose));
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}
