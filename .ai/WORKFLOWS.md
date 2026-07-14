# Workflows

## เผยแพร่รถ

1. ERP สร้างรถด้วย Car ID
2. รถเริ่มที่ `new_arrival`
3. พนักงานเพิ่มรายละเอียดราคาและรูป
4. ปรับสถานะเป็น `available`
5. เจ้าของเปิด `website_published`
6. เว็บไซต์อ่านรถจาก Public View

## รูปภาพ

1. อัปโหลดรูปผ่าน ERP
2. ERP สร้างโฟลเดอร์ `<Car ID>/<category>` ใน Google Drive เมื่อเลือก Drive
3. ERP บันทึกทะเบียนรูปใน `vehicle_files`
4. รูป `vehicle_image_front` ถูกตั้งเป็นรูปหลักโดยอัตโนมัติ
5. เว็บไซต์เรียงรูปหลักก่อน แล้วตาม `sort_order`

การวางรูปลง Google Drive โดยตรงยังไม่สร้างทะเบียนใน Supabase ต้องเพิ่ม Drive Changes Sync ในเฟสถัดไป

## สถานะ

- `available`: แสดงป้ายพร้อมขาย
- `reserved`: แสดงป้ายติดจอง
- `sold`: ซ่อนจากหน้ารวมรถ
- `new_arrival`: ซ่อนจนตรวจและตั้งราคาครบ
- `waiting_repair`: ซ่อนจากเว็บไซต์

## การอัปเดต

หน้าเว็บอ่านข้อมูลใหม่ทุก request ในระยะแรก จึงไม่ต้องคัดลอกข้อมูลรถไปฐานข้อมูลอีกชุด หลังเปิดใช้งานจริงสามารถเพิ่ม cache/revalidation และ Supabase Realtime ได้
