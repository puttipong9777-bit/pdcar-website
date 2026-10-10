import test from "node:test";
import assert from "node:assert/strict";
import {renderToString} from "react-dom/server";
import {loadTs} from "./helpers/load-ts.mjs";
const Image=loadTs("pages-runtime/image.tsx").default;
const Link=loadTs("pages-runtime/link.tsx").default;
const result={source:"supabase",vehicles:[{carId:"PD0001",slug:"toyota-yaris-2022",title:"Toyota Yaris 2022",brand:"Toyota",model:"Yaris",year:2022,status:"available",featured:true,photos:[{fileId:"front",url:"https://media.example.test/front",isPrimary:true,sortOrder:0},{fileId:"side",url:"https://media.example.test/side",isPrimary:false,sortOrder:1}],coverImageUrl:"https://media.example.test/front",mileage:23000,salePrice:399000,monthlyPayment:6900,updatedAt:"2026-10-10T00:00:00Z"}]};
const article={id:"public-id",slug:"car-knowledge-2026-10-10",content:{title:"บทความสาธารณะ",description:"รายละเอียด",sections:[{heading:"ตรวจรถ",paragraphs:["ตรวจสอบก่อนเดินทาง"]}]},sources:[],published_at:"2026-10-10T00:00:00Z",updated_at:"2026-10-10T00:00:00Z"};
const mocks={"next/image":Image,"next/link":Link,"next/navigation":{notFound(){throw Error("unexpected notFound");},usePathname(){return "/";}},"@/lib/vehicle-data":{getPublicVehicles:async()=>result,getPublicVehicle:async()=>result.vehicles[0]},"@/lib/article-approval/public":{getArticles:async()=>[article],getArticle:async()=>article}};
const render=element=>renderToString(element).replace(/<!-- -->/g,"");
function equal(source,migrated,label){const a=render(source),b=render(migrated);let i=0;while(i<Math.min(a.length,b.length)&&a[i]===b[i])i++;assert.ok(a===b,JSON.stringify({label,firstDifference:i,source:a.slice(Math.max(0,i-80),i+150),migration:b.slice(Math.max(0,i-80),i+150)}));}
test("migrated public views retain recovered source JSX and behavior",async()=>{
 const previous={phone:process.env.NEXT_PUBLIC_SHOP_PHONE,line:process.env.NEXT_PUBLIC_LINE_URL};
 process.env.NEXT_PUBLIC_SHOP_PHONE="0840079122";process.env.NEXT_PUBLIC_LINE_URL="https://line.me/ti/p/mock";
 const props={phone:"0840079122",lineUrl:"https://line.me/ti/p/mock"};
 try{
 const Home=loadTs("app/page.tsx",mocks).default,HomeContent=loadTs("components/home-content.tsx",mocks).default;
 equal(await Home(),HomeContent({...props,result}),"showroom");
 const Sell=loadTs("app/sell-car/page.tsx",mocks).default,SellContent=loadTs("components/sell-car-content.tsx",mocks).default;
 equal(Sell(),SellContent(props),"sell-car");
 const Vehicle=loadTs("app/cars/[identifier]/page.tsx",mocks).default,VehicleContent=loadTs("components/vehicle-content.tsx",mocks).default;
 equal(await Vehicle({params:Promise.resolve({identifier:"PD0001"})}),VehicleContent({...props,vehicle:result.vehicles[0]}),"vehicle");
 const Articles=loadTs("app/articles/page.tsx",mocks).default,ArticlesContent=loadTs("components/articles-content.tsx",mocks).default;
 equal(await Articles({searchParams:Promise.resolve({page:"2"})}),ArticlesContent({articles:[article],page:2}),"articles");
 const Article=loadTs("app/articles/[slug]/page.tsx",mocks).default,ArticleContent=loadTs("components/article-page-content.tsx",mocks).default;
 equal(await Article({params:Promise.resolve({slug:article.slug})}),ArticleContent({article}),"article detail");
 }finally{
 if(previous.phone===undefined)delete process.env.NEXT_PUBLIC_SHOP_PHONE;else process.env.NEXT_PUBLIC_SHOP_PHONE=previous.phone;
 if(previous.line===undefined)delete process.env.NEXT_PUBLIC_LINE_URL;else process.env.NEXT_PUBLIC_LINE_URL=previous.line;
 }
});
