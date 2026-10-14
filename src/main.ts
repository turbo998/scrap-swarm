import Phaser from "phaser";
import "./style.css";
import { soundEngine } from "./game/audio";
import { UPGRADES, WEAPONS } from "./game/data";
import {
  HANGAR_POSES,
  HANGAR_UNITS,
  renderHangarPreview,
  type HangarPoseId,
  type HangarUnitId
} from "./game/hangar";
import {
  applyUpgrade,
  buyWeapon,
  continueFromShop,
  repairAtShop,
  startGame,
  summary,
  togglePause
} from "./game/simulation";
import {
  CUTIN_SPECS,
  STORY_CHAPTERS,
  speakerBadgeSvg
} from "./game/story";
import type { GameState, UpgradeId, WeaponId } from "./game/types";
import { GameScene } from "./scenes/GameScene";

const gameContainer = requiredElement("game");
const hud = requiredElement("hud");
const broadcast = requiredElement("broadcast");
const cutin = requiredElement("cutin");
const radio = requiredElement("radio");
const panel = requiredElement("panel");
const drawer = requiredElement("drawer");
const params = new URLSearchParams(location.search);
const seed = Number(params.get("seed")) || 1337;
const scene = new GameScene(seed);

let lastPanelKey = "";
let lastBroadcastKey = "";
let lastRadioKey = "";
let selectedHangarUnit: HangarUnitId = "r17";
let selectedHangarPose: HangarPoseId = "cruise";
let activeStoryChapter = "prologue";
let storyDrawerOpen = false;
let cutinTimeout: number | undefined;
let radioLineIndex = 0;

scene.onStateChange = renderUi;
scene.onCutin = triggerCutinBanner;

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: gameContainer,
  width: 1280,
  height: 720,
  backgroundColor: "#343730",
  scene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  render: {
    antialias: true,
    pixelArt: false
  }
});

function triggerCutinBanner(id: string): void {
  const spec = CUTIN_SPECS[id];
  if (!spec) return;
  cutin.innerHTML = `
    <div class="cutin-strip ${spec.accent}">
      <div class="cutin-avatar">${speakerBadgeSvg(spec.speaker)}</div>
      <div class="cutin-copy">
        <span class="cutin-kicker">${spec.kicker}</span>
        <strong class="cutin-title">${spec.title}</strong>
        <small class="cutin-sub">${spec.quote}</small>
      </div>
    </div>
  `;
  cutin.setAttribute("aria-hidden", "false");
  cutin.classList.remove("active");
  void cutin.offsetWidth;
  cutin.classList.add("active");
  if (cutinTimeout !== undefined) window.clearTimeout(cutinTimeout);
  cutinTimeout = window.setTimeout(() => {
    cutin.classList.remove("active");
    cutin.setAttribute("aria-hidden", "true");
  }, 2600);
}

function resolveStoryChapterForState(state: GameState): string {
  if (state.phase === "win") return "epilogue";
  if (state.wave === 3) return "act3_eve";
  if (state.wave === 2) return "act2_event";
  if (state.phase === "shop" || state.phase === "upgrade") return "act1_after";
  return "prologue";
}

function renderRadioComms(state: GameState): void {
  if (state.phase === "menu") {
    radio.innerHTML = "";
    radio.className = "";
    lastRadioKey = "";
    return;
  }
  const chapterId = resolveStoryChapterForState(state);
  const chapter = STORY_CHAPTERS.find((item) => item.id === chapterId) ?? STORY_CHAPTERS[0]!;
  const lineIndex = Math.floor(state.tick / 240 + radioLineIndex) % chapter.lines.length;
  const key = `${state.phase}:${chapter.id}:${lineIndex}`;
  if (key === lastRadioKey) return;
  lastRadioKey = key;
  const line = chapter.lines[lineIndex] ?? chapter.lines[0]!;
  radio.className = "active";
  radio.innerHTML = `
    <div class="radio-avatar">${speakerBadgeSvg(line.speaker)}</div>
    <div class="radio-body">
      <div class="radio-meta">
        <span class="radio-act">${chapter.actLabel}</span>
        <strong>${line.speakerName}</strong>
        <small>${line.roleTag}</small>
        <span class="radio-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      </div>
      <p class="radio-text">${line.text}</p>
    </div>
    <div class="radio-actions">
      <button type="button" data-radio-action="next" title="下一条通信">切频</button>
      <button type="button" data-radio-action="archive" title="打开三幕剧情档案">档案</button>
    </div>
  `;
}

function renderStoryDrawer(): void {
  drawer.classList.toggle("open", storyDrawerOpen);
  if (!storyDrawerOpen) {
    drawer.innerHTML = "";
    return;
  }
  const current = STORY_CHAPTERS.find((c) => c.id === activeStoryChapter) ?? STORY_CHAPTERS[0]!;
  drawer.innerHTML = `
    <div class="card story-drawer-card">
      <div class="story-drawer-head">
        <div>
          <span class="eyebrow">WASTELAND IRON CIRCUIT · 3-ACT RADIO ARCHIVE</span>
          <h2>三幕无线电剧场与黑匣子档案</h2>
        </div>
        <button type="button" class="drawer-close" data-drawer-action="close">返回战局 [ESC]</button>
      </div>
      <div class="story-tabs" role="tablist">
        ${STORY_CHAPTERS.map(
          (ch) => `
          <button
            type="button"
            role="tab"
            aria-selected="${ch.id === current.id}"
            class="story-tab ${ch.id === current.id ? "active" : ""}"
            data-story-chapter="${ch.id}"
          >
            <span>${ch.actLabel}</span>
            <strong>${ch.title}</strong>
          </button>
        `
        ).join("")}
      </div>
      <div class="story-chapter-meta">
        <strong>${current.title} · ${current.subtitle}</strong>
        <p>${current.triggerLabel} — ${current.summary}</p>
      </div>
      <div class="story-lines">
        ${current.lines
          .map(
            (line) => `
          <article class="story-line" data-tone="${line.speaker}">
            <div class="story-line-badge">${speakerBadgeSvg(line.speaker)}</div>
            <div class="story-line-content">
              <header>
                <strong>${line.speakerName}</strong>
                <span>${line.roleTag}</span>
              </header>
              <p>${line.text}</p>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderUi(state: GameState): void {
  renderBroadcast(state);
  renderRadioComms(state);
  const hpPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  const xpPercent = Math.max(0, (state.player.xp / state.player.xpNext) * 100);
  const boss = state.enemies.find((enemy) => enemy.kind === "boss");
  const dashReady = state.player.dashCooldown <= 0 && state.player.dashTimer <= 0;
  const dashProgress =
    state.player.dashTimer > 0
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((state.player.dashMaxCooldown - state.player.dashCooldown) / state.player.dashMaxCooldown) * 100
          )
        );
  const dashLabel =
    state.player.dashTimer > 0
      ? "炉心突进中"
      : dashReady
        ? "炉心冲刺 [Space]"
        : `冷却 ${state.player.dashCooldown.toFixed(1)}s`;

  const shelterHtml = state.shelter.active
    ? `<div class="hud-sub">维修棚信标 ${Math.ceil(state.shelter.hp)}/${state.shelter.maxHp} · 充能 ${Math.floor((state.shelter.charge / state.shelter.maxCharge) * 100)}% (支援x${state.shelter.pulsesTriggered})</div>`
    : "";

  const bossPhaseBadge = boss
    ? `<div class="hud-sub boss-status">赫克托 PHASE ${state.bossPhase}/3 ${state.bossLockExposedTicks > 0 ? '<b class="lock-open">⚡铁冠锁具暴露 (1.45x破甲)</b>' : ""}</div>`
    : "";

  hud.innerHTML = `
    <div class="hud-block">
      R-17 机体 ${Math.ceil(state.player.hp)} / ${state.player.maxHp}
      <div class="bar"><i style="width:${hpPercent}%"></i></div>
      协议 ${state.player.level} · 回收件 ${state.player.scrap}
      <div class="bar xp"><i style="width:${xpPercent}%"></i></div>
    </div>
    <div class="hud-tactical">
      <button type="button" class="hud-btn ${dashReady ? "ready" : ""}" data-hud-action="dash" ${!dashReady || state.phase !== "combat" ? "disabled" : ""}>
        <span>${dashLabel}</span>
        <i class="hud-cd"><em style="width:${dashProgress}%"></em></i>
      </button>
      <button type="button" class="hud-btn" data-hud-action="mute">
        ${soundEngine.isMuted() ? "音效: 静音 [M]" : "音效: 开启 [M]"}
      </button>
      <button type="button" class="hud-btn" data-hud-action="story">
        三幕档案
      </button>
    </div>
    <div class="hud-block">
      ${state.wave === 3 ? "冠军决战" : `巡回赛程 ${state.wave} / 3`} · 击破 ${state.stats.kills}<br>
      ${state.player.weapons.map((id) => WEAPONS[id].name).join(" · ")}
      ${shelterHtml}
      ${bossPhaseBadge}
      ${boss ? `<div class="bar"><i style="width:${Math.max(0, (boss.hp / boss.maxHp) * 100)}%"></i></div>` : ""}
    </div>
  `;

  const key = `${state.phase}:${state.player.scrap}:${state.upgradeChoices.join(",")}:${state.player.weapons.join(",")}:${selectedHangarUnit}:${selectedHangarPose}`;
  if (key === lastPanelKey) return;
  lastPanelKey = key;
  panel.classList.toggle("open", state.phase !== "combat");
  if (state.phase === "combat") {
    panel.innerHTML = "";
  } else if (state.phase === "menu") {
    const unitMeta = HANGAR_UNITS.find((u) => u.id === selectedHangarUnit) ?? HANGAR_UNITS[0]!;
    panel.innerHTML = card(
      `
      <div class="title-layout">
        <div class="title-copy">
          <span class="eyebrow">荒原联合广播 · 第 19 届斗机祭</span>
          <h1>废土斗机祭<small>Wasteland Iron Circuit · Scrap Swarm</small></h1>
          <p class="story-hook">大崩落后的第 87 年，军阀“铁冠联盟”垄断能源，以巡回机甲赛决定聚落的供电配额。绿溪技师岚·韦斯修复了旧维护机 R-17，将它以“锻火拳”之名送上擂台：连胜三场、击穿联盟冠军赫克托，夺回被扣押的净化核心。</p>
          <div class="persona-strip">
            <span><b>斗士</b> R-17「锻火拳」</span>
            <span><b>技师</b> 岚·韦斯</span>
            <span><b>宿敌</b> 铁冠·赫克托</span>
          </div>
          <button class="primary" data-action="start">R-17，出阵！</button>
          <div class="menu-sub-actions">
            <button type="button" class="secondary-btn" data-action="open-story">三幕无线电剧情档案 (5章)</button>
            <a class="design-link" href="./design/">查看角色与机体设定集</a>
          </div>
        </div>
        <div class="hero-portrait" aria-label="机体构造与动作检视台">
          <div class="hangar-inspector">
            <div class="hangar-header">
              <span>MECH HANGAR INSPECTOR · 程序化多关节检视台</span>
              <strong>${unitMeta.name} · ${unitMeta.role}</strong>
            </div>
            <div class="hangar-unit-tabs">
              ${HANGAR_UNITS.map(
                (u) => `
                <button type="button" class="hangar-tab ${u.id === selectedHangarUnit ? "active" : ""}" data-hangar-unit="${u.id}">
                  ${u.name.split(" ")[0]}
                </button>
              `
              ).join("")}
            </div>
            <div class="hangar-canvas-wrap">
              <canvas id="hangar-canvas" width="420" height="230"></canvas>
            </div>
            <div class="hangar-pose-tabs">
              ${HANGAR_POSES.map(
                (p) => `
                <button type="button" class="hangar-pose ${p.id === selectedHangarPose ? "active" : ""}" data-hangar-pose="${p.id}">
                  ${p.label}
                </button>
              `
              ).join("")}
            </div>
            <div class="hangar-meta">
              <div class="hangar-joints">
                ${unitMeta.joints.map((j) => `<span>${j}</span>`).join("")}
              </div>
              <p>${unitMeta.description}</p>
            </div>
          </div>
        </div>
      </div>
    `,
      "menu-card"
    );
  } else if (state.phase === "upgrade") {
    panel.innerHTML = card(`
      <h2>中场必杀改装</h2>
      <p class="tagline">岚：“听好，R-17！把废料压进炉心——下一击要让全荒原都看见！”</p>
      <div class="choices">
        ${state.upgradeChoices
          .map(
            (id) => `
          <button data-upgrade="${id}"><strong>${UPGRADES[id].name}</strong><br>${UPGRADES[id].description}</button>
        `
          )
          .join("")}
      </div>
    `);
  } else if (state.phase === "shop") {
    panel.innerHTML = card(`
      <h2>流动维修棚 · 绿溪席位</h2>
      <p class="tagline">岚：“库存回收件 ${state.player.scrap}。裁判钟响之前，选好你的下一套连击。”</p>
      <div class="choices">
        ${shopButton(state, "pulse")}
        ${shopButton(state, "arc")}
        <button data-action="repair" ${state.player.scrap < 12 || state.player.hp >= state.player.maxHp ? "disabled" : ""}>
          <strong>赛间紧急焊补</strong><span class="price">12 回收件</span><br>恢复 35 机体完整度
        </button>
        <button type="button" data-action="open-story">
          <strong>回放黑匣子无线电档案</strong><span class="price">剧情记录</span><br>查看《可修复的骸骨》与赫克托加密通信
        </button>
        <button class="primary" data-action="continue">进入第 ${state.wave + 1} 场擂台</button>
      </div>
    `);
  } else if (state.phase === "paused") {
    panel.innerHTML = card(`
      <h2>比赛暂停 · 炉心锁定</h2>
      <p class="tagline">岚已冻结行动总线。按 P 重新点燃斗志，或查阅三幕无线电档案。</p>
      <div class="choices">
        <button type="button" data-action="open-story">查阅三幕无线电剧场档案</button>
      </div>
    `);
  } else {
    const won = state.phase === "win";
    panel.innerHTML = card(`
      <h2>${won ? "荒原冠军 · 核心夺还" : "斗士倒地 · 炉心未灭"}</h2>
      <p class="tagline">${won ? "赫克托的铁冠已经粉碎。岚将净化核心接回绿溪，并向全荒原广播《公开通用维护协定》，全城第一次为一台旧维护机高呼名字。" : "岚：“比赛还没结束。只要炉心还能点亮一次，我们就能再站起来。”"}</p>
      <div class="result-stat"><span>击破机甲</span><strong>${state.stats.kills}</strong></div>
      <div class="result-stat"><span>造成伤害</span><strong>${Math.round(state.stats.damageDealt)}</strong></div>
      <div class="result-stat"><span>购买次数</span><strong>${state.stats.purchases}</strong></div>
      <div class="result-stat"><span>炉心冲刺次数</span><strong>${state.stats.dashes}</strong></div>
      <div class="result-stat"><span>维修棚支援脉冲</span><strong>${state.stats.shelterPulses}</strong></div>
      <div class="choices">
        <button type="button" data-action="open-story">审阅终局档案《铁冠粉碎 · 公开通用维护协定》</button>
        <button class="primary" data-action="restart">${won ? "开启卫冕战" : "重燃炉心"}</button>
      </div>
    `);
  }
}

function renderBroadcast(state: GameState): void {
  const key = `${state.phase}:${state.wave}`;
  if (key === lastBroadcastKey) return;
  lastBroadcastKey = key;
  const messages: Record<number, { kicker: string; title: string; line: string }> = {
    1: {
      kicker: "ROUND 01 · 赤砂车站",
      title: "荒牙群袭",
      line: "广播：绿溪代表 R-17 首次登场——让废铁记住你的拳名！"
    },
    2: {
      kicker: "ROUND 02 · 钢梁高架",
      title: "铁壁围杀",
      line: "岚：守住公共维修棚信标！在信标旁迎击敌群可充能支援脉冲！"
    },
    3: {
      kicker: "FINAL ROUND · 铁冠主场",
      title: "冠军机 赫克托",
      line: "赫克托：能源只属于强者。R-17，瞄准我胸前的铁冠锁具来证明反例！"
    }
  };
  if (state.phase !== "combat") {
    broadcast.replaceChildren();
    broadcast.className = "";
    return;
  }
  const message = messages[state.wave];
  if (!message) return;
  broadcast.innerHTML = `<span>${message.kicker}</span><strong>${message.title}</strong><small>${message.line}</small>`;
  broadcast.className = "";
  void broadcast.offsetWidth;
  broadcast.className = state.wave === 3 ? "show danger" : "show";
}

function startHangarAnimationLoop(): void {
  const step = (now: number): void => {
    if (scene.state.phase === "menu") {
      const canvas = document.getElementById("hangar-canvas") as HTMLCanvasElement | null;
      if (canvas) {
        renderHangarPreview(canvas, selectedHangarUnit, selectedHangarPose, now / 1000);
      }
    }
    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}
startHangarAnimationLoop();

hud.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!btn) return;
  const action = btn.dataset.hudAction;
  if (action === "dash") {
    scene.requestDash();
    renderUi(scene.state);
  } else if (action === "mute") {
    soundEngine.toggleMute();
    renderUi(scene.state);
  } else if (action === "story") {
    activeStoryChapter = resolveStoryChapterForState(scene.state);
    storyDrawerOpen = true;
    renderStoryDrawer();
  }
});

radio.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!btn) return;
  const action = btn.dataset.radioAction;
  if (action === "next") {
    radioLineIndex += 1;
    lastRadioKey = "";
    renderRadioComms(scene.state);
  } else if (action === "archive") {
    activeStoryChapter = resolveStoryChapterForState(scene.state);
    storyDrawerOpen = true;
    renderStoryDrawer();
  }
});

drawer.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!btn) return;
  if (btn.dataset.drawerAction === "close") {
    storyDrawerOpen = false;
    renderStoryDrawer();
  } else if (btn.dataset.storyChapter) {
    activeStoryChapter = btn.dataset.storyChapter;
    renderStoryDrawer();
  }
});

panel.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;
  if (button.dataset.hangarUnit) {
    selectedHangarUnit = button.dataset.hangarUnit as HangarUnitId;
    lastPanelKey = "";
    renderUi(scene.state);
    return;
  }
  if (button.dataset.hangarPose) {
    selectedHangarPose = button.dataset.hangarPose as HangarPoseId;
    lastPanelKey = "";
    renderUi(scene.state);
    return;
  }
  const action = button.dataset.action;
  if (action === "open-story") {
    activeStoryChapter = resolveStoryChapterForState(scene.state);
    storyDrawerOpen = true;
    renderStoryDrawer();
    return;
  }
  if (action === "start") startGame(scene.state);
  if (action === "restart") scene.reset(scene.state.seed);
  if (action === "continue") continueFromShop(scene.state);
  if (action === "repair") repairAtShop(scene.state);
  if (button.dataset.upgrade) applyUpgrade(scene.state, button.dataset.upgrade as UpgradeId);
  if (button.dataset.weapon) buyWeapon(scene.state, button.dataset.weapon as WeaponId);
  lastPanelKey = "";
  renderUi(scene.state);
});

renderUi(scene.state);

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === "escape" && storyDrawerOpen) {
    storyDrawerOpen = false;
    renderStoryDrawer();
    return;
  }
  if (key === "m") {
    soundEngine.toggleMute();
    renderUi(scene.state);
    return;
  }
  if (key === "p") {
    togglePause(scene.state);
    lastPanelKey = "";
    renderUi(scene.state);
  }
});

window.addEventListener("blur", () => {
  if (scene.state.phase === "combat") {
    scene.state.previousPhase = "combat";
    scene.state.phase = "paused";
    lastPanelKey = "";
    renderUi(scene.state);
  }
});

if (import.meta.env.DEV && params.get("dev") === "1") {
  void import("./dev/api").then(({ createDevApi }) => {
    const api = createDevApi(scene, renderUi);
    window.__SCRAP_SWARM_DEV__ = api;
    window.__gameTest = api;
    document.documentElement.dataset.devReady = "true";
    const devPanel = document.createElement("aside");
    devPanel.className = "dev-panel";
    devPanel.innerHTML = `
      <strong>开发 Harness</strong><br>
      种子 ${scene.state.seed} · tick <span data-dev-tick>0</span>
      <button data-dev="spawn">生成锯齿爬机</button>
      <button data-dev="wave2">第2场维修棚</button>
      <button data-dev="boss">首领场景</button>
      <button data-dev="bossPhase3">首领锁具暴露</button>
      <button data-dev="dash">触发炉心冲刺</button>
      <button data-dev="pause">暂停 / 继续</button>
      <button data-dev="step">单步 1 tick</button>
      <button data-dev="snapshot">导出 JSON 快照</button>
    `;
    document.body.append(devPanel);
    devPanel.addEventListener("click", (event) => {
      const action = (event.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.dev;
      if (action === "spawn") window.__SCRAP_SWARM_DEV__?.spawn("scuttler");
      if (action === "wave2") window.__SCRAP_SWARM_DEV__?.prepare("wave2");
      if (action === "boss") window.__SCRAP_SWARM_DEV__?.prepare("boss");
      if (action === "bossPhase3") window.__SCRAP_SWARM_DEV__?.prepare("bossPhase3");
      if (action === "dash") window.__SCRAP_SWARM_DEV__?.dash();
      if (action === "pause") {
        const currentApi = window.__SCRAP_SWARM_DEV__;
        if (currentApi?.read().phase === "paused") currentApi.resume();
        else currentApi?.pause();
      }
      if (action === "step") window.__SCRAP_SWARM_DEV__?.singleStep();
      if (action === "snapshot") {
        const snapshot = window.__SCRAP_SWARM_DEV__?.exportSnapshot();
        if (!snapshot) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([snapshot], { type: "application/json" }));
        link.download = `scrap-swarm-${scene.state.seed}-tick-${scene.state.tick}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    });
    window.setInterval(() => {
      const tick = devPanel.querySelector("[data-dev-tick]");
      if (tick) tick.textContent = String(scene.state.tick);
    }, 250);
  });
}

function shopButton(state: GameState, id: WeaponId): string {
  const owned = state.player.weapons.includes(id);
  const weapon = WEAPONS[id];
  return `
    <button data-weapon="${id}" ${owned || state.player.scrap < weapon.price ? "disabled" : ""}>
      <strong>${weapon.name}</strong><span class="price">${owned ? "已拥有" : `${weapon.price} 废料`}</span><br>${weapon.description}
    </button>
  `;
}

function card(content: string, className = ""): string {
  return `<div class="card ${className}">${content}</div>`;
}

function requiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id} element`);
  return element;
}

export { scene, summary };
