import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Article } from "./types";

export type PublishedArticle = Pick<Article, "id" | "slug" | "content" | "sources" | "published_at" | "updated_at">;
function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false }, global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8_000) }),
  } });
}
const columns = "id,slug,content,sources,published_at,updated_at";
export async function getArticles(page = 1, pageSize = 12): Promise<PublishedArticle[]> {
  const db = publicClient(); if (!db) return [];
  try {
    const { data, error } = await db.from("public_approved_articles").select(columns)
      .order("published_at", { ascending: false }).order("id")
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) return [];
    return data as PublishedArticle[];
  } catch { return []; }
}
export async function getArticle(slug: string): Promise<PublishedArticle | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 100) return null;
  const db = publicClient(); if (!db) return null;
  try {
    const { data, error } = await db.from("public_approved_articles").select(columns).eq("slug", slug).maybeSingle();
    return error ? null : data as PublishedArticle | null;
  } catch { return null; }
}
export async function articleSitemapRows() {
  // Page through PostgREST's row cap so older articles remain discoverable.
  const all: { slug: string; updated_at: string }[] = [];
  const db = publicClient(); if (!db) return all;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("public_approved_articles").select("slug,updated_at")
      .order("slug").range(offset, offset + 499);
    if (error) throw new Error("article_sitemap_unavailable");
    all.push(...data);
    if (data.length < 500) return all;
  }
}
