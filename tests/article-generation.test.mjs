import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { loadTs } from "./helpers/load-ts.mjs";

const sourceModule = loadTs("lib/article-approval/sources.ts");
const { validateContent } = loadTs("lib/article-approval/content.ts");
const content = {
  title: "เตรียมรถให้พร้อมก่อนออกเดินทาง",
  description: "เริ่มต้นตรวจความพร้อมของยาง ไฟรถ และใบปัดน้ำฝน โดยอ้างอิงคำแนะนำผู้ผลิตรถของคุณ",
  sections: [
    { heading: "ตรวจยางตามคู่มือ", paragraphs: ["ใช้แรงดันยางตามป้ายรถหรือคู่มือผู้ผลิต ตรวจขณะยางเย็น และตรวจยางอะไหล่ด้วยถ้ามี"], factIds: ["pressure"] },
    { heading: "ตรวจไฟก่อนเดินทาง", paragraphs: ["ตรวจไฟหน้า ไฟเบรก ไฟเลี้ยว และไฟฉุกเฉินก่อนเดินทาง หากไม่แน่ใจให้ช่างตรวจ"], factIds: ["lights", "service"] },
    { heading: "ตรวจใบปัดน้ำฝน", paragraphs: ["ตรวจใบปัดน้ำฝนและน้ำฉีดกระจก เปลี่ยนใบปัดที่เสื่อมเพื่อการมองเห็นขณะขับรถ"], factIds: ["wipers"] },
  ],
};
test("Thai content validation rejects fabricated references, scripts, guarantees and malformed sections", () => {
  validateContent(content, sourceModule.sources);
  for (const bad of [
    { ...content, title: "English title only" }, { ...content, title: "<script>ทดสอบสคริปต์</script>" },
    { ...content, title: "รับประกันผ่านไฟแนนซ์ อนุมัติแน่นอน" }, { ...content, title: "ขับขี่อย่างปลอดภัย 100% ทุกสถานการณ์" },
    { ...content, sections: null }, { ...content, sections: [null, null, null] },
    { ...content, sections: content.sections.map((s) => ({ ...s, factIds: ["invented"] })) },
  ]) assert.throws(() => validateContent(bad, sourceModule.sources));
});
function apiOutput(value) { return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] }); }
test("generator uses strict Responses schema, no stored requests, then an independent grounding check", async () => {
  let count = 0;
  const generator = loadTs("lib/article-approval/generator.ts", {}, {
    process: { env: { OPENAI_API_KEY: "fake", ARTICLE_OPENAI_MODEL: "configured-model" } },
    fetch: async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const payload = JSON.parse(init.body); assert.equal(payload.store, false); assert.equal(payload.model, "configured-model");
      assert.equal(payload.text.format.strict, true); count++;
      return apiOutput(count === 1 ? content : { approved: true, reason: "supported" });
    },
  });
  const result = await generator.generateArticle("2026-09-08", []);
  assert.deepEqual(result.content, content); assert.equal(count, 2);
});
test("AI refusal, incomplete output and failed factual review cannot become pending drafts", async () => {
  for (const kind of ["refused", "incomplete", "review_failed"]) {
    let count = 0;
    const generator = loadTs("lib/article-approval/generator.ts", {}, {
      process: { env: { OPENAI_API_KEY: "fake", ARTICLE_OPENAI_MODEL: "configured-model" } },
      fetch: async () => {
        count++;
        if (kind === "incomplete") return Response.json({ status: "incomplete", output: [] });
        if (kind === "refused") return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] });
        return apiOutput(count === 1 ? content : { approved: false, reason: "unsupported claim" });
      },
    });
    await assert.rejects(() => generator.generateArticle("2026-09-08", []));
  }
});

const db = new PGlite();
await db.exec("create role anon; create role authenticated;");
await db.exec(readFileSync(new URL("../supabase/migrations/0002_article_approval.sql", import.meta.url), "utf8"));
after(() => db.close());
function sql(strings, ...values) {
  const text = strings.reduce((all, part, i) => `${all}${i ? `$${i}` : ""}${part}`, "");
  return db.query(text, values).then((result) => result.rows);
}
sql.json = (value) => JSON.stringify(value);
test("workflow recovery: AI error -> same daily row -> saved draft -> LINE failure -> resend without regenerating -> publish", async () => {
  let generations = 0; let pushes = 0; let failAI = true; let failLine = true;
  const admin = `U${"a".repeat(32)}`;
  const workflow = loadTs("lib/article-approval/workflow.ts", {
    "./db": { articleDb: () => sql },
    "./generator": { generateArticle: async () => { generations++; if (failAI) throw new Error("provider failed"); return { content, sources: sourceModule.sources }; } },
    "./line": {
      generationConfig: () => [admin],
      lineDraftPayload: () => ({ to: "admin", messages: [{ type: "text", text: "draft" }] }),
      pushDraft: async () => { pushes++; if (failLine) throw new Error("network failure"); },
    },
  }, { process: { env: { ARTICLE_LINE_ADMIN_IDS: admin } } });
  await assert.rejects(() => workflow.runDaily());
  const failed = (await db.query("select * from article_approval.drafts")).rows[0];
  assert.equal(failed.status, "failed"); assert.equal(pushes, 0);
  failAI = false;
  const first = await workflow.runDaily(); assert.equal(first.generation, "created"); assert.equal(first.delivery.failed, 1);
  assert.equal((await db.query("select * from public.public_approved_articles")).rows.length, 0);
  failLine = false;
  const second = await workflow.runDaily(); assert.equal(second.generation, "already_exists"); assert.equal(second.delivery.sent, 1);
  const third = await workflow.runDaily(); assert.equal(third.delivery.sent, 0); assert.equal(generations, 2); assert.equal(pushes, 2);
  const rows = (await db.query("select * from article_approval.drafts")).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].id, failed.id); assert.equal(rows[0].status, "pending");
  const decision = await workflow.decide(rows[0].id, "admin", "approve", 1, "integration-event");
  assert.equal(decision.result, "applied"); assert.equal(decision.status, "published");
  assert.equal((await db.query("select * from public.public_approved_articles")).rows.length, 1);
  await workflow.runDaily(); assert.equal(generations, 2); assert.equal(pushes, 2);
});
