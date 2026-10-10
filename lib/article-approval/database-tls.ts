import { ArticleError } from "./security";

export function articleDatabaseTls() {
  const encoded = process.env.ARTICLE_DATABASE_CA_BASE64?.trim();
  if (!encoded) return "verify-full" as const;
  const ca = Buffer.from(encoded, "base64").toString("utf8");
  if (!ca.startsWith("-----BEGIN CERTIFICATE-----") || !ca.trimEnd().endsWith("-----END CERTIFICATE-----")) {
    throw new ArticleError("invalid_database_ca", 503);
  }
  // Supabase's private root is trusted only for this connection, never globally.
  // Postgres.js supplies the server hostname; Node still validates it and the CA.
  return { rejectUnauthorized: true, ca };
}
