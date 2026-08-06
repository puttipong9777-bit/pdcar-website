# Public Data Contract

เว็บไซต์อ่านจาก `public.public_vehicle_listings` เท่านั้น

## ฟิลด์ที่อนุญาต

- `car_id`
- `status`: `available` หรือ `reserved`
- `brand`, `model`, `variant`, `year`
- `color`, `mileage`, `fuel_type`, `transmission`
- `condition_summary`
- `sale_price`
- `listing_down_payment`, `listing_finance_amount`
- `listing_installment`, `listing_monthly_payment`
- `public_description`
- `website_title`, `website_slug`, `website_featured`
- `photos` ซึ่งมีเฉพาะ `fileId`, `isPrimary`, `sortOrder`
- `vertical_video` ซึ่งมีเฉพาะ `youtubeVideoId`, `youtubeUrl`, `title`, `caption`, `publishedAt`
- `website_published_at`, `updated_at`

## YouTube video reference

`vertical_video` may originate from the existing ERP vertical-video publication
job or from a manually posted YouTube clip synchronized by Make. Both sources are
resolved by the ERP public view using the same Car ID; the website receives only
the newest public YouTube reference and never receives a Drive URL or webhook
secret.

## ฟิลด์ที่ห้ามเผยแพร่

- ราคาซื้อ ต้นทุน ค่าใช้จ่าย กำไร และค่าคอมมิชชัน
- VIN เลขเครื่อง และหมายเหตุภายใน
- ลูกค้า ชื่อ ที่อยู่ เบอร์โทร เลขบัตรประชาชน และรูปเอกสาร
- สัญญา ลายเซ็น ใบเสร็จ และเอกสารการเงิน
- Storage path, OAuth token, API key, service role key

## รูปภาพ

`photos` เป็น JSON array:

```json
[{ "fileId": "FILE-...", "isPrimary": true, "sortOrder": 1 }]
```

เว็บไซต์ไม่เดาโฟลเดอร์ Google Drive และไม่รับ storage path โดยตรง แต่สร้าง URL รูปจาก `NEXT_PUBLIC_ERP_URL` และ `fileId` ผ่าน public media service ของ ERP
