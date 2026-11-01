# แผนวัดผลแคมเปญรถ 3 คันแบบเก็บข้อมูลเท่าที่จำเป็น

สถานะเอกสาร: ชุดโค้ดสำหรับตรวจใน Draft PR เท่านั้น แคมเปญยังไม่เริ่มจนกว่าจะนำโค้ดและ migration ขึ้นจริง ตรวจการรับค่า UTM แล้ว และเผยแพร่ลิงก์จริง

## ขอบเขตข้อมูล

ระบบสถิติ first-party ที่เพิ่มในชุดนี้รับและบันทึกเฉพาะค่าต่อไปนี้:

- `utm_source`: `facebook` หรือ `line`
- `utm_medium`: `organic_social` หรือ `messaging`
- `utm_campaign`: `pd0025_a`, `pd0025_b`, `pd0028_a`, `pd0028_b`, `pd0002_a`, `pd0002_b`
- เหตุการณ์: เปิดหน้า, เปิดรถ, ปัดรูป, กดโทร, กด LINE พร้อมรหัสรถเมื่อปุ่มอยู่บนหน้ารถ

ค่าอื่นถูกทิ้งจากระบบ first-party ทั้งหมด ไม่บันทึก query string เต็ม, referrer, IP, user agent, อีเมล, เบอร์ลูกค้า, เนื้อหาข้อความ หรือ advertising ID. รหัส session แบบสุ่มอยู่ใน `sessionStorage` และหมดเมื่อปิดแท็บ/หน้าต่าง ไม่ใช้รหัสผู้เข้าชมถาวรใน `localStorage`. ตัวเลข “กดโทร” และ “กด LINE” เป็นเพียงการกดปุ่ม ไม่ใช่ยอดนัดหรือยอดขาย

ระบบยึด UTM ชุดแรกที่ผ่าน allowlist ใน session เดียว เพื่อให้การเปิดหน้ารถถัดไปยังอ้างแคมเปญเดิม โดยไม่เก็บ URL ต้นทาง

## ลิงก์ที่เตรียมไว้

URL ใช้รหัสรถซึ่ง route ปัจจุบันรองรับ และหน้ารถจะประกาศ canonical slug จากข้อมูล ERP:

| รถ | ราคาอ้างอิงที่ตรวจ 1 พ.ย. 2569 | Facebook A/B | LINE A/B |
|---|---:|---|---|
| PD0025 | 389,000 บาท | `/cars/PD0025?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0025_a`<br>`/cars/PD0025?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0025_b` | `/cars/PD0025?utm_source=line&utm_medium=messaging&utm_campaign=pd0025_a`<br>`/cars/PD0025?utm_source=line&utm_medium=messaging&utm_campaign=pd0025_b` |
| PD0028 | 448,000 บาท | `/cars/PD0028?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0028_a`<br>`/cars/PD0028?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0028_b` | `/cars/PD0028?utm_source=line&utm_medium=messaging&utm_campaign=pd0028_a`<br>`/cars/PD0028?utm_source=line&utm_medium=messaging&utm_campaign=pd0028_b` |
| PD0002 | 289,000 บาท | `/cars/PD0002?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0002_a`<br>`/cars/PD0002?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0002_b` | `/cars/PD0002?utm_source=line&utm_medium=messaging&utm_campaign=pd0002_a`<br>`/cars/PD0002?utm_source=line&utm_medium=messaging&utm_campaign=pd0002_b` |

เติมโดเมน `https://www.pdcarcenter.com` ข้างหน้าก่อนเผยแพร่ ราคาเป็นหลักฐาน ณ วันที่ตรวจ ไม่ใช่ค่าที่ฝังในลิงก์; หน้ารถยังแสดงราคาจริงจาก public ERP view

## รายงานหลังบ้าน

- เลือกช่วง 1, 7, 14 หรือ 30 วัน พร้อมแสดงวันที่เริ่ม–สิ้นสุดและเขตเวลา `Asia/Bangkok`
- แยกกดโทรและกด LINE ทั้งภาพรวมและรายรถ
- แสดง source / medium / campaign ที่ผ่าน allowlist เท่านั้น; การเข้าชมที่ไม่มีค่าที่อนุญาตรวมใน “เข้าตรง / ไม่ติดแคมเปญ”
- ใช้แคมเปญ A/B เพื่อแยกชิ้นงาน แต่ผลต้องอ่านร่วมกับจำนวนผู้เข้าชม และต้องไม่เรียก click ว่า lead หรือ sale

## ลำดับนำขึ้นและการตรวจ

1. สำรองและตรวจ migration `20261101162830_campaign_attribution.sql` ในฐานข้อมูลทดสอบ
2. ใช้ migration ก่อนโค้ด เพราะโค้ดใหม่เรียกฟังก์ชัน `record_event` แบบ 8 arguments; ฟังก์ชันเดิมแบบ 5 arguments ยังคงอยู่เพื่อรองรับ rollback แอป
3. นำโค้ดขึ้น แล้วเปิดลิงก์ทดสอบ A อย่างละหนึ่งครั้งจาก session ใหม่ โดยไม่กดโทรหรือส่ง LINE
4. ตรวจหน้า admin ว่า source/medium/campaign ถูกต้องและไม่มี query อื่นหลุดเข้า database
5. ตรวจปุ่มโทร/LINE บนรถแต่ละคันโดยตรวจปลายทางเท่านั้น ห้ามวางสายจริง/ส่งข้อความในการทดสอบอัตโนมัติ
6. จึงค่อยเผยแพร่ลิงก์ A/B และเริ่มนับช่วงทดลอง 2 สัปดาห์ ไม่เริ่มนับจากวันที่เตรียมโค้ด

Rollback แอปให้กลับ commit production ก่อนชุดนี้ (`f711e96069460e12e4ef4dd4a85a95b8337498ec`) ได้โดยไม่ต้องลบ column หรือข้อมูล: ฟังก์ชัน 5 arguments ยังทำงาน. การลบ column/ข้อมูลเป็น destructive migration แยกต่างหากและไม่อยู่ในขอบเขตนี้

## สิ่งที่ยังไม่เปลี่ยน

- ไม่มี third-party tracker หรือ dependency ใหม่ และไม่เปลี่ยน Meta Pixel เดิม. Meta Pixel ที่มีอยู่โหลดอัตโนมัติบน production โดยยังไม่มี consent gate ในโค้ดปัจจุบัน และผู้ให้บริการอาจประมวลผล URL/UTM ตามการตั้งค่าเดิม; ประเด็นนี้ต้องแยกทบทวนนโยบายความเป็นส่วนตัวก่อนเปลี่ยน tracking เดิม
- ไม่มีการเปลี่ยน credentials, สิทธิ์ database, ERP, LINE Flex, โฆษณา หรือบทสนทนาลูกค้า
- ยังไม่มีนโยบายลบ raw analytics ตามอายุที่เจ้าของอนุมัติ จึงไม่เพิ่มงานลบข้อมูลอัตโนมัติในชุดนี้
- บัญชี Google Search Console ที่ตรวจยังไม่มี property ตรงกับโดเมน แต่ Google organic พบ `/sell-car`; จึงไม่มีหลักฐานว่าเว็บไซต์ทั้งเว็บถูก deindex และชุดนี้ไม่เปลี่ยน ownership/verification
- Google Business Profile พบรายการซ้ำ แต่ไม่เปลี่ยน ownership, verification หรือข้อมูลรายการในชุดนี้
