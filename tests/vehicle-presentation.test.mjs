import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const presentation = loadTs("lib/vehicle-presentation.ts");
const vehicle = (fields = {}) => ({
  carId: "PD0018", slug: "pd0018", status: "reserved", brand: "Toyota", model: "Fortuner", year: 2019,
  title: "Toyota Fortuner 2.4 2019", description: "ข้อความขายยาวมาก ".repeat(100), salePrice: 819000, mileage: 120000,
  featured: false, photos: [], updatedAt: "2026-01-01", ...fields
});

test("vehicle metadata is concise and based on structured facts", () => {
  const description = presentation.vehicleMetaDescription(vehicle());
  assert(description.length <= 160);
  assert(description.includes("ปีรุ่น 2019"));
  assert(description.includes("สถานะติดจอง"));
  assert(!description.includes("ข้อความขายยาวมาก"));
});

test("related vehicles prefer same-brand available stock without mutating input", () => {
  const inventory = [
    vehicle(),
    vehicle({ carId: "A", brand: "Honda", status: "available" }),
    vehicle({ carId: "B", brand: "Toyota", status: "reserved" }),
    vehicle({ carId: "C", brand: "Toyota", status: "available" })
  ];
  const before = inventory.map((item) => item.carId).join(",");
  assert.deepEqual(presentation.relatedVehicles(inventory[0], inventory).map((item) => item.carId), ["C", "B", "A"]);
  assert.equal(inventory.map((item) => item.carId).join(","), before);
});
