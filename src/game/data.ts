import type { EnemyKind, UpgradeId, WeaponId } from "./types";

export const ARENA = { width: 1280, height: 720, margin: 34 } as const;
export const TICK_RATE = 60;
export const FIXED_DT = 1 / TICK_RATE;

export const CORE_DASH = {
  cooldown: 3.0,
  duration: 0.18,
  speedMultiplier: 2.85,
  damageReduction: 0.35,
  shockRadius: 138,
  shockDamage: 15,
  knockback: 44,
  pickupPullRadius: 235
} as const;

export const SHELTER_CONFIG = {
  x: 490,
  y: 330,
  maxHp: 160,
  radius: 118,
  maxCharge: 100,
  pulseRadius: 220,
  pulseDamage: 22,
  scrapReward: 6,
  healReward: 12
} as const;

export const WEAPONS: Record<WeaponId, {
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  range: number;
  color: number;
  price: number;
}> = {
  rivet: {
    name: "爆铆拳炮",
    description: "将维修铆钉压成拳劲般的高速直击。",
    damage: 12,
    cooldown: 0.34,
    range: 430,
    color: 0xffcc38,
    price: 0
  },
  pulse: {
    name: "震磁圆阵",
    description: "展开近身磁场，把包围者一口气震退。",
    damage: 18,
    cooldown: 1.45,
    range: 150,
    color: 0x00e5ff,
    price: 28
  },
  arc: {
    name: "雷索连击",
    description: "以高压电索连续追击最多三个目标。",
    damage: 10,
    cooldown: 0.9,
    range: 300,
    color: 0xb66cff,
    price: 42
  }
};

export const ENEMIES: Record<EnemyKind, {
  name: string;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  cooldown: number;
  xp: number;
  scrap: number;
  color: number;
}> = {
  scuttler: { name: "赤砂牙轮", hp: 24, speed: 88, radius: 13, damage: 7, cooldown: 0.75, xp: 4, scrap: 2, color: 0xa75636 },
  brute: { name: "铁壁角斗机", hp: 78, speed: 44, radius: 22, damage: 15, cooldown: 1.15, xp: 9, scrap: 5, color: 0xb17a3f },
  zapper: { name: "苍雷浮游卫", hp: 40, speed: 61, radius: 16, damage: 9, cooldown: 1.3, xp: 6, scrap: 3, color: 0x91c9b5 },
  boss: { name: "铁冠·赫克托", hp: 780, speed: 38, radius: 48, damage: 20, cooldown: 0.85, xp: 50, scrap: 100, color: 0xd28a3f }
};

export const UPGRADES: Record<UpgradeId, { name: string; description: string }> = {
  damage: { name: "斗魂增压栓", description: "武器伤害 +25%" },
  fireRate: { name: "连击装填器", description: "射速 +18%" },
  armor: { name: "冠军装甲焊", description: "护甲 +2，完整度上限 +12" },
  speed: { name: "疾走履带油", description: "移动速度 +12%" },
  repair: { name: "技师急救包", description: "恢复 40 完整度" }
};
