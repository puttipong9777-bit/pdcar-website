import { hydrateRoot } from "react-dom/client";
import { App, type PageData } from "./app";
const root = document.getElementById("app");
const bootstrap = document.getElementById("page-data");
if (root && bootstrap?.textContent) {
  const data: PageData = JSON.parse(bootstrap.textContent);
  hydrateRoot(root, <App data={data} />);
}
// A restored history snapshot must not keep an unpublished listing visible.
window.addEventListener("pageshow", (event) => { if (event.persisted) location.reload(); });
