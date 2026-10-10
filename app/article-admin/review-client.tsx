"use client";

import Script from "next/script";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArticleBody } from "@/components/article-content";
import { statusLabels, thaiDate, type Article, type Decision } from "@/lib/article-approval/types";

type Liff = { init: (config: { liffId: string }) => Promise<void>; isLoggedIn: () => boolean; login: (config: { redirectUri: string }) => void; getIDToken: () => string | null };
declare global { interface Window { liff?: Liff } }
const labels: Record<Decision, string> = { approve: "อนุมัติโพสต์", reject: "ไม่อนุมัติ", unpublish: "ยกเลิกเผยแพร่", republish: "เผยแพร่อีกครั้ง", delete: "ลบบทความ" };
function available(article: Article): Decision[] {
  if (article.status === "pending") return ["approve", "reject", "delete"];
  if (article.status === "published") return ["unpublish", "delete"];
  if (article.status === "unpublished") return ["republish", "delete"];
  if (article.status === "rejected" || article.status === "failed") return ["delete"];
  return [];
}
export function ArticleAdmin({ liffId }: { liffId: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [message, setMessage] = useState("กำลังเชื่อมต่อ LINE…");
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(1);
  const [single, setSingle] = useState<string>();
  const [workConfirmation, setWorkConfirmation] = useState<"generate" | "retry-deliveries">();
  const [confirmation, setConfirmation] = useState<{ article: Article; action: Decision; requestId: string }>();
  const initialized = useRef(false);
  const api = useCallback(async (body: object) => {
    const token = window.liff?.getIDToken();
    if (!token) throw new Error("กรุณาเปิดหน้านี้ใหม่และเข้าสู่ระบบ LINE");
    const response = await fetch("/api/article-approval/admin", { method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const result = await response.json();
    if (response.status === 409) throw new Error("สถานะบทความเปลี่ยนแล้ว กรุณาโหลดรายการใหม่ก่อนดำเนินการ");
    if (response.status === 403) throw new Error("บัญชี LINE นี้ไม่มีสิทธิ์จัดการบทความ");
    if (!response.ok) throw new Error("ไม่สามารถดำเนินการได้ กรุณาลองใหม่ หรือแจ้งผู้ดูแลระบบ");
    return result;
  }, []);
  const load = useCallback(async (id?: string, nextPage = 1) => {
    const result = await api({ operation: "list", articleId: id, page: nextPage });
    setArticles(result.articles); setSingle(id); setPage(nextPage); setConfirmation(undefined);
    return result.articles as Article[];
  }, [api]);
  async function initialize() {
    if (initialized.current) return;
    initialized.current = true;
    try {
      if (!window.liff) throw new Error("โหลด LINE ไม่สำเร็จ กรุณาเปิดหน้าใหม่");
      // Capture LIFF secondary redirect state before init can clean the URL.
      const params = new URLSearchParams(window.location.search);
      const state = params.get("liff.state");
      const stateParams = state ? new URL(state, window.location.origin).searchParams : params;
      const articleId = params.get("article") || stateParams.get("article") || undefined;
      const action = params.get("action") || stateParams.get("action");
      await window.liff.init({ liffId });
      if (!window.liff.isLoggedIn()) { window.liff.login({ redirectUri: window.location.href }); return; }
      const rows = await load(articleId);
      setReady(true); setMessage(rows.length ? "ตรวจเนื้อหาและแหล่งข้อมูลก่อนเลือกผลการอนุมัติ" : "ยังไม่มีบทความ");
      // Opening a URL never mutates state. The reviewer confirms deliberately.
      if (articleId && (action === "approve" || action === "reject") && rows[0]?.status === "pending") {
        setConfirmation({ article: rows[0], action, requestId: crypto.randomUUID() });
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "เชื่อมต่อไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  async function refresh(id?: string, nextPage = 1) {
    setBusy(true);
    try { await load(id, nextPage); setMessage("โหลดรายการแล้ว"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "โหลดไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!confirmation || busy) return;
    setBusy(true);
    try {
      const result = await api({ operation: "decide", articleId: confirmation.article.id,
        version: confirmation.article.version, action: confirmation.action, requestId: confirmation.requestId });
      await load(single, page);
      setMessage(result.result === "duplicate" ? "รายการนี้บันทึกไว้แล้ว" : `บันทึกแล้ว: ${statusLabels[result.status as Article["status"]]}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  async function runWork() {
    if (!workConfirmation || busy) return;
    setBusy(true);
    try {
      const result = await api({ operation: workConfirmation });
      await load(); setWorkConfirmation(undefined);
      setMessage(result.generation === "in_progress" ? "กำลังสร้างร่างอยู่ กรุณาโหลดรายการอีกครั้งภายหลัง" : "ดำเนินการแล้ว กรุณาตรวจรายการและข้อความใน LINE (ไม่สร้างร่างซ้ำในวันเดียวกัน)");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  return <main className="pd-articles pd-article-detail">
    <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="afterInteractive" onReady={() => { void initialize(); }}
      onError={() => { setMessage("โหลด LINE ไม่สำเร็จ กรุณาเปิดหน้าใหม่"); setBusy(false); }} />
    <h1>จัดการบทความ PD Car Center</h1>
    <p role="status" aria-live="polite" className="pd-admin-status">{message}</p>
    {ready && <div className="pd-admin-actions">
      <button disabled={busy} onClick={() => refresh(single, page)}>โหลดรายการใหม่</button>
      {single && <button disabled={busy} onClick={() => refresh()}>บทความทั้งหมด</button>}
      <button disabled={busy} onClick={() => setWorkConfirmation("generate")}>สร้างร่างของวันนี้ / ลองใหม่</button>
      <button disabled={busy} onClick={() => setWorkConfirmation("retry-deliveries")}>ส่งร่างที่ค้าง</button>
    </div>}
    {ready && workConfirmation && <div className="pd-admin-confirm">
      <p>{workConfirmation === "generate" ? "สร้างร่างของวันนี้ด้วย AI และส่งให้ผู้ดูแลใน LINE? มีค่าใช้งาน API ตามบัญชี และยังไม่เผยแพร่จนกว่าจะอนุมัติ" : "ลองส่งร่างที่ค้างไปยังผู้ดูแลใน LINE อีกครั้ง? ระบบใช้รหัสส่งเดิมเพื่อป้องกันข้อความซ้ำ"}</p>
      <div className="pd-admin-actions"><button disabled={busy} onClick={runWork}>ยืนยันดำเนินการ</button>
        <button disabled={busy} onClick={() => setWorkConfirmation(undefined)}>ยกเลิก</button></div>
    </div>}
    {articles.map((article) => <article className="pd-article-card" key={article.id}>
      <p className="pd-article-date">{thaiDate(article.article_date)} • {statusLabels[article.status]}</p>
      <h2>{article.content?.title || "ร่างบทความประจำวัน"}</h2>
      {article.content && <><p>{article.content.description}</p><ArticleBody content={article.content} sources={article.sources} /></>}
      {article.status === "published" && <Link href={`/articles/${article.slug}`} target="_blank">ดูบนเว็บไซต์ ↗</Link>}
      <div className="pd-admin-actions">{available(article).map((action) => <button key={action} disabled={busy}
        className={action === "delete" || action === "reject" ? "danger" : ""}
        onClick={() => setConfirmation({ article, action, requestId: crypto.randomUUID() })}>{labels[action]}</button>)}</div>
      {confirmation?.article.id === article.id && <div className="pd-admin-confirm">
        <p>ยืนยัน “{labels[confirmation.action]}” สำหรับบทความนี้หรือไม่?</p>
        <p className="pd-admin-note">{confirmation.action === "delete" ? "บทความจะถูกซ่อนและปิดการเผยแพร่ เก็บประวัติไว้เพื่อตรวจสอบ" : confirmation.action === "approve" || confirmation.action === "republish" ? "เมื่อยืนยัน บทความจะเปิดให้ทุกคนอ่านบนเว็บไซต์" : "บทความจะไม่แสดงบนเว็บไซต์"}</p>
        <div className="pd-admin-actions"><button disabled={busy} onClick={confirm}>ยืนยัน{labels[confirmation.action]}</button>
          <button disabled={busy} onClick={() => setConfirmation(undefined)}>ยกเลิก</button></div>
      </div>}
    </article>)}
    {ready && !single && <div className="pd-admin-actions">
      {page > 1 && <button disabled={busy} onClick={() => refresh(undefined, page - 1)}>หน้าก่อนหน้า</button>}
      {articles.length === 30 && <button disabled={busy} onClick={() => refresh(undefined, page + 1)}>หน้าถัดไป</button>}
    </div>}
  </main>;
}
