import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const detail = readFileSync(new URL("../app/cars/[identifier]/page.tsx", import.meta.url), "utf8");
const stories = readFileSync(new URL("../components/vehicle-stories.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

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
