# Cloudflare Workers migration

เว็บไซต์ Next.js ใช้ OpenNext บน Cloudflare Workers โดย production branch คือ `codex/cloudflare-workers` ใน `puttipong9777-bit/pdcar-website` สร้างจาก source production ที่กู้ไว้บน `codex/vercel-production-source` ไม่ใช้ static export หรือ adapter Next-on-Pages

## Build และ deployment

- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Node.js: 24
- Preview: https://pdcar-website.puttipong9777.workers.dev/
- โดเมนจริง: https://www.pdcarcenter.com/
- ลง dependencies ด้วย `npm ci`; ตรวจด้วย `npm test`, `npm run lint`, `npm run typecheck`
- Local Workers preview: build ก่อน แล้ว `npm run preview:cloudflare`

Cloudflare Build variables และ runtime Secrets ใช้สี่ชื่อ: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key เท่านั้น), `NEXT_PUBLIC_ERP_URL`, `NEXT_PUBLIC_SHOP_PHONE` ไม่เก็บค่าคีย์ใน Git

Runtime flags อยู่ใน `wrangler.jsonc`. Host workers.dev มี noindex/robots disallow เสมอ และไม่มี Meta Pixel. `SITE_ENV=preview` ปิด indexing/tracking ของโดเมนจริงด้วย; เปลี่ยนเป็น production เมื่อพร้อม cutover เท่านั้น

## รูปรถ

Media origin ใช้ https://pdcar-erp-history.onrender.com/api/public/vehicle-images/{fileId} แทน ERP Vercel ที่ตอบ HTTP 402. API เดิมตรวจ publication/status/category ก่อนส่งภาพจาก Google Drive. เว็บไซต์ไม่เก็บ service-role key หรือ Google credentials และไม่อ่านตาราง ERP ภายใน

Next Image ใช้ unoptimized/native delivery จึงไม่มี Vercel image optimizer หรือ Cloudflare Images binding ที่ต้องเสียเงิน. รูป 191 ภาพของรถที่เผยแพร่ 12 คันผ่าน HTTP 200 image/jpeg พร้อม body จริง เมื่อ 14 ตุลาคม 2026; หลักฐาน `artifacts/media-acceptance.json`

แกลเลอรี desktop ใช้ `::details-content` ให้รูปเพิ่มเติมมองเห็นใน Chromium ส่วนมือถือยังเริ่มปิดและเปิดได้ด้วย summary. รูปแบบนี้ตรวจจริงทั้ง desktop และ 390×844

## งานบทความ

Approval/daily cron/postback ยังคงปิดตามสถานะเดิม ไม่มีการเรียก OpenAI หรือส่ง LINE จริงในงานย้ายเว็บนี้. `cloudflare/scheduled.mjs` เรียก GET route เดิมพร้อม Bearer secret และ daily lock; มี tests สำหรับ preview/disabled flags, authorization และ failure. รายการ cron เริ่มว่าง ไม่ได้สืบทอด Vercel Cron. หากเปิดภายหลังต้องตรวจ dedicated PostgreSQL/TLS และ request-scoped connections บน Workers ก่อน แล้วใช้ cron `0 12 * * *` (19:00 ไทย)

## DNS และ rollback

Porkbun ยังคงเป็น registrar. Cloudflare nameservers ที่ได้รับคือ `corey.ns.cloudflare.com` และ `jewel.ns.cloudflare.com`. สำรอง DNS เดิมทั้ง 8 records และ nameservers ใน `artifacts/dns-before-cloudflare.json`. ต้องรักษา MX สองรายการและ SPF สำหรับ email forwarding

เปลี่ยน nameservers ที่ Porkbun และผูก Workers custom domains ทั้ง `www.pdcarcenter.com` และ `pdcarcenter.com` แล้วเมื่อ 14 ตุลาคม 2026. `wrangler.jsonc` บันทึก custom domains เพื่อให้ Git deployment ครั้งต่อไปใช้การตั้งค่าเดียวกัน. Free Universal SSL แสดง Active; HTTPS ผ่านการตรวจใบรับรองตามปกติ. MX/SPF เดิมยังอยู่. โดเมนหลักส่งต่อไป `www` ด้วย 301 พร้อมรักษา path/query

DNS สาธารณะ 1.1.1.1 และ 8.8.8.8 ชี้ Cloudflare แล้ว แต่ resolver ของบางเครือข่ายยัง cache Vercel เก่าที่ตอบ 402. ระหว่าง propagation หากเห็น Deployment Paused ให้รอ cache หมดอายุ; ห้ามปิดการตรวจ certificate เพื่อหลบอาการนี้

หากต้อง rollback ให้ใช้ Cloudflare deployment version ที่ผ่านการตรวจ หรือคืน nameservers/DNS จากไฟล์สำรอง. ERP Vercel ยังถูกพักและส่งรูปไม่ได้ จึงไม่ควรย้อน media origin กลับ Vercelโดยไม่ตรวจ HTTP ก่อน. ไม่ rollback ด้วยการลบฐานข้อมูลหรือรูปต้นฉบับ

## Verification limits

49 unit/in-memory tests ผ่าน, lint/typecheck/Next build/OpenNext build และ Wrangler dry-run ผ่าน. HTTPS Workers ตรวจ health, stock/detail, sell-car, articles, catalog CSV, sitemaps และ unknown-page 404. Browser ตรวจภาพจริง, search, carousel, mobile menu, gallery และ overflow. Cloudflare aggregate metrics แสดง No data ระหว่างตรวจ จึงยังไม่มีค่ารับรอง CPU percentile; HTTP response สำเร็จไม่ใช่การวัด CPU. Dependency audit เหลือ 6 high advisories ใน eslint/glob-pattern tooling; ไม่มีการ force downgrade framework

ผลตรวจโดเมนจริงอยู่ใน `artifacts/production-http-acceptance.json`: หน้าแรก/API/feed/sell-car/articles/sitemaps/robots และหน้ารถที่เผยแพร่ล่าสุด 11 คันผ่าน HTTP 200; หน้าที่ไม่มีอยู่ตอบ 404. จำนวนรถเปลี่ยนจาก 12 เป็น 11 ระหว่างตรวจและตรงกับ public view ปัจจุบัน (180 ภาพ). ภาพชุดเดิมทั้งหมด 191 ภาพผ่านก่อน cutover. Browser บนโดเมนจริงยืนยันภาพโหลดได้ ค้นหา PD0025 พบ 1 คัน แกลเลอรีมือถือเปิดได้ และไม่มี horizontal overflow

CI ของ release `6dab2c1` ผ่านบน Linux: https://github.com/puttipong9777-bit/pdcar-website/actions/runs/38523048542

อ้างอิง: [OpenNext setup](https://opennext.js.org/cloudflare/get-started), [Cloudflare custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [Chromium details styling](https://developer.chrome.com/blog/styling-details/)
