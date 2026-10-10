import { test, expect } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.get("http://127.0.0.1:8789/__state?value=initial");
});

test("inventory, filtering, contact links, images, videos and layout", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const optimizerRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (request.url().includes("/_next/image")) optimizerRequests.push(request.url()); });
  // YouTube availability is external; this fixture only verifies embedding/layout.
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<html><body>Mock YouTube player</body></html>" }));
  await page.goto("/");
  await expect(page.locator(".catalog-card")).toHaveCount(2);
  await expect(page.locator(".catalog-card").first()).toContainText("399,000");
  await expect(page.locator(".catalog-card").first()).toContainText("6,900");
  await expect(page.locator(".catalog-card .catalog-status.reserved")).toHaveCount(1);
  await page.locator(".catalog-photo-controls").first().getByRole("button",{name:/ภาพถัดไป/}).click();
  await expect(page.locator(".catalog-card img").first()).toHaveAttribute("src",/mock-side/);
  await page.getByPlaceholder("ค้นหารุ่น ปี หรือรหัสรถ").fill("Yaris");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page.getByPlaceholder("ค้นหารุ่น ปี หรือรหัสรถ").fill("");
  await page.locator(".catalog-brands").getByRole("button", {name:"Honda", exact:false}).click();
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page.locator(".catalog-brands").getByRole("button", {name:"ทุกยี่ห้อ", exact:false}).click();
  await page.locator("select").nth(1).selectOption("2022");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page.locator("select").nth(1).selectOption("all");
  await page.locator(".catalog-filters select").nth(2).selectOption("reserved");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page.locator(".catalog-filters select").nth(2).selectOption("all");
  await expect(page.locator('a[href="tel:0840079122"]').first()).toHaveAttribute("href", "tel:0840079122");
  await expect(page.locator('a[href="https://line.me/ti/p/mock"]').first()).toHaveAttribute("target", "_blank");
  await expect(page.locator("iframe")).toHaveCount(1);
  if (testInfo.project.name === "mobile") {
    await page.locator(".menu-toggle").click();
    await expect(page.locator("#mobile-navigation")).toBeVisible();
    await page.locator(".menu-toggle").click();
  }
  await page.locator("#inventory").scrollIntoViewIfNeeded();
  for (const img of await page.locator(".catalog-card img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0), { message: "Each lazy catalog image loads when scrolled into view" }).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-home-mock.jpg`, fullPage: true, type: "jpeg", quality: 65, scale: "css" });
  await page.locator(".catalog-card h3 a").first().click();
  await expect(page.locator(".vehicle-summary h1")).toHaveText("Toyota Yaris 2022");
  await page.reload();
  await page.locator(".gallery-more summary").click();
  await expect(page.locator(".gallery-image img")).toHaveCount(2);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /mock-front/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.pdcarcenter.com/cars/toyota-yaris-2022");
  for (const img of await page.locator(".gallery-image img").all()) await img.scrollIntoViewIfNeeded();
  for (const img of await page.locator(".gallery-image img").all()) await expect.poll(() => img.evaluate((node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0), { message: "Gallery images load after disclosure and scrolling" }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-detail-mock.jpg`, fullPage: true, type: "jpeg", quality: 65, scale: "css" });
  expect(errors).toEqual([]);
  expect(optimizerRequests).toEqual([]);
});

test("new slug, price, reserved and unpublish update without rebuilding", async ({ page, request }) => {
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ body: "Mock video" }));
  await request.get("http://127.0.0.1:8789/__state?value=changed");
  const response = await page.goto("/cars/new-slug");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".detail-price")).toContainText("299,000");
  await expect(page.locator(".vehicle-summary .status-badge")).toHaveText("ติดจอง");
  await page.reload();
  await expect(page.locator(".car-id")).toHaveText("PD0001");
  await request.get("http://127.0.0.1:8789/__state?value=unpublished");
  expect((await page.reload())?.status()).toBe(404);
  await page.goto("/");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await expect(page.locator(".catalog-card")).not.toContainText("PD0001");
});

test.describe("server HTML without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("inventory, vehicle links and metadata are available before hydration", async ({ page }) => {
    await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ body: "Mock video" }));
    await page.goto("/");
    await expect(page.locator(".catalog-card")).toHaveCount(2);
    await expect(page.locator(".catalog-card").first()).toContainText("399,000");
    await page.locator(".catalog-card h3 a").first().click();
    await expect(page.locator(".vehicle-summary h1")).toHaveText("Toyota Yaris 2022");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Toyota Yaris 2022");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.pdcarcenter.com/cars/toyota-yaris-2022");
  });
});

test("sell-car, articles, published detail, sitemap and disabled admin preserve public routes", async ({page,request})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/sell-car");
 await expect(page.locator("main.sell-page")).toBeVisible();
 await expect(page.locator('script[type="application/ld+json"]').last()).toContainText("บริการรับซื้อรถมือสอง", {useInnerText:false});
 await page.goto("/articles");
 await expect(page.locator(".pd-article-card")).toHaveCount(1);
 await page.locator(".pd-article-card h2 a").click();
 await expect(page.locator("h1")).toHaveText("บทความทดสอบสาธารณะ");
 expect((await page.reload())?.status()).toBe(200);
 await page.goto("/article-admin");
 await expect(page.locator("h1")).toHaveText("ระบบอนุมัติบทความยังไม่เปิดใช้งาน");
 expect((await request.get("/articles/sitemap.xml")).status()).toBe(200);
 expect((await request.get("/api/meta/catalog-feed")).status()).toBe(200);
 expect(errors).toEqual([]);
});
