import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type PublicSupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export type PublicSupabaseConfig = { url: string; key: string };

export async function publicSupabaseConfig(): Promise<PublicSupabaseConfig | null> {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return { url, key };

  try {
    const { env } = await getCloudflareContext({ async: true });
    const runtime = env as PublicSupabaseEnvironment;
    url ||= runtime.NEXT_PUBLIC_SUPABASE_URL?.trim();
    key ||= runtime.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  } catch {
    // Local Next.js and isolated tests do not have a Cloudflare request context.
  }

  return url && key ? { url, key } : null;
}
