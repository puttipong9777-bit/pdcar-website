// Build only: fixtures are placeholders, never production data or credentials.
import {renderToString} from "react-dom/server.browser";
import {App, type PageData} from "./app";
const markers = {count:"__PDCAR_STATIC_COUNT__",inventory:"__PDCAR_STATIC_INVENTORY__",stories:"__PDCAR_STATIC_STORIES__"};
export function compileTemplates() {
  return [false,true].map(withLine => renderToString(<App data={{kind:"home",result:{source:"supabase",vehicles:[]},phone:"__PDCAR_STATIC_PHONE__",lineUrl:withLine ? "__PDCAR_STATIC_LINE__" : undefined}} homeSlots={markers}/>));
}
export function renderReference(data:PageData) { return renderToString(<App data={data}/>); }
