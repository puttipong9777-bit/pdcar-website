// Test-only local source. Never imported into the Pages bundle.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { car } from "./fixtures.mjs";
let state = "initial";
const base = [car(), car({ car_id: "PD0002", website_slug: "honda-city", website_title: "Honda City", brand: "Honda", model: "City", year: 2021, status: "reserved", vertical_video: null })];
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8789");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (url.pathname === "/__state") {
    state = url.searchParams.get("value") || "initial";
    res.end("ok");
  } else if (url.pathname === "/rest/v1/public_vehicle_listings") {
    res.setHeader("Content-Type", "application/json");
    const rows = state === "unpublished" ? [base[1]] : state === "changed" ? [car({ sale_price: 299000, status: "reserved", website_slug: "new-slug" }), base[1]] : base;
    res.end(JSON.stringify(rows));
  } else if (url.pathname.startsWith("/api/public/vehicle-images/")) {
    res.setHeader("Content-Type", "image/jpeg");
    res.end(await readFile(new URL("../public/images/storefront.jpg", import.meta.url)));
  } else { res.statusCode = 404; res.end(); }
}).listen(8789, "127.0.0.1");
