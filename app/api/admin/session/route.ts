import { adminSessionCookie, createAdminSession, hasAdminSession, siteAdminEnabled, verifyAdminPassword } from "@/lib/admin-auth";
import { ArticleError, failure, readBody, sameOrigin } from "@/lib/article-approval/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(value: unknown, status = 200, cookie?: string) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...(cookie ? { "Set-Cookie": cookie } : {}) } });
}

export async function POST(request: Request) {
  try {
    if (!siteAdminEnabled()) throw new ArticleError("admin_not_configured", 503);
    sameOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ArticleError("invalid_content_type", 415);
    let body: Record<string, unknown>;
    try { body = JSON.parse(await readBody(request, 2_048)); } catch (error) {
      if (error instanceof ArticleError) throw error;
      throw new ArticleError("invalid_json");
    }
    if (body.operation === "status") return response({ authenticated: hasAdminSession(request) });
    if (body.operation === "logout") return response({ authenticated: false }, 200, adminSessionCookie("", 0));
    if (body.operation !== "login" || !verifyAdminPassword(body.password)) throw new ArticleError("invalid_credentials", 401);
    return response({ authenticated: true }, 200, adminSessionCookie(createAdminSession()));
  } catch (error) {
    return failure(error);
  }
}
