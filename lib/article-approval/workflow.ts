import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { articleDb } from "./db";
import { generateArticle } from "./generator";
import { generationConfig, lineDraftPayload, pushDraft } from "./line";
import { ArticleError, bangkokDay, requireAdmin } from "./security";
import type { Article, Decision } from "./types";

export async function sendDeliveries(articleId?: string) {
  const sql = articleDb();
  const pending = await sql`select d.id from article_approval.deliveries d join article_approval.drafts a on a.id = d.article_id
    where d.sent_at is null and a.status = 'pending' and (${articleId ?? null}::uuid is null or a.id = ${articleId ?? null}::uuid)
    order by a.article_date desc limit 20`;
  let sent = 0; let failed = 0; let skipped = 0;
  // Bounded parallel pushes keep the daily invocation inside its time limit.
  for (let i = 0; i < pending.length; i += 5) {
    await Promise.all(pending.slice(i, i + 5).map(async (item) => {
      const token = randomUUID();
      const [delivery] = await sql`select * from article_approval.claim_delivery(${item.id}, ${token})`;
      if (!delivery) { skipped++; return; }
      try {
        requireAdmin(delivery.recipient);
        await pushDraft(delivery.payload, delivery.retry_key);
        await sql`select article_approval.finish_delivery(${delivery.id}, ${token}, true, null)`;
        sent++;
      } catch {
        failed++;
        await sql`select article_approval.finish_delivery(${delivery.id}, ${token}, false, 'line_delivery_failed')`;
      }
    }));
  }
  return { sent, failed, skipped };
}
export async function runDaily() {
  const admins = generationConfig();
  const sql = articleDb(); const day = bangkokDay(); const token = randomUUID();
  const [row] = await sql<Article[]>`select * from article_approval.claim_day(${day}::date, ${token})`;
  let generation = "already_exists";
  if (row) {
    try {
      const recent = await sql`select content->>'title' as title from article_approval.drafts where content is not null order by article_date desc limit 45`;
      const { content, sources } = await generateArticle(day, recent.map((r) => String(r.title)));
      const article = { ...row, content, sources };
      const deliveries = admins.map((recipient) => ({ recipient, payload: lineDraftPayload(article, recipient) }));
      const hash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
      const [saved] = await sql`select article_approval.save_draft(${row.id}, ${token}, ${sql.json(content)}, ${sql.json(sources)}, ${hash}, ${sql.json(deliveries)}) as ok`;
      if (!saved.ok) throw new ArticleError("generation_lease_lost", 409);
      generation = "created";
    } catch (error) {
      const code = error instanceof ArticleError ? error.code : "generation_failed";
      await sql`select article_approval.fail_draft(${row.id}, ${token}, ${code})`;
      throw new ArticleError(code, 502);
    }
  } else {
    const [existing] = await sql`select status, attempts, lease_until from article_approval.drafts where article_date = ${day}::date`;
    if (existing?.status === "failed" || (existing?.status === "generating" && existing.attempts >= 3 && new Date(existing.lease_until) < new Date())) {
      throw new ArticleError("generation_attempts_exhausted", 409);
    }
    if (existing?.status === "generating") generation = "in_progress";
  }
  const delivery = await sendDeliveries();
  return { day, generation, delivery };
}
export async function decide(id: string, actor: string, action: Decision, version: number, eventId: string) {
  const sql = articleDb();
  const [row] = await sql`select article_approval.decide(${id}, ${actor}, ${action}, ${version}, ${eventId}) as decision`;
  return row.decision as { result: "applied" | "duplicate" | "conflict" | "not_found"; status?: string; version?: number };
}
export async function listAdminArticles(id?: string, page = 1) {
  const sql = articleDb();
  const articles = await sql<Article[]>`select id, article_date::text, slug, status, content, sources, version,
    published_at::text, updated_at::text, created_at::text from article_approval.drafts
    where (${id ?? null}::uuid is null or id = ${id ?? null}::uuid)
    order by article_date desc limit 30 offset ${(page - 1) * 30}`;
  return articles;
}
