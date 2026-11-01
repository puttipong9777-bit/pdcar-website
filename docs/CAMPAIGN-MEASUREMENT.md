# แผนวัดผลแคมเปญรถ 3 คันแบบเก็บข้อมูลเท่าที่จำเป็น

สถานะเอกสาร: ชุดโค้ดสำหรับตรวจใน Draft PR เท่านั้น แคมเปญยังไม่เริ่มจนกว่าจะนำโค้ดและ migration ขึ้นจริง ตรวจการรับค่า UTM แล้ว และเผยแพร่ลิงก์จริง. Migration เพิ่มฟังก์ชัน `SECURITY DEFINER` และสิทธิ์ `EXECUTE` ให้ role เดิม จึงต้องได้รับอนุมัติด้านสิทธิ์และฐานข้อมูลโดยเฉพาะก่อนใช้จริง

## ขอบเขตข้อมูล

ระบบสถิติ first-party ที่เพิ่มในชุดนี้รับและบันทึกเฉพาะค่าต่อไปนี้:

- `utm_source`: `facebook` หรือ `line`
- `utm_medium`: `organic_social` หรือ `messaging`
- `utm_campaign`: `pd0025_a`, `pd0025_b`, `pd0028_a`, `pd0028_b`, `pd0002_a`, `pd0002_b`
- เหตุการณ์: เปิดหน้า, เปิดรถ, ปัดรูป, กดโทร, กด LINE พร้อมรหัสรถเมื่อปุ่มอยู่บนหน้ารถ

ค่าอื่นถูกทิ้งจากระบบ first-party ทั้งหมด ไม่บันทึก query string เต็ม, referrer, IP, user agent, อีเมล, เบอร์ลูกค้า, เนื้อหาข้อความ หรือ advertising ID. ข้อความนี้กล่าวถึงระบบ first-party ใน PR นี้เท่านั้น ไม่ครอบคลุม Meta Pixel เดิมซึ่งไม่ได้เปลี่ยน. รหัส session แบบสุ่มอยู่ใน `sessionStorage` และหมดเมื่อปิดแท็บ/หน้าต่าง ไม่ใช้รหัสผู้เข้าชมถาวรใน `localStorage`. ตัวเลข “กดโทร” และ “กด LINE” เป็นเพียงการกดปุ่ม ไม่ใช่ยอดนัดหรือยอดขาย

ระบบยึด UTM ชุดแรกที่ผ่าน allowlist ใน session เดียว เพื่อให้การเปิดหน้ารถถัดไปยังอ้างแคมเปญเดิม โดยไม่เก็บ URL ต้นทาง

ก่อน PR นี้ ค่า “ผู้เข้าชม” ใช้ session ID ใน `localStorage` ซึ่งคงอยู่ข้ามแท็บและการกลับมาใช้เว็บภายหลัง; PR นี้เปลี่ยนเป็น `sessionStorage` ระดับแท็บ/หน้าต่าง. ดังนั้นกราฟผู้เข้าชมก่อนและหลังวันเปิดใช้เปรียบเทียบตรง ๆ ไม่ได้ และจำนวนใหม่คือจำนวน session/แท็บโดยประมาณ ไม่ใช่จำนวนบุคคลจริง. ต้องทำเครื่องหมายวัน cutover ในรายงานและไม่สรุปว่าคนเพิ่มขึ้นจากการเปลี่ยนนิยามนี้

## ลิงก์ที่เตรียมไว้

URL ใช้รหัสรถซึ่ง route ปัจจุบันรองรับ และหน้ารถจะประกาศ canonical slug จากข้อมูล ERP:

| รถ | ราคาอ้างอิงที่ตรวจ 1 พ.ย. 2569 | Facebook A/B | LINE reply A |
|---|---:|---|---|
| PD0025 | 389,000 บาท | `/cars/PD0025?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0025_a`<br>`/cars/PD0025?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0025_b` | `/cars/PD0025?utm_source=line&utm_medium=messaging&utm_campaign=pd0025_a` |
| PD0028 | 448,000 บาท | `/cars/PD0028?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0028_a`<br>`/cars/PD0028?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0028_b` | `/cars/PD0028?utm_source=line&utm_medium=messaging&utm_campaign=pd0028_a` |
| PD0002 | 289,000 บาท | `/cars/PD0002?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0002_a`<br>`/cars/PD0002?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0002_b` | `/cars/PD0002?utm_source=line&utm_medium=messaging&utm_campaign=pd0002_a` |

เติมโดเมน `https://www.pdcarcenter.com` ข้างหน้าก่อนเผยแพร่ ราคาเป็นหลักฐาน ณ วันที่ตรวจ ไม่ใช่ค่าที่ฝังในลิงก์; หน้ารถยังแสดงราคาจริงจาก public ERP view

## รายงานหลังบ้าน

- เลือกช่วง 1, 7, 14 หรือ 30 วัน พร้อมแสดงวันที่เริ่ม–สิ้นสุดและเขตเวลา `Asia/Bangkok`
- แยกกดโทรและกด LINE ทั้งภาพรวมและรายรถ
- แสดง source / medium / campaign ที่ผ่าน allowlist เท่านั้น; การเข้าชมที่ไม่มีค่าที่อนุญาตรวมใน “ไม่ติดแท็ก / ไม่ทราบแหล่งที่มา”. กลุ่มนี้ไม่ใช่หลักฐานว่าเข้าตรง เพราะอาจมาจาก organic search, shared link, bookmark, ลิงก์ที่ถูกตัด UTM หรือค่า UTM ที่ไม่ผ่าน allowlist
- ใช้แคมเปญ A/B เพื่อแยกชิ้นงาน แต่ผลต้องอ่านร่วมกับจำนวนผู้เข้าชม และต้องไม่เรียก click ว่า lead หรือ sale

## ลำดับนำขึ้นและการตรวจ

1. สำรองและตรวจ migration `20261101162830_campaign_attribution.sql` ในฐานข้อมูลทดสอบ
2. ขออนุมัติฐานข้อมูล/สิทธิ์สำหรับฟังก์ชัน `site_admin.record_event` แบบ 8 arguments ซึ่งเป็น `SECURITY DEFINER`; migration revoke `EXECUTE` จาก `PUBLIC`, `anon`, `authenticated` และ grant `EXECUTE` เฉพาะ role เดิม `pdcar_article_worker`. ไม่มี table write grant โดยตรง แต่การเพิ่ม function grant นี้ยังถือเป็นการเปลี่ยนสิทธิ์ที่ต้องอนุมัติ
3. ใช้ migration ก่อนโค้ด เพราะโค้ดใหม่เรียกฟังก์ชัน 8 arguments; ฟังก์ชันเดิมแบบ 5 arguments ยังคงอยู่เพื่อรองรับ rollback แอป
4. นำโค้ดขึ้น แล้วเปิดลิงก์ทดสอบ A อย่างละหนึ่งครั้งจาก session ใหม่ โดยไม่กดโทรหรือส่ง LINE
5. ตรวจหน้า admin ว่า source/medium/campaign ถูกต้องและไม่มี query อื่นหลุดเข้า database
6. ตรวจปุ่มโทร/LINE บนรถแต่ละคันโดยตรวจปลายทางเท่านั้น ห้ามวางสายจริง/ส่งข้อความในการทดสอบอัตโนมัติ
7. จึงค่อยเผยแพร่ลิงก์ A/B และเริ่มนับช่วงทดลอง 2 สัปดาห์ ไม่เริ่มนับจากวันที่เตรียมโค้ด

Rollback แอปให้กลับ commit production ก่อนชุดนี้ (`f711e96069460e12e4ef4dd4a85a95b8337498ec`) ได้โดยไม่ต้องลบ column หรือข้อมูล: ฟังก์ชัน 5 arguments ยังทำงาน. การลบ column/ข้อมูลเป็น destructive migration แยกต่างหากและไม่อยู่ในขอบเขตนี้

## สิ่งที่ยังไม่เปลี่ยน

- ไม่มี third-party tracker หรือ dependency ใหม่ และไม่เปลี่ยน Meta Pixel เดิม. Meta Pixel ที่มีอยู่โหลดอัตโนมัติบน production โดยยังไม่มี consent gate ในโค้ดปัจจุบัน และผู้ให้บริการอาจประมวลผล URL/UTM ตามการตั้งค่าเดิม; ประเด็นนี้ต้องแยกทบทวนนโยบายความเป็นส่วนตัวก่อนเปลี่ยน tracking เดิม
- ไม่มีการเปลี่ยน credentials, ERP, LINE Flex, โฆษณา หรือบทสนทนาลูกค้า. มีการเปลี่ยนสิทธิ์เฉพาะการ grant `EXECUTE` ฟังก์ชันใหม่ให้ `pdcar_article_worker` ตามที่เปิดเผยข้างต้น; ยังไม่ได้ใช้กับ production
- ยังไม่มีนโยบายลบ raw analytics ตามอายุที่เจ้าของอนุมัติ จึงไม่เพิ่มงานลบข้อมูลอัตโนมัติในชุดนี้
- บัญชี Google Search Console ที่ตรวจยังไม่มี property ตรงกับโดเมน แต่ Google organic พบ `/sell-car`; จึงไม่มีหลักฐานว่าเว็บไซต์ทั้งเว็บถูก deindex และชุดนี้ไม่เปลี่ยน ownership/verification
- Google Business Profile พบรายการซ้ำ แต่ไม่เปลี่ยน ownership, verification หรือข้อมูลรายการในชุดนี้
