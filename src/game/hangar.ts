import type { EnemyKind } from "../game/types";

export type HangarUnitId = "r17" | "scuttler" | "brute" | "zapper" | "boss";
export type HangarPoseId = "cruise" | "attack" | "overdrive" | "lockbreak";

export const HANGAR_POSES: Array<{ id: HangarPoseId; label: string }> = [
  { id: "cruise", label: "巡航步态" },
  { id: "attack", label: "射击后坐" },
  { id: "overdrive", label: "炉心觉醒" },
  { id: "lockbreak", label: "铁冠破甲" }
];

export interface HangarUnitSpec {
  id: HangarUnitId;
  code: string;
  name: string;
  role: string;
  mass: string;
  powerplant: string;
  armaments: string[];
  joints: string[];
  description: string;
}

export const HANGAR_UNITS: HangarUnitSpec[] = [
  {
    id: "r17",
    code: "UNIT-01 // GREENBROOK",
    name: "R-17「锻火拳」",
    role: "自主公路维护机 · 绿溪代表斗士",
    mass: "2.48 t · 双履带差速底盘",
    powerplant: "17 号回收炉心 · 开放校准总线",
    armaments: ["右臂：三段液压爆铆拳炮", "左臂：旋转震磁护盾线圈", "肩部：雷索高压卷线盘", "机动：炉心冲刺 + 磁盾震击"],
    joints: ["双承重轮独立履带齿", "躯干呼吸减震与速度倾角", "右肘液压后坐力活塞 + 抛壳窗", "双肩觉醒散热翼 + 背部蒸汽阀"],
    description: "将修路冲击扳手与磁力护盾化为武术架势的非对称机甲。炉心觉醒时双肩排热翼张开，冲刺留下金青双色残影。"
  },
  {
    id: "scuttler",
    code: "ENEMY-01 // RED SAND",
    name: "赤砂牙轮 (Scuttler)",
    role: "一次性改造筑路机 · 近战突袭群",
    mass: "0.62 t · 六足交错步态",
    powerplant: "焊死封盖单次电池组",
    armaments: ["前部偏置高速切割锯轮", "六足液压抓地尖爪"],
    joints: ["两组三足交替摆动关节", "前锯轮高速旋转火花喷口", "受击内缩减震腿夹"],
    description: "原为路面裂缝切割机，被铁冠联盟焊死检修盖当作消耗品投放。六足呈昆虫式交错敲击步态。"
  },
  {
    id: "brute",
    code: "ENEMY-02 // OVERPASS",
    name: "铁壁角斗机 (Brute)",
    role: "重型废料压缩机 · 正面推进壁垒",
    mass: "4.10 t · 短距重装履带",
    powerplant: "双缸高压柴油液压泵",
    armaments: ["双侧外伸液压震地撑臂", "正面安全挡板冲撞槌"],
    joints: ["双臂锤击前摇蓄力光圈", "四轮重型履带底盘", "半血装甲裂纹与黑烟排口"],
    description: "由废料压缩舱改装的重甲单位。攻击前双臂外张加压并亮起琥珀蓄力环，受损后焊缝迸裂冒出黑烟。"
  },
  {
    id: "zapper",
    code: "ENEMY-03 // SKYLINE",
    name: "苍雷浮游卫 (Zapper)",
    role: "气象雷达改装机 · 远程电磁封锁",
    mass: "0.85 t · 涡扇反重力悬浮",
    powerplant: "高压电容环 + 路牌散热翼",
    armaments: ["电磁锁定瞄准束 (Telegraph Beam)", "高压脉冲电弧炮"],
    joints: ["三翼不对称倾角摆动", "同心雷达外环三段收紧", "底部双根拖曳接地链"],
    description: "利用旧气象雷达与路牌铝板拼装的悬浮炮台。开火前会投射青色电磁锁定线并收紧外环电弧。"
  },
  {
    id: "boss",
    code: "CHAMPION // IRON CROWN",
    name: "铁冠·赫克托 (Hector)",
    role: "铁冠联盟冠军机 · 原三号矿井救援平台",
    mass: "11.8 t · 五轮超宽工程履带",
    powerplant: "军用级双联熔炉 + 胸前铁冠专有锁具",
    armaments: ["双联液压碎岩夹臂", "全场地铁冠震地波", "红光战术扫描仪"],
    joints: ["Phase 1 皇家红金巡航装甲", "Phase 2 双肩过载排热翼展开 + 红光扫描", "Phase 3 胸前铁冠锁具暴露高速旋转与崩解特效"],
    description: "曾救下三座矿城的重型救援机。胸前环形‘铁冠锁具’锁死了通用校准协议，唯有在震地波后的破甲窗口正面击碎胸锁，才能公证真相。"
  }
];

export function renderHangarPreview(
  canvas: HTMLCanvasElement,
  unit: HangarUnitId,
  pose: HangarPoseId,
  timeSec: number
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Blueprint grid background
  ctx.fillStyle = "#171c15";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(185, 221, 120, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 24; x < w; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 24; y < h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Platform shadow & turntable ring
  const cx = w * 0.5;
  const cy = h * 0.58;
  ctx.save();
  ctx.strokeStyle = pose === "overdrive" || pose === "lockbreak" ? "rgba(231, 173, 75, 0.55)" : "rgba(156, 215, 200, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 52, 112, 26, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(12, 14, 10, 0.65)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 50, 88, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  if (unit === "r17") {
    drawHangarR17(ctx, cx, cy, pose, timeSec);
  } else if (unit === "scuttler") {
    drawHangarScuttler(ctx, cx, cy + 12, pose, timeSec);
  } else if (unit === "brute") {
    drawHangarBrute(ctx, cx, cy, pose, timeSec);
  } else if (unit === "zapper") {
    drawHangarZapper(ctx, cx, cy - 8, pose, timeSec);
  } else {
    drawHangarBoss(ctx, cx, cy - 4, pose, timeSec);
  }
  ctx.restore();

  // Telemetry overlay text
  ctx.fillStyle = "#b9dd78";
  ctx.font = "700 11px 'Cascadia Mono', Consolas, monospace";
  ctx.fillText(`RIG // ${unit.toUpperCase()} · MODE: ${pose.toUpperCase()}`, 14, 22);
  ctx.fillStyle = "#e7ad4b";
  ctx.fillText(`PROCEDURAL MULTI-JOINT KINEMATICS · 60HZ`, 14, h - 12);
}

function drawHangarR17(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pose: HangarPoseId,
  t: number
): void {
  const isOverdrive = pose === "overdrive" || pose === "lockbreak";
  const isAttack = pose === "attack" || pose === "lockbreak";
  const bob = Math.sin(t * (isOverdrive ? 9 : 4.5)) * (isOverdrive ? 4 : 2.5);
  const lean = isOverdrive ? 0.08 : pose === "cruise" ? Math.sin(t * 2.5) * 0.03 : 0.05;

  // Afterimage ghosts in overdrive/lockbreak
  if (isOverdrive) {
    for (let g = 2; g >= 1; g--) {
      ctx.save();
      ctx.translate(cx - g * 24, cy + bob);
      ctx.fillStyle = g === 1 ? "rgba(0, 229, 255, 0.22)" : "rgba(255, 204, 56, 0.16)";
      ctx.fillRect(-32, -46, 64, 72);
      ctx.restore();
    }
    // Golden aura rings
    ctx.strokeStyle = "rgba(231, 173, 75, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 86 + Math.sin(t * 8) * 8, 102 + Math.cos(t * 8) * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.rotate(lean);

  // Dualshoulder radiator fins when overdrive
  if (isOverdrive) {
    ctx.fillStyle = "#e7ad4b";
    ctx.strokeStyle = "#29251d";
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 34, -36);
      ctx.rotate(side * (0.42 + Math.sin(t * 10) * 0.08));
      ctx.fillRect(-7, -22, 14, 24);
      ctx.strokeRect(-7, -22, 14, 24);
      ctx.restore();
    }
  }

  // Backpack & Steam Plumes
  ctx.fillStyle = "#3c4237";
  ctx.strokeStyle = "#1c1f1a";
  ctx.lineWidth = 3;
  ctx.fillRect(-52, -38, 24, 58);
  ctx.strokeRect(-52, -38, 24, 58);
  ctx.fillStyle = "#8f5a32";
  ctx.fillRect(-46, -54, 14, 18);
  for (let i = 0; i < 3; i++) {
    const phase = (t * 2.2 + i * 0.33) % 1;
    ctx.fillStyle = isOverdrive
      ? `rgba(231, 173, 75, ${(1 - phase) * 0.5})`
      : `rgba(210, 195, 155, ${(1 - phase) * 0.35})`;
    ctx.beginPath();
    ctx.arc(-39 - phase * 18, -60 - phase * 34, 6 + phase * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Treads & scrolling cleats
  ctx.fillStyle = "#20231f";
  ctx.strokeStyle = "#0e100d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-42, 22, 84, 34, 12);
  ctx.fill();
  ctx.stroke();
  for (const wx of [-22, 22]) {
    ctx.fillStyle = "#7d7458";
    ctx.beginPath();
    ctx.arc(wx, 39, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#23251f";
    ctx.lineWidth = 2;
    const spoke = t * 6;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(spoke) * 9, 39 + Math.sin(spoke) * 9);
    ctx.lineTo(wx - Math.cos(spoke) * 9, 39 - Math.sin(spoke) * 9);
    ctx.stroke();
  }
  const cleatShift = Math.floor(t * 28) % 12;
  ctx.strokeStyle = "#c3a86a";
  ctx.lineWidth = 2.5;
  for (let ox = -32; ox <= 28; ox += 12) {
    ctx.beginPath();
    ctx.moveTo(ox + cleatShift - 6, 53);
    ctx.lineTo(ox + cleatShift, 56);
    ctx.stroke();
  }

  // Torso
  ctx.fillStyle = "#76785e";
  ctx.strokeStyle = "#252821";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-32, -32, 64, 58, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#b7863d";
  ctx.beginPath();
  ctx.moveTo(-24, 18);
  ctx.lineTo(24, 18);
  ctx.lineTo(0, -20);
  ctx.closePath();
  ctx.fill();

  // Left Magnetic Shield Arm + Rotating Energy Ring
  const shieldAng = t * 4.5;
  ctx.strokeStyle = "#5d6251";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(-28, -14);
  ctx.lineTo(-48, 12);
  ctx.stroke();
  ctx.fillStyle = "#2b322a";
  ctx.beginPath();
  ctx.arc(-52, 18, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 3;
  for (let arcIdx = 0; arcIdx < 3; arcIdx++) {
    const start = shieldAng + (arcIdx * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(-52, 18, 22, start, start + 1.2);
    ctx.stroke();
  }

  // Head & Visor
  ctx.fillStyle = "#595f50";
  ctx.strokeStyle = "#22251f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-25, -66, 50, 32, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#141e17";
  ctx.fillRect(-18, -56, 36, 13);
  ctx.fillStyle = isOverdrive ? "#ffcc38" : "#b9dd78";
  ctx.fillRect(-12, -52, 26, 5);

  // Right Rivet Cannon Arm + Hydraulic Recoil + Brass Shell Ejection
  const recoilCycle = isAttack ? Math.max(0, Math.sin(t * 16)) * 12 : 0;
  ctx.strokeStyle = "#656957";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(28, -16);
  ctx.lineTo(48 - recoilCycle * 0.4, 2);
  ctx.stroke();

  const gunX = 44 - recoilCycle;
  ctx.fillStyle = "#484e45";
  ctx.strokeStyle = "#20231e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(gunX, -6, 50, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c48438";
  ctx.fillRect(gunX + 44, -2, 12, 10);

  if (isAttack && recoilCycle > 5) {
    // Cross Muzzle Flash
    const mx = gunX + 62;
    const my = 3;
    ctx.strokeStyle = "#ffe28a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mx - 14, my);
    ctx.lineTo(mx + 18, my);
    ctx.moveTo(mx, my - 14);
    ctx.lineTo(mx, my + 14);
    ctx.stroke();

    // Ejected Brass Shell Casing
    const shellPhase = (t * 8) % 1;
    const sx = gunX + 16 - shellPhase * 28;
    const sy = -10 - Math.sin(shellPhase * Math.PI) * 32;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(shellPhase * 9);
    ctx.fillStyle = "#f2b84b";
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();
  }

  ctx.restore();
}

function drawHangarScuttler(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pose: HangarPoseId,
  t: number
): void {
  const speed = pose === "overdrive" || pose === "attack" ? 14 : 8;
  const gait = Math.sin(t * speed) * 9;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "#52402e";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const alt = i % 2 === 0 ? gait : -gait;
    const y0 = -14 + i * 14;
    ctx.beginPath();
    ctx.moveTo(-16, y0);
    ctx.lineTo(-46 + alt, y0 + 8);
    ctx.lineTo(-58 + alt * 0.5, y0 + 24);
    ctx.moveTo(16, y0);
    ctx.lineTo(46 - alt, y0 + 8);
    ctx.lineTo(58 - alt * 0.5, y0 + 24);
    ctx.stroke();
  }
  ctx.fillStyle = "#733928";
  ctx.strokeStyle = "#2b211b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spinning front cutter wheel + sparks
  const sawX = -20;
  const sawY = -2;
  ctx.fillStyle = "#282824";
  ctx.beginPath();
  ctx.arc(sawX, sawY, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d99d45";
  ctx.lineWidth = 3;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + t * 14;
    ctx.beginPath();
    ctx.moveTo(sawX + Math.cos(a) * 11, sawY + Math.sin(a) * 11);
    ctx.lineTo(sawX + Math.cos(a) * 22, sawY + Math.sin(a) * 22);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffae42";
  ctx.beginPath();
  ctx.arc(16, -5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHangarBrute(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pose: HangarPoseId,
  t: number
): void {
  const isSlam = pose === "attack" || pose === "overdrive";
  const isDamaged = pose === "lockbreak" || pose === "overdrive";
  const piston = Math.sin(t * (isSlam ? 9 : 4)) * (isSlam ? 10 : 4);

  ctx.save();
  ctx.translate(cx, cy);
  if (isSlam) {
    ctx.strokeStyle = "rgba(240, 179, 79, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 10, 68 + Math.sin(t * 12) * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#20211d";
  ctx.beginPath();
  ctx.roundRect(-48, 16, 96, 32, 10);
  ctx.fill();
  ctx.fillStyle = "#745038";
  ctx.strokeStyle = "#2c2820";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-38, -38, 76, 62, 8);
  ctx.fill();
  ctx.stroke();

  if (isDamaged) {
    ctx.strokeStyle = "#ff7838";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-22, -24);
    ctx.lineTo(-6, -8);
    ctx.lineTo(-14, 8);
    ctx.stroke();
  }

  ctx.strokeStyle = "#66543d";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(-36, -18);
  ctx.lineTo(-62 - piston, 12);
  ctx.moveTo(36, -18);
  ctx.lineTo(62 + piston, 12);
  ctx.stroke();

  ctx.fillStyle = "#f0b34f";
  ctx.fillRect(-18, -26, 36, 8);
  ctx.restore();
}

function drawHangarZapper(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pose: HangarPoseId,
  t: number
): void {
  const hover = Math.sin(t * 5) * 7;
  const tilt = Math.cos(t * 3.5) * 0.1;
  ctx.save();
  ctx.translate(cx, cy + hover);
  ctx.rotate(tilt);

  // Three radiator wings
  ctx.fillStyle = "#56625c";
  ctx.strokeStyle = "#2c3531";
  ctx.lineWidth = 3;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * 18, -6);
    ctx.lineTo(dir * 62, -24);
    ctx.lineTo(dir * 48, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(-14, -54);
  ctx.lineTo(14, -54);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#28302e";
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9cd7c8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 34 + Math.sin(t * 10) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#b9f4c9";
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  if (pose === "attack" || pose === "overdrive") {
    ctx.strokeStyle = "rgba(185, 244, 201, 0.8)";
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(95, 42);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawHangarBoss(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pose: HangarPoseId,
  t: number
): void {
  const isPhase2 = pose === "overdrive" || pose === "attack" || pose === "lockbreak";
  const isLockBreak = pose === "lockbreak";
  const piston = Math.sin(t * 4) * 7;

  ctx.save();
  ctx.translate(cx, cy);

  // Phase 2+ Overdrive heat-vent wings
  if (isPhase2) {
    ctx.fillStyle = "#b8442a";
    ctx.strokeStyle = "#ffb548";
    ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 48, -36);
      ctx.rotate(side * (0.35 + Math.sin(t * 6) * 0.06));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * 38, -26);
      ctx.lineTo(side * 30, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Treads
  ctx.fillStyle = "#22231e";
  ctx.strokeStyle = "#0e0f0d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-68, 18, 136, 36, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#756344";
  for (let x = -48; x <= 48; x += 24) {
    ctx.beginPath();
    ctx.arc(x, 36, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Torso
  ctx.fillStyle = "#5d4632";
  ctx.strokeStyle = "#29251d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-48, -42, 96, 64, 10);
  ctx.fill();
  ctx.stroke();

  // Heavy hydraulic arms
  ctx.strokeStyle = "#655038";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-44, -20);
  ctx.lineTo(-74 - piston, 6);
  ctx.moveTo(44, -20);
  ctx.lineTo(74 + piston, 6);
  ctx.stroke();

  // Iron Crown Chest Lock
  const lockRadius = isLockBreak ? 26 : 22;
  ctx.fillStyle = "#24261f";
  ctx.beginPath();
  ctx.arc(0, -4, lockRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isLockBreak ? "#00e5ff" : "#d65b35";
  ctx.lineWidth = 4;
  ctx.stroke();

  const spin = t * (isLockBreak ? 10 : 1.5);
  for (let b = 0; b < 6; b++) {
    const a = (b * Math.PI) / 3 + spin;
    const dist = isLockBreak ? 23 + Math.sin(t * 14) * 3 : 17;
    ctx.fillStyle = isLockBreak ? "#ffe28a" : "#b8975c";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, -4 + Math.sin(a) * dist, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = isLockBreak ? "#00e5ff" : "#e0a044";
  ctx.beginPath();
  ctx.arc(0, -4, isLockBreak ? 11 : 7, 0, Math.PI * 2);
  ctx.fill();

  // Head & Scanner
  ctx.fillStyle = "#242a24";
  ctx.strokeStyle = "#9a7a43";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-24, -64, 48, 26, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffb548";
  ctx.fillRect(-16, -54, 32, 6);

  ctx.restore();
}

export function mapEnemyToHangar(kind: EnemyKind): HangarUnitId {
  return kind;
}
