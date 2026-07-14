# System Context

## บทบาทของโปรเจกต์

`pdcar-website` เป็นเว็บไซต์สาธารณะสำหรับลูกค้าดูรถของ PD Car Center ไม่ใช่ระบบหลังบ้านและไม่ใช้ทำสัญญา

## ระบบต้นทาง

- ERP: `pdcar-platform`
- Production ERP: `https://pdcar-platform.vercel.app`
- Database: Supabase Project เดียวกับ ERP
- File master: Google Drive หรือ Supabase Storage ตามค่าของ ERP
- Primary key กลาง: `inventory.car_id` เช่น `PD0001`

## หลักการสำคัญ

- Supabase เป็น source of truth ของข้อมูลรถและทะเบียนรูป
- Google Drive เป็นแหล่งเก็บไฟล์ ไม่ใช่ฐานข้อมูลรายการรถ
- เว็บไซต์อ่านเฉพาะ view `public_vehicle_listings`
- เว็บไซต์ห้ามอ่านตารางภายในโดยตรง
- รถจะขึ้นเว็บเมื่อ `website_published = true` และสถานะเป็น `available` หรือ `reserved`
- รถ `sold`, `new_arrival`, `waiting_repair` ไม่แสดงในหน้ารวมรถ

## ข้อมูลร้าน

- ชื่อ: PD Car Center / พี.ดี.คาร์เซ็นเตอร์
- ที่อยู่: 23/2 หมู่ 13 ต.โพรงมะเดื่อ อ.เมืองนครปฐม จ.นครปฐม 73000
- โทร: 0840079122
- สีแบรนด์หลัก: ขาว แดง น้ำเงิน ดำ
- รูปแบบ: สะอาด ทันสมัย อ่านง่าย Mobile First
