import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

function page(lookup) {
  return loadTs("app/cars/[identifier]/page.tsx", {
    "@/lib/vehicle-data": { getPublicVehicle: async () => lookup },
    "@/components/business-visit-info": {},
    "@/components/meta-view-content": {},
    "@/components/vehicle-detail-gallery": {},
  });
}
const vehicle = {
  carId: "PD0016", slug: "pd0016", status: "available", brand: "HONDA",
  model: "CIVIC", year: 2010, title: "HONDA CIVIC FD 2010", salePrice: 198000,
  coverImageUrl: "https://www.pdcarcenter.com/media/vehicle-images/test-cover",
};

test("car Twitter preview uses the same vehicle facts and cover as Open Graph", async () => {
  const metadata = await page({ status: "found", vehicle }).generateMetadata({ params: Promise.resolve({ identifier: "pd0016" }) });
  assert.equal(metadata.twitter.title, vehicle.title);
  assert.equal(metadata.twitter.description, metadata.openGraph.description);
  assert(metadata.twitter.description.includes("PD0016"));
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert.deepEqual(metadata.twitter.images, metadata.openGraph.images);
  assert.equal(metadata.alternates.canonical, "/cars/pd0016");
});
test("car without a cover does not inherit unrelated shop imagery", async () => {
  const metadata = await page({ status: "found", vehicle: { ...vehicle, coverImageUrl: undefined, status: "reserved" } }).generateMetadata({ params: Promise.resolve({ identifier: "pd0016" }) });
  assert.equal(metadata.twitter.card, "summary");
  assert.deepEqual(metadata.twitter.images, []);
  assert(metadata.twitter.description.includes("สถานะติดจอง"));
});
test("missing and unavailable vehicles retain their existing metadata behavior", async () => {
  const args = { params: Promise.resolve({ identifier: "missing" }) };
  assert.equal((await page({ status: "not_found" }).generateMetadata(args)).twitter, undefined);
  const unavailable = await page({ status: "unavailable" }).generateMetadata(args);
  assert.equal(unavailable.robots.index, false);
  assert.equal(unavailable.twitter, undefined);
});
