import { expect, test } from "@playwright/test";

test("design atlas is readable, complete, and self-contained", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  const response = await page.goto("/design/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "废土斗机祭" })).toBeVisible();
  await expect(page.locator("[data-design]")).toHaveCount(6);
  await expect(page.locator("[data-design='r17']")).toContainText("R-17");
  await expect(page.locator("[data-design='ran']")).toContainText("岚·韦斯");
  await expect(page.locator("[data-design='hector']")).toContainText("铁冠·赫克托");
  await expect(page.locator("[data-design='fang']")).toContainText("赤砂牙轮");
  await expect(page.locator("[data-design='bulwark']")).toContainText("铁壁角斗机");
  await expect(page.locator("[data-design='arc']")).toContainText("苍雷浮游卫");
  await expect(page.getByRole("navigation", { name: "设定集导航" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#cast")?.scrollIntoView();
  });
  await page.locator("#cast").screenshot({ path: "test-results/screenshots/08-design-atlas.png" });
  await page.evaluate(() => document.querySelector("#hero-sheet")?.scrollIntoView());
  await page.locator("#hero-sheet").screenshot({ path: "test-results/screenshots/09-r17-sheet.png" });
  await page.screenshot({ path: "test-results/screenshots/10-design-page.png", fullPage: true });

  expect(consoleErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
