# ERP Handoff: PD Car Center OS -> Website

เอกสารนี้ระบุข้อเท็จจริงที่เว็บไซต์รับต่อจาก ERP ณ commit `b099495`

## Verified integration 2026-07-14

- ERP publication controls are implemented on the inventory detail page.
- `public.public_vehicle_listings` is installed in the shared Supabase project.
- The view exposes photo file IDs but no storage path or signed URL.
- Private images are read through `GET /api/public/vehicle-images/{fileId}`.
- The website deployment remains separate from ERP while keeping the same Car ID.

## สิ่งที่ ERP มีแล้ว

### Inventory

- Car ID
- สถานะ `new_arrival`, `available`, `reserved`, `sold`, `waiting_repair`
- ยี่ห้อ รุ่น รุ่นย่อย ปี สี เลขไมล์ เชื้อเพลิง เกียร์
- สภาพรถโดยสรุป
- ราคาขาย เงินดาวน์ ยอดจัด จำนวนงวด ค่างวด
- คำบรรยายสำหรับสาธารณะ

### Vehicle files

- File ID และ Car ID
- หมวด `vehicle_image_front` สำหรับรูปหน้ารถหลัก
- หมวด `vehicle_images` สำหรับรูปรถทั้งหมด
- `is_primary` และ `sort_order`
- Storage provider: Google Drive, Supabase Storage หรือ local
- Public URL เมื่อระบบจัดเก็บรองรับ

### Google Drive

- ERP สามารถสร้างโฟลเดอร์ `<Car ID>/<category>` อัตโนมัติ
- ERP รองรับ OAuth refresh token และ service account
- การอัปโหลดผ่าน ERP จะบันทึก metadata ลง Supabase พร้อมกัน
- การวางไฟล์ใน Drive โดยตรงยังไม่ซิงก์กลับ Supabase

## สิ่งที่ยังต้องเพิ่มใน ERP

- สวิตช์เผยแพร่เว็บไซต์
- ชื่อและ slug สำหรับ SEO
- รถแนะนำ
- Public View
- วิธีส่งรูป private ไปเว็บไซต์อย่างถาวร
- หน้าควบคุม Publish/Unpublish

## การเชื่อมระบบ

เว็บไซต์ไม่ต้องมีฐานข้อมูลรถอีกชุด ให้ใช้ Supabase Project เดิมและอ่าน Public View ด้วย anon key รถทุกคันอ้างอิงด้วย Car ID เดิม

## Environment Variables

เว็บไซต์ต้องมี:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ERP_URL`
- `NEXT_PUBLIC_SHOP_PHONE`
- `NEXT_PUBLIC_LINE_URL`

ค่าลับของ ERP ที่ห้ามคัดลอกมาคือ service role key, OCR API keys และ Google OAuth/service-account credentials
