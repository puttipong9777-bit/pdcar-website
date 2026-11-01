import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const detail = readFileSync(new URL("../app/cars/[identifier]/page.tsx", import.meta.url), "utf8");
const stories = readFileSync(new URL("../components/vehicle-stories.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
const analyticsClient = readFileSync(new URL("../components/site-analytics.tsx", import.meta.url), "utf8");

test("detail page labels model year and keeps the long seller caption after primary content", () => {
  assert(detail.includes("ปีรุ่น"));
  assert(detail.indexOf('className="detail-layout"') < detail.indexOf('className="vehicle-description"'));
  assert(detail.includes("ไม่ใช่คำรับรองผลอนุมัติ"));
});

test("video rail promotes only published YouTube references", () => {
  assert(stories.includes("vehicles.filter((vehicle) => vehicle.youtubeVideoId)"));
  assert(!stories.includes("คลิปกำลังมา"));
  assert(home.includes("videos.length ? <section"));
});

test("homepage quick guides do not promote the empty article index", () => {
  assert(!home.includes("อ่านบทความทั้งหมด"));
});

test("reserved vehicle schema and contact context match the public status", () => {
  assert(detail.includes('"https://schema.org/OutOfStock"'));
  assert(!detail.includes('"https://schema.org/LimitedAvailability"'));
  assert(detail.includes("รถคันนี้ติดจอง"));
  assert(detail.includes("ปุ่ม LINE เปิดโปรไฟล์ร้านและไม่ส่งข้อความอัตโนมัติ"));
});

test("all global phone and LINE links are measured without a persistent visitor id", () => {
  assert.equal((header.match(/data-analytics="phone_click"/g) || []).length, 3);
  assert.equal((header.match(/data-analytics="line_click"/g) || []).length, 3);
  assert(analyticsClient.includes("window.sessionStorage"));
  assert(!analyticsClient.includes("window.localStorage"));
});
