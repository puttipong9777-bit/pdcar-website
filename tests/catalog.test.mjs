import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Execute the pure TypeScript catalog helpers without adding a test dependency.
const source = readFileSync(new URL("../lib/vehicle-catalog.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const context = { exports: {} };
runInNewContext(outputText, context);
const { filterCatalog, getCatalogPhotos, defaultCatalogFilters } = context.exports;
const makeVehicle = (fields) => Object.freeze({ carId: "TEST", slug: "test", status: "available", brand: "Toyota", model: "Yaris", title: "Toyota Yaris", year: 2020, photos: [], featured: false, updatedAt: "2026-01-01", ...fields });
const vehicles = Object.freeze([
  makeVehicle({ carId: "A", salePrice: 500000, year: 2023, featured: true }),
  makeVehicle({ carId: "B", salePrice: 300000, brand: "Honda", title: "Honda City", status: "reserved", year: 2021 }),
  makeVehicle({ carId: "C", year: 2024 }),
  makeVehicle({ carId: "D", salePrice: 800000, title: "Toyota Fortuner", model: "Fortuner", year: 2019 })
]);
const ids = (filters = {}) => filterCatalog(vehicles, { ...defaultCatalogFilters, ...filters }).map((vehicle) => vehicle.carId).join(",");

test("default preserves all cars and the source order", () => assert.equal(ids(), "A,B,C,D"));
test("search trims whitespace and ignores English case", () => assert.equal(ids({ query: "  fOrTuNeR  " }), "D"));
test("search includes Car ID and year", () => { assert.equal(ids({ query: "2023" }), "A"); assert.equal(ids({ query: "C" }), "B,C"); });
test("brand, status and year filters compose", () => assert.equal(ids({ brand: "Honda", status: "reserved", year: "2021" }), "B"));
test("budget is inclusive and excludes an unknown price", () => assert.equal(ids({ maxPrice: "500000" }), "A,B"));
test("both price sorts keep unknown prices last", () => { assert.equal(ids({ sort: "price-asc" }), "B,A,D,C"); assert.equal(ids({ sort: "price-desc" }), "D,A,B,C"); });
test("year sorting and empty results", () => { assert.equal(ids({ sort: "year-desc" }), "C,A,B,D"); assert.equal(ids({ query: "no-such-car" }), ""); });
test("filtering and sorting never mutate inventory records", () => { const before = JSON.stringify(vehicles); ids({ sort: "price-desc" }); ids({ maxPrice: "300000" }); assert.equal(JSON.stringify(vehicles), before); });
test("photo list preserves originals, removes duplicates and puts cover first", () => { const photos = getCatalogPhotos(makeVehicle({ coverImageUrl: "/cover.jpg", photos: [{ url: "/side.jpg" }, { url: "/cover.jpg" }] })); assert.equal(photos.join(","), "/cover.jpg,/side.jpg"); });
test("photo and inventory empty states are safe", () => { assert.equal(getCatalogPhotos(makeVehicle({})).length, 0); assert.equal(filterCatalog([], defaultCatalogFilters).length, 0); });
