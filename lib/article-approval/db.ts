import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";
import { required } from "./security";
import { articleDatabaseTls } from "./database-tls";

type HyperdriveBinding = { connectionString: string };
let directConnection: ReturnType<typeof postgres> | undefined;

async function hyperdriveConnectionString() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as CloudflareEnv & { ARTICLE_DATABASE_HYPERDRIVE?: HyperdriveBinding }).ARTICLE_DATABASE_HYPERDRIVE;
    return binding?.connectionString?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function articleDb() {
  const hyperdriveUrl = await hyperdriveConnectionString();
  if (hyperdriveUrl) {
    // Hyperdrive owns the database pool. Prepared statements avoid the extra
    // protocol round trips that can hang transaction-pooled connections.
    return postgres(hyperdriveUrl, {
      max: 5,
      fetch_types: false,
      prepare: true,
      connect_timeout: 10,
      idle_timeout: 20,
      connection: { application_name: "pdcar-article-approval", statement_timeout: 15000 },
    });
  }
  if (!directConnection) directConnection = postgres(required("ARTICLE_DATABASE_URL"), {
    ssl: articleDatabaseTls(), max: 1, prepare: false, connect_timeout: 10, idle_timeout: 20,
    connection: { application_name: "pdcar-article-approval", statement_timeout: 15000 },
  });
  return directConnection;
}
