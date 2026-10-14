import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyUpgrade, buyWeapon, continueFromShop, createGame, startGame, stepGame } from "../src/game/simulation";
import type { GameState, InputState } from "../src/game/types";

const seeds = [101, 202, 303, 404, 505];
const maxTicks = 60 * 150;
const maxIterations = maxTicks * 4;
const wallTimeoutMs = 5_000;

interface BotResult {
  seed: number;
  outcome: "win" | "dead" | "timeout" | "error";
  ticks: number;
  wave: number;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  purchases: number;
  error?: string;
  timeoutReason?: "tick-limit" | "iteration-limit" | "wall-watchdog";
}

function decide(state: GameState): InputState {
  const nearestPickup = [...state.pickups].sort((a, b) =>
    Math.hypot(a.x - state.player.x, a.y - state.player.y) -
    Math.hypot(b.x - state.player.x, b.y - state.player.y)
  )[0];
  const nearestEnemy = [...state.enemies].sort((a, b) =>
    Math.hypot(a.x - state.player.x, a.y - state.player.y) -
    Math.hypot(b.x - state.player.x, b.y - state.player.y)
  )[0];
  if (nearestPickup && Math.hypot(nearestPickup.x - state.player.x, nearestPickup.y - state.player.y) < 260) {
    return { x: nearestPickup.x - state.player.x, y: nearestPickup.y - state.player.y };
  }
  if (!nearestEnemy) return { x: Math.sin(state.tick / 90), y: Math.cos(state.tick / 110) };
  const dx = nearestEnemy.x - state.player.x;
  const dy = nearestEnemy.y - state.player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 125) return { x: -dx - dy * 0.45, y: -dy + dx * 0.45 };
  if (distance > 330) return { x: dx, y: dy };
  return { x: -dy, y: dx };
}

function run(seed: number): BotResult {
  const state = createGame(seed);
  startGame(state);
  const startedAt = performance.now();
  let iterations = 0;
  try {
    let timeoutReason: BotResult["timeoutReason"];
    while (state.tick < maxTicks && state.phase !== "win" && state.phase !== "dead") {
      iterations++;
      if (iterations > maxIterations) {
        timeoutReason = "iteration-limit";
        break;
      }
      if (performance.now() - startedAt > wallTimeoutMs) {
        timeoutReason = "wall-watchdog";
        break;
      }
      if (state.phase === "upgrade") {
        const preference = ["damage", "fireRate", "armor", "speed", "repair"] as const;
        const selected = preference.find((id) => state.upgradeChoices.includes(id)) ?? state.upgradeChoices[0]!;
        applyUpgrade(state, selected);
      } else if (state.phase === "shop") {
        buyWeapon(state, "pulse");
        buyWeapon(state, "arc");
        continueFromShop(state);
      } else {
        stepGame(state, decide(state));
      }
    }
    const outcome = state.phase === "win" ? "win" : state.phase === "dead" ? "dead" : "timeout";
    return {
      seed,
      outcome,
      ticks: state.tick,
      wave: state.wave,
      kills: state.stats.kills,
      damageDealt: Math.round(state.stats.damageDealt),
      damageTaken: state.stats.damageTaken,
      purchases: state.stats.purchases,
      ...(outcome === "timeout" ? { timeoutReason: timeoutReason ?? "tick-limit" } : {})
    };
  } catch (error) {
    return {
      seed,
      outcome: "error",
      ticks: state.tick,
      wave: state.wave,
      kills: state.stats.kills,
      damageDealt: Math.round(state.stats.damageDealt),
      damageTaken: state.stats.damageTaken,
      purchases: state.stats.purchases,
      error: error instanceof Error ? error.stack ?? error.message : String(error)
    };
  }
}

const results = seeds.map(run);
const counts = Object.fromEntries(["win", "dead", "timeout", "error"].map((outcome) => [
  outcome,
  results.filter((result) => result.outcome === outcome).length
]));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  config: { seeds, maxTicks, maxIterations, wallTimeoutMs, tickRate: 60, botVersion: "orbit-salvager-v1" },
  counts,
  results
};
const reportDir = join(process.cwd(), "reports");
await mkdir(reportDir, { recursive: true });
const output = join(reportDir, "bot-report.json");
await writeFile(output, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, counts }));
if ((counts.error ?? 0) > 0) process.exitCode = 1;
