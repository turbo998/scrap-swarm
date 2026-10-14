import Phaser from "phaser";
import { soundEngine } from "../game/audio";
import { ARENA, FIXED_DT, WEAPONS } from "../game/data";
import { createGame, startGame, stepGame, triggerDash } from "../game/simulation";
import type { GameEvent, GameState, InputState } from "../game/types";

interface VisualEffect extends GameEvent {
  life: number;
  maxLife: number;
}
interface DustMote {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
}
interface ShellCasing {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  life: number;
  maxLife: number;
}
interface AfterimageGhost {
  x: number;
  y: number;
  facing: number;
  tint: number;
  life: number;
  maxLife: number;
}
interface TreadDust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: number;
  life: number;
  maxLife: number;
}
interface FloatingNumber {
  x: number;
  y: number;
  vy: number;
  value: number;
  critical: boolean;
  life: number;
  maxLife: number;
}
interface DebrisShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  life: number;
  maxLife: number;
}

const DIGIT_SEGMENTS: Record<string, Array<[number, number, number, number]>> = {
  "0": [[0, 0, 1, 0], [1, 0, 1, 2], [1, 2, 0, 2], [0, 2, 0, 0]],
  "1": [[0.5, 0, 0.5, 2]],
  "2": [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 2], [0, 2, 1, 2]],
  "3": [[0, 0, 1, 0], [1, 0, 1, 2], [0, 1, 1, 1], [0, 2, 1, 2]],
  "4": [[0, 0, 0, 1], [0, 1, 1, 1], [1, 0, 1, 2]],
  "5": [[1, 0, 0, 0], [0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 2], [1, 2, 0, 2]],
  "6": [[1, 0, 0, 0], [0, 0, 0, 2], [0, 1, 1, 1], [1, 1, 1, 2], [0, 2, 1, 2]],
  "7": [[0, 0, 1, 0], [1, 0, 0.4, 2]],
  "8": [[0, 0, 1, 0], [1, 0, 1, 2], [0, 2, 1, 2], [0, 0, 0, 2], [0, 1, 1, 1]],
  "9": [[0, 0, 1, 0], [0, 0, 0, 1], [0, 1, 1, 1], [1, 0, 1, 2], [0, 2, 1, 2]]
};

export class GameScene extends Phaser.Scene {
  public state: GameState;
  public onStateChange: (state: GameState) => void = () => undefined;
  public onCutin: (cutinId: string) => void = () => undefined;
  public harnessControlled = false;
  public renderCount = 0;
  private graphics!: Phaser.GameObjects.Graphics;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private accumulator = 0;
  private lastPhase = "";
  private lastWave = 0;
  private overdriveAnnounced = false;
  private effects: VisualEffect[] = [];
  private shells: ShellCasing[] = [];
  private afterimages: AfterimageGhost[] = [];
  private treadDust: TreadDust[] = [];
  private floatingNumbers: FloatingNumber[] = [];
  private debris: DebrisShard[] = [];
  private facing = 1;
  private previousPlayerX = ARENA.width / 2;
  private previousPlayerY = ARENA.height / 2;
  private shakeTimer = 0;
  private shakeMagnitude = 0;
  private impactFlashTimer = 0;
  private dust: DustMote[] = [];

  constructor(seed = 1337) {
    super("arena");
    this.state = createGame(seed);
  }

  create(): void {
    this.createTerrain();
    this.graphics = this.add.graphics();
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable.");
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      upAlt: Phaser.Input.Keyboard.KeyCodes.UP,
      downAlt: Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftAlt: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightAlt: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      dashAlt: Phaser.Input.Keyboard.KeyCodes.SHIFT
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.scale.on("resize", () => this.draw());
    this.onStateChange(this.state);
  }

  public requestDash(): boolean {
    const fired = triggerDash(this.state);
    if (fired) {
      for (const event of this.state.events) this.captureEffect(event);
      this.onStateChange(this.state);
    }
    return fired;
  }

  update(_: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);
    this.accumulator += dt;
    let stepped = false;
    while (!this.harnessControlled && this.accumulator >= FIXED_DT) {
      stepGame(this.state, this.readInput());
      this.accumulator -= FIXED_DT;
      stepped = true;
      for (const event of this.state.events) this.captureEffect(event);
      this.spawnContinuousParticles();
    }
    if (this.harnessControlled) this.accumulator = 0;

    this.updateVisualParticles(dt);
    this.checkMilestones();

    if (stepped || this.state.phase !== this.lastPhase) {
      this.lastPhase = this.state.phase;
      this.onStateChange(this.state);
    }
    this.draw();
    this.renderCount++;
  }

  reset(seed: number): void {
    this.state = createGame(seed);
    startGame(this.state);
    this.accumulator = 0;
    this.effects = [];
    this.shells = [];
    this.afterimages = [];
    this.treadDust = [];
    this.floatingNumbers = [];
    this.debris = [];
    this.lastWave = 0;
    this.overdriveAnnounced = false;
    this.shakeTimer = 0;
    this.impactFlashTimer = 0;
    this.previousPlayerX = this.state.player.x;
    this.previousPlayerY = this.state.player.y;
    this.onStateChange(this.state);
  }

  private checkMilestones(): void {
    if (this.state.phase !== "combat") return;
    if (this.state.wave !== this.lastWave) {
      this.lastWave = this.state.wave;
      if (this.state.wave === 1) this.onCutin("wave1");
      else if (this.state.wave === 2) this.onCutin("wave2_shelter");
      else if (this.state.wave === 3) this.onCutin("wave3_boss");
    }
    if (!this.overdriveAnnounced && this.state.player.weapons.length >= 3) {
      this.overdriveAnnounced = true;
      this.onCutin("overdrive");
    }
  }

  private spawnContinuousParticles(): void {
    const { x, y, dashTimer } = this.state.player;
    const moved = Math.hypot(x - this.previousPlayerX, y - this.previousPlayerY);
    if (moved > 0.25 && this.state.tick % 3 === 0) {
      this.treadDust.push({
        x: x - this.facing * 18,
        y: y + 26,
        vx: -this.facing * (18 + (this.state.tick % 14)),
        vy: -6 - (this.state.tick % 9),
        radius: dashTimer > 0 ? 5.5 : 3.5,
        color: dashTimer > 0 ? 0xffcc38 : 0xb59c64,
        life: 0.35,
        maxLife: 0.35
      });
    }
    if (dashTimer > 0 && this.state.tick % 2 === 0) {
      this.afterimages.push({
        x,
        y,
        facing: this.facing,
        tint: this.state.tick % 4 === 0 ? 0x00e5ff : 0xffcc38,
        life: 0.26,
        maxLife: 0.26
      });
    }
  }

  private updateVisualParticles(dt: number): void {
    for (const effect of this.effects) effect.life -= dt;
    this.effects = this.effects.filter((effect) => effect.life > 0).slice(-72);

    for (const shell of this.shells) {
      shell.life -= dt;
      shell.x += shell.vx * dt;
      shell.y += shell.vy * dt;
      shell.vy += 260 * dt;
      shell.rot += shell.vrot * dt;
    }
    this.shells = this.shells.filter((s) => s.life > 0).slice(-24);

    for (const ghost of this.afterimages) ghost.life -= dt;
    this.afterimages = this.afterimages.filter((g) => g.life > 0).slice(-16);

    for (const dust of this.treadDust) {
      dust.life -= dt;
      dust.x += dust.vx * dt;
      dust.y += dust.vy * dt;
    }
    this.treadDust = this.treadDust.filter((d) => d.life > 0).slice(-36);

    for (const num of this.floatingNumbers) {
      num.life -= dt;
      num.y += num.vy * dt;
    }
    this.floatingNumbers = this.floatingNumbers.filter((n) => n.life > 0).slice(-28);

    for (const shard of this.debris) {
      shard.life -= dt;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.vy += 180 * dt;
    }
    this.debris = this.debris.filter((d) => d.life > 0).slice(-40);

    this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    this.impactFlashTimer = Math.max(0, this.impactFlashTimer - dt);
  }

  private captureEffect(event: GameEvent): void {
    if (!this.harnessControlled) {
      soundEngine.handleEvent(event);
    }

    if (event.type === "shot" && event.x !== undefined && event.y !== undefined) {
      this.shells.push({
        x: event.x + this.facing * 18,
        y: event.y - 6,
        vx: -this.facing * (45 + (event.tick % 25)),
        vy: -85 - (event.tick % 30),
        rot: 0,
        vrot: 11 * -this.facing,
        life: 0.42,
        maxLife: 0.42
      });
    } else if (event.type === "hit" && event.x !== undefined && event.y !== undefined && event.value !== undefined) {
      const crit = event.label === "armorBreak" || event.value >= 20;
      this.floatingNumbers.push({
        x: event.x + ((event.tick % 5) - 2) * 5,
        y: event.y - 22,
        vy: crit ? -46 : -32,
        value: Math.round(event.value),
        critical: crit,
        life: crit ? 0.65 : 0.48,
        maxLife: crit ? 0.65 : 0.48
      });
    } else if (event.type === "hurt") {
      this.triggerShake(0.18, 5);
    } else if (event.type === "dash" && event.x !== undefined && event.y !== undefined) {
      this.triggerShake(0.12, 3.5);
      this.afterimages.push({
        x: event.x,
        y: event.y,
        facing: this.facing,
        tint: 0x00e5ff,
        life: 0.3,
        maxLife: 0.3
      });
    } else if (event.type === "lockExpose") {
      if (event.label === "phase2" || event.label === "phase3") {
        this.onCutin("lock_expose");
      }
      this.triggerShake(0.22, 6);
    } else if (event.type === "bossSlam") {
      this.triggerShake(0.26, 7.5);
    } else if (event.type === "kill" && event.x !== undefined && event.y !== undefined) {
      const isBoss = event.label === "boss";
      const count = isBoss ? 22 : 6;
      for (let i = 0; i < count; i++) {
        const ang = (i * Math.PI * 2) / count + (event.tick % 7) * 0.2;
        const spd = isBoss ? 90 + (i % 5) * 42 : 45 + (i % 3) * 28;
        this.debris.push({
          x: event.x,
          y: event.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 35,
          size: isBoss ? 6 + (i % 4) * 2 : 3.5 + (i % 2) * 1.5,
          color: isBoss ? (i % 2 === 0 ? 0xffcc38 : 0xdf633a) : 0xc39145,
          life: isBoss ? 0.85 : 0.42,
          maxLife: isBoss ? 0.85 : 0.42
        });
      }
      if (isBoss) {
        this.impactFlashTimer = 0.28;
        this.triggerShake(0.45, 11);
      }
    }

    if (event.type === "spawn" || event.type === "phase" || event.type === "pickup") return;
    const duration =
      event.type === "pulse" || event.type === "shelterPulse" || event.type === "bossSlam"
        ? 0.48
        : event.type === "bossTelegraph"
          ? 0.7
          : event.type === "kill"
            ? 0.52
            : event.type === "hurt" || event.type === "dash"
              ? 0.34
              : event.type === "arc"
                ? 0.28
                : 0.2;
    this.effects.push({ ...event, life: duration, maxLife: duration });
  }

  private triggerShake(duration: number, magnitude: number): void {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
  }

  private readInput(): InputState {
    const pressed = (name: string): boolean => this.keys[name]?.isDown ?? false;
    return {
      x: Number(pressed("right") || pressed("rightAlt")) - Number(pressed("left") || pressed("leftAlt")),
      y: Number(pressed("down") || pressed("downAlt")) - Number(pressed("up") || pressed("upAlt")),
      dash: pressed("dash") || pressed("dashAlt")
    };
  }

  private createTerrain(): void {
    const terrain = this.add.graphics();
    terrain.fillStyle(0x5a5038, 1);
    terrain.fillRect(0, 0, ARENA.width, ARENA.height);

    // Broken service-highway slab.
    terrain.fillStyle(0x343733, 1);
    terrain.fillRect(76, 0, 1128, ARENA.height);
    terrain.fillStyle(0x3e403a, 1);
    terrain.fillRect(106, 0, 1068, ARENA.height);
    terrain.lineStyle(2, 0x171b18, 0.55);
    const cracks = [
      [145, 80, 198, 112, 174, 154], [350, 0, 324, 62, 379, 96], [535, 230, 587, 258, 558, 310],
      [810, 74, 768, 128, 825, 168], [1018, 292, 966, 335, 1002, 392], [244, 498, 304, 526, 276, 590],
      [706, 510, 670, 557, 728, 621], [1112, 565, 1070, 612, 1105, 676]
    ];
    for (const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0] of cracks) {
      terrain.beginPath();
      terrain.moveTo(x1, y1);
      terrain.lineTo(x2, y2);
      terrain.lineTo(x3, y3);
      terrain.strokePath();
      terrain.lineBetween(x2, y2, x2 + 18, y2 - 9);
    }

    // Faded highway and service lane paint.
    terrain.fillStyle(0xc6a64b, 0.32);
    for (let y = 26; y < ARENA.height; y += 92) terrain.fillRect(624, y, 8, 48);
    terrain.fillStyle(0xd9d0a1, 0.18);
    terrain.fillRect(176, 0, 5, ARENA.height);
    terrain.fillRect(1088, 0, 5, ARENA.height);

    // Sand drifts keep the combat center readable.
    terrain.fillStyle(0xa78c54, 0.88);
    terrain.fillEllipse(100, 246, 220, 92);
    terrain.fillEllipse(1184, 458, 260, 118);
    terrain.fillEllipse(336, 706, 420, 54);
    terrain.fillStyle(0xc4a665, 0.4);
    terrain.fillEllipse(105, 232, 160, 38);
    terrain.fillEllipse(1175, 438, 190, 48);

    // Abandoned relay station silhouette.
    terrain.fillStyle(0x242a27, 1);
    terrain.fillRect(34, 32, 276, 112);
    terrain.fillStyle(0x4c4b3c, 1);
    terrain.fillRect(48, 46, 248, 82);
    terrain.fillStyle(0x171c1b, 1);
    terrain.fillRect(74, 76, 58, 52);
    terrain.fillRect(206, 62, 64, 35);
    terrain.lineStyle(5, 0x28261d, 1);
    terrain.lineBetween(176, 44, 198, 4);
    terrain.lineBetween(198, 4, 222, 44);
    terrain.fillStyle(0xc98531, 0.42);
    terrain.fillCircle(210, 75, 8);

    // Pipework and perimeter fence.
    terrain.lineStyle(10, 0x584b38, 1);
    terrain.lineBetween(900, 48, 1198, 48);
    terrain.lineBetween(900, 48, 900, 120);
    terrain.lineBetween(900, 120, 1005, 120);
    terrain.lineStyle(2, 0x76654d, 0.7);
    for (let x = 938; x < 1210; x += 28) {
      terrain.lineBetween(x, 568, x, 700);
      terrain.lineBetween(x - 14, 568, x + 14, 700);
    }
    terrain.lineBetween(924, 584, 1210, 584);
    terrain.lineBetween(924, 670, 1210, 670);

    // Landmark clusters: wreck, barrels, cable coils, concrete blocks.
    this.drawWreck(terrain, 1040, 190, -0.08);
    this.drawWreck(terrain, 196, 606, 0.05);
    for (const [x, y, color] of [[1132, 112, 0x87472e], [1160, 121, 0x6e5c31], [88, 506, 0x87472e]] as const) {
      terrain.fillStyle(0x161713, 0.5);
      terrain.fillEllipse(x + 5, y + 14, 35, 15);
      terrain.fillStyle(color, 1);
      terrain.fillRoundedRect(x - 12, y - 18, 24, 38, 5);
      terrain.lineStyle(2, 0x2d241c, 1);
      terrain.strokeRoundedRect(x - 12, y - 18, 24, 38, 5);
      terrain.lineBetween(x - 11, y - 7, x + 11, y - 7);
    }
    terrain.lineStyle(5, 0x1d201d, 0.9);
    terrain.strokeCircle(330, 78, 25);
    terrain.strokeCircle(330, 78, 15);
    terrain.lineBetween(354, 76, 416, 88);
    terrain.fillStyle(0x555043, 1);
    terrain.fillRect(756, 620, 90, 36);
    terrain.fillRect(790, 586, 78, 30);
    terrain.lineStyle(2, 0x292b27, 1);
    terrain.strokeRect(756, 620, 90, 36);
    terrain.strokeRect(790, 586, 78, 30);

    // Hazard boundary and burnt vignette.
    terrain.lineStyle(3, 0xa76d2d, 0.75);
    terrain.strokeRect(ARENA.margin, ARENA.margin, ARENA.width - ARENA.margin * 2, ARENA.height - ARENA.margin * 2);
    terrain.fillStyle(0x15130e, 0.3);
    terrain.fillRect(0, 0, ARENA.width, 26);
    terrain.fillRect(0, ARENA.height - 28, ARENA.width, 28);
    terrain.fillRect(0, 0, 28, ARENA.height);
    terrain.fillRect(ARENA.width - 28, 0, 28, ARENA.height);

    let visualSeed = 0x51a7c0de;
    const next = (): number => {
      visualSeed = (visualSeed * 1664525 + 1013904223) >>> 0;
      return visualSeed / 0x1_0000_0000;
    };
    this.dust = Array.from({ length: 26 }, () => ({
      x: next() * ARENA.width,
      y: next() * ARENA.height,
      size: 1 + next() * 2.5,
      speed: 4 + next() * 9,
      phase: next() * Math.PI * 2
    }));
  }

  private drawWreck(graphics: Phaser.GameObjects.Graphics, x: number, y: number, rotation: number): void {
    const skew = rotation * 80;
    graphics.fillStyle(0x171814, 0.55);
    graphics.fillEllipse(x + 8, y + 17, 126, 32);
    graphics.fillStyle(0x6f4932, 1);
    graphics.fillRoundedRect(x - 56, y - 18, 112, 37, 12);
    graphics.fillStyle(0x3b413d, 1);
    graphics.fillRect(x - 23 + skew, y - 35, 52, 24);
    graphics.fillStyle(0x151b1a, 1);
    graphics.fillRect(x - 16 + skew, y - 31, 19, 17);
    graphics.fillRect(x + 8 + skew, y - 31, 15, 17);
    graphics.fillStyle(0x171814, 1);
    graphics.fillCircle(x - 35, y + 17, 14);
    graphics.fillCircle(x + 37, y + 17, 14);
    graphics.fillStyle(0x8e633c, 1);
    graphics.fillCircle(x - 35, y + 17, 6);
    graphics.fillCircle(x + 37, y + 17, 6);
  }

  private draw(): void {
    if (!this.graphics) return;
    const graphics = this.graphics;
    graphics.clear();

    const reducedMotion =
      typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    if (this.impactFlashTimer > 0 && !reducedMotion) {
      this.drawImpactFrame(graphics);
      return;
    }

    if (this.shakeTimer > 0 && !reducedMotion) {
      const ox = Math.sin(this.time.now * 0.09) * this.shakeMagnitude;
      const oy = Math.cos(this.time.now * 0.11) * this.shakeMagnitude * 0.7;
      graphics.setPosition(ox, oy);
    } else {
      graphics.setPosition(0, 0);
    }

    this.drawAtmosphere(graphics);
    if (this.state.shelter.active) this.drawShelterRelay(graphics, this.state.shelter);
    for (const pickup of this.state.pickups) this.drawPickup(graphics, pickup.x, pickup.y, pickup.id);
    this.drawAfterimages(graphics);
    for (const enemy of this.state.enemies) this.drawEnemy(graphics, enemy);
    this.drawPlayer(graphics);
    for (const effect of this.effects) this.drawEffect(graphics, effect);
    this.drawParticlesAndNumbers(graphics);
  }

  private drawImpactFrame(graphics: Phaser.GameObjects.Graphics): void {
    graphics.setPosition(0, 0);
    graphics.fillStyle(0x0c0b09, 0.94);
    graphics.fillRect(0, 0, ARENA.width, ARENA.height);
    const cx = this.state.player.x;
    const cy = this.state.player.y;
    graphics.lineStyle(5, 0xffe48f, 0.95);
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10;
      graphics.lineBetween(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36, cx + Math.cos(a) * 780, cy + Math.sin(a) * 780);
    }
    graphics.fillStyle(0xff5b2e, 0.9);
    graphics.fillCircle(cx, cy, 52);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(cx, cy, 26);
  }

  private drawShelterRelay(
    graphics: Phaser.GameObjects.Graphics,
    shelter: GameState["shelter"]
  ): void {
    const now = this.time.now / 1000;
    const chargeRatio = Math.min(1, shelter.charge / shelter.maxCharge);
    const hpRatio = Math.max(0, shelter.hp / shelter.maxHp);

    // Protective field ring
    graphics.lineStyle(2, 0x74d1b6, 0.25 + Math.sin(now * 4) * 0.08);
    graphics.strokeCircle(shelter.x, shelter.y, shelter.radius + 95);
    graphics.lineStyle(3, 0xb9dd78, 0.45);
    graphics.beginPath();
    graphics.arc(shelter.x, shelter.y, shelter.radius + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeRatio, false);
    graphics.strokePath();

    // Base pad & shelter beacon tower
    graphics.fillStyle(0x161915, 0.65);
    graphics.fillEllipse(shelter.x, shelter.y + 18, 92, 28);
    graphics.fillStyle(0x363d34, 1);
    graphics.fillRoundedRect(shelter.x - 32, shelter.y - 18, 64, 38, 8);
    graphics.lineStyle(3, 0x1d211c, 1);
    graphics.strokeRoundedRect(shelter.x - 32, shelter.y - 18, 64, 38, 8);

    // Rotating relay dish & amber beacon core
    const dishAngle = now * 2.4;
    graphics.lineStyle(4, 0xc89a49, 0.9);
    graphics.lineBetween(
      shelter.x + Math.cos(dishAngle) * 18,
      shelter.y - 24 + Math.sin(dishAngle) * 7,
      shelter.x - Math.cos(dishAngle) * 18,
      shelter.y - 24 - Math.sin(dishAngle) * 7
    );
    graphics.fillStyle(hpRatio > 0.35 ? 0x8be0b9 : 0xe46b44, 0.95);
    graphics.fillCircle(shelter.x, shelter.y - 4, 10 + Math.sin(now * 6) * 1.5);

    // HP & Charge bars above shelter
    graphics.fillStyle(0x1b1d18, 0.9);
    graphics.fillRect(shelter.x - 38, shelter.y - 42, 76, 5);
    graphics.fillStyle(0x88d4ab, 1);
    graphics.fillRect(shelter.x - 38, shelter.y - 42, 76 * hpRatio, 5);
    graphics.fillStyle(0xf0b849, 1);
    graphics.fillRect(shelter.x - 38, shelter.y - 35, 76 * chargeRatio, 3);
  }

  private drawAfterimages(graphics: Phaser.GameObjects.Graphics): void {
    for (const ghost of this.afterimages) {
      const alpha = Math.max(0, (ghost.life / ghost.maxLife) * 0.55);
      const color = ghost.tint;
      graphics.fillStyle(color, alpha * 0.45);
      graphics.fillRoundedRect(ghost.x - 20, ghost.y - 34, 40, 62, 8);
      graphics.lineStyle(2, color, alpha * 0.9);
      graphics.strokeRoundedRect(ghost.x - 18, ghost.y - 17, 36, 35, 7);
      graphics.strokeCircle(ghost.x - ghost.facing * 26, ghost.y + 12, 11);
    }
  }

  private drawAtmosphere(graphics: Phaser.GameObjects.Graphics): void {
    const now = this.time.now / 1000;
    for (const mote of this.dust) {
      const x = (mote.x + now * mote.speed) % ARENA.width;
      const y = mote.y + Math.sin(now * 0.45 + mote.phase) * 8;
      graphics.fillStyle(0xd5b772, 0.08);
      graphics.fillCircle(x, y, mote.size);
    }
    graphics.fillStyle(0xd69a49, 0.025);
    graphics.fillEllipse(640 + Math.sin(now * 0.08) * 80, 300, 900, 360);
    if (this.state.phase === "combat") this.drawBattleMotion(graphics, now);
  }

  private drawBattleMotion(graphics: Phaser.GameObjects.Graphics, time: number): void {
    const moving = Math.abs(this.state.player.x - this.previousPlayerX) > 0.05;
    if (moving || this.state.wave === 3 || this.state.player.dashTimer > 0) {
      graphics.lineStyle(2, this.state.wave === 3 ? 0xe7a347 : 0xd6c47d, this.state.wave === 3 ? 0.16 : 0.09);
      for (let index = 0; index < 10; index++) {
        const y = 90 + ((index * 71 + Math.floor(time * 140)) % 560);
        const drift = (index * 47 + Math.floor(time * 220)) % 260;
        graphics.lineBetween(20 + drift, y, 110 + drift, y - 18);
        graphics.lineBetween(1260 - drift, y + 28, 1170 - drift, y + 10);
      }
    }
    const boss = this.state.enemies.find((enemy) => enemy.kind === "boss");
    if (boss) {
      const pulse = 72 + Math.sin(time * 6) * 8;
      const phaseColor = this.state.bossPhase >= 3 ? 0xff5a36 : this.state.bossPhase === 2 ? 0xf59e36 : 0xf0a13a;
      graphics.lineStyle(3, phaseColor, 0.22);
      graphics.strokeCircle(boss.x, boss.y - 16, pulse);
      graphics.lineStyle(2, 0xb74c2f, 0.18);
      for (let ray = 0; ray < 12; ray++) {
        const angle = (ray * Math.PI) / 6 + time * (0.18 * this.state.bossPhase);
        graphics.lineBetween(
          boss.x + Math.cos(angle) * 84,
          boss.y - 16 + Math.sin(angle) * 84,
          boss.x + Math.cos(angle) * 118,
          boss.y - 16 + Math.sin(angle) * 118
        );
      }
    }
  }

  private drawPlayer(graphics: Phaser.GameObjects.Graphics): void {
    const { x, y, hp, maxHp, dashTimer } = this.state.player;
    const dx = x - this.previousPlayerX;
    const dy = y - this.previousPlayerY;
    if (Math.abs(dx) > 0.05) this.facing = Math.sign(dx);
    this.previousPlayerX = x;
    this.previousPlayerY = y;
    const moving = Math.hypot(dx, dy) > 0.05;
    const nowSec = this.time.now / 1000;
    const bob = moving ? Math.sin(this.time.now * 0.018) * 2.4 : Math.sin(this.time.now * 0.005) * 1.1;
    const activeShot = this.effects.find((effect) => effect.type === "shot" && effect.life > effect.maxLife * 0.45);
    const recoil = activeShot ? 6.5 : 0;
    const hurt = this.effects.some((effect) => effect.type === "hurt" && effect.life > 0.18);
    const isOverdrive = this.state.wave === 3 || this.state.player.weapons.length === 3;

    // Overdrive golden battle aura + dual shoulder radiator fins
    if (isOverdrive || dashTimer > 0) {
      const aura = 42 + Math.sin(this.time.now * 0.014) * 6;
      graphics.lineStyle(3, dashTimer > 0 ? 0x7ce8dc : 0xf4bd4f, 0.28);
      graphics.strokeEllipse(x, y - 4, aura * 1.4, aura * 2.05);
      graphics.lineStyle(2, 0xb9dd78, 0.2);
      graphics.strokeEllipse(x, y - 4, aura, aura * 1.68);

      // Opened dual shoulder radiator fins with glowing heat cores
      graphics.fillStyle(0xb76a31, 0.95);
      graphics.fillTriangle(x - 18, y - 16 + bob, x - 34, y - 34 + bob, x - 24, y - 8 + bob);
      graphics.fillTriangle(x + 18, y - 16 + bob, x + 34, y - 34 + bob, x + 24, y - 8 + bob);
      graphics.lineStyle(2, 0xffdf7e, 0.85);
      graphics.lineBetween(x - 20, y - 15 + bob, x - 30, y - 29 + bob);
      graphics.lineBetween(x + 20, y - 15 + bob, x + 30, y - 29 + bob);
    }

    graphics.fillStyle(0x17140f, 0.55);
    graphics.fillEllipse(x + 4, y + 28, 64, 18);

    // Treads, suspension, and independent scrolling roller spokes
    graphics.fillStyle(0x20231f, 1);
    graphics.fillRoundedRect(x - 24, y + 12 + bob, 48, 20, 7);
    graphics.lineStyle(3, 0x0f100e, 1);
    graphics.strokeRoundedRect(x - 24, y + 12 + bob, 48, 20, 7);
    const wheelAngle = moving ? nowSec * 14 * this.facing : nowSec * 1.5;
    for (const wx of [-14, 0, 14] as const) {
      graphics.fillStyle(0x777058, 1);
      graphics.fillCircle(x + wx, y + 22 + bob, 5.5);
      graphics.lineStyle(1.8, 0x1d201a, 0.9);
      graphics.lineBetween(
        x + wx + Math.cos(wheelAngle) * 4.5,
        y + 22 + bob + Math.sin(wheelAngle) * 4.5,
        x + wx - Math.cos(wheelAngle) * 4.5,
        y + 22 + bob - Math.sin(wheelAngle) * 4.5
      );
    }
    graphics.lineStyle(2, 0xb49a58, 0.75);
    const treadShift = moving ? Math.floor(this.time.now / 55) % 8 : 0;
    for (let offset = -18; offset <= 18; offset += 8) {
      graphics.lineBetween(x + offset + treadShift - 4, y + 29 + bob, x + offset + treadShift, y + 31 + bob);
    }

    // Backpack and exhaust stack
    graphics.fillStyle(0x343a31, 1);
    graphics.fillRoundedRect(x - 25 * this.facing - 9, y - 18 + bob, 15, 34, 4);
    graphics.fillStyle(0x8f5a32, 1);
    graphics.fillRect(x - 27 * this.facing - 5, y - 26 + bob, 9, 13);
    graphics.fillStyle(isOverdrive ? 0xffb347 : 0xc69d54, 0.28);
    graphics.fillCircle(x - 27 * this.facing, y - 32 + bob - Math.sin(this.time.now * 0.012) * 3, 6);

    // Riveted torso and hazard plate
    graphics.fillStyle(hurt ? 0xe9b06f : 0x77785f, 1);
    graphics.fillRoundedRect(x - 18, y - 17 + bob, 36, 35, 7);
    graphics.lineStyle(3, 0x292c26, 1);
    graphics.strokeRoundedRect(x - 18, y - 17 + bob, 36, 35, 7);
    graphics.fillStyle(0xb7863d, 1);
    graphics.fillTriangle(x - 15, y + 12 + bob, x + 15, y + 12 + bob, x, y - 10 + bob);
    graphics.lineStyle(2, 0x2d2d24, 1);
    graphics.lineBetween(x - 10, y + 8 + bob, x + 6, y - 5 + bob);
    graphics.lineBetween(x - 2, y + 11 + bob, x + 13, y - 2 + bob);
    graphics.fillStyle(0xc8c3a0, 1);
    for (const [rx, ry] of [[-13, -11], [13, -11], [-13, 12], [13, 12]] as const) {
      graphics.fillCircle(x + rx, y + ry + bob, 2);
    }

    // Left magnetic guard arm with rotating energy ring + block sparks
    const guardSide = -this.facing;
    const shieldX = x + guardSide * 29;
    const shieldY = y + 13 + bob;
    graphics.lineStyle(7, 0x5d6251, 1);
    graphics.lineBetween(x + guardSide * 15, y - 8 + bob, x + guardSide * 25, y + 8 + bob);
    graphics.fillStyle(0x30362e, 1);
    graphics.fillCircle(shieldX, shieldY, 11);
    graphics.lineStyle(3, dashTimer > 0 ? 0x7ce8dc : 0xb9dd78, 0.92);
    graphics.strokeCircle(shieldX, shieldY, 13.5);
    for (let node = 0; node < 3; node++) {
      const a = nowSec * 5 + (node * Math.PI * 2) / 3;
      graphics.fillStyle(0xe8f8b8, 0.95);
      graphics.fillCircle(shieldX + Math.cos(a) * 13.5, shieldY + Math.sin(a) * 13.5, 2.3);
    }

    // Head, phosphor visor, antenna
    graphics.fillStyle(0x555b4d, 1);
    graphics.fillRoundedRect(x - 15, y - 39 + bob, 30, 20, 5);
    graphics.lineStyle(2, 0x252823, 1);
    graphics.strokeRoundedRect(x - 15, y - 39 + bob, 30, 20, 5);
    graphics.fillStyle(0x172019, 1);
    graphics.fillRoundedRect(x - 11, y - 34 + bob, 22, 8, 3);
    graphics.fillStyle(hurt ? 0xffc26b : isOverdrive ? 0xffe066 : 0xb8df68, 1);
    graphics.fillRect(x - 8 + this.facing * 2, y - 32 + bob, 13, 3);
    graphics.lineStyle(2, 0x6a6045, 1);
    graphics.lineBetween(x + 8, y - 39 + bob, x + 14, y - 52 + bob);
    graphics.fillStyle(0xd98a42, 1);
    graphics.fillCircle(x + 15, y - 54 + bob, 3);

    // Jointed right tool arm + rivet gun with hydraulic piston recoil & cross muzzle flash
    const side = this.facing;
    graphics.lineStyle(7, 0x656957, 1);
    graphics.lineBetween(x + side * 15, y - 10 + bob, x + side * (27 - recoil * 0.35), y + 1 + bob);
    graphics.fillStyle(0x272b26, 1);
    graphics.fillCircle(x + side * 16, y - 10 + bob, 5);
    graphics.fillCircle(x + side * (28 - recoil * 0.35), y + 1 + bob, 5);
    graphics.fillStyle(0x4a5047, 1);
    const gunX = x + side * (30 - recoil);
    graphics.fillRoundedRect(side > 0 ? gunX : gunX - 29, y - 3 + bob, 29, 10, 3);
    graphics.fillStyle(0xbc7e38, 1);
    graphics.fillRect(side > 0 ? gunX + 25 : gunX - 6, y - 1 + bob, 7, 5);

    if (activeShot) {
      const muzzleX = side > 0 ? gunX + 35 : gunX - 9;
      const muzzleY = y + 1 + bob;
      graphics.lineStyle(3, 0xffe596, 0.95);
      graphics.lineBetween(muzzleX - 9, muzzleY, muzzleX + 9, muzzleY);
      graphics.lineBetween(muzzleX, muzzleY - 9, muzzleX, muzzleY + 9);
    }

    graphics.fillStyle(0x24251f, 1);
    graphics.fillRect(x - 26, y - 55 + bob, 52, 5);
    graphics.fillStyle(hp / maxHp > 0.35 ? 0xa9bd64 : 0xb84c36, 1);
    graphics.fillRect(x - 26, y - 55 + bob, 52 * Math.max(0, hp / maxHp), 5);
  }

  private drawEnemy(graphics: Phaser.GameObjects.Graphics, enemy: GameState["enemies"][number]): void {
    const time = this.time.now / 1000;
    if (enemy.kind === "scuttler") this.drawCrawler(graphics, enemy, time);
    else if (enemy.kind === "brute") this.drawBrute(graphics, enemy, time);
    else if (enemy.kind === "zapper") this.drawSentinel(graphics, enemy, time);
    else this.drawBoss(graphics, enemy, time);
    if (enemy.hp < enemy.maxHp || enemy.kind === "boss") this.drawEnemyHealth(graphics, enemy);
  }

  private drawCrawler(graphics: Phaser.GameObjects.Graphics, enemy: GameState["enemies"][number], time: number): void {
    const gait = Math.sin(time * 11 + enemy.id) * 5;
    graphics.fillStyle(0x17140f, 0.48);
    graphics.fillEllipse(enemy.x, enemy.y + 13, 47, 13);
    graphics.lineStyle(3.5, 0x4b3c2c, 1);
    for (let index = 0; index < 3; index++) {
      const y = enemy.y - 8 + index * 8;
      const alt = index % 2 === 0 ? gait : -gait;
      graphics.lineBetween(enemy.x - 8, y, enemy.x - 24 + alt, y + 11);
      graphics.lineBetween(enemy.x + 8, y, enemy.x + 24 - alt, y + 11);
    }
    graphics.fillStyle(0x6f3827, 1);
    graphics.fillEllipse(enemy.x, enemy.y, 31, 22);
    graphics.lineStyle(3, 0x2c231d, 1);
    graphics.strokeEllipse(enemy.x, enemy.y, 31, 22);
    graphics.fillStyle(0x282824, 1);
    graphics.fillCircle(enemy.x - 9, enemy.y - 2, 9);
    graphics.lineStyle(2, 0xd49c45, 1);
    for (let index = 0; index < 8; index++) {
      const angle = (index * Math.PI) / 4 + time * 8;
      graphics.lineBetween(
        enemy.x - 9 + Math.cos(angle) * 6,
        enemy.y - 2 + Math.sin(angle) * 6,
        enemy.x - 9 + Math.cos(angle) * 13,
        enemy.y - 2 + Math.sin(angle) * 13
      );
    }
    graphics.fillStyle(0xf0a34a, 1);
    graphics.fillCircle(enemy.x + 7, enemy.y - 3, 3);
  }

  private drawBrute(graphics: Phaser.GameObjects.Graphics, enemy: GameState["enemies"][number], time: number): void {
    const distToPlayer = Math.hypot(this.state.player.x - enemy.x, this.state.player.y - enemy.y);
    const windup = distToPlayer < 110;
    const piston = Math.sin(time * (windup ? 10 : 4) + enemy.id) * (windup ? 6 : 3);

    if (windup) {
      graphics.lineStyle(2, 0xff8040, 0.45 + Math.sin(time * 12) * 0.2);
      graphics.strokeCircle(enemy.x, enemy.y + 4, 38);
    }

    graphics.fillStyle(0x17140f, 0.55);
    graphics.fillEllipse(enemy.x, enemy.y + 22, 62, 17);
    graphics.fillStyle(0x20211d, 1);
    graphics.fillRoundedRect(enemy.x - 27, enemy.y + 7, 54, 20, 6);
    graphics.fillStyle(0x70654f, 1);
    for (let x = -18; x <= 18; x += 12) graphics.fillCircle(enemy.x + x, enemy.y + 17, 5);
    graphics.fillStyle(0x745038, 1);
    graphics.fillRoundedRect(enemy.x - 22, enemy.y - 24, 44, 38, 5);
    graphics.lineStyle(4, 0x2c2820, 1);
    graphics.strokeRoundedRect(enemy.x - 22, enemy.y - 24, 44, 38, 5);

    // Armor damage cracks when below 60% HP
    if (enemy.hp < enemy.maxHp * 0.6) {
      graphics.lineStyle(2, 0xff944d, 0.85);
      graphics.lineBetween(enemy.x - 12, enemy.y - 18, enemy.x + 4, enemy.y - 4);
      graphics.lineBetween(enemy.x + 4, enemy.y - 4, enemy.x - 3, enemy.y + 8);
    }

    graphics.fillStyle(0xc49543, 1);
    graphics.fillRect(enemy.x - 17, enemy.y + 1, 34, 7);
    graphics.lineStyle(3, 0x34281c, 1);
    for (let x = -14; x < 16; x += 10) graphics.lineBetween(enemy.x + x, enemy.y + 7, enemy.x + x + 7, enemy.y + 1);
    graphics.lineStyle(8, 0x66543d, 1);
    graphics.lineBetween(enemy.x - 20, enemy.y - 12, enemy.x - 34 - piston, enemy.y + 5 - (windup ? 8 : 0));
    graphics.lineBetween(enemy.x + 20, enemy.y - 12, enemy.x + 34 + piston, enemy.y + 5 - (windup ? 8 : 0));
    graphics.fillStyle(windup ? 0xff6b35 : 0xf0b34f, 1);
    graphics.fillRect(enemy.x - 10, enemy.y - 16, 20, 5);
  }

  private drawSentinel(graphics: Phaser.GameObjects.Graphics, enemy: GameState["enemies"][number], time: number): void {
    const hover = Math.sin(time * 4.5 + enemy.id) * 5;
    const y = enemy.y - 8 + hover;
    const dist = Math.hypot(this.state.player.x - enemy.x, this.state.player.y - enemy.y);

    // Electromagnetic lock-on telegraph beam when in medium range
    if (dist < 280) {
      graphics.lineStyle(1.5, 0x8ef7d8, 0.24 + Math.sin(time * 16) * 0.1);
      graphics.lineBetween(enemy.x, y, this.state.player.x, this.state.player.y - 6);
    }

    graphics.fillStyle(0x17140f, 0.32);
    graphics.fillEllipse(enemy.x, enemy.y + 18, 48, 13);
    graphics.lineStyle(4, 0x59635c, 1);
    graphics.lineBetween(enemy.x - 12, y, enemy.x - 27, y - 9);
    graphics.lineBetween(enemy.x + 12, y, enemy.x + 27, y - 9);
    graphics.fillStyle(0x56625c, 1);
    graphics.fillTriangle(enemy.x - 31, y - 13, enemy.x - 15, y - 4, enemy.x - 27, y + 8);
    graphics.fillTriangle(enemy.x + 31, y - 13, enemy.x + 15, y - 4, enemy.x + 27, y + 8);
    graphics.fillStyle(0x28302e, 1);
    graphics.fillCircle(enemy.x, y, 15);
    graphics.lineStyle(3, 0x80a49a, 1);
    graphics.strokeCircle(enemy.x, y, 17);
    graphics.lineStyle(2, 0x8fcfc1, 0.7);
    graphics.strokeCircle(enemy.x, y, 21 + Math.sin(time * 6) * 2);
    graphics.fillStyle(0xb9f4c9, 1);
    graphics.fillCircle(enemy.x, y, 5);
  }

  private drawBoss(graphics: Phaser.GameObjects.Graphics, enemy: GameState["enemies"][number], time: number): void {
    const phase = this.state.bossPhase;
    const lockExposed = this.state.bossLockExposedTicks > 0;
    const telegraphTicks = this.state.bossTelegraphTicks;
    const piston = Math.sin(time * (phase >= 2 ? 6 : 3)) * (phase >= 2 ? 8 : 5);

    // Ground Slam Telegraph Warning Ring
    if (telegraphTicks > 0) {
      const progress = 1 - telegraphTicks / 45;
      graphics.lineStyle(3, 0xff572e, 0.75);
      graphics.strokeCircle(enemy.x, enemy.y + 10, 175);
      graphics.fillStyle(0xff572e, 0.14 + progress * 0.18);
      graphics.fillCircle(enemy.x, enemy.y + 10, 175 * progress);
    }

    graphics.fillStyle(0x15120e, 0.65);
    graphics.fillEllipse(enemy.x + 4, enemy.y + 38, 142, 27);

    // Phase 2 & 3 Expanded Shoulder Heat-Vent Wings
    if (phase >= 2) {
      const wingSpread = phase === 3 ? 22 : 14;
      graphics.fillStyle(0x9e3b24, 0.95);
      graphics.fillTriangle(
        enemy.x - 42,
        enemy.y - 42,
        enemy.x - 78 - wingSpread,
        enemy.y - 68,
        enemy.x - 56,
        enemy.y - 14
      );
      graphics.fillTriangle(
        enemy.x + 42,
        enemy.y - 42,
        enemy.x + 78 + wingSpread,
        enemy.y - 68,
        enemy.x + 56,
        enemy.y - 14
      );
      graphics.lineStyle(2, 0xffbe55, 0.85);
      graphics.lineBetween(enemy.x - 46, enemy.y - 38, enemy.x - 72 - wingSpread * 0.7, enemy.y - 60);
      graphics.lineBetween(enemy.x + 46, enemy.y - 38, enemy.x + 72 + wingSpread * 0.7, enemy.y - 60);
    }

    graphics.fillStyle(0x22231e, 1);
    graphics.fillRoundedRect(enemy.x - 64, enemy.y + 9, 128, 34, 10);
    graphics.lineStyle(4, 0x0e0f0d, 1);
    graphics.strokeRoundedRect(enemy.x - 64, enemy.y + 9, 128, 34, 10);
    graphics.fillStyle(0x756344, 1);
    for (let x = -48; x <= 48; x += 24) graphics.fillCircle(enemy.x + x, enemy.y + 26, 10);

    graphics.fillStyle(0x5d4632, 1);
    graphics.fillRoundedRect(enemy.x - 45, enemy.y - 47, 90, 62, 9);
    graphics.lineStyle(5, 0x29251d, 1);
    graphics.strokeRoundedRect(enemy.x - 45, enemy.y - 47, 90, 62, 9);
    graphics.fillStyle(0xa87535, 1);
    graphics.fillRect(enemy.x - 38, enemy.y - 34, 76, 13);
    graphics.lineStyle(4, 0x352719, 1);
    for (let x = -32; x < 35; x += 18) graphics.lineBetween(enemy.x + x, enemy.y - 21, enemy.x + x + 12, enemy.y - 34);

    // Proprietary Chest "Iron Crown Lock" — spins & glows brightly when exposed!
    const lockSpin = lockExposed ? time * 9 : time * 1.2;
    graphics.fillStyle(0x24261f, 1);
    graphics.fillCircle(enemy.x, enemy.y - 5, 22);
    graphics.lineStyle(5, lockExposed ? 0xffe066 : 0xd65b35, 0.98);
    graphics.strokeCircle(enemy.x, enemy.y - 5, lockExposed ? 26 + Math.sin(time * 18) * 2 : 24);
    graphics.fillStyle(lockExposed ? 0xfff099 : 0xe0a044, 1);
    graphics.fillCircle(enemy.x, enemy.y - 5, lockExposed ? 11 : 8);
    graphics.fillStyle(lockExposed ? 0xff6e3b : 0xb8975c, 1);
    for (let bolt = 0; bolt < 6; bolt++) {
      const angle = (bolt * Math.PI) / 3 + lockSpin;
      graphics.fillCircle(enemy.x + Math.cos(angle) * 19, enemy.y - 5 + Math.sin(angle) * 19, 3.5);
    }
    if (lockExposed) {
      graphics.lineStyle(2, 0xffe680, 0.9);
      graphics.lineBetween(enemy.x - 32, enemy.y - 5, enemy.x + 32, enemy.y - 5);
      graphics.lineBetween(enemy.x, enemy.y - 37, enemy.x, enemy.y + 27);
    }

    graphics.lineStyle(10, 0x655038, 1);
    graphics.lineBetween(enemy.x - 42, enemy.y - 25, enemy.x - 66 - piston, enemy.y - 2);
    graphics.lineBetween(enemy.x + 42, enemy.y - 25, enemy.x + 66 + piston, enemy.y - 2);
    graphics.fillStyle(0x2b2a23, 1);
    graphics.fillCircle(enemy.x - 70 - piston, enemy.y, 14);
    graphics.fillCircle(enemy.x + 70 + piston, enemy.y, 14);

    graphics.fillStyle(0x242a24, 1);
    graphics.fillRoundedRect(enemy.x - 24, enemy.y - 68, 48, 28, 6);
    graphics.lineStyle(3, 0x9a7a43, 1);
    graphics.strokeRoundedRect(enemy.x - 24, enemy.y - 68, 48, 28, 6);
    graphics.fillStyle(phase >= 2 ? 0xff492e : 0xffb548, 1);
    graphics.fillRect(enemy.x - 17, enemy.y - 58, 34, 7);
    graphics.fillStyle(0xff8733, 0.18 + Math.sin(time * 8) * 0.06);
    graphics.fillCircle(enemy.x, enemy.y - 55, 24);

    graphics.lineStyle(5, 0x3d3d32, 1);
    graphics.lineBetween(enemy.x + 21, enemy.y - 66, enemy.x + 38, enemy.y - 88);
    graphics.fillStyle(0xd9a247, 1);
    graphics.fillCircle(enemy.x + 39, enemy.y - 90, 5);
  }

  private drawEnemyHealth(graphics: Phaser.GameObjects.Graphics, enemy: GameState["enemies"][number]): void {
    const width = enemy.kind === "boss" ? 164 : Math.max(32, enemy.radius * 2.4);
    const y = enemy.y - (enemy.kind === "boss" ? 106 : enemy.radius + 18);
    graphics.fillStyle(0x201b14, 0.9);
    graphics.fillRect(enemy.x - width / 2, y, width, 6);
    const barColor =
      enemy.kind === "boss" && this.state.bossLockExposedTicks > 0
        ? 0xffe066
        : enemy.kind === "zapper"
          ? 0x91cbb7
          : 0xc2643e;
    graphics.fillStyle(barColor, 1);
    graphics.fillRect(enemy.x - width / 2, y, width * Math.max(0, enemy.hp / enemy.maxHp), 6);
  }

  private drawPickup(graphics: Phaser.GameObjects.Graphics, x: number, y: number, id: number): void {
    const bob = Math.sin(this.time.now * 0.006 + id) * 3;
    graphics.fillStyle(0x17140f, 0.35);
    graphics.fillEllipse(x, y + 8, 23, 8);
    graphics.fillStyle(0x8f693b, 1);
    graphics.fillRoundedRect(x - 8, y - 7 + bob, 16, 12, 3);
    graphics.lineStyle(2, 0x29251d, 1);
    graphics.strokeRoundedRect(x - 8, y - 7 + bob, 16, 12, 3);
    graphics.fillStyle(0xc8cf76, 1);
    graphics.fillRect(x - 4, y - 4 + bob, 8, 5);
    graphics.fillStyle(0x72634a, 1);
    graphics.fillRect(x - 11, y - 2 + bob, 3, 7);
    graphics.fillRect(x + 8, y - 2 + bob, 3, 7);
  }

  private drawEffect(graphics: Phaser.GameObjects.Graphics, effect: VisualEffect): void {
    const alpha = Math.max(0, effect.life / effect.maxLife);
    if (effect.type === "shot" && effect.targetX !== undefined && effect.targetY !== undefined) {
      graphics.lineStyle(6, 0x4b2f18, alpha * 0.55);
      graphics.lineBetween(effect.x!, effect.y!, effect.targetX, effect.targetY);
      graphics.lineStyle(2, WEAPONS.rivet.color, alpha);
      graphics.lineBetween(effect.x!, effect.y!, effect.targetX, effect.targetY);
      this.drawSpark(graphics, effect.targetX, effect.targetY, alpha, 0xd9a64d);
      graphics.fillStyle(0xffe1a1, alpha);
      graphics.fillCircle(effect.x!, effect.y!, 5);
    } else if (effect.type === "arc" && effect.targetX !== undefined && effect.targetY !== undefined) {
      const segments = 7;
      let lastX = effect.x!;
      let lastY = effect.y!;
      graphics.lineStyle(5, 0x4b655f, alpha * 0.8);
      for (let index = 1; index <= segments; index++) {
        const t = index / segments;
        const x = Phaser.Math.Linear(effect.x!, effect.targetX, t);
        const y = Phaser.Math.Linear(effect.y!, effect.targetY, t);
        const jitter = index === segments ? 0 : Math.sin(index * 12.7 + effect.tick) * 8;
        graphics.lineBetween(lastX, lastY, x, y + jitter);
        lastX = x;
        lastY = y + jitter;
      }
      graphics.lineStyle(2, 0xc5f1cc, alpha);
      graphics.lineBetween(effect.x!, effect.y!, effect.targetX, effect.targetY);
    } else if (effect.type === "pulse" || effect.type === "dash" || effect.type === "shelterPulse") {
      const progress = 1 - alpha;
      const baseColor = effect.type === "dash" ? 0x7ce8dc : effect.type === "shelterPulse" ? 0x8be0b9 : 0xd3c56d;
      for (let ring = 0; ring < 3; ring++) {
        graphics.lineStyle(4 - ring, ring === 1 ? baseColor : 0x8ba8a0, alpha * (0.85 - ring * 0.18));
        graphics.strokeCircle(effect.x!, effect.y!, (effect.value ?? 100) * Math.min(1, progress + ring * 0.08));
      }
    } else if (effect.type === "bossSlam" || effect.type === "lockExpose") {
      const progress = 1 - alpha;
      const color = effect.type === "lockExpose" ? 0xffe066 : 0xff5a36;
      graphics.lineStyle(4, color, alpha * 0.9);
      graphics.strokeCircle(effect.x!, effect.y!, (effect.value ?? 160) * Math.max(0.2, progress));
    } else if (effect.type === "hit" || effect.type === "kill") {
      this.drawSpark(graphics, effect.x!, effect.y!, alpha, effect.type === "kill" ? 0xf1a84b : 0xb4a06d);
      if (effect.type === "kill") {
        const burst = 18 + (1 - alpha) * 46;
        graphics.lineStyle(4, 0xffd66c, alpha * 0.8);
        for (let index = 0; index < 10; index++) {
          const angle = (index * Math.PI) / 5;
          graphics.lineBetween(
            effect.x! + Math.cos(angle) * 8,
            effect.y! + Math.sin(angle) * 8,
            effect.x! + Math.cos(angle) * burst,
            effect.y! + Math.sin(angle) * burst
          );
        }
        graphics.lineStyle(3, 0xf06c35, alpha * 0.7);
        graphics.strokeCircle(effect.x!, effect.y!, burst * 0.55);
      }
    } else if (effect.type === "hurt") {
      graphics.lineStyle(5, 0xe26a3e, alpha);
      graphics.strokeCircle(effect.x!, effect.y!, 32 + (1 - alpha) * 12);
      this.drawSpark(graphics, effect.x!, effect.y! - 12, alpha, 0xffcf72);
    }
  }

  private drawParticlesAndNumbers(graphics: Phaser.GameObjects.Graphics): void {
    for (const s of this.treadDust) {
      const alpha = Math.max(0, (s.life / s.maxLife) * 0.36);
      graphics.fillStyle(s.color, alpha);
      graphics.fillCircle(s.x, s.y, s.radius);
    }
    for (const sh of this.shells) {
      const alpha = Math.max(0, sh.life / sh.maxLife);
      graphics.fillStyle(0xf2b949, alpha);
      graphics.fillRect(sh.x - 3, sh.y - 1.5, 6, 3);
    }
    for (const d of this.debris) {
      const alpha = Math.max(0, d.life / d.maxLife);
      graphics.fillStyle(d.color, alpha);
      graphics.fillCircle(d.x, d.y, d.size * 0.5);
    }
    for (const fn of this.floatingNumbers) {
      const alpha = Math.max(0, fn.life / fn.maxLife);
      const color = fn.critical ? 0xffe066 : 0xe8d9b5;
      const scale = fn.critical ? 5.5 : 4;
      const digits = String(fn.value);
      let cursorX = fn.x - (digits.length * (scale + 2)) / 2;
      graphics.lineStyle(fn.critical ? 2.2 : 1.6, color, alpha);
      for (const ch of digits) {
        const segs = DIGIT_SEGMENTS[ch] ?? [];
        for (const [x1, y1, x2, y2] of segs) {
          graphics.lineBetween(
            cursorX + x1 * scale,
            fn.y + y1 * scale,
            cursorX + x2 * scale,
            fn.y + y2 * scale
          );
        }
        cursorX += scale + 2.5;
      }
    }
  }

  private drawSpark(graphics: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, color: number): void {
    graphics.lineStyle(2, color, alpha);
    for (let index = 0; index < 7; index++) {
      const angle = (index * Math.PI * 2) / 7 + this.time.now * 0.001;
      const inner = 4;
      const outer = 8 + (1 - alpha) * 15;
      graphics.lineBetween(
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner,
        x + Math.cos(angle) * outer,
        y + Math.sin(angle) * outer
      );
    }
  }
}
