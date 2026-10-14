import { ARENA } from "../game/data";
import {
  advanceTicks,
  applyUpgrade,
  buyWeapon,
  continueFromShop,
  spawnEnemy,
  startGame,
  stepGame,
  summary,
  togglePause,
  triggerDash
} from "../game/simulation";
import type { EnemyKind, GameState, StateSummary, WeaponId } from "../game/types";
import type { GameScene } from "../scenes/GameScene";

export interface ScrapSwarmDevApi {
  reset(seed?: number): StateSummary;
  read(): StateSummary;
  advance(ticks: number, x?: number, y?: number): StateSummary;
  dash(dirX?: number, dirY?: number): StateSummary;
  spawn(kind: EnemyKind, x?: number, y?: number): StateSummary;
  grantScrap(amount: number): StateSummary;
  prepare(scenario: "upgrade" | "shop" | "wave2" | "boss" | "bossPhase3" | "bossLow" | "dead" | "win"): StateSummary;
  setWeapons(weapons: WeaponId[]): StateSummary;
  runDeterministic(seed: number, ticks: number, x?: number, y?: number): StateSummary;
  rendererInfo(): { renderCount: number; canvasPixelsPresent: boolean };
  pause(): StateSummary;
  resume(): StateSummary;
  singleStep(): StateSummary;
  exportSnapshot(): string;
}

export function createDevApi(scene: GameScene, refresh: (state: GameState) => void): ScrapSwarmDevApi {
  const done = (): StateSummary => {
    refresh(scene.state);
    return summary(scene.state);
  };
  return {
    reset(seed = 1337) {
      scene.harnessControlled = false;
      scene.reset(seed);
      return done();
    },
    read() {
      return summary(scene.state);
    },
    advance(ticks, x = 0, y = 0) {
      advanceTicks(scene.state, Math.max(0, Math.min(100_000, Math.floor(ticks))), { x, y });
      return done();
    },
    dash(dirX, dirY) {
      triggerDash(scene.state, dirX, dirY);
      return done();
    },
    spawn(kind, x = ARENA.width / 2 + 180, y = ARENA.height / 2) {
      spawnEnemy(scene.state, kind, x, y);
      return done();
    },
    grantScrap(amount) {
      scene.state.player.scrap += Math.max(0, Math.floor(amount));
      return done();
    },
    prepare(scenario) {
      const state = scene.state;
      if (state.phase === "menu") startGame(state);
      if (scenario === "upgrade") {
        state.player.xp = state.player.xpNext;
        advanceTicks(state, 1);
      } else if (scenario === "shop") {
        state.phase = "shop";
        state.player.scrap = 75;
      } else if (scenario === "wave2") {
        state.phase = "combat";
        state.wave = 2;
        state.waveTick = 0;
        state.enemies = [];
        state.shelter.active = false;
        state.player.weapons = ["rivet", "pulse"];
        advanceTicks(state, 1);
      } else if (scenario === "boss" || scenario === "bossPhase3" || scenario === "bossLow") {
        state.phase = "combat";
        state.wave = 3;
        state.waveTick = 0;
        state.bossSpawned = false;
        state.bossPhase = 1;
        state.bossLockExposedTicks = 0;
        state.enemies = [];
        state.player.weapons = ["rivet", "pulse", "arc"];
        advanceTicks(state, 1);
        if (scenario === "bossPhase3") {
          const boss = state.enemies.find((enemy) => enemy.kind === "boss");
          if (boss) {
            boss.hp = Math.round(boss.maxHp * 0.3);
          }
          advanceTicks(state, 1);
        } else if (scenario === "bossLow") {
          const boss = state.enemies.find((enemy) => enemy.kind === "boss");
          if (boss) {
            boss.hp = 1;
            boss.x = state.player.x + 30;
            boss.y = state.player.y;
          }
          state.enemies = state.enemies.filter((enemy) => enemy.kind === "boss");
        }
      } else if (scenario === "dead") {
        state.phase = "dead";
        state.player.hp = 0;
      } else {
        state.phase = "win";
        state.stats.kills = Math.max(36, state.stats.kills);
      }
      return done();
    },
    setWeapons(weapons) {
      scene.state.player.weapons = [...new Set<WeaponId>(["rivet", ...weapons])];
      return done();
    },
    runDeterministic(seed, ticks, x = 0, y = 0) {
      scene.harnessControlled = true;
      scene.reset(seed);
      advanceTicks(scene.state, Math.max(0, Math.min(100_000, Math.floor(ticks))), { x, y });
      return done();
    },
    rendererInfo() {
      const canvas = document.querySelector("canvas");
      if (!canvas) return { renderCount: scene.renderCount, canvasPixelsPresent: false };
      const context = canvas.getContext("2d");
      if (!context) return { renderCount: scene.renderCount, canvasPixelsPresent: canvas.width > 0 && canvas.height > 0 };
      const pixels = context.getImageData(0, 0, Math.min(32, canvas.width), Math.min(32, canvas.height)).data;
      return {
        renderCount: scene.renderCount,
        canvasPixelsPresent: pixels.some((value, index) => index % 4 !== 3 && value !== 0)
      };
    },
    pause() {
      if (scene.state.phase === "combat") togglePause(scene.state);
      return done();
    },
    resume() {
      if (scene.state.phase === "paused") togglePause(scene.state);
      return done();
    },
    singleStep() {
      if (scene.state.phase !== "paused") return done();
      scene.state.phase = "combat";
      stepGame(scene.state, { x: 0, y: 0 });
      if (scene.state.phase === "combat") {
        scene.state.phase = "paused";
        scene.state.previousPhase = "combat";
      }
      return done();
    },
    exportSnapshot() {
      return JSON.stringify({
        snapshotSchemaVersion: 1,
        exportedAtTick: scene.state.tick,
        authority: scene.state
      }, null, 2);
    }
  };
}

declare global {
  interface Window {
    __SCRAP_SWARM_DEV__?: ScrapSwarmDevApi;
    __gameTest?: ScrapSwarmDevApi;
  }
}

export function buyForHarness(scene: GameScene, id: WeaponId): boolean {
  return buyWeapon(scene.state, id);
}

export function upgradeForHarness(scene: GameScene, id: Parameters<typeof applyUpgrade>[1]): boolean {
  return applyUpgrade(scene.state, id);
}

export function continueForHarness(scene: GameScene): boolean {
  return continueFromShop(scene.state);
}
