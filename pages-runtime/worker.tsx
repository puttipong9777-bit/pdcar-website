import { renderToString } from "react-dom/server.browser";
import { getPublicVehicles } from "@/lib/vehicle-data";
import { App, type PageData } from "./app";
import { renderHome } from "./render-home";

export type Env = Record<string, string | undefined> & { ASSETS?: never };
type Bindings = { ASSETS: { fetch(request: Request): Promise<Response> } };
const origin = "https://www.pdcarcenter.com";
const shopTitle = "PD Car Center | รถมือสองนครปฐม";
const shopDescription = "รถมือสองคัดคุณภาพ พร้อมบริการจัดไฟแนนซ์ โดย PD Car Center นครปฐม";
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const headers = (type: string, preview: boolean) => ({
  "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  ...(preview ? { "X-Robots-Tag": "noindex, nofollow" } : {})
});

export async function handleRequest(request: Request, env: Env, assets?: Bindings["ASSETS"]) {
  const url = new URL(request.url);
  const preview = url.hostname !== "www.pdcarcenter.com";
  const path = url.pathname;
  const dynamic = path === "/" || path.startsWith("/cars/") || ["/robots.txt", "/sitemap.xml", "/api/health"].includes(path);
  if (!dynamic) return assets ? assets.fetch(request) : new Response("Not found", { status: 404 });
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const reply = (body: string, type: string, status = 200) => new Response(request.method === "HEAD" ? null : body, { status, headers: headers(type, preview) });
  if (path === "/api/health") return reply(JSON.stringify({ status: "ok", service: "pdcar-website", timestamp: new Date().toISOString() }), "application/json");
  if (path === "/robots.txt") return reply(preview ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, "text/plain; charset=utf-8");
  let identifier: string | undefined;
  if (path.startsWith("/cars/")) {
    if (!/^\/cars\/[^/]+\/?$/.test(path)) return reply("Not found", "text/plain", 404);
    try { identifier = decodeURIComponent(path.replace(/^\/cars\//, "").replace(/\/$/, "")); }
    catch { return reply("Bad request", "text/plain", 400); }
  }
  const result = await getPublicVehicles(env, identifier);
  const unavailable = result.source !== "supabase";
  if (path === "/sitemap.xml") {
    if (unavailable) return reply("Temporarily unavailable", "text/plain", 503);
    if (request.method === "HEAD") return reply("", "application/xml; charset=utf-8");
    const locations = [origin + "/", ...result.vehicles.map((car) => `${origin}/cars/${encodeURIComponent(car.slug)}`)];
    return reply(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map((loc) => `<url><loc>${escape(loc)}</loc></url>`).join("")}</urlset>`, "application/xml; charset=utf-8");
  }
  const vehicle = identifier === undefined ? undefined : result.vehicles.find((car) => car.carId === identifier || car.slug === identifier);
  const status = unavailable ? 503 : identifier !== undefined && !vehicle ? 404 : 200;
  if (request.method === "HEAD") return reply("", "text/html; charset=utf-8", status);
  const data: PageData = {
    kind: identifier === undefined ? "home" : unavailable ? "unavailable" : vehicle ? "vehicle" : "not-found",
    result: identifier === undefined ? result : { ...result, vehicles: [] }, vehicle,
    phone: env.NEXT_PUBLIC_SHOP_PHONE || "0840079122", lineUrl: env.NEXT_PUBLIC_LINE_URL
  };
  const title = vehicle ? `${vehicle.title} | PD Car Center` : status === 404 ? "ไม่พบรถ | PD Car Center" : shopTitle;
  const description = vehicle?.description || (vehicle ? `${vehicle.title} ${vehicle.carId} — ${shopDescription}` : shopDescription);
  const canonical = vehicle ? `${origin}/cars/${encodeURIComponent(vehicle.slug)}` : `${origin}/`;
  const socialImage = vehicle?.coverImageUrl || `${origin}/og.png`;
  const markup = data.kind === "home" && !unavailable ? renderHome(data) : renderToString(<App data={data} />);
  // Escape script delimiters even though data came from the approved public view.
  const bootstrap = JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return reply(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="facebook-domain-verification" content="1h2omtxmsu0vgdm1ustg0x9zokcgl9">${status !== 200 || preview ? '<meta name="robots" content="noindex,nofollow">' : ""}<link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(socialImage)}"><meta property="og:locale" content="th_TH"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(socialImage)}"><link rel="stylesheet" href="/assets/site.css"></head><body><div id="app">${markup}</div><script id="page-data" type="application/json">${bootstrap}</script><script type="module" src="/assets/client.js"></script></body></html>`, "text/html; charset=utf-8", status);
}


const worker = { fetch(request: Request, env: Bindings & Record<string, unknown>) {
  return handleRequest(request, env as unknown as Env, env.ASSETS);
} };

export default worker;
