# รายงานพัฒนาและเตรียมเปิดใช้งาน — 8 กันยายน 2026

## ผลทดสอบในเครื่อง

| การตรวจ | ผล |
|---|---|
| `npm test` | ผ่าน 42/42 รวมการทดสอบ catalog เดิม 10 กรณี |
| `npm run typecheck` | ผ่าน |
| `npm run lint` | ผ่าน ไม่มี warning/error |
| `npm run build` | ผ่าน Next.js 15.5.25 ทั้ง local และ Vercel Preview |
| `git diff --check` | ผ่าน |
| browser ตรวจ `/articles` | เปิดได้ แสดง empty state และลิงก์นำทาง |
| browser ตรวจ `/article-admin` | แสดงว่ายังไม่เปิดระบบตามค่าเริ่มต้น |
| HTTP `/articles` / `/article-admin` | 200, no-store |
| HTTP URL บทความที่ยังไม่มีเผยแพร่ | 404 |
| HTTP cron เมื่อยังไม่มี secret | 503 แบบ fail closed ไม่สร้างหรือส่งร่าง |
| HTTP `/api/health` เดิม | 200 |
| HTTP POST callback เมื่อยังปิด postback | 404 `disabled` ไม่ประมวลผล event |
| HTTP `/robots.txt` หลัง build สุดท้าย | 200 มีทั้ง sitemap รถเดิมและ sitemap บทความใหม่ |
| browser bundle | ไม่พบชื่อ env ของ database URL, OpenAI key, OA token และ Channel secret ใน `.next/static` |

Build สุดท้ายสร้าง `/articles/sitemap.xml` แบบ dynamic แยกจาก `/sitemap.xml` เดิม ซึ่งยัง revalidate ทุก 1 ชั่วโมง และ `/robots.txt` ประกาศทั้งสอง sitemap

## สิ่งที่ทดสอบได้จริง

- รัน migration ทั้งไฟล์ใน PGlite (PostgreSQL ใน memory) ไม่เชื่อม Supabase จริง: schema, tables, functions, unique constraints, RLS และ grants
- จองวันเดียวกันหลาย request ได้ร่างเดียว, worker token เก่าเขียนไม่ได้, กู้คืน lease และจำกัด attempts
- บันทึกร่างกับคิวส่งแบบ atomic, duplicate content rollback ไม่ทิ้งคิวบางส่วน
- อนุมัติ/ปฏิเสธ, duplicate event, stale version, ยกเลิกเผยแพร่, เผยแพร่อีกครั้ง และ soft delete รวม public view visibility
- บัญชี anon/authenticated อ่านได้เฉพาะ published view และเรียก mutation ไม่ได้; worker ไม่มีสิทธิ์เขียนตารางตรงหรืออ่าน fixture ERP
- HMAC LINE กับ raw body ภาษาไทย, body ถูกแก้ไข, ลายเซ็นผิด/หาย, destination ผิด, ข้ามแชทลูกค้า/กลุ่ม/บัญชีนอก allowlist
- การตรวจ LINE ID token ด้วย provider stub: audience/issuer/expiry/allowlist และ same-origin ของ admin API
- LINE push ใช้ retry key เดิมและ payload เดิม, 409 ต้องมี accepted request ID, ambiguous request เกิน retry window ถูกระงับ
- กรณี workflow รวม: AI ล้มเหลว → retry ร่างเดิม → บันทึกสำเร็จ → LINE ล้มเหลว → ส่งค้างสำเร็จโดยไม่สร้างใหม่ → อนุมัติแล้วเห็นใน public view
- ปฏิเสธ AI refusal/incomplete/failed fact review และเนื้อหาที่มี script/อ้างอิงแต่ง/คำรับประกัน
- Server render หน้า detail พร้อมเนื้อหา วันที่ไทย canonical description และ Article JSON-LD; missing article noindex/404
- Sitemap อ่านต่อเกิน 1,000 แถว ไม่ตัดบทความเก่าทิ้งตาม PostgREST row cap

PGlite ทำงานใน process เดียวและ serialize queries การทดสอบ request พร้อมกันยืนยันผลของ workflow ใน environment นี้ ไม่ใช่ load test หลาย connection ของ Supabase production โดยตรง SQL ใช้ unique constraint และ row lock สำหรับการทำงานพร้อมกันจริง

## Dependency ก่อนและหลังเตรียม deploy

ก่อนอัปเดต dependency, `npm audit --json` รายงาน 6 packages: 5 high / 1 moderate คือ `next`, `sharp`, `nanoid`, `brace-expansion`, `js-yaml`, `postcss` ทั้งหมดเป็นแพ็กเกจเดิมที่เวอร์ชัน ณ จุดตรวจนั้นยังไม่เปลี่ยนจาก HEAD ไม่ใช่ `postgres`, `server-only` หรือ `@electric-sql/pglite` ที่เพิ่มใหม่

หลังผู้ใช้อนุมัติให้ทำต่อ ได้อัปเดต Next.js/eslint-config-next เป็น 15.5.25 (ไม่เปลี่ยน major), sharp 0.35.4 ตามช่วงที่ Next รองรับ, postcss 8.5.28, nanoid 3.3.18, js-yaml 4.3.2, brace-expansion 1.1.18/5.0.9 รวม dependency ประกอบ ผล `npm audit` ล่าสุด: **0 vulnerabilities** จาก registry ณ เวลาตรวจ ไม่ได้ทำ exploit validation หรือสแกนความปลอดภัยทั้ง repository และผลนี้ไม่รับประกันว่าไม่มีช่องโหว่ที่ยังไม่ถูกรายงาน

## ติดตั้งและทดสอบกับระบบจริงแล้ว

- ติดตั้ง migration `0002_article_approval.sql` ใน Supabase project ที่เว็บไซต์ใช้อยู่ หลังตรวจชื่อ schema/view/role ว่าไม่ชน ไม่รัน migration อื่น และไม่แก้ตาราง ERP
- สร้าง dedicated LOGIN `pdcar_article_login` สมาชิกเฉพาะ `pdcar_article_worker`; password สุ่มและเก็บเฉพาะไฟล์ local ที่ Git ignore กับ Vercel Secret ไม่มี service-role key ในเว็บไซต์
- ตรวจ TLS ผ่าน Supabase Root 2021 CA จากแหล่งทางการ ยืนยัน CA และ hostname; ไม่ปิด certificate verification และไม่เปลี่ยน server SSL enforcement ที่อาจ restart ฐานข้อมูล
- ตรวจสิทธิ์ runtime: ใช้ article schema/อ่านร่างได้, update ตารางตรงไม่ได้, ไม่มี SELECT บน customers/inventory (ตรวจ metadata ไม่อ่านข้อมูลลูกค้าจริง)
- ทดสอบฐานข้อมูลจริง 10 จุด: daily claim, duplicate claim, save pending, approve, duplicate decision, stale decision, unpublish, rollback ไม่เหลือ test rows, public view HTTP 200 และรูปแบบผลอ่าน โดยทุก mutation ทดสอบอยู่ใน transaction ที่ rollback ไม่เคยเผยแพร่ fixture ต่อสาธารณะหรือส่ง LINE
- เพิ่ม Vercel env เฉพาะบทความแบบปิด: `ARTICLE_APPROVAL_ENABLED=false`, `ARTICLE_DAILY_CRON_ENABLED=false`, `ARTICLE_LINE_POSTBACK_ENABLED=false`, site URL, dedicated database URL (Sensitive), public CA และโมเดล
- ยืนยัน OA `@rug0978j` ใช้ Webhook `https://pdcar-growth-ops.vercel.app/api/webhooks/line` ไม่มีการแก้ Webhook/token/auto-reply/greeting
- `CRON_SECRET` เดิมคงเดิม: ค่าที่ `vercel env pull` ส่งออกเป็นข้อความปกปิดของ Sensitive env **ไม่ใช่ secret จริง** จึงสรุปความยาว/ความแข็งแรงจากไฟล์นั้นไม่ได้
- ผู้ใช้เลือก **รอเปลี่ยนแผน Vercel เพื่อให้เริ่มตรงนาที 19:00** จึงปิดงานรายวันแยกจากโหมดทดสอบด้วยผู้ดูแล ไม่ซื้อหรืออัปเกรดแผนอัตโนมัติ
- ผู้ดูแลสร้าง LINE Login `PD Car Articles` ใน provider เดียวกับ OA แล้ว และเพิ่ม LIFF `PD Car Article Approval` แบบ Full, endpoint `https://www.pdcarcenter.com/article-admin`, scope เฉพาะ `openid`, Add friend Off ไม่ขอ `chat_message.write`
- หลังผู้ใช้ยืนยันอย่างชัดเจน ได้คัดลอก OA token **เดิม** ไปที่ `ARTICLE_LINE_CHANNEL_ACCESS_TOKEN` แบบ Sensitive ใน Vercel Production โดยไม่ออก/เพิกถอน token และไม่แก้ระบบ OA เดิม
- ตรวจ metadata ยืนยัน `OPENAI_API_KEY` ที่ผู้ใช้เพิ่มเป็น Sensitive ใน Production; เพิ่ม `ARTICLE_LINE_ADMIN_IDS` แบบ Sensitive และ LIFF/Login channel IDs เฉพาะ Production ไม่แสดงค่าลับใน output หรือ Git
- เปิดหน้าอัปเกรด Pro ให้ผู้ใช้ดำเนินการชำระเงินเอง หน้า checkout ระบุ $20/เดือน รวมเครดิตใช้บริการ $20 และอาจมีค่าใช้เกินเครดิต/ภาษี ยังไม่กดสมัครและยังตรวจได้แผน Hobby; master, daily cron และ postback ยังคง `false`
- ยังไม่ push Git และไม่เปลี่ยน production deployment/โดเมน

Preview deploy สำเร็จ: [pdcar-website Preview](https://pdcar-website-mlgtwy8hn-puttipong9777-bits-projects.vercel.app) (`dpl_5W81PTHt1bXoui9MbGrJtiyfy9y9`, READY) โหมดบทความ/cron/postback ปิดทั้งหมด ไม่มี production database credential ใน Preview และยังไม่ใช่การทดสอบ LINE/OpenAI end-to-end

HTTP smoke tests บน Preview ผ่าน **12/12**: หน้าแรก, health เดิม, sell-car, articles, article-admin, sitemap ทั้งสองและ robots ตอบ 200; บทความที่ไม่มีตอบ 404; callback ปิดตอบ 404; admin API ปิดตอบ 503; cron ไม่มี credential ใน Preview ตอบ 503 fail-closed ตรวจ robots พบ sitemap ทั้งรถและบทความ

Browser บน Preview: หน้าบทความเปิดได้/empty state, หน้าโชว์รูมเดิมแสดงรถ 11 คันและภาพหน้าร้าน, หน้ารถ `/cars/pd0019` เปิดได้พร้อมภาพหลักที่โหลดครบ 501×501 pixels หลังอัปเดต Next/sharp ไม่ทดสอบส่งข้อความแชทลูกค้าจริง ไม่สรุปว่าระบบภายนอก growth-ops ผ่าน regression แล้ว

## รายการที่ยังต้องทำก่อนเปิดจริง

1. ผู้ใช้กรอกข้อมูลชำระเงิน/ตรวจยอดและยืนยันสมัคร Pro ในแท็บ Billing เอง จากนั้นตรวจแผนจริงอีกครั้งก่อนเปิดงานรายวัน
2. เตรียม Production deployment โดยตรวจ LINE Login/LIFF กับบัญชีผู้ดูแลจริง เปิด master เฉพาะเมื่อพร้อมทดสอบและยังคง `ARTICLE_DAILY_CRON_ENABLED=false`
3. ทดสอบสิทธิ์โมเดล/การสร้างจริงและส่งร่าง–อนุมัติ–ปฏิเสธ–ยกเลิกเผยแพร่บน LIFF ด้วยผู้ดูแลจริง ตรวจ regression แชทตามกระบวนการเดิม ไม่มีการเรียก AI แบบคิดเงินหรือส่งข้อความจริงในชุดทดสอบปัจจุบัน
4. ตรวจความพร้อม CRON_SECRET ที่ runtime โดยไม่เปิดเผยค่า และ deployment config ก่อนเปิด `ARTICLE_DAILY_CRON_ENABLED=true` บน Pro; ตาราง cron กำหนดระดับนาที ไม่รับประกันว่างาน AI จะเสร็จตรง 19:00:00

ขั้นตอนและ environment ทั้งหมดอยู่ใน [ARTICLE-APPROVAL.md](ARTICLE-APPROVAL.md)
