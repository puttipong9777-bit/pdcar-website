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
- `cover_image_url`, `photos`
- `updated_at`

## ฟิลด์ที่ห้ามเผยแพร่

- ราคาซื้อ ต้นทุน ค่าใช้จ่าย กำไร และค่าคอมมิชชัน
- VIN เลขเครื่อง และหมายเหตุภายใน
- ลูกค้า ชื่อ ที่อยู่ เบอร์โทร เลขบัตรประชาชน และรูปเอกสาร
- สัญญา ลายเซ็น ใบเสร็จ และเอกสารการเงิน
- Storage path, OAuth token, API key, service role key

## รูปภาพ

`photos` เป็น JSON array:

```json
[{ "fileId": "FILE-...", "url": "https://...", "isPrimary": true, "sortOrder": 1 }]
```

เว็บไซต์ไม่ควรเดาโฟลเดอร์ Google Drive เอง ต้องใช้ URL ที่ Public View หรือ public media service ส่งให้เท่านั้น
