import { requireAdminRequest, siteAdminEnabled } from "@/lib/admin-auth";
import { ArticleError, failure, json, readBody, sameOrigin } from "@/lib/article-approval/security";
import { analyticsEnabled, getDashboardMetrics } from "@/lib/site-analytics/server";
import { parseDashboardWindow } from "@/lib/site-analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!siteAdminEnabled()) throw new ArticleError("disabled", 503);
    sameOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ArticleError("invalid_content_type", 415);
    let body: Record<string, unknown>;
    try { body = JSON.parse(await readBody(request, 2_048)); } catch (error) {
      if (error instanceof ArticleError) throw error;
      throw new ArticleError("invalid_json");
    }
    await requireAdminRequest(request);
    if (body.operation !== "overview") throw new ArticleError("invalid_operation");
    const windowDays = parseDashboardWindow(body.windowDays);
    return json({ analyticsEnabled: analyticsEnabled(), metrics: analyticsEnabled() ? await getDashboardMetrics(windowDays) : null });
  } catch (error) {
    return failure(error);
  }
}
