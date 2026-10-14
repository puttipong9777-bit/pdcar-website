// Reuse the authenticated Next route, its Bangkok date and its persistent lock.
export async function runArticleSchedule(env, invoke) {
  if (env.SITE_ENV !== "production" || env.ARTICLE_APPROVAL_ENABLED !== "true" || env.ARTICLE_DAILY_CRON_ENABLED !== "true") {
    return { status: "disabled" };
  }
  if (!env.CRON_SECRET || env.CRON_SECRET.trim().length < 32) {
    throw new Error("article_schedule_missing_secret");
  }
  const origin = new URL(env.ARTICLE_SITE_URL);
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error("article_schedule_invalid_origin");
  }
  const response = await invoke(new Request(new URL("/api/cron/article-drafts", origin), {
    method: "GET",
    headers: { Authorization: `Bearer ${env.CRON_SECRET.trim()}` }
  }));
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`article_schedule_failed_${response.status}`);
  }
  await response.body?.cancel();
  return { status: "completed" };
}
