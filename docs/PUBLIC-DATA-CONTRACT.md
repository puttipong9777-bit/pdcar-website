# Public Data Contract

| Website field | Supabase field | หมายเหตุ |
| --- | --- | --- |
| `carId` | `car_id` | Primary key ร่วมกับ ERP |
| `slug` | `website_slug` | URL ของรถ |
| `status` | `status` | เฉพาะ available/reserved |
| `title` | `website_title` | ถ้าว่างใช้ brand/model/year |
| `salePrice` | `sale_price` | ราคาขาย ไม่ใช่ต้นทุน |
| `downPayment` | `listing_down_payment` | ข้อมูลประกาศ |
| `financeAmount` | `listing_finance_amount` | ข้อมูลประกาศ |
| `installment` | `listing_installment` | จำนวนงวด |
| `monthlyPayment` | `listing_monthly_payment` | ค่างวดโดยประมาณ |
| `description` | `public_description` | ข้อความที่เจ้าของอนุญาต |
| `coverImageUrl` | `photos[0].fileId` | เว็บไซต์สร้าง URL ผ่าน ERP public image API |
| `photos` | `photos` | JSON array ที่มี `fileId`, `isPrimary`, `sortOrder` |
| `youtubeVideoId` | `vertical_video.youtubeVideoId` | ใช้ฝัง YouTube Shorts แบบไม่เปิดเผยไฟล์ต้นฉบับใน Drive |
| `youtubeVideoUrl` | `vertical_video.youtubeUrl` | ลิงก์โพสต์ YouTube ที่เผยแพร่สำเร็จแล้ว |
| `videoCaption` | `vertical_video.caption` | ข้อความสาธารณะที่ใช้ประกอบวิดีโอ |

รูปภาพเว็บไซต์ต้องอ้าง FILE ID ที่อยู่ใน `public_vehicle_listings.photos` ปัจจุบันก่อน แล้วจึงอ่านผ่าน `GET {NEXT_PUBLIC_ERP_URL}/api/public/vehicle-images/{fileId}` เว็บไซต์ตรวจ membership ด้วย public anon view แบบ query เฉพาะ FILE ID, เลือกเพียง `car_id`, จำกัดหนึ่งแถว, ไม่อ่าน inventory ทั้งชุด และไม่เก็บ membership cache ข้าม request

Migration ของ public view รับเฉพาะหมวดรูปหลัก/แกลเลอรีเจ็ดหมวด: `vehicle_image_front`, `vehicle_images`, `vehicle_image_rear`, `vehicle_image_left`, `vehicle_image_right`, `vehicle_image_interior` และ `vehicle_image_mileage` รูปซ่อม ความเสียหาย เอกสาร วิดีโอ และรูปตอบลูกค้าที่ไม่ได้อยู่ใน `photos` จึงต้องไม่ผ่านด่านเว็บไซต์ แม้ FILE นั้นจะยังผูกกับรถใน ERP

Source review ของ ERP ยืนยันเพียงพฤติกรรมในโค้ดที่ตรวจ ไม่ใช่ deployed SHA: normal full/thumb route ยังไม่มี membership check แบบเดียวกันและรวม exception หลายชนิดเป็น 404 เว็บไซต์จึงแยก ERP denial/deletion ออกจาก ERP database/storage failure ไม่ได้เมื่อ ERP ตอบ 404 หลัง membership ผ่าน นอกจากนี้ ERP อาจ redirect ไป public object ที่ cache แบบ immutable; โค้ดเว็บไซต์ไม่สามารถลบ direct object URL หรือ cache ที่เผยแพร่ไปก่อนแล้วได้

หาก Public View ยังไม่มี YouTube Shorts ที่เผยแพร่สำเร็จ เว็บไซต์จะแสดงภาพรถพร้อมข้อความ `คลิปกำลังมา` แทน โดยไม่เปิดไฟล์ต้นฉบับจาก Google Drive

การเปลี่ยนชื่อหรือชนิดฟิลด์ต้องแก้พร้อมกันใน SQL view, `lib/types.ts`, `lib/vehicle-data.ts` และเอกสารนี้
