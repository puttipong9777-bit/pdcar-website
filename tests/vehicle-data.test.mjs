import assert from "node:assert/strict";
import { after, test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalMedia = process.env.NEXT_PUBLIC_VEHICLE_IMAGE_BASE_URL;
let response = { data: [], error: null };

const query = {
  select() { return this; },
  order() { return this; },
  then(resolve, reject) {
    return response instanceof Error ? Promise.reject(response).then(resolve, reject) : Promise.resolve(response).then(resolve, reject);
  }
};

const vehicleData = loadTs("lib/vehicle-data.ts", {
  react: { cache: (fn) => fn },
  "@supabase/supabase-js": { createClient: () => ({ from: () => query }) }
});

after(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  if (originalMedia === undefined) delete process.env.NEXT_PUBLIC_VEHICLE_IMAGE_BASE_URL; else process.env.NEXT_PUBLIC_VEHICLE_IMAGE_BASE_URL = originalMedia;
});

test("public inventory preserves published available/reserved while excluding sold and explicitly unpublished rows", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";
  process.env.NEXT_PUBLIC_VEHICLE_IMAGE_BASE_URL = "https://media.example/vehicles";
  response = {
    error: null,
    data: [
      {
        car_id: "PD0018", status: "reserved", brand: "Toyota Toyota", model: "Fortunner", variant: "2.4 Auto",
        year: 2019, fuel_type: "diesel", transmission: "automatic", website_title: "Toyota Fortunner 2019",
        photos: [
          { fileId: "FILE-side", isPrimary: false, sortOrder: 2 },
          { fileId: "FILE-cover", isPrimary: true, sortOrder: 9 }
        ], updated_at: "2026-01-01"
      },
      { car_id: "PD-SOLD", status: "sold", brand: "Honda", model: "City", year: 2022, photos: [] },
      { car_id: "PD-UNPUBLISHED", status: "available", website_published: false, brand: "Mazda", model: "2", year: 2023, photos: [] }
    ]
  };

  const result = await vehicleData.getPublicVehicles();
  assert.equal(result.source, "supabase");
  assert.equal(result.vehicles.length, 1);
  assert.equal(result.vehicles[0].status, "reserved");
  assert.equal(result.vehicles[0].brand, "Toyota");
  assert.equal(result.vehicles[0].model, "Fortuner");
  assert.equal(result.vehicles[0].fuelType, "ดีเซล");
  assert.equal(result.vehicles[0].transmission, "อัตโนมัติ");
  assert.equal(result.vehicles[0].coverImageUrl, "https://media.example/vehicles/FILE-cover");
});

test("lookup distinguishes a real miss from an unavailable upstream", async () => {
  response = { data: [], error: null };
  assert.equal((await vehicleData.getPublicVehicle("PD-NOT-FOUND")).status, "not_found");

  response = { data: null, error: { message: "database offline" } };
  const unavailable = await vehicleData.getPublicVehicle("PD0018");
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.source, "view_not_ready");

  response = new Error("network timeout");
  assert.equal((await vehicleData.getPublicVehicles()).source, "view_not_ready");
});

test("missing public configuration is reported as unavailable rather than empty inventory", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const result = await vehicleData.getPublicVehicle("PD0018");
  assert.equal(result.status, "unavailable");
  assert.equal(result.source, "not_configured");
});
