import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const info = loadTs("lib/business-info.ts");

test("business hours distinguish ordinary opening from appointment-only viewing", () => {
  assert.equal(info.businessMapUrl, "https://maps.app.goo.gl/nzqpjnq3GD5LNs5W6");
  assert.match(info.businessHoursText, /08:00–17:00/);
  assert.match(info.viewingAppointmentText, /นัดชมรถล่วงหน้า.*19:00/);
  assert.equal(info.businessOpeningHours.opens, "08:00");
  assert.equal(info.businessOpeningHours.closes, "17:00");
  assert.equal(info.businessOpeningHours.dayOfWeek.length, 7);
});
