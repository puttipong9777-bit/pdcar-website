import type {PublishedArticle} from "@/lib/article-approval/public";
import {isPublicKey} from "@/lib/vehicle-data";
type Env = Record<string,string|undefined>;
const columns="id,slug,content,sources,published_at,updated_at";
export class PublicArticleUnavailable extends Error {}
async function read(env:Env, params:Record<string,string>):Promise<PublishedArticle[]> {
  const base=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!base || !key || !isPublicKey(key)) throw new PublicArticleUnavailable();
  const url=new URL("/rest/v1/public_approved_articles",base);
  for(const [k,v] of Object.entries({select:columns,...params}))url.searchParams.set(k,v);
  try {
    const response=await fetch(url,{method:"GET",cache:"no-store",signal:AbortSignal.timeout(8000),headers:{apikey:key,...(key.startsWith("sb_publishable_")?{}:{Authorization:`Bearer ${key}`})}});
    if(!response.ok)throw new PublicArticleUnavailable();
    const rows:unknown=await response.json();
    if(!Array.isArray(rows))throw new PublicArticleUnavailable();
    return rows.map(row=>({id:row.id,slug:row.slug,content:row.content,sources:row.sources,published_at:row.published_at,updated_at:row.updated_at}));
  } catch {throw new PublicArticleUnavailable();}
}
export function getPagesArticles(env:Env,page=1) {return read(env,{order:"published_at.desc,id.asc",limit:"12",offset:String((page-1)*12)});}
export async function getPagesArticle(env:Env,slug:string) {
  if(!/^car-knowledge-\d{4}-\d{2}-\d{2}$/.test(slug))return null;
  const rows=await read(env,{slug:`eq.${slug}`,limit:"1"});
  return rows[0] || null;
}
export async function getPagesArticleSitemap(env:Env) {
  const all:PublishedArticle[]=[];
  for(let page=0;page<40;page++){
    const rows=await read(env,{order:"slug.asc",limit:"500",offset:String(page*500)});
    all.push(...rows);
    if(rows.length<500)return all;
  }
  throw new PublicArticleUnavailable();
}
