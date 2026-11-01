"use client";

import { BarChart3, BookOpenText, CarFront, ImageIcon, Images, LayoutDashboard, LineChart, LoaderCircle, LogIn, MessageCircle, Pencil, PhoneCall, Plus, RefreshCw, Save, Upload, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Article, ArticleContent, Decision } from "@/lib/article-approval/types";
import { dashboardWindowValues, type DashboardMetrics, type DashboardWindowDays } from "@/lib/site-analytics/types";

type Vehicle = { carId: string; title: string; photos: { fileId: string; url: string }[] };
type Tab = "overview" | "articles" | "media";
type ArticleForm = { id?: string; version: number; articleDate: string; slug: string; title: string; description: string; sections: { heading: string; body: string }[] };
const number = new Intl.NumberFormat("th-TH");
const dashboardDate = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });

function formatDashboardDate(value?: string) {
  return value ? dashboardDate.format(new Date(`${value}T00:00:00+07:00`)) : "—";
}

function bangkokDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function blankArticle(): ArticleForm {
  const date = bangkokDate();
  return { version: 0, articleDate: date, slug: `news-${date}-${crypto.randomUUID().slice(0, 6)}`, title: "", description: "", sections: [{ heading: "รายละเอียด", body: "" }] };
}
function formFromArticle(article: Article): ArticleForm {
  return {
    id: article.id,
    version: article.version,
    articleDate: article.article_date,
    slug: article.slug,
    title: article.content?.title || "",
    description: article.content?.description || "",
    sections: article.content?.sections.map((section) => ({ heading: section.heading, body: section.paragraphs.join("\n\n") })) || [{ heading: "รายละเอียด", body: "" }]
  };
}
function contentFromForm(form: ArticleForm): ArticleContent {
  return {
    title: form.title,
    description: form.description,
    sections: form.sections.map((section) => ({
      heading: section.heading,
      paragraphs: section.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
      factIds: []
    }))
  };
}
function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  if (message === "forbidden") return "บัญชี LINE นี้ไม่มีสิทธิ์จัดการเว็บไซต์";
  if (message === "conflict") return "ข้อมูลมีการเปลี่ยนแปลง กรุณาโหลดใหม่แล้วลองอีกครั้ง";
  if (message === "media_storage_unavailable") return "Cloudflare R2 ยังไม่พร้อมใช้งาน";
  if (message === "invalid_content") return "กรุณากรอกหัวข้อ คำอธิบาย และเนื้อหาให้ครบ";
  return "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

async function resizeToWebp(file: File, maxSize: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("image_processing_failed");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("image_processing_failed");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

export function AdminDashboard({ vehicles }: { vehicles: Vehicle[] }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("กำลังตรวจสอบสิทธิ์…");
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [windowDays, setWindowDays] = useState<DashboardWindowDays>(14);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState<ArticleForm | null>(null);
  const [selectedCar, setSelectedCar] = useState(vehicles[0]?.carId || "");
  const [uploadTarget, setUploadTarget] = useState<string>();
  const initialized = useRef(false);

  const api = useCallback(async (url: string, body: object) => {
    const response = await fetch(url, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { setAuthenticated(false); setReady(false); }
    if (!response.ok) throw new Error(String(result.error || (response.status === 409 ? "conflict" : "request_failed")));
    return result;
  }, []);

  const load = useCallback(async (selectedWindow: DashboardWindowDays = windowDays) => {
    const [overview, articleResult] = await Promise.all([
      api("/api/admin/dashboard", { operation: "overview", windowDays: selectedWindow }),
      api("/api/article-approval/admin", { operation: "list", page: 1 })
    ]);
    setMetrics(overview.metrics);
    setAnalyticsOn(Boolean(overview.analyticsEnabled));
    setArticles(articleResult.articles);
  }, [api, windowDays]);

  const initialize = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const response = await fetch("/api/admin/session", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "status" }) });
      const session = await response.json().catch(() => ({}));
      if (!response.ok || !session.authenticated) { setMessage("กรอกรหัสผ่านผู้ดูแลเพื่อเข้าสู่ระบบ"); return; }
      setAuthenticated(true);
      await load();
      setReady(true);
      setMessage("ข้อมูลล่าสุดของเว็บไซต์");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [load]);

  useEffect(() => { void initialize(); }, [initialize]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "login", password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.authenticated) throw new Error(String(result.error || "invalid_credentials"));
      setAuthenticated(true); setPassword("");
      await load(); setReady(true); setMessage("เข้าสู่ระบบแล้ว");
    } catch (error) { setMessage(error instanceof Error && error.message === "invalid_credentials" ? "รหัสผ่านไม่ถูกต้อง" : errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "logout" }) }); }
    finally { setAuthenticated(false); setReady(false); setMetrics(null); setArticles([]); setMessage("ออกจากระบบแล้ว"); setBusy(false); }
  }

  async function refresh() {
    setBusy(true);
    try { await load(); setMessage("อัปเดตข้อมูลแล้ว"); } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function changeWindow(selectedWindow: DashboardWindowDays) {
    setWindowDays(selectedWindow); setBusy(true);
    try { await load(selectedWindow); setMessage(`อัปเดตข้อมูล ${selectedWindow} วันแล้ว`); } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function saveArticle() {
    if (!form) return;
    setBusy(true);
    try {
      await api("/api/article-approval/admin", {
        operation: "save",
        articleId: form.id,
        articleDate: form.articleDate,
        slug: form.slug,
        version: form.version,
        content: contentFromForm(form),
        requestId: crypto.randomUUID()
      });
      await load();
      setForm(null);
      setMessage("บันทึกบทความแล้ว และรอการอนุมัติก่อนเผยแพร่");
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function decide(article: Article, action: Decision) {
    setBusy(true);
    try {
      await api("/api/article-approval/admin", { operation: "decide", articleId: article.id, version: article.version, action, requestId: crypto.randomUUID() });
      await load();
      setMessage(action === "approve" || action === "republish" ? "เผยแพร่บทความแล้ว" : "อัปเดตสถานะบทความแล้ว");
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function uploadImage(target: string, file?: File) {
    if (!file) return;
    setBusy(true); setUploadTarget(target);
    try {
      const optimized = await resizeToWebp(file, target === "site:logo" ? 800 : 1600);
      const body = new FormData(); body.set("target", target); body.set("image", optimized);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(result.error || "upload_failed"));
      setMessage(`เปลี่ยนรูปแล้ว • ไฟล์ใหม่ ${number.format(Math.round(optimized.size / 1024))} KB`);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); setUploadTarget(undefined); }
  }

  const selectedVehicle = useMemo(() => vehicles.find((vehicle) => vehicle.carId === selectedCar), [selectedCar, vehicles]);
  const maxDaily = Math.max(1, ...(metrics?.daily.map((day) => day.visitors) || [1]));
  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
    { id: "articles", label: "บทความ", icon: BookOpenText },
    { id: "media", label: "รูปภาพ", icon: Images }
  ];

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span className="admin-eyebrow">PD CAR CENTER</span><h1>ศูนย์จัดการเว็บไซต์</h1><p>ดูความสนใจของลูกค้า จัดการบทความ และเปลี่ยนรูปจากที่เดียว</p></div>
      <div className="admin-head-actions"><button className="admin-refresh" type="button" disabled={busy || !ready} onClick={refresh}>{busy ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}อัปเดต</button>{authenticated ? <button className="admin-logout" type="button" disabled={busy} onClick={logout}>ออกจากระบบ</button> : null}</div>
    </header>
    <p className="admin-status" role="status" aria-live="polite">{message}</p>
    {!ready ? <form className="admin-login" onSubmit={login}><LogIn size={28} /><h2>{busy ? "กำลังตรวจสิทธิ์ผู้ดูแล" : "เข้าสู่ระบบผู้ดูแล"}</h2><p>ข้อมูลสถิติและเครื่องมือแก้ไขเว็บไซต์เปิดให้ผู้ดูแลเท่านั้น</p><label className="admin-field"><span>รหัสผ่านผู้ดูแล</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} required minLength={20} /></label><button className="admin-primary" type="submit" disabled={busy || password.length < 20}>{busy ? <LoaderCircle className="spin" size={18} /> : <LogIn size={18} />}เข้าสู่ระบบ</button></form> : <>
      <nav className="admin-tabs" aria-label="เมนูแอดมิน">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><Icon size={19} />{label}</button>)}</nav>

      {tab === "overview" && <section className="admin-panel">
        <div className="admin-section-title"><div><span>สถิติวันนี้ · เวลาไทย</span><h2>ลูกค้าสนใจอะไรบนเว็บไซต์</h2></div><label className="dashboard-window"><span>ช่วงรายงาน</span><select value={windowDays} disabled={busy || !analyticsOn} onChange={(event) => void changeWindow(Number(event.target.value) as DashboardWindowDays)}>{dashboardWindowValues.map((days) => <option key={days} value={days}>{days} วัน</option>)}</select></label></div>
        <p className="dashboard-range">{analyticsOn && metrics ? `${formatDashboardDate(metrics.windowStart)} – ${formatDashboardDate(metrics.windowEnd)} · Asia/Bangkok · อัปเดต ${new Date(metrics.generatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}` : "รอเปิดระบบเก็บสถิติ"}</p>
        <div className="metric-grid">
          <Metric icon={Users} label="ผู้เข้าชม" value={metrics?.today.visitors} previous={metrics?.yesterday.visitors} />
          <Metric icon={BarChart3} label="หน้าที่เปิด" value={metrics?.today.pageViews} previous={metrics?.yesterday.pageViews} />
          <Metric icon={CarFront} label="เปิดดูรถ" value={metrics?.today.vehicleViews} previous={metrics?.yesterday.vehicleViews} />
          <Metric icon={PhoneCall} label="กดโทร" value={metrics?.today.phoneClicks} previous={metrics?.yesterday.phoneClicks} />
          <Metric icon={MessageCircle} label="กด LINE" value={metrics?.today.lineClicks} previous={metrics?.yesterday.lineClicks} />
        </div>
        <div className="admin-two-columns">
          <article className="admin-card"><div className="card-heading"><div><small>{windowDays} วันล่าสุด</small><h3>แนวโน้มผู้เข้าชม</h3></div><LineChart size={22} /></div>
            <div className="trend-chart">{metrics?.daily.map((day) => <div className="trend-day" key={day.day} title={`${day.day}: ${day.visitors} คน`}><span style={{ height: `${Math.max(4, day.visitors / maxDaily * 100)}%` }} /><small>{day.day.slice(8)}</small></div>)}</div>
          </article>
          <article className="admin-card"><div className="card-heading"><div><small>7 วันล่าสุด</small><h3>สรุปความสนใจ</h3></div><BarChart3 size={22} /></div>
            <dl className="summary-list"><div><dt>ผู้เข้าชม</dt><dd>{number.format(metrics?.last7Days.visitors || 0)}</dd></div><div><dt>เปิดดูรถ</dt><dd>{number.format(metrics?.last7Days.vehicleViews || 0)}</dd></div><div><dt>กดโทร</dt><dd>{number.format(metrics?.last7Days.phoneClicks || 0)}</dd></div><div><dt>กด LINE</dt><dd>{number.format(metrics?.last7Days.lineClicks || 0)}</dd></div></dl>
          </article>
        </div>
        <div className="admin-two-columns">
          <article className="admin-card"><h3>รถที่ลูกค้าสนใจใน {windowDays} วัน</h3><div className="admin-table"><div className="table-row vehicle-table table-head"><span>รถ</span><span>ดู</span><span>ปัดรูป</span><span>โทร</span><span>LINE</span></div>{metrics?.topVehicles.length ? metrics.topVehicles.map((row) => <div className="table-row vehicle-table" key={row.carId}><span><b>{row.carId}</b><small>{vehicles.find((vehicle) => vehicle.carId === row.carId)?.title}</small></span><span>{number.format(row.views)}</span><span>{number.format(row.gallerySwipes)}</span><span>{number.format(row.phoneClicks)}</span><span>{number.format(row.lineClicks)}</span></div>) : <p className="admin-empty">ยังไม่มีข้อมูล</p>}</div></article>
          <article className="admin-card"><h3>หน้าที่เปิดมากที่สุดใน {windowDays} วัน</h3><div className="page-list">{metrics?.topPages.length ? metrics.topPages.map((row) => <div key={row.path}><Link href={row.path} target="_blank">{row.path}</Link><b>{number.format(row.views)}</b></div>) : <p className="admin-empty">ยังไม่มีข้อมูล</p>}</div></article>
        </div>
        <article className="admin-card attribution-card"><div className="card-heading"><div><small>{windowDays} วันล่าสุด · เก็บเฉพาะ UTM ที่อนุญาต</small><h3>แหล่งที่มาของผู้เข้าชม</h3></div><BarChart3 size={22} /></div><p className="dashboard-privacy-note">ไม่เก็บ URL เต็ม, referrer, IP, อีเมล หรือข้อความของลูกค้า · กลุ่มไม่ติดแท็กไม่ใช่หลักฐานว่าเข้าตรง</p><div className="admin-table"><div className="source-row source-head"><span>แหล่งที่มา</span><span>แคมเปญ</span><span>คน</span><span>ดูรถ</span><span>โทร</span><span>LINE</span></div>{metrics?.sources.length ? metrics.sources.map((row) => <div className="source-row" key={`${row.source}:${row.medium}:${row.campaign}`}><span><b>{row.source === "untagged" ? "ไม่ติดแท็ก / ไม่ทราบแหล่งที่มา" : row.source}</b><small>{row.medium === "none" ? "—" : row.medium}</small></span><span>{row.campaign === "none" ? "—" : row.campaign.toUpperCase()}</span><span>{number.format(row.visitors)}</span><span>{number.format(row.vehicleViews)}</span><span>{number.format(row.phoneClicks)}</span><span>{number.format(row.lineClicks)}</span></div>) : <p className="admin-empty">ยังไม่มีข้อมูล</p>}</div></article>
      </section>}

      {tab === "articles" && <section className="admin-panel">
        <div className="admin-section-title"><div><span>จัดการเนื้อหา</span><h2>บทความบนเว็บไซต์</h2></div><button type="button" className="admin-primary" onClick={() => setForm(blankArticle())}><Plus size={18} />เพิ่มบทความ</button></div>
        {form ? <ArticleEditor form={form} busy={busy} setForm={setForm} onSave={saveArticle} onCancel={() => setForm(null)} /> : null}
        <div className="article-admin-list">{articles.map((article) => <article className="article-admin-item" key={article.id}>
          <div><small>{article.article_date} • {article.status}</small><h3>{article.content?.title || "ร่างบทความ"}</h3><p>{article.content?.description}</p></div>
          <div className="article-admin-buttons"><button type="button" disabled={busy} onClick={() => setForm(formFromArticle(article))}><Pencil size={16} />แก้ไข</button>{article.status === "pending" ? <button type="button" disabled={busy} onClick={() => decide(article, "approve")}>อนุมัติเผยแพร่</button> : null}{article.status === "published" ? <><Link href={`/articles/${article.slug}`} target="_blank">ดูบทความ</Link><button type="button" disabled={busy} onClick={() => decide(article, "unpublish")}>ซ่อนบทความ</button></> : null}{article.status === "unpublished" ? <button type="button" disabled={busy} onClick={() => decide(article, "republish")}>เผยแพร่อีกครั้ง</button> : null}</div>
        </article>)}</div>
      </section>}

      {tab === "media" && <section className="admin-panel">
        <div className="admin-section-title"><div><span>คลังรูปภาพ</span><h2>รูปภาพบนเว็บไซต์</h2></div><small>โลโก้และหน้าร้านอัปโหลดที่นี่ · รูปรถจัดการใน ERP</small></div>
        <div className="media-site-grid"><MediaUpload title="โลโก้ร้าน" image="/media/site/logo" target="site:logo" busy={busy} loading={uploadTarget} onUpload={uploadImage} /><MediaUpload title="ภาพหน้าร้าน" image="/media/site/storefront" target="site:storefront" busy={busy} loading={uploadTarget} onUpload={uploadImage} /></div>
        <article className="admin-card vehicle-media"><div className="card-heading"><div><small>รูปรถจาก ERP</small><h3>ตรวจรูปที่เผยแพร่บนเว็บไซต์</h3></div><ImageIcon size={22} /></div>
          <p className="media-managed-note"><strong>จัดการรูปรถในระบบ ERP</strong> หน้านี้แสดงตัวอย่างแบบอ่านอย่างเดียว เพื่อให้สถานะรถและรูปอ้างอิงแหล่งข้อมูลเดียวกัน</p>
          <label className="admin-field"><span>เลือกรถเพื่อตรวจรูป</span><select value={selectedCar} onChange={(event) => setSelectedCar(event.target.value)}>{vehicles.map((vehicle) => <option value={vehicle.carId} key={vehicle.carId}>{vehicle.carId} — {vehicle.title}</option>)}</select></label>
          <div className="vehicle-photo-grid">{selectedVehicle?.photos.map((photo, index) => <VehicleMediaPreview key={photo.fileId} title={`ภาพที่ ${index + 1}`} image={`${photo.url}?admin=1`} />)}</div>
          {!selectedVehicle?.photos.length ? <p className="admin-empty">รถคันนี้ยังไม่มีช่องรูปจากระบบ ERP</p> : null}
        </article>
      </section>}
    </>}
  </main>;
}

function Metric({ icon: Icon, label, value = 0, previous = 0 }: { icon: typeof Users; label: string; value?: number; previous?: number }) {
  const difference = value - previous;
  return <article className="metric-card"><span><Icon size={20} /></span><small>{label}</small><strong>{number.format(value)}</strong><p>{difference === 0 ? "เท่ากับเมื่อวาน" : `${difference > 0 ? "+" : ""}${number.format(difference)} จากเมื่อวาน`}</p></article>;
}

function ArticleEditor({ form, setForm, busy, onSave, onCancel }: { form: ArticleForm; setForm(value: ArticleForm): void; busy: boolean; onSave(): void; onCancel(): void }) {
  const updateSection = (index: number, key: "heading" | "body", value: string) => setForm({ ...form, sections: form.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, [key]: value } : section) });
  return <article className="article-editor"><div className="card-heading"><div><small>{form.id ? "แก้ไขบทความ" : "บทความใหม่"}</small><h3>เนื้อหาที่ลูกค้าจะอ่าน</h3></div><BookOpenText size={22} /></div>
    <div className="form-grid"><label className="admin-field"><span>วันที่</span><input type="date" value={form.articleDate} onChange={(event) => setForm({ ...form, articleDate: event.target.value })} /></label><label className="admin-field"><span>ที่อยู่บทความ (อังกฤษ)</span><input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })} /></label></div>
    <label className="admin-field"><span>หัวข้อบทความ</span><input value={form.title} maxLength={140} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="หัวข้อที่ลูกค้าเข้าใจได้ทันที" /></label>
    <label className="admin-field"><span>คำอธิบายสั้น</span><textarea value={form.description} maxLength={250} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
    {form.sections.map((section, index) => <div className="article-section-editor" key={index}><label className="admin-field"><span>หัวข้อส่วนที่ {index + 1}</span><input value={section.heading} onChange={(event) => updateSection(index, "heading", event.target.value)} /></label><label className="admin-field"><span>เนื้อหา (เว้นหนึ่งบรรทัดเพื่อขึ้นย่อหน้าใหม่)</span><textarea value={section.body} onChange={(event) => updateSection(index, "body", event.target.value)} rows={7} /></label>{form.sections.length > 1 ? <button type="button" className="admin-text-danger" onClick={() => setForm({ ...form, sections: form.sections.filter((_, itemIndex) => itemIndex !== index) })}>ลบส่วนนี้</button> : null}</div>)}
    <div className="editor-actions"><button type="button" onClick={() => setForm({ ...form, sections: [...form.sections, { heading: "", body: "" }] })}><Plus size={17} />เพิ่มหัวข้อย่อย</button><span /><button type="button" onClick={onCancel}>ยกเลิก</button><button type="button" className="admin-primary" disabled={busy} onClick={onSave}><Save size={17} />บันทึกรอตรวจ</button></div>
  </article>;
}

function MediaUpload({ title, image, target, busy, loading, onUpload, compact = false }: { title: string; image: string; target: string; busy: boolean; loading?: string; onUpload(target: string, file?: File): void; compact?: boolean }) {
  return <article className={`media-upload ${compact ? "compact" : ""}`}><div className="media-preview"><Image src={image} alt={title} fill sizes={compact ? "220px" : "420px"} /></div><div className="media-upload-info"><h3>{title}</h3><label className="upload-button">{loading === target ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}เลือกรูปใหม่<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void onUpload(target, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></article>;
}

function VehicleMediaPreview({ title, image }: { title: string; image: string }) {
  return <article className="media-upload compact"><div className="media-preview"><Image src={image} alt={title} fill sizes="220px" /></div><div className="media-upload-info"><h3>{title}</h3><span className="media-managed-label">จัดการใน ERP</span></div></article>;
}
