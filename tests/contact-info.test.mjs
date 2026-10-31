import assert from "node:assert/strict";
import { after, test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const original = process.env.NEXT_PUBLIC_LINE_URL;
const contact = loadTs("lib/contact-info.ts");

after(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_LINE_URL; else process.env.NEXT_PUBLIC_LINE_URL = original;
});

test("verified LINE OA fallback opens the public profile without a message payload", () => {
  delete process.env.NEXT_PUBLIC_LINE_URL;
  assert.equal(contact.getPublicLineUrl(), "https://line.me/R/ti/p/%40pdcar");
  assert.equal(contact.publicLineOaId, "@pdcar");
  assert.equal(new URL(contact.getPublicLineUrl()).search, "");
});

test("only an explicit HTTPS destination overrides the verified fallback", () => {
  process.env.NEXT_PUBLIC_LINE_URL = "https://lin.ee/verified";
  assert.equal(contact.getPublicLineUrl(), "https://lin.ee/verified");
  process.env.NEXT_PUBLIC_LINE_URL = "javascript:alert(1)";
  assert.equal(contact.getPublicLineUrl(), contact.defaultPublicLineUrl);
});
