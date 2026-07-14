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

รูปภาพอ่านผ่าน `GET {NEXT_PUBLIC_ERP_URL}/api/public/vehicle-images/{fileId}` เท่านั้น
API จะส่งรูปเมื่อรถถูกเผยแพร่และสถานะเป็น `available` หรือ `reserved`

การเปลี่ยนชื่อหรือชนิดฟิลด์ต้องแก้พร้อมกันใน SQL view, `lib/types.ts`, `lib/vehicle-data.ts` และเอกสารนี้
