# ระบบอนุมัติบทความ AI ผ่าน LINE OA

## ขอบเขตที่ทำและข้อจำกัดการเชื่อม LINE

ตรวจ ณ 8 กันยายน 2026: `pdcar-website` เป็น Next.js 15 ใช้ Supabase ร่วมกับ ERP แต่เว็บไซต์อ่านเฉพาะ public vehicle view เดิม ไม่พบตัวรับ LINE Messaging API ในเว็บไซต์หรือในโค้ด ERP สอง checkout ที่ตรวจ หลังผู้ดูแลล็อกอิน LINE Console ยืนยัน Webhook ที่ใช้อยู่คือ `https://pdcar-growth-ops.vercel.app/api/webhooks/line` ของ OA `@rug0978j` ภายใต้ Provider PD Car Center ไม่ได้แก้ URL, token, auto-reply, greeting messages หรือไฟล์ใดในระบบ Webhook/ERP และยังไม่ได้ตรวจซอร์สของบริการ growth-ops

LINE ส่ง postback ไปที่ Webhook URL ที่ตั้งสำหรับ Messaging API channel การเพิ่ม route ใหม่ไม่ได้ทำให้ LINE ส่ง event มายัง route นั้นเอง เงื่อนไขห้ามเปลี่ยน URL และห้ามแก้ Webhook เดิมจึงใช้ **ปุ่ม URI เปิด LIFF** เป็นค่าเริ่มต้น:

1. Cron จองวันที่ไทย → สร้างร่างและตรวจข้อเท็จจริง → บันทึกร่างพร้อมคิวส่ง
2. OA push เนื้อหาทั้งเรื่อง แหล่งข้อมูล และปุ่ม “อนุมัติโพสต์” / “ไม่อนุมัติ” ให้ LINE user ID ของผู้ดูแลโดยตรง
3. ปุ่มเปิด `/article-admin` ภายใน LINE ผู้ดูแลอ่านและยืนยัน → server ส่ง ID token ไปให้ LINE ตรวจลายเซ็น ความถูกต้อง channel และวันหมดอายุ แล้วตรวจ allowlist
4. บันทึกผลและประวัติใน transaction เดียว บทความที่อนุมัติขึ้น `/articles/{slug}` และ sitemap ใน request ถัดไป

การเปิดลิงก์/GET ไม่เปลี่ยนสถานะ ไม่ใช้ `liff.sendMessages()` ไม่ตอบแชท ไม่สมัคร Webhook ใหม่ให้ OA ไม่แก้ reply/auto-response/rich menu ของร้าน

`/api/article-approval/line-callback` เป็น route แยกสำหรับ native postback **ปิดไว้โดยค่าเริ่มต้น** ตรวจ `X-Line-Signature` ด้วย HMAC-SHA256 บน raw body ก่อน parse JSON ตรวจ destination, user allowlist และ `pdarticle:` namespace ยอมรับเฉพาะ approve/reject ไม่อ่านข้อความ ไม่ตอบ reply token

ห้ามตั้ง Webhook URL เดิมมาที่ route นี้ เปิด `ARTICLE_LINE_POSTBACK_ENABLED=true` ได้เฉพาะหลังตรวจพบ relay เดิมที่ส่ง raw body เดิมกับลายเซ็นเดิมได้ และผู้ใช้อนุมัติการตั้งค่านั้นแล้ว ถ้า relay ไม่มี ใช้ LIFF ต่อไป; ไม่ควรสร้างตัวส่งต่อที่ต้องแก้ Webhook เดิมภายใต้ขอบเขตนี้

## ไฟล์และผลกระทบ

| ขอบเขต | ไฟล์ |
|---|---|
| ฐานข้อมูลบทความเท่านั้น | `supabase/migrations/0002_article_approval.sql` |
| สร้างร่าง/ตรวจเนื้อหา/LINE/สิทธิ์/ข้อมูลสาธารณะ | `lib/article-approval/*` |
| Cron ใหม่ | `app/api/cron/article-drafts/route.ts`, `vercel.json` |
| API ผู้ดูแล/ตรวจสถานะ/ส่งค้าง/รับ postback | `app/api/article-approval/*` |
| หน้า LIFF ผู้ดูแล | `app/article-admin/*` |
| หน้ารวมและหน้า SEO แยก | `app/articles/*`, `components/article-content.tsx` |
| จุดแตะเว็บไซต์เดิม | `components/site-header.tsx` เปลี่ยนลิงก์บทความ, `app/page.tsx` เพิ่มลิงก์อ่านทั้งหมด, `app/sitemap.ts` เพิ่ม `/articles` โดยคง cache เดิม, `app/robots.ts` ชี้ sitemap บทความแยก `/articles/sitemap.xml` |
| ตั้งค่าและทดสอบ | `.env.example`, `package.json`, `package-lock.json`, `tests/article-*.test.mjs`, `tests/helpers/load-ts.mjs` |

รักษาการแก้ไขหน้าโชว์รูมที่มีมาก่อนงานนี้ไว้ (`app/globals.css`, การปรับ `app/page.tsx`, ไฟล์ catalog/showroom และ tests เดิม) ไม่ลบคำแนะนำบทความแบบเดิมหน้าแรก ไม่มีการแก้ public vehicle contract, ตารางรถ/ลูกค้า, Webhook หรือแชทลูกค้า

Dependency เพิ่ม: `postgres` สำหรับบัญชีฐานข้อมูลบทความเฉพาะ, `server-only` กัน server module หลุดไป client; `@electric-sql/pglite` เป็น dev dependency สำหรับทดสอบ PostgreSQL ใน memory

## Environment variables

เพิ่มเป็น server-only ทั้งหมด ไม่มีคีย์ลับใช้ prefix `NEXT_PUBLIC_` ค่าใน `.env.example` เป็นช่องว่าง/ค่าตัวอย่างเท่านั้น

| ชื่อ | การใช้งาน |
|---|---|
| `ARTICLE_APPROVAL_ENABLED` | เริ่มด้วย `false`; เปลี่ยน `true` หลังพร้อมเปิดใช้งาน ปิดงานใหม่และการตัดสินใจ แต่บทความที่เผยแพร่แล้วคงอยู่ |
| `ARTICLE_DAILY_CRON_ENABLED` | เริ่ม `false` เพื่อทดสอบด้วยผู้ดูแลโดยยังไม่เปิดงานรายวัน; `true` เปิด GET ตาม cron เมื่อพร้อมและยืนยันแผน Vercel แล้ว ไม่ปิดการสร้างด้วยมือ/อ่านบทความ |
| `ARTICLE_SITE_URL` | Origin ที่เปิด LIFF เช่น `https://www.pdcarcenter.com` ไม่มี path; staging ใช้ origin staging ให้ตรง ไม่ใช้ wildcard |
| `ARTICLE_DATABASE_URL` | PostgreSQL connection URL ผ่าน Supabase pooler ด้วย dedicated LOGIN เฉพาะบทความ ใช้ TLS ตรวจ certificate เต็มรูปแบบ ไม่ใช้บัญชี postgres/ERP/service_role |
| `ARTICLE_DATABASE_CA_BASE64` | Base64 ของไฟล์ PEM CA จาก Supabase Dashboard > Database Settings > SSL Configuration จำเป็นเมื่อ pooler ใช้ Supabase Root CA; เป็น public certificate ไม่ใช่ private key และยังตรวจ CA/hostname เต็มรูปแบบ ห้ามแก้เป็น `rejectUnauthorized:false` |
| `CRON_SECRET` | สุ่มอย่างน้อย 32 ตัวอักษร ใช้ Bearer สำหรับ Cron/operations ถ้ามีค่าเดิมใน Vercel ให้ตรวจและใช้ร่วมโดยไม่หมุนค่าเอง |
| `OPENAI_API_KEY` | API key สำหรับสร้าง/ตรวจร่าง แนะนำ project แยกกำหนดงบได้ |
| `ARTICLE_OPENAI_MODEL` | ชื่อโมเดลที่บัญชีใช้งานได้ รองรับ Responses API และ strict structured outputs ไม่มี fallback เลือกโมเดลเงียบ ๆ |
| `ARTICLE_LINE_CHANNEL_ACCESS_TOKEN` | Messaging API token ของ OA ร้านที่มีอยู่ ไม่ออกใหม่/เพิกถอน token เดิมโดยไม่ตรวจผลต่อแชท |
| `ARTICLE_LINE_ADMIN_IDS` | LINE user ID แบบ `U…` คั่นด้วย comma สูงสุด 10 คน ไม่ใช้ display name, OA ID, group ID; push เฉพาะรายชื่อเหล่านี้ |
| `ARTICLE_LIFF_ID` | LIFF ID ของแอปตรวจบทความ (ค่านี้ไม่ใช่ secret และส่งให้ browser สำหรับ init ได้) |
| `ARTICLE_LINE_LOGIN_CHANNEL_ID` | Channel ID ของ LINE Login ที่ LIFF อยู่ ใช้ตรวจ audience บน server |
| `ARTICLE_LINE_POSTBACK_ENABLED` | คง `false` สำหรับ LIFF; ไม่ต้องมี LINE Channel secret ในโหมดนี้ |
| `ARTICLE_LINE_CHANNEL_SECRET` | เฉพาะโหมด relay/postback ที่ได้รับอนุมัติ ใช้ตรวจ HMAC callback |
| `ARTICLE_LINE_BOT_USER_ID` | เฉพาะโหมด relay/postback เป็น destination user ID ของ bot ไม่ใช่ channel ID |

ตัวแปรสาธารณะเดิม `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, ERP URL, phone, LINE URL ใช้ค่าเดิม เว็บไซต์อ่านเฉพาะ `public_approved_articles` สำหรับบทความ ไม่มี `SUPABASE_SERVICE_ROLE_KEY` ใน implementation นี้ตาม `.ai/SECURITY.md`

อย่าคัดลอก `.env.local` หรือค่าจริงมาไว้ในเอกสาร/ข้อความ Git; อย่าใส่ ID token หรือ token ใน URL, query string หรือ client logs

## ติดตั้งฐานข้อมูลหลังอนุมัติ

ทดสอบใน Supabase project สำหรับ staging ก่อน ไม่รัน migration อื่นใน repository เหมาไปด้วย ตรวจว่าเลข `0002` และชื่อ schema/view/role ยังไม่ชนในฐานข้อมูลจริง

1. รัน `0002_article_approval.sql` ครั้งเดียวด้วยผู้ดูแลฐานข้อมูลที่สร้าง schema/role ได้ (ไม่ใช่ runtime credential ของเว็บ)
2. Migration สร้าง schema `article_approval`, ตาราง `drafts`, `deliveries`, `decisions`, role `pdcar_article_worker` แบบ NOLOGIN และ public view ที่กรอง `published` เท่านั้น
3. ผู้ดูแลสร้าง LOGIN ใหม่ เช่น `pdcar_article_login` ที่ `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT` ผ่านเครื่องมือจัดการฐานข้อมูล ตั้งรหัสผ่านผ่านช่องทางลับ แล้ว `GRANT pdcar_article_worker TO pdcar_article_login;` ห้าม grant role อื่นหรือสิทธิ์ ERP ให้บัญชีนี้
4. ใส่ connection URL ของ LOGIN นี้ใน `ARTICLE_DATABASE_URL` ใช้ค่าจาก Supabase Connect/pooler ตรวจรูปแบบชื่อผู้ใช้และ project reference ตาม pooler ที่เลือก เปิด TLS ต้องผ่าน certificate validation; code ใช้ `prepare:false` รองรับ transaction pooler
5. บัญชี runtime มี SELECT เฉพาะ schema นี้ และ EXECUTE ฟังก์ชัน workflow ไม่มี INSERT/UPDATE/DELETE ตารางโดยตรง ไม่ใช่ service-role key
6. ตรวจ runtime login จริงด้วย `current_user`, membership และสิทธิ์อ่าน view/เรียก workflow ตรวจด้วยว่าบัญชีนี้อ่านตาราง ERP ไม่ได้ อย่าทดลองอ่านข้อมูลส่วนตัวจริง ให้ใช้การตรวจ grants หรือ fixture

ทุกตาราง private เปิด RLS อนุญาต SELECT เฉพาะ worker; `anon`/`authenticated` ใช้เฉพาะ owner-backed security-barrier view โดยไม่เห็น LINE IDs, สถานะ draft หรือประวัติผู้ดูแล ฟังก์ชัน mutation เป็น SECURITY DEFINER, fixed empty search_path และ revoke EXECUTE จาก PUBLIC/anon/authenticated

## ตั้งค่า LINE โดยรักษา Webhook เดิม

ทำหลังผู้ใช้ยืนยันรายการเปลี่ยนแปลงนี้เท่านั้น:

1. จด Webhook URL เดิมไว้ตรวจเทียบ **ไม่แก้ URL หรือโค้ดเดิม** ตรวจว่า OA token ที่ใช้เป็นของร้านและ push ให้ผู้ดูแลได้
2. สร้าง/เลือก LINE Login channel ภายใต้ **Provider เดียวกับ Messaging API channel** เพื่อให้ user IDs ตรงกัน เพิ่ม LIFF app เฉพาะบทความ ใช้ scope `openid` (และ `profile` ถ้าการตั้งค่า channel ต้องการ) ไม่ขอ email
3. LIFF Endpoint URL เป็น `https://www.pdcarcenter.com/article-admin` หรือ staging URL สำหรับแอป staging; ตั้ง size Full เปิดให้บัญชีผู้ดูแลเข้าถึงตามสถานะ LINE Login channel
4. ใส่ LIFF ID / Login channel ID / admin user IDs ใน environment ผู้ดูแลต้องเป็นเพื่อน OA และไม่ block OA เพื่อรับ push
5. เริ่มทดสอบโดยผู้ดูแลหนึ่งคน ทดสอบ token audience, admin allowlist และการเปิด LIFF บนโทรศัพท์จริง

สถานะติดตั้งล่าสุดและรายการที่ยังรอผู้ดูแลอยู่ใน `ARTICLE-APPROVAL-TEST-REPORT.md` การผ่าน unit tests ไม่ใช่หลักฐานว่าส่งข้อความหรือกดปุ่มผ่าน LINE จริงสำเร็จแล้ว

## Cron และการทดสอบส่งร่าง

`vercel.json` ตั้ง `0 12 * * *` = 19:00 Asia/Bangkok (UTC+7) Vercel เรียก GET เฉพาะ production deployment พร้อม `Authorization: Bearer CRON_SECRET` เมื่อกำหนด env นี้แล้ว ร่างส่งหลัง AI สร้างและตรวจสำเร็จ จึงมีเวลาประมวลผลเพิ่ม

ต้องเปิดทั้ง `ARTICLE_APPROVAL_ENABLED=true` และ `ARTICLE_DAILY_CRON_ENABLED=true` สำหรับงานรายวัน หากรอเปลี่ยนแผน Vercel ให้คงตัวหลังเป็น `false` ผู้ดูแลที่ยืนยันตัวตนแล้วสามารถกด “สร้างร่างของวันนี้ / ลองใหม่” หรือ “ส่งร่างที่ค้าง” ใน `/article-admin` ได้ โดยยืนยันก่อนเรียก AI/ส่ง LINE ทุกครั้ง ไม่เปิดเผย CRON_SECRET ให้ browser และใช้ daily lock/allowlist เดียวกัน

ตัวแปรชนิด Sensitive ใน Vercel ไม่สามารถ export ค่าจริงด้วย `env pull` ได้ ไฟล์ที่ได้อาจมีข้อความปกปิด ห้ามใช้ความยาวของข้อความนั้นตัดสินคุณภาพ secret หรือคัดลอกทับค่าเดิม

Vercel Hobby อาจเริ่มได้ทุกนาทีในช่วงชั่วโมงที่กำหนด (19:00–19:59) ถ้าต้องการตรงนาที 19:00 ต้องตรวจแผนที่รองรับ minute precision ไม่เปลี่ยนแผนหรือซื้อบริการอัตโนมัติ `maxDuration=300` ต้องตรวจขีดจำกัด function ของโปรเจกต์ด้วย

รันในเครื่องโดยไม่ส่ง LINE จริง:

```text
npm run test
npm run typecheck
npm run lint
npm run build
```

ทดสอบ staging ที่ตั้งค่าครบและได้รับอนุมัติให้ส่งถึงบัญชีผู้ดูแลทดสอบแล้ว (ใช้ตัวแปรจาก shell ห้ามฝังคีย์จริงในคำสั่ง):

```powershell
$articleHeaders = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Method Post -Uri "$env:ARTICLE_SITE_URL/api/cron/article-drafts" -Headers $articleHeaders
Invoke-RestMethod -Method Get -Uri "$env:ARTICLE_SITE_URL/api/article-approval/operations" -Headers $articleHeaders
```

POST cron ใช้ lock/วันที่ไทยเดียวกับ GET เรียกซ้ำวันเดียวกันไม่สร้างเรื่องใหม่ หากเป็น Preview ที่มี Vercel Deployment Protection ให้ใช้สิทธิ์ bypass ของทีมตามขั้นตอนเดิม อย่าปิด protection ของ production เพื่อทดสอบ

ทดสอบ end-to-end บน staging:

1. ส่งร่าง → ตรวจว่า OA ส่งให้ผู้ดูแลเท่านั้น มีเนื้อหาทั้งเรื่องและแหล่งข้อมูล ลิงก์บทความสาธารณะยังเปิดไม่ได้
2. กด “อนุมัติโพสต์” → ตรวจตัวตน LINE → อ่านเนื้อหา → ยืนยัน → สถานะ “เผยแพร่แล้ว” มี URL/title/description/วันที่/canonical/Article JSON-LD และ URL ใน `/articles/sitemap.xml` ซึ่งประกาศใน `/robots.txt` ควบคู่ sitemap รถเดิม
3. เรียก cron/กดยืนยันซ้ำ/กดจากสองเครื่องพร้อมกัน → มีร่างเดียวและหนึ่งผลการตัดสินใจ สถานะเก่าไม่ทับสถานะใหม่
4. ทดสอบอีกวันในฐานข้อมูล staging หรือใช้ fixtures ในชุดทดสอบสำหรับ reject → “ไม่อนุมัติ” และ 404 ที่หน้าสาธารณะ ไม่มี query parameter สำหรับบังคับสร้างซ้ำใน production
5. บัญชีไม่อยู่ allowlist และ token ปลอม/หมดอายุ/คนละ channel ต้องถูกปฏิเสธ ส่งลิงก์ต่อให้ลูกค้าก็อนุมัติหรืออ่านร่างไม่ได้
6. เปิด “จัดการบทความ” → ยกเลิกเผยแพร่ → URL ตอบ 404 และ sitemap เอาออก ทดสอบเผยแพร่อีกครั้งด้วยคำสั่งเฉพาะ; ปุ่มอนุมัติเก่าใช้ไม่ได้
7. ลบบทความด้วยปุ่มยืนยัน → `deleted` (soft delete) ซ่อนหน้า/เอาออกจาก sitemap เก็บเนื้อหาและประวัติไว้ตรวจสอบ ไม่ purge อัตโนมัติ
8. ทดสอบแชทลูกค้าและ Webhook เดิมหลัง deploy โดยทีมผู้ดูแลตามขั้นตอนเดิมของร้าน

## ป้องกันข้อมูลซ้ำและการกู้คืน

`article_date UNIQUE` อ้างอิงวันที่ไทย; lease การสร้าง 10 นาทีและ ownership token ป้องกัน worker เก่าเขียนทับ worker ใหม่ จำกัดการสร้างสูงสุด 3 attempts ต่อวัน ร่างที่ pending/approved/rejected/unpublished/deleted ไม่ถูกสร้างทับ แฮช unique ป้องกันเนื้อหา JSON เหมือนกันเป๊ะข้ามวันด้วย ไม่รับประกันความไม่ซ้ำเชิงความหมาย ต้องตรวจร่างและขยาย fact pack เป็นระยะ

`save_draft` บันทึกร่างและ outbox ใน transaction เดียว แต่ละผู้รับมี retry UUID และ payload ที่ไม่เปลี่ยนระหว่าง retry ใช้ `X-Line-Retry-Key` ทุกครั้ง ยอมรับ HTTP 409 เฉพาะเมื่อมี `x-line-accepted-request-id` สถานะ sent หมายถึง LINE รับ request แล้ว ไม่ยืนยันว่าผู้ใช้ได้อ่านข้อความหรือไม่ (เช่น block OA)

Vercel ไม่ retry cron ที่ล้มเหลวให้เอง ตรวจ logs หรือ GET operations ถ้างานสร้างล้มเหลว ให้เรียก POST cron อีกครั้งวันเดิมหลังแก้ต้นเหตุ ถ้า process หยุดระหว่างสร้างให้รอ lease หมดก่อน retry และไม่เกิน 3 attempts ไม่มี silent fallback บทความตัวอย่าง

ถ้าส่ง LINE ไม่สำเร็จแต่ร่างมีแล้ว เรียกส่งค้างอย่างเดียว:

```powershell
Invoke-RestMethod -Method Post -Uri "$env:ARTICLE_SITE_URL/api/article-approval/operations" -Headers $articleHeaders
```

worker ตรวจ allowlist อีกครั้งก่อน push เพื่อไม่ส่งร่างค้างให้ผู้ดูแลที่ถอนสิทธิ์แล้ว คิวค้างเกิน 23 ชั่วโมงหลังเริ่มส่งจะไม่ retry อัตโนมัติ เพราะ LINE จำ retry key 24 ชั่วโมง ให้ผู้ดูแลเปิด LIFF รายการทั้งหมดเพื่อตรวจร่างที่ค้าง หรือให้ผู้ดูแลระบบตรวจประวัติ request ก่อนตัดสินใจส่งใหม่ อย่าเปลี่ยน retry key เองเพื่อแก้ข้อผิดพลาดโดยไม่ตรวจว่ารับแล้วหรือไม่

การตัดสินใจ lock แถว + ตรวจ version + บันทึก event ID unique ใน transaction เดียว “ไม่อนุมัติ” ย้อนกลับมา approve ไม่ได้; “ยกเลิกเผยแพร่” ใช้ republish ได้เฉพาะจากหน้าจัดการ; ปุ่มเก่าหรือ event เดิมไม่เผยแพร่ซ้ำ ไม่มีงานลบบทความเก่า ไม่มี HTTP hard-delete API

## เนื้อหาและ SEO

ร่างใช้ fact pack ที่อ่านจากแหล่งทางการใน `lib/article-approval/sources.ts` ให้ AI เขียนจากข้อเท็จจริงที่ระบุเท่านั้น จำกัด plain text และขนาด ตรวจโครงสร้าง/คำกล่าวอ้างเสี่ยง/อ้างอิง fact IDs แล้วให้ AI ตรวจ grounding อีกรอบ หากปฏิเสธหรือไม่สมบูรณ์ → failed ไม่เข้าคิวอนุมัติ ไม่มีข่าว/ราคา/ข้อกฎหมายหรือคำรับประกันการเงินจากความจำของ AI

แหล่งอ้างอิงที่ลิงก์บนเว็บมาจาก fact pack ไม่ใช่ URL ที่โมเดลแต่งขึ้น การตรวจอัตโนมัติช่วยลดข้อผิดพลาด แต่ไม่พิสูจน์ว่าเนื้อหาทุกประโยคถูกต้อง ผู้ดูแลจึงต้องอ่านทั้งเรื่องและแหล่งข้อมูลก่อนยืนยัน หมุนหัวข้อ 12 มุมและส่งชื่อ 45 เรื่องล่าสุดให้หลีกเลี่ยง ควรขยายแหล่งข้อมูลที่บรรณาธิการตรวจแล้วเพื่อรักษาคุณภาพเมื่อใช้ระยะยาว

บทความเก็บถาวรในฐานข้อมูล หน้า index มี pagination, หน้า detail มี URL ถาวร canonical, metadata, วันที่ไทย, Article JSON-LD และเนื้อหา render โดย React (ไม่รัน HTML จาก AI) อ่านเฉพาะ published view แบบ no-store จึงตรวจสถานะใหม่ทุก request หน้า `/articles/sitemap.xml` แยกจาก sitemap รถเดิม อ่านทีละ 500 แถวเพื่อไม่ตกหล่นบทความเก่าเกิน PostgREST limit หากฐานข้อมูลบทความผิดพลาด sitemap ใหม่นี้ตอบ error เพื่อให้ crawler retry โดยไม่กระทบ sitemap รถเดิม

## หยุดระบบและ rollback

หากต้องหยุด ให้ตั้ง `ARTICLE_APPROVAL_ENABLED=false` และ redeploy ตามสิทธิ์ที่ผู้ใช้อนุมัติ ปิด cron ของระบบนี้ใน Vercel ได้เมื่อได้รับอนุมัติแล้ว ไม่ลบบทความที่มีอยู่ ถ้าจะเอาบทความใดลง ให้ใช้ unpublish ของผู้ดูแลก่อนปิดระบบ

Rollback deployment เก็บ schema/ตารางไว้ ห้าม rollback ด้วย DROP schema หรือ truncate ตาราง การ rollback บน Vercel ไม่ได้อัปเดต cron เสมอไป ให้ตรวจ cron schedule/status ใน dashboard แยก

## เอกสารอ้างอิง

- [LINE webhook routing](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)
- [LINE signature verification](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/)
- [LIFF user tokens on server](https://developers.line.biz/en/docs/liff/using-user-profile/)
- [LINE ID token verification](https://developers.line.biz/en/reference/line-login/#verify-id-token)
- [LINE retry keys](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/)
- [Vercel Cron timezone](https://vercel.com/docs/cron-jobs)
- [Vercel timing, security and retries](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [GPT-5.4 mini: Responses และ structured outputs](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [Supabase TLS และ CA certificate](https://supabase.com/docs/guides/platform/ssl-enforcement)
