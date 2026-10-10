import "server-only";
import postgres from "postgres";
import { required } from "./security";
import { articleDatabaseTls } from "./database-tls";

let connection: ReturnType<typeof postgres> | undefined;
export function articleDb() {
  if (!connection) connection = postgres(required("ARTICLE_DATABASE_URL"), {
    ssl: articleDatabaseTls(), max: 2, prepare: false, connect_timeout: 10, idle_timeout: 20,
    connection: { application_name: "pdcar-article-approval", statement_timeout: 15000 },
  });
  return connection;
}
