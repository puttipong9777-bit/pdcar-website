# PD Car Center Website

เว็บไซต์สาธารณะของ PD Car Center แยกจากระบบ ERP แต่ใช้ Supabase Project และ `Car ID` ชุดเดียวกัน

## สถานะเริ่มต้น

- หน้าแรกเป็นรายการรถพร้อมขายและติดจอง
- ค้นหาด้วยยี่ห้อ รุ่น ปี และ Car ID
- มีหน้ารายละเอียดรถ
- อ่านข้อมูลจาก `public.public_vehicle_listings` เท่านั้น
- ไม่อ่านตารางลูกค้า ต้นทุน สัญญา หรือข้อมูลส่วนตัว
- Public Data View ถูกติดตั้งใน Supabase production แล้วเมื่อ 14/07/2026
- รูป private ถูกส่งผ่าน public image API ของ ERP เฉพาะรถที่เปิดเผยแพร่

## เริ่มใช้งาน

1. คัดลอก `.env.example` เป็น `.env.local`
2. ใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ตรวจและรัน `supabase/migrations/0001_public_website_contract.sql` ใน Supabase
4. ตั้ง `website_published = true` ให้รถที่อนุญาตให้แสดง
5. รัน `npm install` และ `npm run dev`

อ่านบริบทระบบทั้งหมดที่ [`.ai/SYSTEM_CONTEXT.md`](.ai/SYSTEM_CONTEXT.md) และ [`docs/ERP-HANDOFF.md`](docs/ERP-HANDOFF.md)
