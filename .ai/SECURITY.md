# Security Boundary

- ใช้เฉพาะ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ในเว็บไซต์
- ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` ในโปรเจกต์เว็บไซต์
- ห้ามนำ Google OAuth client secret, refresh token หรือ service-account private key มาไว้ที่เว็บไซต์
- ห้าม query `customers`, `purchases`, `sales`, `reservations`, `documents`, `vehicle_expenses` หรือ `audit_logs`
- ห้ามเปิด anon select บน `inventory` และ `vehicle_files` ทั้งตาราง
- เปิด anon select เฉพาะ `public_vehicle_listings` ที่เลือก safe columns แล้ว
- รูป Google Drive แบบ private ต้องผ่าน public media service หรือ mirror ไป public web bucket ก่อนแสดง
- ห้ามใช้ URL ที่มี access token หรือ signed token ระยะสั้นเป็น URL ถาวรของรูป
