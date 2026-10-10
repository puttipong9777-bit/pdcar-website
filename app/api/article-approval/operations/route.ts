import { articleDb } from "@/lib/article-approval/db";
import { enabled, failure, json, requireCron } from "@/lib/article-approval/security";
import { sendDeliveries } from "@/lib/article-approval/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  try {
    requireCron(request);
    if (!enabled()) return json({ status: "disabled" });
    const sql = articleDb();
    const drafts = await sql`select id, article_date::text, status, attempts, error_code, updated_at::text
      from article_approval.drafts order by article_date desc limit 30`;
    const deliveries = await sql`select article_id, count(*)::int as recipients,
      count(sent_at)::int as sent, count(*) filter (where sent_at is null and first_attempt_at < now() - interval '23 hours')::int as needs_review
      from article_approval.deliveries group by article_id order by article_id limit 100`;
    return json({ drafts, deliveries });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireCron(request);
    if (!enabled()) return json({ status: "disabled" });
    const result = await sendDeliveries();
    return json(result, result.failed ? 502 : 200);
  } catch (error) { return failure(error); }
}
