import { enabled, failure, json, requireCron } from "@/lib/article-approval/security";
import { runDaily } from "@/lib/article-approval/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
async function invoke(request: Request, scheduled: boolean) {
  try {
    requireCron(request);
    if (!enabled()) return json({ status: "disabled" });
    if (scheduled && process.env.ARTICLE_DAILY_CRON_ENABLED !== "true") return json({ status: "schedule_disabled" });
    const result = await runDaily();
    return json(result, result.delivery.failed ? 502 : 200);
  } catch (error) { return failure(error); }
}
export function GET(request: Request) { return invoke(request, true); }
// Explicit manual invocation for staging/recovery; same auth and daily lock as Cron.
export function POST(request: Request) { return invoke(request, false); }
