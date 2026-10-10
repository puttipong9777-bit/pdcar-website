import test from "node:test";
import assert from "node:assert/strict";
import {handleRequest} from "../out/_worker.js";
import {env,car} from "./fixtures.mjs";
const request=(p,method="GET")=>new Request("https://preview.pages.dev"+p,{method});
const article={id:"public-id",slug:"car-knowledge-2026-10-10",content:{title:"บทความสาธารณะ",description:"รายละเอียด",sections:[]},sources:[],published_at:"2026-10-10T00:00:00Z",updated_at:"2026-10-10T00:00:00Z"};
async function mock(run){const original=fetch,calls=[];globalThis.fetch=async(input,options)=>{const url=new URL(input);calls.push({url,options});return Response.json(url.pathname.endsWith("public_approved_articles")?[{...article,private_draft:"PRIVATE_SENTINEL"}]:[car()]);};try{await run(calls);}finally{globalThis.fetch=original;}}
test("sell-car SEO, service schema and original showroom survive migration",()=>mock(async()=>{
 const home=await(await handleRequest(request("/"),env)).text();
 assert.match(home,/catalog-card/);assert.match(home,/discovery-hero/);assert.match(home,/href="\/sell-car"/);
 const html=await(await handleRequest(request("/sell-car"),env)).text();
 assert.match(html,/sell-page/);assert.match(html,/รับซื้อรถมือสองนครปฐม/);assert.match(html,/Service/);assert.match(html,/og-sell-car.png/);
}));
test("preview suppresses real Meta events while production retains pixel and product IDs",()=>mock(async()=>{
 const preview=await(await handleRequest(request("/cars/PD0001"),env)).text();
 assert.ok(!preview.includes("connect.facebook.net"));assert.match(preview,/product:retailer_item_id/);assert.match(preview,/PD0001/);
 const prod=await(await handleRequest(new Request("https://www.pdcarcenter.com/cars/PD0001"),env)).text();
 assert.match(prod,/connect.facebook.net/);assert.match(prod,/fbq\('init','690571535487780'\)/);
}));
test("article routes read only the published public view and serialize safe columns",()=>mock(async calls=>{
 for(const path of ["/articles?page=2","/articles/car-knowledge-2026-10-10","/articles/sitemap.xml"]){
 const response=await handleRequest(request(path),env);assert.equal(response.status,200);
 const html=await response.text();assert.ok(!html.includes("PRIVATE_SENTINEL"));assert.equal(response.headers.get("cache-control"),"no-store");}
 assert.ok(calls.every(c=>c.url.pathname==="/rest/v1/public_approved_articles"&&c.options.method==="GET"));
 assert.equal(calls[0].url.searchParams.get("offset"),"12");
 assert.ok(calls.every(c=>!c.url.searchParams.get("select").includes("*")));
}));
test("catalog retains Car IDs, reserved quantity and all photos without optimizer cache",()=>mock(async()=>{
 const response=await handleRequest(request("/api/meta/catalog-feed"),env);
 assert.equal(response.status,200);const csv=await response.text();
 assert.match(csv,/quantity_to_sell_on_facebook/);assert.match(csv,/PD0001/);assert.match(csv,/mock-front/);assert.match(csv,/mock-side/);
 assert.ok(!csv.includes("_next/image"));assert.equal(response.headers.get("cache-control"),"no-store");
}));
test("disabled article integrations never generate, send or write",async()=>{
 const original=fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error("forbidden");};
 try {
 const admin=await handleRequest(request("/api/article-approval/admin","POST"),env);assert.equal(admin.status,503);assert.equal((await admin.json()).error,"disabled");
 const callback=await handleRequest(request("/api/article-approval/line-callback","POST"),env);assert.equal(callback.status,404);
 for(const path of ["/api/article-approval/operations","/api/cron/article-drafts"])assert.equal((await handleRequest(request(path),env)).status,503);
 assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test("article provider failures return 503 rather than publishing false empty/404",async()=>{
 const original=fetch;globalThis.fetch=async()=>Response.json({}, {status:503});
 try{for(const p of ["/articles","/articles/car-knowledge-2026-10-10","/articles/sitemap.xml"])assert.equal((await handleRequest(request(p),env)).status,503);}
 finally{globalThis.fetch=original;}
});
