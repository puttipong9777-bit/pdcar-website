import type { ArticleSource } from "./types";

// Editorial fact pack, reviewed 2026-09-08. No market statistics or jurisdiction-specific rules.
export const sources: ArticleSource[] = [
  { id: "tires", title: "NHTSA — Tire safety", url: "https://www.nhtsa.gov/vehicle-safety/tires", facts: [
    { id: "pressure", text: "ใช้แรงดันยางตามป้ายรถหรือคู่มือผู้ผลิต ตรวจขณะยางเย็น และตรวจยางอะไหล่ด้วยถ้ามี" },
    { id: "tread", text: "ตรวจรอยสึกและสะพานยาง หากไม่แน่ใจให้ช่างตรวจสภาพยาง" },
    { id: "rotation", text: "วิธีและช่วงสลับยางขึ้นกับคู่มือรถ รถบางรุ่นไม่เหมาะกับการสลับยาง" },
  ] },
  { id: "trip", title: "NHTSA — Summer driving tips", url: "https://www.nhtsa.gov/summer-driving-tips", facts: [
    { id: "lights", text: "ตรวจไฟหน้า ไฟเบรก ไฟเลี้ยว และไฟฉุกเฉินก่อนเดินทาง" },
    { id: "wipers", text: "ตรวจใบปัดน้ำฝนและน้ำฉีดกระจก เปลี่ยนใบปัดที่เสื่อมเพื่อการมองเห็น" },
    { id: "service", text: "เตรียมรถด้วยการบำรุงรักษาตามคำแนะนำผู้ผลิต ให้ช่างตรวจเมื่อมีปัญหา" },
    { id: "supplies", text: "เตรียมอุปกรณ์ฉุกเฉิน เช่น โทรศัพท์ ที่ชาร์จ ไฟฉาย ชุดปฐมพยาบาล และน้ำดื่ม" },
  ] },
];
export const topics = [
  "เช็กลมยางก่อนใช้รถมือสอง", "อ่านคู่มือรถเพื่อดูแลยาง", "สังเกตการสึกของยาง", "เตรียมไฟรถก่อนเดินทาง",
  "ดูแลทัศนวิสัยผ่านกระจกหน้า", "เตรียมอุปกรณ์ฉุกเฉินในรถ", "เริ่มดูแลรถหลังรับรถมือสอง", "เช็กรถก่อนทริประยะไกล",
  "รู้จักยางอะไหล่ของรถคุณ", "ทำไมการสลับยางต้องดูคู่มือ", "รายการตรวจรถสำหรับมือใหม่", "เตรียมรถสำหรับวันฝนตก",
];
export function topicForDay(day: string) { return topics[Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000) % topics.length]; }
