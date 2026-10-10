// Build/test only. No live data, environment values or credentials are rendered.
import { renderToString } from "react-dom/server";
import { App, type PageData } from "./app";
import { VehicleBrowser, VehicleEmptyState } from "@/components/vehicle-browser";
import { VehicleCard, CardImage, CardMileage, CardMonthly } from "@/components/vehicle-card";
import { VehicleStories, VehicleStory } from "@/components/vehicle-stories";
import type { PublicVehicleListing } from "@/lib/types";

export const markers = {
  count: "__PDCAR_STATIC_COUNT__", inventory: "__PDCAR_STATIC_INVENTORY__",
  stories: "__PDCAR_STATIC_STORIES__", notice: "__PDCAR_STATIC_NOTICE__",
  phone: "__PDCAR_STATIC_PHONE__", line: "__PDCAR_STATIC_LINE__"
};
export function compileHomeShells() {
  return [false, true].map((withLine) => renderToString(<App data={{
    kind: "home", result: { source: "supabase", vehicles: [] }, phone: markers.phone,
    lineUrl: withLine ? markers.line : undefined
  }} homeSlots={markers} />));
}
export function renderReference(data: PageData) {
  return renderToString(<App data={data} />);
}

const token = (name: string) => `__PDCAR_DYNAMIC_${name}__`;
export function compileTemplates() {
  const vehicle: PublicVehicleListing = {
    carId: token("ID"), slug: token("SLUG"), title: token("TITLE"),
    brand: "", model: "", year: 0, status: "available", featured: false,
    photos: [], updatedAt: "", coverImageUrl: token("COVER")
  };
  return {
    home: compileHomeShells(),
    browser: renderToString(<VehicleBrowser vehicles={[]} slots={{ brands: token("BRANDS"), years: token("YEARS"), results: token("RESULTS") }} />),
    option: renderToString(<option value={token("VALUE")}>{token("VALUE")}</option>),
    grid: renderToString(<div className="vehicle-grid">{token("CARDS")}</div>),
    empty: renderToString(<VehicleEmptyState />),
    card: renderToString(<VehicleCard vehicle={vehicle} slots={{ image: token("IMAGE"), mileage: token("MILEAGE"), fuel: token("FUEL"), transmission: token("TRANSMISSION"), price: token("PRICE"), monthly: token("MONTHLY"), status: token("STATUS"), statusClass: token("STATUS_CLASS") }} />),
    image: renderToString(<CardImage vehicle={vehicle} />),
    placeholder: renderToString(<CardImage vehicle={{ ...vehicle, coverImageUrl: undefined }} />),
    mileage: renderToString(<CardMileage value={token("VALUE")} />),
    monthly: renderToString(<CardMonthly value={token("VALUE")} />),
    meta: renderToString(<span>{token("VALUE")}</span>),
    stories: renderToString(<div className="story-rail">{token("STORIES")}</div>),
    emptyStories: renderToString(<VehicleStories vehicles={[]} />),
    storyVideo: renderToString(<VehicleStory vehicle={{ ...vehicle, youtubeVideoId: token("VIDEO") }} index={0} indexLabel={token("INDEX")} />),
    storyImage: renderToString(<VehicleStory vehicle={vehicle} index={0} indexLabel={token("INDEX")} />),
    storyEmpty: renderToString(<VehicleStory vehicle={{ ...vehicle, coverImageUrl: undefined }} index={0} indexLabel={token("INDEX")} />)
  };
}
