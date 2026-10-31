import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

let result;
const readiness = loadTs("app/api/readiness/route.ts", {
  "@/lib/vehicle-data": { getPublicVehicles: async () => result }
});

test("readiness reports available and reserved separately", async () => {
  result = { source: "supabase", vehicles: [{ status: "available" }, { status: "reserved" }, { status: "available" }] };
  const response = await readiness.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ready", inventory: { published: 3, available: 2, reserved: 1 } });
});

test("readiness returns 503 when public inventory cannot be verified", async () => {
  result = { source: "view_not_ready", vehicles: [], message: "temporary" };
  const response = await readiness.GET();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "unavailable", dependency: "public_vehicle_listings" });
});
