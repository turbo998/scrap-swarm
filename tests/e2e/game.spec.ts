import { expect, test, type Page } from "@playwright/test";
import type { ScrapSwarmDevApi } from "../../src/dev/api";
import { advanceTicks, createGame, startGame, summary } from "../../src/game/simulation";
import { verificationPassed } from "../../scripts/verification-contract";

declare global {
  interface Window {
    __SCRAP_SWARM_DEV__?: ScrapSwarmDevApi;
    __testErrors?: string[];
  }
}

async function openGame(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__testErrors = [];
    window.addEventListener("error", (event) => window.__testErrors?.push(event.message));
    window.addEventListener("unhandledrejection", (event) => window.__testErrors?.push(String(event.reason)));
  });
  await page.goto("/?dev=1&seed=2026", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-dev-ready", "true");
}

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) expect(await page.evaluate(() => window.__testErrors ?? [])).toEqual([]);
});

test("plays menu, movement, upgrade, shop, boss and results with real input", async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole("heading", { name: /废土斗机祭/ })).toBeVisible();
  await page.screenshot({ path: "test-results/screenshots/01-menu.png" });

  await page.getByRole("button", { name: "R-17，出阵！" }).click();
  await expect(page.locator("#broadcast")).toContainText("荒牙群袭");
  const before = await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().player.x);
  await page.keyboard.down("d");
  await expect.poll(
    () => page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().player.x),
    { timeout: 2_000 }
  ).toBeGreaterThan(before + 20);
  await page.keyboard.up("d");
  const after = await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().player.x);
  expect(after).toBeGreaterThan(before + 20);

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.spawn("scuttler", 760, 360));
  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.spawn("brute", 850, 420));
  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.spawn("zapper", 690, 260));
  await page.waitForTimeout(450);
  await page.screenshot({ path: "test-results/screenshots/02-combat.png" });

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("upgrade"));
  await expect(page.getByRole("heading", { name: "中场必杀改装" })).toBeVisible();
  await page.locator("[data-upgrade]").first().click();
  await expect(page.getByRole("heading", { name: "中场必杀改装" })).toBeHidden();

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("shop"));
  await expect(page.getByRole("heading", { name: /流动维修棚/ })).toBeVisible();
  await page.screenshot({ path: "test-results/screenshots/03-shop.png" });
  await page.locator("[data-weapon='pulse']").click();
  await expect(page.locator("[data-weapon='pulse']")).toBeDisabled();
  await page.getByRole("button", { name: /进入第 2 场擂台/ }).click();

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("boss"));
  await expect.poll(() => page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().wave)).toBe(3);
  await expect(page.locator("#broadcast")).toContainText("冠军机 赫克托");
  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.advance(90, 0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: "test-results/screenshots/04-boss.png" });

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("bossLow"));
  await expect.poll(() => page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().phase)).toBe("win");
  await expect(page.getByRole("heading", { name: "荒原冠军 · 核心夺还" })).toBeVisible();
  await page.screenshot({ path: "test-results/screenshots/05-win.png" });
  await page.getByRole("button", { name: "开启卫冕战" }).click();
  await expect.poll(() => page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().phase)).toBe("combat");
});

test("supports death, restart, pause, and blur pause", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "R-17，出阵！" }).click();
  await page.keyboard.press("p");
  await expect(page.getByRole("heading", { name: "比赛暂停 · 炉心锁定" })).toBeVisible();
  await page.keyboard.press("p");
  await expect(page.getByRole("heading", { name: "比赛暂停 · 炉心锁定" })).toBeHidden();

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("dead"));
  await expect(page.getByRole("heading", { name: "斗士倒地 · 炉心未灭" })).toBeVisible();
  await page.screenshot({ path: "test-results/screenshots/06-dead.png" });
  await page.getByRole("button", { name: "重燃炉心" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("heading", { name: "比赛暂停 · 炉心锁定" })).toBeVisible();
});

test("browser renderer and pure core produce the same authoritative state", async ({ page }) => {
  const core = createGame(5150);
  startGame(core);
  advanceTicks(core, 400, { x: 0.7, y: -0.3 });
  const expected = summary(core);

  await openGame(page);
  const browserState = await page.evaluate(() =>
    window.__SCRAP_SWARM_DEV__!.runDeterministic(5150, 400, 0.7, -0.3)
  );
  expect(browserState.tick).toBe(expected.tick);
  await page.waitForTimeout(100);
  const renderer = await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.rendererInfo());
  const afterRender = await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read());
  expect(renderer.renderCount).toBeGreaterThan(0);
  expect(renderer.canvasPixelsPresent).toBe(true);
  expect(afterRender).toEqual(expected);
});

test("an injected browser exception is captured as verification failure", async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent("error", { message: "injected browser failure" }));
  });

  const errors = await page.evaluate(() => window.__testErrors ?? []);
  expect(errors).toContain("injected browser failure");
  expect(verificationPassed(errors, false)).toBe(false);
  await page.evaluate(() => {
    window.__testErrors = [];
  });
});

test("developer pause, single-step, and authority snapshot are diagnostic", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "R-17，出阵！" }).click();
  const paused = await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.pause());
  expect(paused.phase).toBe("paused");
  const frozenTick = paused.tick;
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().tick)).toBe(frozenTick);

  const stepped = await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.singleStep());
  expect(stepped.tick).toBe(frozenTick + 1);
  expect(stepped.phase).toBe("paused");
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().tick)).toBe(frozenTick + 1);

  const snapshotText = await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.exportSnapshot());
  const snapshot = JSON.parse(snapshotText) as {
    snapshotSchemaVersion: number;
    exportedAtTick: number;
    authority: {
      schemaVersion: number;
      seed: number;
      tick: number;
      phase: string;
      rngState: number;
      player: { hp: number; weapons: string[] };
      enemies: unknown[];
      weapons: Record<string, unknown>;
      stats: Record<string, number>;
    };
  };
  expect(snapshot.snapshotSchemaVersion).toBe(1);
  expect(snapshot.exportedAtTick).toBe(frozenTick + 1);
  expect(snapshot.authority).toMatchObject({
    schemaVersion: 1,
    seed: 2026,
    tick: frozenTick + 1,
    phase: "paused"
  });

  expect(snapshot.authority.player.weapons).toContain("rivet");
  expect(snapshot.authority.rngState).toBeGreaterThan(0);
  expect(snapshot.authority.enemies).toBeInstanceOf(Array);
  expect(snapshot.authority.weapons).toHaveProperty("rivet");
  expect(snapshot.authority.stats).toHaveProperty("damageDealt");
});

test("title composition fits a 1440x900 viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openGame(page);
  await expect(page.getByRole("heading", { name: /废土斗机祭/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "R-17，出阵！" })).toBeInViewport();
  await page.screenshot({ path: "test-results/screenshots/07-title-wide.png" });
});

test("loads the local R-17 favicon without browser errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await openGame(page);
  const faviconUrl = await page.locator("link[rel='icon']").getAttribute("href");
  expect(["/favicon.svg", "./favicon.svg"]).toContain(faviconUrl);
  const faviconResponse = await page.request.get(new URL(faviconUrl!, page.url()).toString());
  expect(faviconResponse.status()).toBe(200);
  expect(faviconResponse.headers()["content-type"]).toContain("image/svg+xml");
  expect(consoleErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test("showcases Hangar Inspector, 3-Act Story Archive, Core Dash, Wave 2 Shelter, and Boss Lock Break with evidence screenshots", async ({ page }) => {
  await openGame(page);
  await expect(page.locator("#hangar-canvas")).toBeVisible();
  await page.locator("[data-hangar-unit='boss']").click();
  await page.locator("[data-hangar-pose='lockbreak']").click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: "docs/evidence/01-menu-hangar.png" });

  await page.locator("[data-action='open-story']").first().click();
  await expect(page.locator("#drawer")).toHaveClass(/open/);
  await page.locator("[data-story-chapter='act3_eve']").click();
  await expect(page.locator("#drawer")).toContainText("赫克托未删改的救援日志");
  await page.screenshot({ path: "docs/evidence/02-story-archive.png" });
  await page.locator("[data-drawer-action='close']").click();
  await expect(page.locator("#drawer")).not.toHaveClass(/open/);

  await page.getByRole("button", { name: "R-17，出阵！" }).click();
  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.spawn("scuttler", 740, 360));
  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.dash());
  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.advance(6, 1, 0));
  expect(await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().player.dashCooldown)).toBeGreaterThan(0);
  await page.waitForTimeout(120);
  await page.screenshot({ path: "docs/evidence/03-wave1-combat-dash.png" });

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("wave2"));
  await expect(page.locator("#hud")).toContainText("维修棚信标");
  await page.waitForTimeout(150);
  await page.screenshot({ path: "docs/evidence/04-wave2-shelter-relay.png" });

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("bossPhase3"));
  await expect(page.locator("#hud")).toContainText("铁冠锁具暴露");
  await page.waitForTimeout(150);
  await page.screenshot({ path: "docs/evidence/05-wave3-hector-lockbreak.png" });

  await page.evaluate(() => window.__SCRAP_SWARM_DEV__!.prepare("bossLow"));
  await expect.poll(() => page.evaluate(() => window.__SCRAP_SWARM_DEV__!.read().phase)).toBe("win");
  await page.screenshot({ path: "docs/evidence/06-victory-accord.png" });
});
