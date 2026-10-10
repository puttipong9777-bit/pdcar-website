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
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
  await expect(page.locator(".vehicle-card").first()).toContainText("399,000");
  await expect(page.locator(".vehicle-card").first()).toContainText("6,900");
  await expect(page.locator(".vehicle-card .status-badge.reserved")).toHaveCount(1);
  await page.getByPlaceholder("ค้นหายี่ห้อ รุ่น ปี หรือ Car ID").fill("Yaris");
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.getByPlaceholder("ค้นหายี่ห้อ รุ่น ปี หรือ Car ID").fill("");
  await page.locator("select").first().selectOption("Honda");
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.locator("select").first().selectOption("all");
  await page.locator("select").nth(1).selectOption("2022");
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.locator("select").nth(1).selectOption("all");
  await page.locator(".segments").getByRole("button", { name: "ติดจอง", exact: true }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.locator(".segments").getByRole("button", { name: "ทั้งหมด", exact: true }).click();
  await expect(page.locator('a[href="tel:0840079122"]').first()).toHaveAttribute("href", "tel:0840079122");
  await expect(page.locator('a[href="https://line.me/ti/p/mock"]').first()).toHaveAttribute("target", "_blank");
  await expect(page.locator("iframe")).toHaveCount(1);
  if (testInfo.project.name === "mobile") {
    await page.locator(".menu-toggle").click();
    await expect(page.locator("#mobile-navigation")).toBeVisible();
    await page.locator(".menu-toggle").click();
  }
  await page.locator("#inventory").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>(".vehicle-card img")].every((img) => img.complete && img.naturalWidth > 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-home-mock.jpg`, fullPage: true, type: "jpeg", quality: 65, scale: "css" });
  await page.locator(".vehicle-card h3 a").first().click();
  await expect(page.locator(".vehicle-summary h1")).toHaveText("Toyota Yaris 2022");
  await page.reload();
  await expect(page.locator(".gallery-image img")).toHaveCount(2);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /mock-front/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.pdcarcenter.com/cars/toyota-yaris-2022");
  for (const img of await page.locator(".gallery-image img").all()) await img.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>(".gallery-image img")].every((img) => img.complete && img.naturalWidth > 0));
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
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await expect(page.locator(".vehicle-card")).not.toContainText("PD0001");
});
