export type Phase = "menu" | "combat" | "upgrade" | "shop" | "paused" | "win" | "dead";
export type EnemyKind = "scuttler" | "brute" | "zapper" | "boss";
export type WeaponId = "rivet" | "pulse" | "arc";
export type UpgradeId = "damage" | "fireRate" | "armor" | "speed" | "repair";

export interface Vec2 { x: number; y: number }

export interface Player extends Vec2 {
  hp: number;
  maxHp: number;
  speed: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  armor: number;
  level: number;
  xp: number;
  xpNext: number;
  scrap: number;
  weapons: WeaponId[];
  dashCooldown: number;
  dashMaxCooldown: number;
  dashTimer: number;
  dashDirX: number;
  dashDirY: number;
  facingX: number;
  facingY: number;
}

export interface ShelterRelay extends Vec2 {
  active: boolean;
  hp: number;
  maxHp: number;
  radius: number;
  charge: number;
  maxCharge: number;
  pulsesTriggered: number;
  overloaded: boolean;
}

export interface Enemy extends Vec2 {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  attackCooldown: number;
  attackTimer: number;
}

export interface Pickup extends Vec2 {
  id: number;
  xp: number;
  scrap: number;
}

export interface WeaponRuntime {
  cooldown: number;
}

export interface RunStats {
  kills: number;
  damageDealt: number;
  damageTaken: number;
  upgrades: number;
  purchases: number;
  dashes: number;
  shelterPulses: number;
}

export type GameEventType =
  | "shot"
  | "pulse"
  | "arc"
  | "hit"
  | "hurt"
  | "kill"
  | "pickup"
  | "phase"
  | "spawn"
  | "dash"
  | "shelterSpawn"
  | "shelterPulse"
  | "bossTelegraph"
  | "bossSlam"
  | "lockExpose";

export interface GameEvent {
  tick: number;
  type: GameEventType;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
  value?: number;
  label?: string;
}

export interface GameState {
  schemaVersion: 1;
  seed: number;
  rngState: number;
  tick: number;
  phase: Phase;
  previousPhase: Phase | null;
  player: Player;
  enemies: Enemy[];
  pickups: Pickup[];
  weapons: Record<WeaponId, WeaponRuntime>;
  wave: number;
  waveTick: number;
  spawnTimer: number;
  bossSpawned: boolean;
  bossPhase: 1 | 2 | 3;
  bossSlamTimer: number;
  bossTelegraphTicks: number;
  bossLockExposedTicks: number;
  shelter: ShelterRelay;
  nextEntityId: number;
  upgradeChoices: UpgradeId[];
  stats: RunStats;
  events: GameEvent[];
}

export interface InputState {
  x: number;
  y: number;
  dash?: boolean;
}

export interface StateSummary {
  seed: number;
  tick: number;
  phase: Phase;
  wave: number;
  player: {
    x: number;
    y: number;
    hp: number;
    level: number;
    xp: number;
    scrap: number;
    weapons: WeaponId[];
    dashCooldown: number;
  };
  enemies: Array<{ kind: EnemyKind; x: number; y: number; hp: number }>;
  kills: number;
  rngState: number;
  bossPhase: 1 | 2 | 3;
  bossLockExposed: boolean;
  shelter: {
    active: boolean;
    hp: number;
    pulses: number;
  };
}
