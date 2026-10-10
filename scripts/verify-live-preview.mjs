import assert from "node:assert/strict";
import {setTimeout as pause} from "node:timers/promises";
const origin="https://pdcar-website-preview.pages.dev";
const summary={origin,checkedAt:new Date().toISOString(),methods:["GET","HEAD"],productionWrites:false,checks:[],media:[],limits:"Cloudflare CPU must be read from dashboard; HTTP latency is not CPU"};
const check=(name,value)=>{summary.checks.push({name,pass:!!value});assert.ok(value,name);};
async function read(path,method="GET"){
 const response=await fetch(origin+path,{method,redirect:"follow",signal:AbortSignal.timeout(15000)});
 return {response,html:method==="HEAD"?"":await response.text()};
}
const dataOf=html=>JSON.parse(html.match(/<script id="page-data" type="application\/json">(.*?)<\/script>/s)?.[1]||"null");
try{
 let home,data;
 for(let attempt=0;attempt<10;attempt++){
  home=await read("/");data=dataOf(home.html);
  if(home.response.status===200 && data?.result?.source==="supabase")break;
  if(attempt<9)await pause(8000);
 }
 check("Live home 200 and public view connected",home.response.status===200&&data?.result?.source==="supabase");
 summary.publicVehicleCount=data.result.vehicles.length;
 check("Fresh dynamic HTML",home.response.headers.get("cache-control")?.includes("no-store"));
 check("Preview blocked from indexing",home.response.headers.get("x-robots-tag")?.includes("noindex")&&home.html.includes('content="noindex,nofollow"'));
 check("No real Meta pixel on preview",!home.html.includes("connect.facebook.net"));
 check("No API key serialized",!home.html.includes("sb_publishable_"));
 check("Only public available/reserved listings",data.result.vehicles.every(v=>["available","reserved"].includes(v.status)));
 check("No Vercel image optimizer",!home.html.includes("/_next/image"));
 const health=await read("/api/health");check("Health identifies Pages",health.response.status===200&&JSON.parse(health.html).runtime==="cloudflare-pages");
 const robots=await read("/robots.txt");check("Robots disallow preview",robots.response.status===200&&robots.html.includes("Disallow: /"));
 for(const path of ["/sell-car","/articles","/sitemap.xml","/articles/sitemap.xml","/api/meta/catalog-feed"]){
  const result=await read(path);check(path+" 200",result.response.status===200);
  if(path==="/api/meta/catalog-feed")check("Catalog quantity field preserved",result.html.includes("quantity_to_sell_on_facebook"));
 }
 const first=data.result.vehicles[0];
 if(first){
  const detail=await read("/cars/"+encodeURIComponent(first.slug));const detailData=dataOf(detail.html);
  check("Live slug detail and Car ID match",detail.response.status===200&&detailData?.vehicle?.carId===first.carId);
  check("Product metadata retains Car ID",detail.html.includes('property="product:retailer_item_id"'));
  const byId=await read("/cars/"+encodeURIComponent(first.carId));check("Car ID detail route",byId.response.status===200&&dataOf(byId.html)?.vehicle?.carId===first.carId);
  check("Photos retain order",JSON.stringify(detailData.vehicle.photos)===JSON.stringify(first.photos));
  for(const photo of first.photos.slice(0,2)){
   try{const r=await fetch(photo.url,{method:"HEAD",signal:AbortSignal.timeout(15000)});summary.media.push({origin:new URL(photo.url).origin,status:r.status,image:r.ok&&r.headers.get("content-type")?.startsWith("image/")});}
   catch{summary.media.push({origin:new URL(photo.url).origin,status:"network_error",image:false});}
  }
 }else summary.stockCoverage="No public rows returned; real detail/media coverage is blocked";
 const head=await read("/","HEAD");check("HEAD home",head.response.status===200&&head.html==="");
 const missing=await read("/__migration_missing_page__");check("Unknown page 404",missing.response.status===404);
 summary.result="PASS";summary.mediaAcceptance=summary.media.length&&summary.media.every(x=>x.image)?"sample_PASS":"BLOCKED";
}catch(error){summary.result="FAIL";summary.reason=error instanceof Error?error.message:"Read-only check failed";process.exitCode=1;}
console.log("LIVE_PREVIEW_RESULT "+JSON.stringify(summary));
