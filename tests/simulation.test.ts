import { describe, expect, it } from "vitest";
import { ENEMIES, TICK_RATE } from "../src/game/data";
import {
  advanceTicks,
  applyUpgrade,
  buyWeapon,
  continueFromShop,
  createGame,
  spawnEnemy,
  startGame,
  stepGame,
  summary,
  triggerDash
} from "../src/game/simulation";
import type { GameState, InputState } from "../src/game/types";

function combat(seed = 42): GameState {
  const state = createGame(seed);
  startGame(state);
  return state;
}

describe("deterministic fixed-tick simulation", () => {
  it("normalizes diagonal movement", () => {
    const cardinal = combat();
    const diagonal = combat();
    stepGame(cardinal, { x: 1, y: 0 });
    stepGame(diagonal, { x: 1, y: 1 });
    const cardinalDistance = cardinal.player.x - 640;
    const diagonalDistance = Math.hypot(diagonal.player.x - 640, diagonal.player.y - 360);
    expect(diagonalDistance).toBeCloseTo(cardinalDistance, 5);
  });

  it("auto-attacks once, kills once, and creates salvage", () => {
    const state = combat();
    const enemy = spawnEnemy(state, "scuttler", state.player.x + 80, state.player.y);
    enemy.hp = 1;
    stepGame(state, { x: 0, y: 0 });
    expect(state.stats.kills).toBe(1);
    expect(state.pickups).toHaveLength(1);
    advanceTicks(state, 60);
    expect(state.stats.kills).toBe(1);
    expect(state.player.xp).toBeGreaterThan(0);
  });

  it("freezes combat during an upgrade and applies the choice once", () => {
    const state = combat();
    spawnEnemy(state, "brute", state.player.x + 25, state.player.y);
    state.player.xp = state.player.xpNext;
    stepGame(state, { x: 0, y: 0 });
    const hp = state.player.hp;
    const tick = state.tick;
    const choice = state.upgradeChoices[0]!;
    advanceTicks(state, TICK_RATE * 3);
    expect(state.tick).toBe(tick);
    expect(state.player.hp).toBe(hp);
    expect(applyUpgrade(state, choice)).toBe(true);
    expect(applyUpgrade(state, choice)).toBe(false);
    expect(state.stats.upgrades).toBe(1);
  });

  it("enforces shop affordability and advances waves", () => {
    const state = combat();
    state.phase = "shop";
    expect(buyWeapon(state, "pulse")).toBe(false);
    state.player.scrap = 28;
    expect(buyWeapon(state, "pulse")).toBe(true);
    expect(state.player.weapons).toContain("pulse");
    expect(continueFromShop(state)).toBe(true);
    expect(state.wave).toBe(2);
    expect(state.phase).toBe("combat");
  });

  it("reaches boss victory through authoritative combat", () => {
    const state = combat();
    state.wave = 3;
    state.player.weapons = ["rivet", "pulse", "arc"];
    advanceTicks(state, 1);
    const boss = state.enemies.find((enemy) => enemy.kind === "boss");
    expect(boss).toBeDefined();
    if (boss) {
      boss.x = state.player.x + 20;
      state.player.damageMultiplier = 100;
    }
    advanceTicks(state, 120);
    expect(state.phase).toBe("win");
  });

  it("produces the same summary on three repeated runs", () => {
    const run = (): ReturnType<typeof summary> => {
      const state = combat(9001);
      const inputs: InputState[] = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: -1 },
        { x: 0, y: 0 }
      ];
      for (let tick = 0; tick < 800; tick++) {
        if (state.phase === "upgrade") {
          applyUpgrade(state, state.upgradeChoices[0]!);
        } else if (state.phase !== "combat") {
          break;
        }
        stepGame(state, inputs[Math.floor(tick / 100) % inputs.length]!);
      }
      return summary(state);
    };
    const results = [run(), run(), run()];
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
  });

  it("contains valid data for all enemy archetypes", () => {
    expect(Object.keys(ENEMIES)).toEqual(["scuttler", "brute", "zapper", "boss"]);
    for (const enemy of Object.values(ENEMIES)) {
      expect(enemy.hp).toBeGreaterThan(0);
      expect(enemy.name).not.toMatch(/undefined|NaN/);
    }
  });

  it("executes Core Dash with burst speed, cooldown, and endpoint shockwave", () => {
    const state = combat(108);
    const enemy = spawnEnemy(state, "scuttler", state.player.x + 115, state.player.y);
    const initialEnemyHp = enemy.hp;
    const startX = state.player.x;

    expect(triggerDash(state, 1, 0)).toBe(true);
    expect(state.stats.dashes).toBe(1);
    expect(triggerDash(state, 1, 0)).toBe(false);

    advanceTicks(state, 14, { x: 1, y: 0 });
    expect(state.player.x - startX).toBeGreaterThan(80);
    expect(enemy.hp).toBeLessThan(initialEnemyHp);
    expect(state.player.dashCooldown).toBeGreaterThan(0);
  });

  it("spawns Wave 2 Shelter Relay Beacon and triggers Ran's support pulse", () => {
    const state = combat(204);
    state.phase = "shop";
    expect(continueFromShop(state)).toBe(true);
    expect(state.wave).toBe(2);

    // Step once to activate the Wave 2 Shelter Relay Beacon
    stepGame(state, { x: 0, y: 0 });
    expect(state.shelter.active).toBe(true);

    const shelter = state.shelter;
    state.player.x = shelter.x + 20;
    state.player.y = shelter.y;
    state.player.hp = 60;
    const scrapBefore = state.player.scrap;
    shelter.charge = shelter.maxCharge - 0.1;

    stepGame(state, { x: 0, y: 0 });
    expect(shelter.pulsesTriggered).toBe(1);
    expect(state.player.scrap).toBeGreaterThan(scrapBefore);
    expect(state.player.hp).toBeGreaterThan(60);
  });

  it("transitions Boss Hector through 3 phases and exposes the Iron Crown Lock for 1.45x damage", () => {
    const state = combat(309);
    state.wave = 3;
    advanceTicks(state, 1);
    const boss = state.enemies.find((enemy) => enemy.kind === "boss");
    expect(boss).toBeDefined();
    if (!boss) return;

    expect(state.bossPhase).toBe(1);
    boss.hp = Math.floor(boss.maxHp * 0.58);
    stepGame(state, { x: 0, y: 0 });
    expect(state.bossPhase).toBe(2);

    boss.hp = Math.floor(boss.maxHp * 0.30);
    state.bossSlamTimer = 0.01;
    stepGame(state, { x: 0, y: 0 });
    expect(state.bossPhase).toBe(3);
    expect(state.bossTelegraphTicks).toBeGreaterThan(0);

    advanceTicks(state, 50);
    expect(state.bossLockExposedTicks).toBeGreaterThan(0);

    const hpBefore = boss.hp;
    boss.x = state.player.x + 40;
    boss.y = state.player.y;
    state.weapons.rivet.cooldown = 0;
    stepGame(state, { x: 0, y: 0 });
    expect(boss.hp).toBeLessThan(hpBefore);
    expect(state.events.some((e) => e.type === "hit" && e.label === "armorBreak")).toBe(true);
  });
});
