import handler from "../.open-next/worker.js";
import { runArticleSchedule } from "./scheduled.mjs";

const worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const previewHost = url.hostname !== "www.pdcarcenter.com" && url.hostname !== "pdcarcenter.com";
    const isPreview = env.SITE_ENV === "preview" || previewHost;
    if (isPreview && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" }
      });
    }
    const response = await handler.fetch(request, env, ctx);
    if (!isPreview) return response;
    const preview = new Response(response.body, response);
    preview.headers.set("X-Robots-Tag", "noindex, nofollow");
    return preview;
  },
  async scheduled(_event, env, ctx) {
    // Await the job so failed schedules are reported by Cloudflare.
    await runArticleSchedule(env, (request) => handler.fetch(request, env, ctx));
  }
};

export default worker;
