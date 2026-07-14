# Next Steps

## Verified 2026-07-14

- Public Data View ถูกใช้จริงใน Supabase production และ anon read ตอบ HTTP 200
- ERP มีตัวควบคุม publish/unpublish, title, slug และ featured ในหน้ารายละเอียดรถ
- รูป private จาก Google Drive หรือ Supabase Storage ส่งผ่าน ERP public image API
- เว็บไซต์อ่านข้อมูลรถจาก Supabase โดยไม่คัดลอกฐานข้อมูลชุดใหม่

## Phase 1: Data boundary (completed)

- ตรวจ SQL migration กับ schema production
- เพิ่มตัวควบคุมเผยแพร่ใน ERP
- เลือกวิธีส่งรูปสาธารณะ: Supabase web bucket หรือ public media proxy
- รัน migration หลังอนุมัติ

## Phase 2: Website MVP (in progress)

- เชื่อม Environment Variables
- ตรวจรถพร้อมขายและติดจองจากข้อมูลจริง
- เพิ่ม LINE URL, Google Maps และโดเมนร้าน
- เพิ่ม SEO, Open Graph และ sitemap รายคัน

## Phase 3: Automation

- ทำ Drive Changes Sync สำหรับรูปที่วางใน Drive โดยตรง
- สร้างรูปย่อสำหรับเว็บและ Facebook
- เพิ่มปุ่มเผยแพร่/ยกเลิกเผยแพร่จาก ERP
- เพิ่ม Facebook Catalog/โพสต์อัตโนมัติภายหลัง

ห้ามเริ่ม Phase 3 ก่อน Public Data View และ media delivery ผ่านการทดสอบสิทธิ์
