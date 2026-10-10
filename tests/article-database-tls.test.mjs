import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("database TLS verifies certificates by default and with the provider CA", () => {
  const env = {};
  const { articleDatabaseTls } = loadTs("lib/article-approval/database-tls.ts", {}, { process: { env } });
  assert.equal(articleDatabaseTls(), "verify-full");
  const ca = "-----BEGIN CERTIFICATE-----\npublic-ca-fixture\n-----END CERTIFICATE-----\n";
  env.ARTICLE_DATABASE_CA_BASE64 = Buffer.from(ca).toString("base64");
  assert.deepEqual(articleDatabaseTls(), { rejectUnauthorized: true, ca });
  env.ARTICLE_DATABASE_CA_BASE64 = Buffer.from("not a certificate").toString("base64");
  assert.throws(() => articleDatabaseTls(), /invalid_database_ca/);
});
