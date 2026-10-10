import {renderToString} from "react-dom/server.browser";
import {getPublicVehicles} from "@/lib/vehicle-data";
import {createMetaCatalogCsv} from "@/lib/meta-catalog";
import {App,type PageData} from "./app";
import {renderHome} from "./render-home";
import {getPagesArticle,getPagesArticles,getPagesArticleSitemap} from "./article-data";
type Env=Record<string,string|undefined>;
type Assets={fetch(request:Request):Promise<Response>};
const origin="https://www.pdcarcenter.com";
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const safeJson=(value:unknown)=>JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
const publicRoutes=new Set(["/","/sell-car","/articles","/article-admin","/robots.txt","/sitemap.xml","/articles/sitemap.xml","/api/health","/api/meta/catalog-feed"]);
const adminRoutes=new Set(["/api/cron/article-drafts","/api/article-approval/admin","/api/article-approval/operations","/api/article-approval/line-callback"]);
export async function handleRequest(request:Request,env:Env,assets?:Assets) {
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,"") || "/";
  const preview=url.hostname!=="www.pdcarcenter.com" && url.hostname!=="pdcarcenter.com";
  const reply=(body:string,type="text/html; charset=utf-8",status=200,extra:Record<string,string>={})=>new Response(request.method==="HEAD"?null:body,{status,headers:{"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...(preview?{"X-Robots-Tag":"noindex, nofollow"}:{}),...extra}});
  const json=(value:unknown,status=200)=>reply(JSON.stringify(value),"application/json",status,{"X-Robots-Tag":"noindex, nofollow"});
  if(adminRoutes.has(path)) {
    const methods=path==="/api/article-approval/admin" || path==="/api/article-approval/line-callback"?["POST"]:["GET","POST"];
    if(!methods.includes(request.method))return reply("Method not allowed","text/plain",405,{Allow:methods.join(", ")});
    if(path.endsWith("/line-callback"))return json({error:"disabled"},404);
    if(path.endsWith("/admin"))return json({error:env.ARTICLE_APPROVAL_ENABLED==="true"?"article_activation_requires_review":"disabled"},503);
    // Pages has no cron scheduler. Preserve the current disabled integration and
    // fail closed if someone tries to enable it without the reviewed Node backend.
    if(!env.CRON_SECRET)return json({error:"missing_CRON_SECRET"},503);
    const encoder=new TextEncoder();
    const [a,b]=await Promise.all([crypto.subtle.digest("SHA-256",encoder.encode(request.headers.get("authorization") || "")),crypto.subtle.digest("SHA-256",encoder.encode("Bearer "+env.CRON_SECRET))]);
    const left=new Uint8Array(a),right=new Uint8Array(b);let mismatch=0;for(let i=0;i<left.length;i++)mismatch|=left[i]^right[i];
    if(env.CRON_SECRET.length<32 || mismatch)return json({error:"unauthorized"},401);
    return env.ARTICLE_APPROVAL_ENABLED==="true"?json({error:"article_activation_requires_review"},503):json({status:"disabled"});
  }
  if(!publicRoutes.has(path) && !/^\/(cars|articles)\/[^/]+$/.test(path))return assets?assets.fetch(request):reply("Not found","text/plain",404);
  if(!["GET","HEAD"].includes(request.method))return reply("Method not allowed","text/plain",405,{Allow:"GET, HEAD"});
  if(path==="/api/health")return json({status:"ok",service:"pdcar-website",runtime:"cloudflare-pages",timestamp:new Date().toISOString()});
  if(path==="/robots.txt")return reply(preview?"User-agent: *\nDisallow: /\n":`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/articles/sitemap.xml\nHost: ${origin}\n`,"text/plain; charset=utf-8");
  const data:PageData={kind:"not-found",result:{source:"supabase",vehicles:[]},phone:env.NEXT_PUBLIC_SHOP_PHONE || "0840079122",lineUrl:env.NEXT_PUBLIC_LINE_URL,tracking:!preview};
  let status=200;
  if(path==="/" || path.startsWith("/cars/") || path==="/sitemap.xml" || path==="/api/meta/catalog-feed") {
    let identifier:string|undefined;
    if(path.startsWith("/cars/")){try{identifier=decodeURIComponent(path.slice(6));}catch{return reply("Bad request","text/plain",400);}}
    const result=await getPublicVehicles(env,identifier),unavailable=result.source!=="supabase";
    if(path==="/api/meta/catalog-feed")return unavailable?json({message:result.message},503):reply(createMetaCatalogCsv(result.vehicles),"text/csv; charset=utf-8",200,{"Content-Disposition":'inline; filename="pdcar-meta-catalog.csv"'});
    if(path==="/sitemap.xml"){
      if(unavailable)return reply("Temporarily unavailable","text/plain",503);
      const dates=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?"":`<lastmod>${d.toISOString()}</lastmod>`;};
      const pages=[`<url><loc>${origin}/</loc><changefreq>daily</changefreq><priority>1</priority></url>`,`<url><loc>${origin}/sell-car</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,`<url><loc>${origin}/articles</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,...result.vehicles.map(v=>`<url><loc>${origin}/cars/${escape(encodeURIComponent(v.slug))}</loc>${dates(v.updatedAt)}<changefreq>weekly</changefreq><priority>${v.featured?0.8:0.7}</priority>${v.coverImageUrl?`<image:image><image:loc>${escape(v.coverImageUrl)}</image:loc></image:image>`:""}</url>`)];
      return reply(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${pages.join("")}</urlset>`,"application/xml; charset=utf-8");
    }
    data.vehicle=identifier===undefined?undefined:result.vehicles.find(v=>v.carId===identifier || v.slug===identifier);
    data.kind=identifier===undefined?"home":unavailable?"unavailable":data.vehicle?"vehicle":"not-found";
    data.result=identifier===undefined?result:{...result,vehicles:[]};
    status=unavailable?503:identifier!==undefined&&!data.vehicle?404:200;
  } else if(path==="/sell-car")data.kind="sell-car";
  else if(path==="/article-admin"){data.kind="admin-disabled";if(env.ARTICLE_APPROVAL_ENABLED==="true")status=503;}
  else {
    try {
      if(path==="/articles/sitemap.xml"){
        const rows=await getPagesArticleSitemap(env);
        return reply(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.map(a=>`<url><loc>${origin}/articles/${escape(a.slug)}</loc>${Number.isNaN(new Date(a.updated_at).getTime())?"":`<lastmod>${new Date(a.updated_at).toISOString()}</lastmod>`}<changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("")}</urlset>`,"application/xml; charset=utf-8");
      }
      if(path==="/articles"){data.kind="articles";data.page=Math.max(1,Math.min(10000,Number.parseInt(url.searchParams.get("page")||"1",10)||1));data.articles=await getPagesArticles(env,data.page);}
      else {
        let slug:string;try{slug=decodeURIComponent(path.slice(10));}catch{return reply("Bad request","text/plain",400);}
        data.article=(await getPagesArticle(env,slug))||undefined;
        data.kind=data.article?.content?"article":"not-found";
        if(!data.article?.content)status=404;
      }
    }catch{data.kind="unavailable";status=503;if(path==="/articles/sitemap.xml")return reply("Temporarily unavailable","text/plain",503);}
  }
  if(request.method==="HEAD")return reply("",undefined,status);
  const title=data.vehicle?`${data.vehicle.title} | PD Car Center`:data.article?.content?`${data.article.content.title} | PD Car Center`:data.kind==="sell-car"?"รับซื้อรถมือสองนครปฐม | ขายรถให้เรา | PD Car Center":data.kind==="articles"?"บทความความรู้รถยนต์และรถมือสอง | PD Car Center":data.kind==="admin-disabled"?"จัดการบทความ | PD Car Center":status===404?"ไม่พบหน้า | PD Car Center":"PD Car Center | รถมือสองและรับซื้อรถนครปฐม";
  const description=data.vehicle?.description || (data.vehicle?`${data.vehicle.title} ดูราคา รูปจริง เลขไมล์ และรายละเอียดรถจาก PD Car Center นครปฐม`:data.article?.content?.description || (data.kind==="sell-car"?"อยากขายรถมือสองในนครปฐม ส่งยี่ห้อ รุ่น ปี เลขไมล์ และรูปถ่ายให้ PD Car Center ประเมินเบื้องต้นก่อนนัดดูรถจริง ติดต่อร้านโดยตรงผ่านช่องทางที่แสดงบนเว็บไซต์":data.kind==="articles"?"ความรู้ในการดูแลรถและเตรียมตัวใช้รถมือสอง จากบทความที่ผ่านการตรวจโดยผู้ดูแล PD Car Center":"PD Car Center รถมือสองคัดคุณภาพในนครปฐม พร้อมบริการรับซื้อรถมือสอง ติดต่อดูรถหรือส่งข้อมูลรถเพื่อประเมินเบื้องต้นกับร้านได้โดยตรง"));
  const canonical=data.vehicle?`${origin}/cars/${encodeURIComponent(data.vehicle.slug)}`:data.article?`${origin}/articles/${data.article.slug}`:`${origin}${path}`;
  const socialImage=data.vehicle?.coverImageUrl || `${origin}/og-sell-car.png`;
  const product=data.vehicle?Object.entries({"product:retailer_item_id":data.vehicle.carId,"product:condition":"used","product:availability":data.vehicle.status==="available"?"in stock":"out of stock","product:price:amount":String(data.vehicle.salePrice??0),"product:price:currency":"THB"}).map(([name,value])=>`<meta property="${name}" content="${escape(value)}">`).join(""):"";
  const articleMeta=data.article?`<meta property="article:published_time" content="${escape(data.article.published_at||"")}"><meta property="article:modified_time" content="${escape(data.article.updated_at)}">`:"";
  const markup=data.kind==="home" && data.result.source==="supabase"?renderHome(data):renderToString(<App data={data}/>);
  const pixelId=env.NEXT_PUBLIC_META_PIXEL_ID || "690571535487780";
  const pixel=!preview && /^\d+$/.test(pixelId)?`<script>${"!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');".replace("\${pixelId}",pixelId)}</script><noscript><img alt="" width="1" height="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&amp;ev=PageView&amp;noscript=1"></noscript>`:"";
  return reply(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="facebook-domain-verification" content="1h2omtxmsu0vgdm1ustg0x9zokcgl9">${status!==200||preview||data.kind==="admin-disabled"?'<meta name="robots" content="noindex,nofollow">':""}${data.kind==="admin-disabled"?'<meta name="referrer" content="no-referrer">':""}<link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(socialImage)}"><meta property="og:locale" content="th_TH"><meta property="og:type" content="${data.article?"article":"website"}"><meta name="twitter:card" content="${data.article?"summary":"summary_large_image"}"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(socialImage)}">${product}${articleMeta}<link rel="stylesheet" href="/assets/site.css"></head><body><div id="app">${markup}</div>${pixel}<script id="page-data" type="application/json">${safeJson(data)}</script><script type="module" src="/assets/client.js"></script></body></html>`,"text/html; charset=utf-8",status);
}
export default {fetch(request:Request,env:Env & {ASSETS:Assets}){return handleRequest(request,env,env.ASSETS);}};
