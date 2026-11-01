import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec("create role anon; create role authenticated; create table public.erp_private_fixture(secret text); insert into public.erp_private_fixture values ('untouched');");
await db.exec(readFileSync(new URL("../supabase/migrations/0002_article_approval.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/20261014104736_admin_dashboard.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/20261101162830_campaign_attribution.sql", import.meta.url), "utf8"));
after(() => db.close());
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const claim = async (day, token = randomUUID()) => ({ token, row: (await query("select * from article_approval.claim_day($1::date,$2)", [day, token]))[0] });
const save = async ({ row, token }, hash = randomUUID()) => (await query("select article_approval.save_draft($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb) as ok", [row.id, token,
  JSON.stringify({ title: `บทความ ${row.id}`, description: "รายละเอียด", sections: [] }), "[]", hash,
  JSON.stringify([{ recipient: "admin", payload: { messages: [{ type: "text", text: "draft" }] } }])]))[0].ok;
const decide = async (id, action, version = 1, event = randomUUID()) => (await query("select article_approval.decide($1,'admin',$2,$3,$4) as result", [id, action, version, event]))[0].result;

test("migration executes on PostgreSQL; existing ERP fixture stays untouched", async () => {
  assert.equal((await query("select secret from public.erp_private_fixture"))[0].secret, "untouched");
});
test("duplicate/concurrent daily claims return one persistent draft", async () => {
  const claims = await Promise.all([claim("2026-09-01"), claim("2026-09-01"), claim("2026-09-01")]);
  assert.equal(claims.filter((c) => c.row).length, 1);
  assert.equal((await query("select count(*)::int as n from article_approval.drafts where article_date='2026-09-01'"))[0].n, 1);
});
test("lease ownership protects saved drafts; persisted content and outbox are atomic", async () => {
  const draft = await claim("2026-09-02");
  assert.equal(await save({ ...draft, token: randomUUID() }), false);
  assert.equal(await save(draft), true);
  assert.equal(await save(draft), false);
  assert.equal((await query("select count(*)::int as n from article_approval.deliveries where article_id=$1", [draft.row.id]))[0].n, 1);
});
test("public view hides pending drafts; approval is atomic and duplicate clicks cannot republish", async () => {
  const draft = await claim("2026-09-03"); await save(draft);
  assert.equal((await query("select * from public.public_approved_articles where id=$1", [draft.row.id])).length, 0);
  const event = randomUUID();
  const results = await Promise.all([decide(draft.row.id, "approve", 1, event), decide(draft.row.id, "approve", 1, event)]);
  assert.deepEqual(results.map((r) => r.result).sort(), ["applied", "duplicate"]);
  assert.equal((await query("select * from public.public_approved_articles where id=$1", [draft.row.id])).length, 1);
  assert.equal((await query("select count(*)::int as n from article_approval.decisions where article_id=$1", [draft.row.id]))[0].n, 1);
  assert.equal((await decide(draft.row.id, "reject", 1)).result, "conflict");
  assert.equal((await decide(draft.row.id, "unpublish", 2)).status, "unpublished");
  assert.equal((await query("select * from public.public_approved_articles where id=$1", [draft.row.id])).length, 0);
  assert.equal((await decide(draft.row.id, "approve", 1, event)).status, "unpublished");
  assert.equal((await decide(draft.row.id, "approve", 1)).result, "conflict");
  assert.equal((await decide(draft.row.id, "republish", 3)).status, "published");
  assert.equal((await decide(draft.row.id, "delete", 4)).status, "deleted");
  assert.equal((await decide(draft.row.id, "republish", 5)).result, "conflict");
  assert.equal((await claim("2026-09-03")).row, undefined);
});
test("reject is terminal for approval buttons and never visible", async () => {
  const draft = await claim("2026-09-04"); await save(draft);
  assert.equal((await decide(draft.row.id, "reject")).status, "rejected");
  assert.equal((await decide(draft.row.id, "approve", 2)).result, "conflict");
  assert.equal((await query("select * from public.public_approved_articles where id=$1", [draft.row.id])).length, 0);
  assert.equal((await claim("2026-09-04")).row, undefined);
});
test("expired generation lease can retry, stale worker cannot complete, attempts capped", async () => {
  const first = await claim("2026-09-05");
  await query("update article_approval.drafts set lease_until=now()-interval '1 minute' where id=$1", [first.row.id]);
  const retry = await claim("2026-09-05"); assert.equal(retry.row.id, first.row.id);
  assert.equal(await save(first), false);
  await query("select article_approval.fail_draft($1,$2,'test')", [retry.row.id, retry.token]);
  const last = await claim("2026-09-05"); assert.equal(last.row.attempts, 3);
  await query("select article_approval.fail_draft($1,$2,'test')", [last.row.id, last.token]);
  assert.equal((await claim("2026-09-05")).row, undefined);
});
test("duplicate content rolls back pending status and delivery insertion", async () => {
  const hash = randomUUID();
  const a = await claim("2026-09-06"); await save(a, hash);
  const b = await claim("2026-09-07"); await assert.rejects(() => save(b, hash));
  assert.equal((await query("select status from article_approval.drafts where id=$1", [b.row.id]))[0].status, "generating");
  assert.equal((await query("select * from article_approval.deliveries where article_id=$1", [b.row.id])).length, 0);
});
test("delivery retry preserves key/payload; expired ambiguous delivery cannot be sent again", async () => {
  const draft = await claim("2026-09-08"); await save(draft);
  const [delivery] = await query("select * from article_approval.deliveries where article_id=$1", [draft.row.id]);
  const token = randomUUID();
  const [first] = await query("select * from article_approval.claim_delivery($1,$2)", [delivery.id, token]);
  assert.equal((await query("select * from article_approval.claim_delivery($1,$2)", [delivery.id, randomUUID()])).length, 0);
  await query("select article_approval.finish_delivery($1,$2,false,'network')", [delivery.id, token]);
  const retryToken = randomUUID();
  const [retry] = await query("select * from article_approval.claim_delivery($1,$2)", [delivery.id, retryToken]);
  assert.equal(retry.retry_key, first.retry_key); assert.deepEqual(retry.payload, first.payload);
  await query("select article_approval.finish_delivery($1,$2,false,'network')", [delivery.id, retryToken]);
  await query("update article_approval.deliveries set first_attempt_at=now()-interval '24 hours' where id=$1", [delivery.id]);
  assert.equal((await query("select * from article_approval.claim_delivery($1,$2)", [delivery.id, randomUUID()])).length, 0);
});
test("anon/authenticated can read only published view, cannot call mutation functions or private tables", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await query("select * from public.public_approved_articles");
      await assert.rejects(() => query("select * from article_approval.drafts"));
      await assert.rejects(() => query("select * from article_approval.claim_day('2026-09-10',gen_random_uuid())"));
      await assert.rejects(() => query("select * from public.erp_private_fixture"));
    } finally { await db.exec("reset role"); }
  }
});
test("dedicated worker has scoped read and function access, no table writes or ERP access", async () => {
  await db.exec("set role pdcar_article_worker");
  try {
    await query("select * from article_approval.drafts limit 1");
    assert((await claim("2026-09-11")).row);
    await assert.rejects(() => query("delete from article_approval.drafts"));
    await assert.rejects(() => query("update article_approval.drafts set status='published'"));
    await assert.rejects(() => query("select * from public.erp_private_fixture"));
    await assert.rejects(() => query("select * from auth.users"));
  } finally { await db.exec("reset role"); }
});

test("manual articles can share a date, require approval, and support safe edits", async () => {
  const content = JSON.stringify({ title: "วิธีเลือกรถมือสอง", description: "คำแนะนำสำหรับลูกค้าที่กำลังเลือกรถมือสอง", sections: [{ heading: "เริ่มต้นตรวจรถ", paragraphs: ["ตรวจสภาพรถและเอกสารให้ครบก่อนตัดสินใจซื้อ"], factIds: [] }] });
  const eventA = `liff:${randomUUID()}`;
  const eventB = `liff:${randomUUID()}`;
  const create = async (slug, event) => (await query("select article_approval.save_manual(null,'admin','2026-09-12',$1,$2::jsonb,0,$3) as result", [slug, content, event]))[0].result;
  const first = await create("used-car-guide-one", eventA);
  const second = await create("used-car-guide-two", eventB);
  assert.equal(first.result, "created"); assert.equal(second.result, "created");
  assert.equal((await query("select * from public.public_approved_articles where id=$1", [first.id])).length, 0);
  const edited = (await query("select article_approval.save_manual($1,'admin','2026-09-12','used-car-guide-one',$2::jsonb,1,$3) as result", [first.id, content, `liff:${randomUUID()}`]))[0].result;
  assert.equal(edited.result, "updated"); assert.equal(edited.version, 2);
  assert.equal((await decide(first.id, "approve", 2)).status, "published");
});

test("analytics stores only the approved compact contract and stays private", async () => {
  const eventId = randomUUID(); const sessionId = randomUUID();
  await db.exec("set role pdcar_article_worker");
  try {
    assert.equal((await query("select site_admin.record_event($1,$2,'vehicle_view','/cars/test','PD0002') as ok", [eventId, sessionId]))[0].ok, true);
    assert.equal((await query("select site_admin.record_event($1,$2,'vehicle_view','/cars/test','PD0002') as ok", [eventId, sessionId]))[0].ok, true);
    assert.equal((await query("select count(*)::int as n from site_admin.analytics_events where event_id=$1", [eventId]))[0].n, 1);
    assert.equal((await query("select site_admin.record_event($1,$2,'email','/','PD0002') as ok", [randomUUID(), sessionId]))[0].ok, false);
    const campaignEvent = randomUUID();
    assert.equal((await query("select site_admin.record_event($1,$2,'line_click','/cars/pd0028','PD0028','line','messaging','pd0028_a') as ok", [campaignEvent, sessionId]))[0].ok, true);
    assert.deepEqual((await query("select utm_source,utm_medium,utm_campaign from site_admin.analytics_events where event_id=$1", [campaignEvent]))[0], {
      utm_source: "line", utm_medium: "messaging", utm_campaign: "pd0028_a"
    });
    assert.equal((await query("select site_admin.record_event($1,$2,'page_view','/','PD0002','email','messaging','pd0002_a') as ok", [randomUUID(), sessionId]))[0].ok, false);
    assert.equal((await query("select site_admin.record_event($1,$2,'page_view','/','PD0002','facebook','arbitrary','pd0002_a') as ok", [randomUUID(), sessionId]))[0].ok, false);
    assert.equal((await query("select site_admin.record_event($1,$2,'page_view','/','PD0002','facebook','organic_social','customer-name') as ok", [randomUUID(), sessionId]))[0].ok, false);
    assert.equal((await query("select site_admin.record_event($1,$2,'page_view','/?token=secret',null,null,null,null) as ok", [randomUUID(), sessionId]))[0].ok, false);
  } finally { await db.exec("reset role"); }
  await db.exec("set role anon");
  try {
    await assert.rejects(() => query("select * from site_admin.analytics_events"));
    await assert.rejects(() => query("select site_admin.record_event(gen_random_uuid(),gen_random_uuid(),'page_view','/',null)"));
    await assert.rejects(() => query("select site_admin.record_event(gen_random_uuid(),gen_random_uuid(),'page_view','/',null,'facebook','organic_social','pd0002_a')"));
  } finally { await db.exec("reset role"); }
});
