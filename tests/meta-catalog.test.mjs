import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { catalogVehicleRows, createMetaCatalogCsv } = loadTs("lib/meta-catalog.ts");
const vehicle = (fields = {}) => ({
  carId: "PD0001",
  slug: "pd0001",
  status: "available",
  brand: "Toyota",
  model: "Yaris",
  year: 2024,
  title: "Toyota Yaris 2024",
  description: "รถสวย, พร้อมใช้",
  salePrice: 519000,
  featured: false,
  coverImageUrl: "https://erp.example/primary.jpg",
  photos: [
    { fileId: "1", url: "https://erp.example/primary.jpg", isPrimary: true, sortOrder: 0 },
    { fileId: "2", url: "https://erp.example/side.jpg", isPrimary: false, sortOrder: 1 }
  ],
  updatedAt: "2026-10-02T00:00:00Z",
  ...fields
});

test("catalog uses the stable ERP Car ID and complete public listing fields", () => {
  const [row] = catalogVehicleRows([vehicle()]);
  assert.equal(row.id, "PD0001");
  assert.equal(row.link, "https://www.pdcarcenter.com/cars/pd0001");
  assert.equal(row.image_link, "https://erp.example/primary.jpg");
  assert.equal(row.additional_image_link, "https://erp.example/side.jpg");
  assert.equal(row.price, "519000.00 THB");
  assert.equal(row.availability, "in stock");
  assert.equal(row.quantity_to_sell_on_facebook, "1");
});

test("reserved cars stay in the feed but cannot be advertised as in stock", () => {
  const [row] = catalogVehicleRows([vehicle({ status: "reserved" })]);
  assert.equal(row.availability, "out of stock");
  assert.equal(row.quantity_to_sell_on_facebook, "0");
});

test("invalid listings without a public photo or sale price are excluded", () => {
  assert.equal(catalogVehicleRows([vehicle({ coverImageUrl: undefined }), vehicle({ salePrice: 0 })]).length, 0);
});

test("CSV is UTF-8 compatible and safely quotes commas and image lists", () => {
  const csv = createMetaCatalogCsv([vehicle()]);
  assert(csv.startsWith("\uFEFFid,title,description"));
  assert(csv.includes('"รถสวย, พร้อมใช้"'));
  assert(csv.includes("PD0001"));
});
