import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, process.argv[2] || "/tmp/pdcar-audit-evidence");

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
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Process exited with ${child.exitCode}\n${logs()}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return response;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error(`Timed out waiting for ${url}\n${logs()}`);
}

function fixture() {
  const photos = (prefix) => Array.from({ length: 6 }, (_, index) => ({ fileId: `${prefix}-${index + 1}`, isPrimary: index === 0, sortOrder: index }));
  const base = {
    color: "น้ำเงิน", mileage: 38500, fuel_type: "hybrid", transmission: "automatic",
    condition_summary: "รถตัวอย่างสังเคราะห์สำหรับทดสอบหน้าจอ ไม่ใช่ประกาศขายจริง", website_featured: false,
    updated_at: "2026-10-31T00:00:00Z", public_description: "คำอธิบายตัวอย่างสำหรับตรวจลำดับเนื้อหา"
  };
  return [{
    ...base,
    car_id: "PDTEST18", website_slug: "pdtest18", status: "reserved", brand: "Toyota", model: "Corolla Cross",
    variant: "1.8 Hybrid Premium", year: 2022, sale_price: 729000,
    listing_down_payment: 120000, listing_finance_amount: 609000, listing_installment: 72, listing_monthly_payment: 10500,
    website_title: "Toyota Corolla Cross 1.8 Hybrid Premium ปี 2022", website_featured: true,
    vertical_video: { youtubeVideoId: "aqz-KE-bpKQ" }, photos: photos("fixture")
  }, {
    ...base, car_id: "PDHONDA1", website_slug: "pdhonda1", status: "available", brand: "Honda", model: "City",
    variant: "1.0 Turbo", year: 2021, sale_price: 450000, website_title: "Honda City 1.0 Turbo ปี 2021", photos: photos("honda")
  }, {
    ...base, car_id: "PDTOYOTA2", website_slug: "pdtoyota2", status: "available", brand: "Toyota", model: "RAV4",
    variant: "Hybrid", year: 2023, sale_price: 900000, website_title: "Toyota RAV4 Hybrid ปี 2023", photos: photos("rav4")
  }, {
    ...base, car_id: "PDMAZDA1", website_slug: "pdmazda1", status: "reserved", brand: "Mazda", model: "2",
    variant: "1.3", year: 2020, sale_price: 300000, website_title: "Mazda 2 1.3 ปี 2020", photos: photos("mazda")
  }, {
    ...base, car_id: "PDSOLD", website_slug: "pdsold", status: "sold", brand: "Nissan", model: "Almera",
    year: 2022, sale_price: 350000, website_title: "Synthetic sold record", photos: photos("sold")
  }, {
    ...base, car_id: "PDHIDDEN", website_slug: "pdhidden", status: "available", website_published: false, brand: "Ford", model: "Ranger",
    year: 2024, sale_price: 1200000, website_title: "Synthetic unpublished record", photos: photos("hidden")
  }];
}

function connectCdp(url) {
  return new Promise((resolveConnect, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let id = 0;
    socket.addEventListener("error", reject, { once: true });
    socket.addEventListener("open", () => resolveConnect({
      call(method, params = {}) {
        return new Promise((resolveCall, rejectCall) => {
          const callId = ++id;
          pending.set(callId, { resolveCall, rejectCall });
          socket.send(JSON.stringify({ id: callId, method, params }));
        });
      },
      close() { socket.close(); }
    }), { once: true });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) item.rejectCall(new Error(message.error.message)); else item.resolveCall(message.result);
    });
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitForSelector(cdp, selector) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

async function waitForExpression(cdp, expression) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function clickWhenInteractive(cdp, selector, outcomeSelector) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.click()`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    if (await evaluate(cdp, `Boolean(document.querySelector(${JSON.stringify(outcomeSelector)}))`)) return;
  }
  throw new Error(`Timed out waiting for interactive ${selector}`);
}

const mockPort = await freePort();
const appPort = await freePort();
const chromePort = await freePort();
const userData = await mkdtemp(join(os.tmpdir(), "pdcar-chrome-"));
let serverLogs = "";
let chromeLogs = "";
const mediaBase = `http://127.0.0.1:${mockPort}/images`;
await mkdir(output, { recursive: true });
const mock = http.createServer((request, response) => {
  if (request.url?.startsWith("/images/")) {
    const label = request.url.split("/").pop()?.replace("fixture-", "") || "1";
    response.writeHead(200, { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store", "Content-Type": "image/svg+xml" });
    response.end(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#0c3158"/><circle cx="850" cy="390" r="260" fill="#176dcc"/><text x="80" y="170" fill="white" font-size="72" font-family="sans-serif">PD CAR TEST PHOTO ${label}</text><text x="80" y="260" fill="#cfe3fb" font-size="36" font-family="sans-serif">SYNTHETIC FIXTURE · NOT A REAL LISTING</text></svg>`);
    return;
  }
  response.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", "Content-Range": "0-0/1" });
  response.end(JSON.stringify(fixture()));
});
await new Promise((resolveListen) => mock.listen(mockPort, "127.0.0.1", resolveListen));

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(appPort), "-H", "127.0.0.1"], {
  cwd: root, detached: true,
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key", NEXT_PUBLIC_VEHICLE_IMAGE_BASE_URL: mediaBase, ALLOW_LOCAL_MEDIA_FIXTURES: "true", SITE_ENV: "preview", SITE_ANALYTICS_ENABLED: "false" },
  stdio: ["ignore", "pipe", "pipe"]
});
next.stdout.on("data", (chunk) => { serverLogs += chunk; });
next.stderr.on("data", (chunk) => { serverLogs += chunk; });

let chrome;
let cdp;
try {
  await waitFor(`http://127.0.0.1:${appPort}/api/health`, next, () => serverLogs.slice(-4_000));
  chrome = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${chromePort}`, `--user-data-dir=${userData}`, "about:blank"], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
  chrome.stdout.on("data", (chunk) => { chromeLogs += chunk; });
  chrome.stderr.on("data", (chunk) => { chromeLogs += chunk; });
  await waitFor(`http://127.0.0.1:${chromePort}/json/version`, chrome, () => chromeLogs.slice(-4_000), 30_000);
  const target = await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(`http://127.0.0.1:${appPort}/cars/pdtest18`)}`, { method: "PUT" }).then((response) => response.json());
  cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.call("Page.enable");
  await cdp.call("Runtime.enable");
  await cdp.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.call("Page.navigate", { url: `http://127.0.0.1:${appPort}/cars/pdtest18` });
  await waitForSelector(cdp, ".gallery-open");

  const layout = await evaluate(cdp, `(() => {
    const summary = document.querySelector('.vehicle-summary').getBoundingClientRect();
    const primary = document.querySelector('.gallery-image-primary').getBoundingClientRect();
    const video = document.querySelector('.vehicle-video-section').getBoundingClientRect();
    return { viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, summaryTop: summary.top, galleryTop: document.querySelector('.gallery').getBoundingClientRect().top, primaryBottom: primary.bottom, videoTop: video.top, thumbnails: getComputedStyle(document.querySelector('.gallery-thumbnails')).display, mapHref: document.querySelector('.vehicle-summary a[href*="maps.app.goo.gl"]').href, hours: document.querySelector('.vehicle-summary .business-visit-info').innerText };
  })()`);
  assert.ok(layout.scrollWidth <= layout.viewport + 1, "mobile page has no horizontal overflow");
  assert.ok(layout.summaryTop >= layout.primaryBottom, "summary follows the first-screen gallery image");
  assert.ok(layout.videoTop > layout.summaryTop, "video does not precede the price/status summary");
  assert.equal(layout.thumbnails, "none");
  assert.equal(layout.mapHref, "https://maps.app.goo.gl/nzqpjnq3GD5LNs5W6");
  assert.match(layout.hours, /08:00–17:00/);
  assert.match(layout.hours, /นัด.*19:00/);

  await clickWhenInteractive(cdp, ".gallery-open", ".gallery-lightbox");
  const firstCounter = await evaluate(cdp, `document.querySelector('.gallery-lightbox-toolbar span').innerText`);
  assert.equal(firstCounter, "1 / 6");
  assert.equal(await evaluate(cdp, `document.activeElement.getAttribute('aria-label')`), "ปิดรูปเต็มจอ");
  assert.equal(await evaluate(cdp, `document.querySelector('.site-header').inert`), true);
  await cdp.call("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" });
  await cdp.call("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight" });
  assert.equal(await evaluate(cdp, `document.querySelector('.gallery-lightbox-toolbar span').innerText`), "2 / 6");
  assert.equal(await evaluate(cdp, `document.activeElement.getAttribute('aria-label')`), "ปิดรูปเต็มจอ", "changing images does not reset modal focus");
  await cdp.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", modifiers: 8 });
  await cdp.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", modifiers: 8 });
  assert.equal(await evaluate(cdp, `document.activeElement.getAttribute('aria-label')`), "รูปถัดไป", "Shift+Tab wraps to the last control");
  await cdp.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab" });
  await cdp.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
  assert.equal(await evaluate(cdp, `document.activeElement.getAttribute('aria-label')`), "ปิดรูปเต็มจอ", "Tab wraps to the first control");
  await evaluate(cdp, `(() => { const image = document.querySelector('.gallery-lightbox-image'); image.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300 })); image.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100 })); })()`);
  assert.equal(await evaluate(cdp, `document.querySelector('.gallery-lightbox-toolbar span').innerText`), "3 / 6");
  assert.equal(await evaluate(cdp, `document.activeElement.getAttribute('aria-label')`), "ปิดรูปเต็มจอ", "simulated pointer swipe does not reset modal focus");
  const image = await cdp.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(output, "pdcar-detail-lightbox-390.png"), Buffer.from(image.data, "base64"));
  await cdp.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await cdp.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector('.gallery-lightbox'))`), false);
  assert.equal(await evaluate(cdp, `document.activeElement.classList.contains('gallery-open')`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('.site-header').inert`), false);
  const detail = await cdp.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(output, "pdcar-detail-390-updated.png"), Buffer.from(detail.data, "base64"));

  const responsive = [{ width: 390, viewport: layout.viewport, scrollWidth: layout.scrollWidth, summaryTop: layout.summaryTop, galleryTop: layout.galleryTop }];
  for (const width of [768, 1165, 1440]) {
    await cdp.call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 900 });
    await cdp.call("Page.reload", { ignoreCache: true });
    await waitForSelector(cdp, ".vehicle-summary");
    const dimensions = await evaluate(cdp, `({ viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, summaryTop: document.querySelector('.vehicle-summary').getBoundingClientRect().top, galleryTop: document.querySelector('.gallery').getBoundingClientRect().top })`);
    assert.ok(dimensions.scrollWidth <= dimensions.viewport + 1, `${width}px page has no horizontal overflow`);
    responsive.push({ width, ...dimensions });
    if (width === 1440) {
      const wide = await cdp.call("Page.captureScreenshot", { format: "png", fromSurface: true });
      await writeFile(join(output, "pdcar-detail-1440-updated.png"), Buffer.from(wide.data, "base64"));
    }
  }

  const navigateHome = async (query, assertion) => {
    await cdp.call("Page.navigate", { url: `http://127.0.0.1:${appPort}/${query}#inventory` });
    await waitForExpression(cdp, `location.pathname === '/' && document.readyState === 'complete'`);
    await waitForSelector(cdp, ".catalog-card");
    await waitForExpression(cdp, assertion);
    return evaluate(cdp, `Array.from(document.querySelectorAll('.catalog-card')).map((card) => card.innerText)`);
  };

  const reservedCards = await navigateHome("?status=reserved&sort=price-desc", `document.querySelectorAll('.catalog-card').length === 2 && document.querySelectorAll('.catalog-card')[0].innerText.includes('Corolla Cross') && document.querySelectorAll('.catalog-card')[1].innerText.includes('Mazda 2')`);
  assert.match(reservedCards[0], /ปีรุ่น 2022/);
  assert.match(reservedCards[0], /ดาวน์ 120,000 บ\./);
  assert.match(reservedCards[0], /72 งวด/);

  const brandStatusCards = await navigateHome("?brand=Toyota&status=available", `document.querySelectorAll('.catalog-card').length === 1 && document.querySelector('.catalog-card').innerText.includes('RAV4')`);
  assert.equal(brandStatusCards.length, 1, "brand and status filters exclude other makes and reserved vehicles");
  const searchCards = await navigateHome("?q=Honda", `document.querySelectorAll('.catalog-card').length === 1 && document.querySelector('.catalog-card').innerText.includes('Honda City')`);
  assert.equal(searchCards.length, 1, "search excludes nonmatching vehicles");
  const sortedCards = await navigateHome("?sort=price-asc", `document.querySelectorAll('.catalog-card').length === 4 && document.querySelectorAll('.catalog-card')[0].innerText.includes('Mazda 2') && document.querySelectorAll('.catalog-card')[3].innerText.includes('RAV4')`);
  assert.match(sortedCards[1], /Honda City/);
  assert.match(sortedCards[2], /Corolla Cross/);
  assert.doesNotMatch(sortedCards.join("\n"), /Synthetic sold|Synthetic unpublished/);

  await navigateHome("?status=reserved", `document.querySelectorAll('.catalog-card').length === 2`);
  const resetDeadline = Date.now() + 30_000;
  while (Date.now() < resetDeadline && await evaluate(cdp, `location.search !== ''`)) {
    await evaluate(cdp, `document.querySelector('.catalog-result button')?.click()`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  await waitForExpression(cdp, `location.search === '' && document.querySelectorAll('.catalog-card').length === 4`);

  const homeResponsive = [];
  for (const width of [390, 768, 1165, 1440]) {
    await cdp.call("Emulation.setDeviceMetricsOverride", { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 900 });
    const dimensions = await evaluate(cdp, `({ viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, cardCount: document.querySelectorAll('.catalog-card').length })`);
    assert.ok(dimensions.scrollWidth <= dimensions.viewport + 1, `${width}px home has no horizontal overflow`);
    assert.equal(dimensions.cardCount, 4);
    homeResponsive.push({ width, ...dimensions });
  }

  const home = await evaluate(cdp, `(() => ({ viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, articleHref: document.querySelector('a[href="/#articles"]').href, mapHref: document.querySelector('.contact-band a[href*="maps.app.goo.gl"]').href, query: location.search }))()`);
  assert.equal(home.articleHref, `http://127.0.0.1:${appPort}/#articles`);
  assert.equal(home.mapHref, "https://maps.app.goo.gl/nzqpjnq3GD5LNs5W6");
  assert.equal(home.query, "");
  const homeShot = await cdp.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(output, "pdcar-home-1440-updated.png"), Buffer.from(homeShot.data, "base64"));

  const report = {
    environment: "local Next development server with synthetic fixture; not built-server or Cloudflare adapter evidence; no production writes",
    detailResponsive: responsive,
    homeResponsive,
    home,
    catalog: { publishedCards: 4, reservedSort: ["PDTEST18", "PDMAZDA1"], brandStatus: "PDTOYOTA2", search: "PDHONDA1", ascendingPrice: ["PDMAZDA1", "PDHONDA1", "PDTEST18", "PDTOYOTA2"], reset: true, soldAndUnpublishedExcluded: true },
    gallery: { keyboardNext: true, tabWrap: true, shiftTabWrap: true, backgroundInert: true, simulatedPointerSwipe: true, escapeClose: true, focusRestored: true, focusStableDuringImageChange: true }
  };
  await writeFile(join(output, "browser-gallery.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  cdp?.close();
  if (chrome?.pid) try { process.kill(-chrome.pid, "SIGTERM"); } catch {}
  try { process.kill(-next.pid, "SIGTERM"); } catch {}
  await new Promise((resolveClose) => mock.close(resolveClose));
  await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}
