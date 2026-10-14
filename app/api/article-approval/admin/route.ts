import { requireAdminRequest, siteAdminEnabled } from "@/lib/admin-auth";
import { ArticleError, enabled, failure, json, readBody, sameOrigin, uuid } from "@/lib/article-approval/security";
import { decide, listAdminArticles, runDaily, sendDeliveries } from "@/lib/article-approval/workflow";
import { saveManualArticle } from "@/lib/article-approval/workflow";
import { validateManualContent } from "@/lib/article-approval/content";
import type { Decision } from "@/lib/article-approval/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    if (!enabled() && !siteAdminEnabled()) throw new ArticleError("disabled", 503);
    sameOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ArticleError("invalid_content_type", 415);
    let body;
    try { body = JSON.parse(await readBody(request)); } catch (error) {
      if (error instanceof ArticleError) throw error;
      throw new ArticleError("invalid_json");
    }
    if (!body || typeof body !== "object") throw new ArticleError("invalid_body");
    const actor = await requireAdminRequest(request);
    // Manual tests/recovery use the same verified admin identity and daily lock.
    // No cron credentials are ever exposed to the browser.
    if (body.operation === "generate") {
      const result = await runDaily();
      return json(result, result.delivery.failed ? 502 : 200);
    }
    if (body.operation === "retry-deliveries") {
      const result = await sendDeliveries();
      return json(result, result.failed ? 502 : 200);
    }
    if (body.operation === "list") {
      const page = body.page ?? 1;
      if (!Number.isInteger(page) || page < 1 || page > 10000) throw new ArticleError("invalid_page");
      return json({ articles: await listAdminArticles(body.articleId ? uuid(body.articleId) : undefined, page) });
    }
    if (body.operation === "save") {
      const articleId = body.articleId === undefined ? undefined : uuid(body.articleId);
      if (typeof body.articleDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.articleDate)) throw new ArticleError("invalid_article_date");
      if (typeof body.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) || body.slug.length < 3 || body.slug.length > 100) throw new ArticleError("invalid_slug");
      const version = articleId ? body.version : 0;
      if (!Number.isInteger(version) || version < 0) throw new ArticleError("invalid_version");
      const content = validateManualContent(body.content);
      const result = await saveManualArticle({
        id: articleId,
        actor,
        articleDate: body.articleDate,
        slug: body.slug,
        content,
        version,
        eventId: `liff:${uuid(body.requestId)}`
      });
      return json(result, result.result === "not_found" ? 404 : result.result === "conflict" ? 409 : result.result === "invalid" ? 400 : 200);
    }
    const actions: Decision[] = ["approve", "reject", "unpublish", "republish", "delete"];
    if (body.operation !== "decide" || !actions.includes(body.action) || !Number.isInteger(body.version) || body.version < 1) throw new ArticleError("invalid_decision");
    const id = uuid(body.articleId);
    const result = await decide(id, actor, body.action, body.version, `liff:${uuid(body.requestId)}`);
    return json(result, result.result === "not_found" ? 404 : result.result === "conflict" ? 409 : 200);
  } catch (error) { return failure(error); }
}
