import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const analytics = loadTs("lib/site-analytics/types.ts");

test("analytics accepts only the small first-party event contract", () => {
  const valid = {
    eventId: randomUUID(),
    sessionId: randomUUID(),
    eventName: "vehicle_view",
    path: "/cars/mazda-2",
    carId: "PD0002"
  };
  assert.deepEqual(analytics.parseAnalyticsEvent(valid), valid);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, eventName: "customer_phone" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, path: "https://evil.example/" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, path: "/cars/x?email=private@example.com" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, carId: "PD0002<script>" }), null);
});

test("analytics requires fresh UUID identifiers and does not accept extra identity fields", () => {
  const input = {
    eventId: randomUUID(), sessionId: "not-a-uuid", eventName: "page_view", path: "/", email: "person@example.com"
  };
  assert.equal(analytics.parseAnalyticsEvent(input), null);
  const accepted = analytics.parseAnalyticsEvent({ ...input, sessionId: randomUUID() });
  assert.deepEqual(Object.keys(accepted).sort(), ["eventId", "eventName", "path", "sessionId"].sort());
});
