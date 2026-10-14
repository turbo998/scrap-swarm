import { ARENA, CORE_DASH, ENEMIES, FIXED_DT, SHELTER_CONFIG, TICK_RATE, UPGRADES, WEAPONS } from "./data";
import { hashSeed, nextRandom } from "./rng";
import type {
  Enemy,
  EnemyKind,
  GameEvent,
  GameState,
  InputState,
  StateSummary,
  UpgradeId,
  WeaponId
} from "./types";

const WAVE_DURATION_TICKS = 20 * TICK_RATE;
const ALL_UPGRADES = Object.keys(UPGRADES) as UpgradeId[];

export function createGame(seed = 1337): GameState {
  const rngState = hashSeed(seed);
  return {
    schemaVersion: 1,
    seed,
    rngState,
    tick: 0,
    phase: "menu",
    previousPhase: null,
    player: {
      x: ARENA.width / 2,
      y: ARENA.height / 2,
      hp: 100,
      maxHp: 100,
      speed: 205,
      damageMultiplier: 1,
      cooldownMultiplier: 1,
      armor: 0,
      level: 1,
      xp: 0,
      xpNext: 14,
      scrap: 0,
      weapons: ["rivet"],
      dashCooldown: 0,
      dashMaxCooldown: CORE_DASH.cooldown,
      dashTimer: 0,
      dashDirX: 1,
      dashDirY: 0,
      facingX: 1,
      facingY: 0
    },
    enemies: [],
    pickups: [],
    weapons: {
      rivet: { cooldown: 0 },
      pulse: { cooldown: 0 },
      arc: { cooldown: 0 }
    },
    wave: 1,
    waveTick: 0,
    spawnTimer: 0,
    bossSpawned: false,
    bossPhase: 1,
    bossSlamTimer: 5.2,
    bossTelegraphTicks: 0,
    bossLockExposedTicks: 0,
    shelter: {
      x: SHELTER_CONFIG.x,
      y: SHELTER_CONFIG.y,
      active: false,
      hp: SHELTER_CONFIG.maxHp,
      maxHp: SHELTER_CONFIG.maxHp,
      radius: SHELTER_CONFIG.radius,
      charge: 0,
      maxCharge: SHELTER_CONFIG.maxCharge,
      pulsesTriggered: 0,
      overloaded: false
    },
    nextEntityId: 1,
    upgradeChoices: [],
    stats: {
      kills: 0,
      damageDealt: 0,
      damageTaken: 0,
      upgrades: 0,
      purchases: 0,
      dashes: 0,
      shelterPulses: 0
    },
    events: []
  };
}

export function startGame(state: GameState): void {
  if (state.phase !== "menu" && state.phase !== "dead" && state.phase !== "win") return;
  const fresh = createGame(state.seed);
  Object.assign(state, fresh);
  setPhase(state, "combat");
}

export function togglePause(state: GameState): void {
  if (state.phase === "combat") {
    state.previousPhase = state.phase;
    setPhase(state, "paused");
  } else if (state.phase === "paused") {
    setPhase(state, state.previousPhase === "combat" ? "combat" : "combat");
    state.previousPhase = null;
  }
}

export function triggerDash(state: GameState, dirX?: number, dirY?: number): boolean {
  if (state.phase !== "combat") return false;
  if (state.player.dashCooldown > 0 || state.player.dashTimer > 0) return false;
  const rawX = dirX !== undefined ? dirX : state.player.facingX;
  const rawY = dirY !== undefined ? dirY : state.player.facingY;
  const len = Math.hypot(rawX, rawY);
  const nx = len > 0.01 ? rawX / len : state.player.facingX || 1;
  const ny = len > 0.01 ? rawY / len : state.player.facingY || 0;

  state.player.dashDirX = nx;
  state.player.dashDirY = ny;
  state.player.facingX = nx;
  state.player.facingY = ny;
  state.player.dashTimer = CORE_DASH.duration;
  state.player.dashCooldown = state.player.dashMaxCooldown * Math.max(0.65, state.player.cooldownMultiplier);
  state.stats.dashes++;

  emit(state, {
    type: "dash",
    x: state.player.x,
    y: state.player.y,
    targetX: clamp(state.player.x + nx * 105, ARENA.margin, ARENA.width - ARENA.margin),
    targetY: clamp(state.player.y + ny * 105, ARENA.margin, ARENA.height - ARENA.margin),
    value: CORE_DASH.shockRadius
  });
  return true;
}

export function stepGame(state: GameState, input: InputState): void {
  state.events = [];
  if (state.phase !== "combat") return;
  state.tick++;
  state.waveTick++;

  movePlayer(state, input);
  updateSpawns(state);
  updateShelter(state);
  updateBossMechanics(state);
  updateEnemies(state);
  updateWeapons(state);
  updatePickups(state);
  cleanupDead(state);

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    setPhase(state, "dead");
    return;
  }

  if (state.player.xp >= state.player.xpNext) {
    state.player.xp -= state.player.xpNext;
    state.player.level++;
    state.player.xpNext = Math.round(state.player.xpNext * 1.34 + 4);
    state.upgradeChoices = chooseUpgrades(state, 3);
    setPhase(state, "upgrade");
    return;
  }

  if (state.wave < 3 && state.waveTick >= WAVE_DURATION_TICKS) {
    if (state.wave === 2 && state.shelter.active && !state.shelter.overloaded) {
      state.player.scrap += 8;
    }
    state.shelter.active = false;
    state.enemies = [];
    state.pickups = [];
    setPhase(state, "shop");
  } else if (state.wave === 3 && state.bossSpawned && state.enemies.every((enemy) => enemy.kind !== "boss")) {
    setPhase(state, "win");
  }
}

function movePlayer(state: GameState, input: InputState): void {
  state.player.dashCooldown = Math.max(0, state.player.dashCooldown - FIXED_DT);

  const length = Math.hypot(input.x, input.y);
  const x = length > 0 ? input.x / Math.max(1, length) : 0;
  const y = length > 0 ? input.y / Math.max(1, length) : 0;
  if (length > 0.05) {
    const normLen = Math.hypot(x, y) || 1;
    state.player.facingX = x / normLen;
    state.player.facingY = y / normLen;
  }

  if (input.dash) {
    triggerDash(state, x, y);
  }

  if (state.player.dashTimer > 0) {
    const prevTimer = state.player.dashTimer;
    state.player.dashTimer = Math.max(0, state.player.dashTimer - FIXED_DT);
    const dashSpeed = state.player.speed * CORE_DASH.speedMultiplier;
    state.player.x = clamp(
      state.player.x + state.player.dashDirX * dashSpeed * FIXED_DT,
      ARENA.margin,
      ARENA.width - ARENA.margin
    );
    state.player.y = clamp(
      state.player.y + state.player.dashDirY * dashSpeed * FIXED_DT,
      ARENA.margin,
      ARENA.height - ARENA.margin
    );
    if (prevTimer > 0 && state.player.dashTimer <= 0) {
      releaseDashShockwave(state);
    }
    return;
  }

  state.player.x = clamp(state.player.x + x * state.player.speed * FIXED_DT, ARENA.margin, ARENA.width - ARENA.margin);
  state.player.y = clamp(state.player.y + y * state.player.speed * FIXED_DT, ARENA.margin, ARENA.height - ARENA.margin);
}

function releaseDashShockwave(state: GameState): void {
  const targets = livingInRange(state, CORE_DASH.shockRadius);
  for (const target of targets) {
    dealDamage(state, target, CORE_DASH.shockDamage * state.player.damageMultiplier);
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const push = target.kind === "boss" ? CORE_DASH.knockback * 0.3 : CORE_DASH.knockback;
    target.x = clamp(target.x + (dx / dist) * push, ARENA.margin, ARENA.width - ARENA.margin);
    target.y = clamp(target.y + (dy / dist) * push, ARENA.margin, ARENA.height - ARENA.margin);
  }
  emit(state, {
    type: "pulse",
    x: state.player.x,
    y: state.player.y,
    value: CORE_DASH.shockRadius,
    label: "dashShock"
  });
}

function updateSpawns(state: GameState): void {
  if (state.wave === 3) {
    if (!state.bossSpawned) {
      spawnEnemy(state, "boss", ARENA.width / 2, ARENA.margin + 25);
      for (let index = 0; index < 5; index++) spawnAtEdge(state, index % 2 === 0 ? "scuttler" : "zapper");
      state.bossSpawned = true;
    }
    if (state.tick % 180 === 0 && state.enemies.length < 12) spawnAtEdge(state, random(state) < 0.65 ? "scuttler" : "zapper");
    return;
  }

  state.spawnTimer--;
  if (state.spawnTimer > 0) return;
  const intensity = state.wave === 1 ? 78 : 54;
  state.spawnTimer = intensity - Math.min(24, Math.floor(state.waveTick / 180));
  const roll = random(state);
  const kind: EnemyKind =
    state.wave === 1
      ? roll < 0.8 ? "scuttler" : "zapper"
      : roll < 0.45 ? "scuttler" : roll < 0.77 ? "brute" : "zapper";
  spawnAtEdge(state, kind);
}

function spawnAtEdge(state: GameState, kind: EnemyKind): void {
  const edge = Math.floor(random(state) * 4);
  const along = random(state);
  const positions = [
    { x: ARENA.margin, y: ARENA.height * along },
    { x: ARENA.width - ARENA.margin, y: ARENA.height * along },
    { x: ARENA.width * along, y: ARENA.margin },
    { x: ARENA.width * along, y: ARENA.height - ARENA.margin }
  ];
  const position = positions[edge] ?? positions[0]!;
  spawnEnemy(state, kind, position.x, position.y);
}

export function spawnEnemy(state: GameState, kind: EnemyKind, x: number, y: number): Enemy {
  const data = ENEMIES[kind];
  const waveScale = kind === "boss" ? 1 : 1 + (state.wave - 1) * 0.14;
  const enemy: Enemy = {
    id: state.nextEntityId++,
    kind,
    x,
    y,
    hp: Math.round(data.hp * waveScale),
    maxHp: Math.round(data.hp * waveScale),
    speed: data.speed,
    radius: data.radius,
    damage: data.damage,
    attackCooldown: data.cooldown,
    attackTimer: 0
  };
  state.enemies.push(enemy);
  emit(state, { type: "spawn", x, y, label: kind });
  return enemy;
}

function updateShelter(state: GameState): void {
  if (state.wave !== 2) {
    state.shelter.active = false;
    return;
  }
  if (!state.shelter.active) {
    state.shelter.active = true;
    state.shelter.hp = state.shelter.maxHp;
    state.shelter.charge = 0;
    state.shelter.overloaded = false;
    emit(state, { type: "shelterSpawn", x: state.shelter.x, y: state.shelter.y });
  }

  const distToPlayer = distance(state.player, state.shelter);
  if (distToPlayer <= state.shelter.radius + 45) {
    state.shelter.charge += 22 * FIXED_DT;
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (distance(enemy, state.shelter) <= 56 && !state.shelter.overloaded) {
      state.shelter.hp = Math.max(0, state.shelter.hp - 5 * FIXED_DT);
      if (state.shelter.hp <= 0) {
        state.shelter.overloaded = true;
      }
    }
  }

  if (state.shelter.charge >= state.shelter.maxCharge) {
    state.shelter.charge -= state.shelter.maxCharge;
    state.shelter.pulsesTriggered++;
    state.stats.shelterPulses++;
    state.shelter.overloaded = false;
    state.shelter.hp = Math.min(state.shelter.maxHp, state.shelter.hp + 40);
    state.player.scrap += SHELTER_CONFIG.scrapReward;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + SHELTER_CONFIG.healReward);

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const d = distance(enemy, state.shelter);
      if (d <= SHELTER_CONFIG.pulseRadius) {
        dealDamage(state, enemy, SHELTER_CONFIG.pulseDamage * state.player.damageMultiplier);
        const dx = enemy.x - state.shelter.x;
        const dy = enemy.y - state.shelter.y;
        const norm = Math.max(1, Math.hypot(dx, dy));
        enemy.x = clamp(enemy.x + (dx / norm) * 48, ARENA.margin, ARENA.width - ARENA.margin);
        enemy.y = clamp(enemy.y + (dy / norm) * 48, ARENA.margin, ARENA.height - ARENA.margin);
      }
    }
    emit(state, {
      type: "shelterPulse",
      x: state.shelter.x,
      y: state.shelter.y,
      value: SHELTER_CONFIG.pulseRadius,
      label: "shelter"
    });
  }
}

function updateBossMechanics(state: GameState): void {
  if (state.wave !== 3) return;
  const boss = state.enemies.find((enemy) => enemy.kind === "boss" && enemy.hp > 0);
  if (!boss) return;

  const hpRatio = boss.hp / boss.maxHp;
  if (hpRatio <= 0.65 && state.bossPhase < 2) {
    state.bossPhase = 2;
    boss.speed = Math.round(ENEMIES.boss.speed * 1.16);
    state.bossLockExposedTicks = Math.max(state.bossLockExposedTicks, 210);
    emit(state, { type: "lockExpose", x: boss.x, y: boss.y, value: 2, label: "phase2" });
  }
  if (hpRatio <= 0.35 && state.bossPhase < 3) {
    state.bossPhase = 3;
    boss.speed = Math.round(ENEMIES.boss.speed * 1.28);
    state.bossLockExposedTicks = Math.max(state.bossLockExposedTicks, 260);
    emit(state, { type: "lockExpose", x: boss.x, y: boss.y, value: 3, label: "phase3" });
  }

  if (state.bossLockExposedTicks > 0) {
    state.bossLockExposedTicks--;
  }

  if (state.bossTelegraphTicks > 0) {
    state.bossTelegraphTicks--;
    if (state.bossTelegraphTicks === 0) {
      const slamRadius = 136;
      if (distance(state.player, boss) <= slamRadius) {
        const raw = Math.max(1, 14 - state.player.armor);
        const amount = state.player.dashTimer > 0 ? Math.max(1, Math.round(raw * CORE_DASH.damageReduction)) : raw;
        state.player.hp -= amount;
        state.stats.damageTaken += amount;
        emit(state, { type: "hurt", x: state.player.x, y: state.player.y, value: amount, label: "bossSlam" });
      }
      state.bossLockExposedTicks = Math.max(state.bossLockExposedTicks, 180);
      emit(state, { type: "bossSlam", x: boss.x, y: boss.y, value: slamRadius });
      emit(state, { type: "lockExpose", x: boss.x, y: boss.y, value: state.bossPhase, label: "slamVent" });
    }
    return;
  }

  state.bossSlamTimer -= FIXED_DT;
  if (state.bossSlamTimer <= 0) {
    state.bossTelegraphTicks = 42;
    state.bossSlamTimer = state.bossPhase === 3 ? 4.4 : state.bossPhase === 2 ? 5.2 : 6.0;
    emit(state, { type: "bossTelegraph", x: boss.x, y: boss.y, value: 136 });
  }
}

function updateEnemies(state: GameState): void {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.attackTimer = Math.max(0, enemy.attackTimer - FIXED_DT);
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    const desiredRange = enemy.kind === "zapper" ? 175 : enemy.radius + 15;
    const speedScale = enemy.kind === "boss" && state.bossTelegraphTicks > 0 ? 0.35 : 1;
    if (dist > desiredRange) {
      enemy.x += (dx / dist) * enemy.speed * speedScale * FIXED_DT;
      enemy.y += (dy / dist) * enemy.speed * speedScale * FIXED_DT;
    }
    const canAttack = enemy.kind === "zapper" ? dist <= 210 : dist <= enemy.radius + 21;
    if (canAttack && enemy.attackTimer <= 0) {
      const baseAmount = Math.max(1, enemy.damage - state.player.armor);
      const amount =
        state.player.dashTimer > 0
          ? Math.max(1, Math.round(baseAmount * CORE_DASH.damageReduction))
          : baseAmount;
      state.player.hp -= amount;
      state.stats.damageTaken += amount;
      enemy.attackTimer = enemy.attackCooldown;
      emit(state, { type: "hurt", x: state.player.x, y: state.player.y, value: amount, label: enemy.kind });
    }
  }
}

function updateWeapons(state: GameState): void {
  for (const id of state.player.weapons) {
    const runtime = state.weapons[id];
    runtime.cooldown = Math.max(0, runtime.cooldown - FIXED_DT);
    if (runtime.cooldown > 0) continue;
    const fired = id === "rivet" ? fireRivet(state) : id === "pulse" ? firePulse(state) : fireArc(state);
    if (fired) runtime.cooldown = WEAPONS[id].cooldown * state.player.cooldownMultiplier;
  }
}

function livingInRange(state: GameState, range: number): Enemy[] {
  return state.enemies
    .filter((enemy) => enemy.hp > 0 && distance(state.player, enemy) <= range)
    .sort((a, b) => distance(state.player, a) - distance(state.player, b) || a.id - b.id);
}

function fireRivet(state: GameState): boolean {
  const target = livingInRange(state, WEAPONS.rivet.range)[0];
  if (!target) return false;
  dealDamage(state, target, WEAPONS.rivet.damage * state.player.damageMultiplier);
  emit(state, { type: "shot", x: state.player.x, y: state.player.y, targetX: target.x, targetY: target.y });
  return true;
}

function firePulse(state: GameState): boolean {
  const targets = livingInRange(state, WEAPONS.pulse.range);
  if (targets.length === 0) return false;
  for (const target of targets) dealDamage(state, target, WEAPONS.pulse.damage * state.player.damageMultiplier);
  emit(state, { type: "pulse", x: state.player.x, y: state.player.y, value: WEAPONS.pulse.range });
  return true;
}

function fireArc(state: GameState): boolean {
  const targets = livingInRange(state, WEAPONS.arc.range).slice(0, 3);
  if (targets.length === 0) return false;
  let from = { x: state.player.x, y: state.player.y };
  for (const target of targets) {
    dealDamage(state, target, WEAPONS.arc.damage * state.player.damageMultiplier);
    emit(state, { type: "arc", x: from.x, y: from.y, targetX: target.x, targetY: target.y });
    from = target;
  }
  return true;
}

function dealDamage(state: GameState, enemy: Enemy, rawDamage: number): void {
  const armorBreak = enemy.kind === "boss" && state.bossLockExposedTicks > 0;
  const effectiveDamage = armorBreak ? rawDamage * 1.45 : rawDamage;
  const damage = Math.round(effectiveDamage * 10) / 10;
  enemy.hp -= damage;
  state.stats.damageDealt += damage;
  emit(state, {
    type: "hit",
    x: enemy.x,
    y: enemy.y,
    value: damage,
    label: armorBreak ? "armorBreak" : enemy.kind
  });
}

function cleanupDead(state: GameState): void {
  const survivors: Enemy[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      survivors.push(enemy);
      continue;
    }
    const data = ENEMIES[enemy.kind];
    state.stats.kills++;
    if (state.wave === 2 && state.shelter.active && distance(enemy, state.shelter) <= 280) {
      state.shelter.charge += 24;
    }
    state.pickups.push({
      id: state.nextEntityId++,
      x: enemy.x,
      y: enemy.y,
      xp: data.xp,
      scrap: data.scrap
    });
    emit(state, { type: "kill", x: enemy.x, y: enemy.y, label: enemy.kind });
  }
  state.enemies = survivors;
}

function updatePickups(state: GameState): void {
  const magnetRadius = state.player.dashTimer > 0 ? CORE_DASH.pickupPullRadius : 150;
  const magnetSpeed = state.player.dashTimer > 0 ? 480 : 260;
  state.pickups = state.pickups.filter((pickup) => {
    const dx = state.player.x - pickup.x;
    const dy = state.player.y - pickup.y;
    const dist = Math.hypot(dx, dy);
    if (dist < magnetRadius && dist > 1) {
      pickup.x += (dx / dist) * magnetSpeed * FIXED_DT;
      pickup.y += (dy / dist) * magnetSpeed * FIXED_DT;
    }
    if (dist > 24) return true;
    state.player.xp += pickup.xp;
    state.player.scrap += pickup.scrap;
    emit(state, { type: "pickup", x: pickup.x, y: pickup.y, value: pickup.xp });
    return false;
  });
}

function chooseUpgrades(state: GameState, count: number): UpgradeId[] {
  const pool = [...ALL_UPGRADES];
  const choices: UpgradeId[] = [];
  while (choices.length < count && pool.length > 0) {
    const index = Math.floor(random(state) * pool.length);
    choices.push(pool.splice(index, 1)[0]!);
  }
  return choices;
}

export function applyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (state.phase !== "upgrade" || !state.upgradeChoices.includes(id)) return false;
  switch (id) {
    case "damage":
      state.player.damageMultiplier *= 1.25;
      break;
    case "fireRate":
      state.player.cooldownMultiplier *= 0.82;
      break;
    case "armor":
      state.player.armor += 2;
      state.player.maxHp += 12;
      state.player.hp += 12;
      break;
    case "speed":
      state.player.speed *= 1.12;
      break;
    case "repair":
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 40);
      break;
  }
  state.stats.upgrades++;
  state.upgradeChoices = [];
  setPhase(state, "combat");
  return true;
}

export function buyWeapon(state: GameState, id: WeaponId): boolean {
  if (state.phase !== "shop" || id === "rivet" || state.player.weapons.includes(id)) return false;
  const price = WEAPONS[id].price;
  if (state.player.scrap < price) return false;
  state.player.scrap -= price;
  state.player.weapons.push(id);
  state.stats.purchases++;
  return true;
}

export function repairAtShop(state: GameState): boolean {
  const price = 12;
  if (state.phase !== "shop" || state.player.scrap < price || state.player.hp >= state.player.maxHp) return false;
  state.player.scrap -= price;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 35);
  state.stats.purchases++;
  return true;
}

export function continueFromShop(state: GameState): boolean {
  if (state.phase !== "shop") return false;
  state.wave++;
  state.waveTick = 0;
  state.spawnTimer = 0;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 18);
  setPhase(state, "combat");
  return true;
}

export function summary(state: GameState): StateSummary {
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    seed: state.seed,
    tick: state.tick,
    phase: state.phase,
    wave: state.wave,
    player: {
      x: round(state.player.x),
      y: round(state.player.y),
      hp: round(state.player.hp),
      level: state.player.level,
      xp: round(state.player.xp),
      scrap: state.player.scrap,
      weapons: [...state.player.weapons],
      dashCooldown: round(state.player.dashCooldown)
    },
    enemies: state.enemies
      .map((enemy) => ({ kind: enemy.kind, x: round(enemy.x), y: round(enemy.y), hp: round(enemy.hp) }))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.x - b.x || a.y - b.y),
    kills: state.stats.kills,
    rngState: state.rngState,
    bossPhase: state.bossPhase,
    bossLockExposed: state.bossLockExposedTicks > 0,
    shelter: {
      active: state.shelter.active,
      hp: round(state.shelter.hp),
      pulses: state.shelter.pulsesTriggered
    }
  };
}

export function advanceTicks(state: GameState, ticks: number, input: InputState = { x: 0, y: 0 }): void {
  for (let index = 0; index < ticks && state.phase === "combat"; index++) stepGame(state, input);
}

function random(state: GameState): number {
  const [value, next] = nextRandom(state.rngState);
  state.rngState = next;
  return value;
}

function setPhase(state: GameState, phase: GameState["phase"]): void {
  state.phase = phase;
  emit(state, { type: "phase", label: phase });
}

function emit(state: GameState, event: Omit<GameEvent, "tick">): void {
  state.events.push({ tick: state.tick, ...event });
  if (state.events.length > 80) state.events.shift();
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
