import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

function harness() {
  const requests = [];
  const values = new Map();
  let listener;
  let page = { dataset: { analyticsVehicle: "PD0029", analyticsIdentifier: "pd0029" } };
  const window = {
    location: { pathname: "/cars/pd0029", search: "" },
    sessionStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  };
  class Element {
    constructor(dataset) { this.dataset = dataset; }
    closest() { return this; }
  }
  const document = {
    documentElement: { dataset: { siteAnalytics: "enabled" } },
    querySelector: () => page,
    addEventListener: (_, callback) => { listener = callback; },
    removeEventListener: () => {}
  };
  const client = loadTs("components/site-analytics.tsx", {
    react: { useEffect: (callback) => callback(), useRef: (current) => ({ current }) },
    "next/navigation": { usePathname: () => window.location.pathname }
  }, {
    window, document, Element, crypto: { randomUUID }, URLSearchParams,
    fetch: (_, options) => { requests.push(JSON.parse(options.body)); return Promise.resolve({ ok: true }); }
  });
  client.SiteAnalytics({ enabled: true });
  return {
    window,
    setPage: (next) => { page = next; },
    click: (dataset) => { listener({ target: new Element(dataset) }); return requests.at(-1); }
  };
}

test("detail server markup exposes the resolved vehicle and current route identifier", () => {
  const detail = readFileSync(new URL("../app/cars/[identifier]/page.tsx", import.meta.url), "utf8");
  assert(detail.includes("data-analytics-vehicle={vehicle.carId}"));
  assert(detail.includes("data-analytics-identifier={decodeURIComponent(identifier)}"));
});

test("global contact clicks inherit the current server-resolved vehicle without new payload fields", () => {
  const h = harness();
  for (const analytics of ["phone_click", "line_click"]) {
    const event = h.click({ analytics });
    assert.equal(event.carId, "PD0029");
    assert.equal(event.path, "/cars/pd0029");
    assert.deepEqual(Object.keys(event).sort(), ["carId", "eventId", "eventName", "path", "sessionId"]);
  }
  assert.equal(h.click({ analytics: "phone_click", analyticsCar: "PD0002" }).carId, "PD0002");
  assert.equal(h.click({ analytics: "gallery_swipe" }).carId, undefined);
});

test("navigation never reuses a previous car and reads updated DOM at each click", () => {
  const h = harness();
  h.window.location.pathname = "/cars/pd0002";
  assert.equal(h.click({ analytics: "phone_click" }).carId, undefined, "old DOM during navigation must not match");
  h.setPage({ dataset: { analyticsVehicle: "PD0002", analyticsIdentifier: "pd0002" } });
  assert.equal(h.click({ analytics: "line_click" }).carId, "PD0002");
  for (const path of ["/", "/sell-car", "/cars/pd0002/extra", "/cars/%ZZ"]) {
    h.window.location.pathname = path;
    assert.equal(h.click({ analytics: "line_click" }).carId, undefined);
  }
  h.window.location.pathname = "/cars/pd0002";
  h.setPage(null);
  assert.equal(h.click({ analytics: "phone_click" }).carId, undefined, "404/loading without vehicle context");
});

test("encoded route identifiers and trailing slash resolve only a matching current vehicle", () => {
  const h = harness();
  h.window.location.pathname = `/cars/${encodeURIComponent("เอ็มจี-zs")}/`;
  h.setPage({ dataset: { analyticsVehicle: "PD0029", analyticsIdentifier: "เอ็มจี-zs" } });
  assert.equal(h.click({ analytics: "line_click" }).carId, "PD0029");
});
