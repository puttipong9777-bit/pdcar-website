import {BusinessJsonLd} from "./business";
import {renderToString} from "react-dom/server.browser";
import {CatalogBrowser} from "@/components/catalog-browser";
import {VehicleStories} from "@/components/vehicle-stories";
import type {PageData} from "./app";
declare const __PDCAR_TEMPLATES__: string[];
const escape = (s:string) => s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[c]!));
function url(value:string) {
  return escape(value.replace(/[\u0000-\u0020]/g,"").toLowerCase().startsWith("javascript:") ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : value);
}
export function renderHome(data:PageData) {
  const values:Record<string,string> = {
    BUSINESS:renderToString(<BusinessJsonLd phone={data.phone}/>),COUNT:String(data.result.vehicles.length),PHONE:escape(data.phone),LINE:url(data.lineUrl || ""),
    INVENTORY:renderToString(<CatalogBrowser vehicles={data.result.vehicles}/>),
    STORIES:renderToString(<VehicleStories vehicles={data.result.vehicles}/>)
  };
  // One pass prevents public text resembling a marker from being substituted.
  return __PDCAR_TEMPLATES__[data.lineUrl ? 1:0].replace(/__PDCAR_STATIC_(COUNT|PHONE|LINE|INVENTORY|STORIES|BUSINESS)__/g,(_,name:string)=>values[name]);
}
