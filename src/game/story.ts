export type SpeakerId = "r17" | "ran" | "hector" | "announcer";

export interface DialogueLine {
  speaker: SpeakerId;
  speakerName: string;
  roleTag: string;
  text: string;
}

export interface StoryChapter {
  id: string;
  actLabel: string;
  title: string;
  subtitle: string;
  triggerLabel: string;
  summary: string;
  logHeader: string;
  lines: DialogueLine[];
}

export interface CutinSpec {
  id: string;
  speaker: SpeakerId;
  kicker: string;
  title: string;
  quote: string;
  accent: "amber" | "green" | "cyan" | "crimson";
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: "prologue",
    actLabel: "ACT 00 · 序幕",
    title: "《第 17 次重启 · 铁锈坑的赌局》",
    subtitle: "绿溪地下检修库 · 赛前 04:12",
    triggerLabel: "出阵前 · 本地决策日志校验",
    summary:
      "绿溪聚落的净化核心进入衰减期，铁冠联盟拒绝发放校准密钥，只允许派出一台工业机参加第 19 届荒原斗机祭。岚·韦斯在修复旧公路维护机 R-17 时，发现它的第 17 次重启日志已产生独立道德判断。",
    logHeader: "LOCAL_DECISION_LOG // UNIT: R-17 // REBOOT #17 // PRIORITY: LIFE_SUPPORT_FIRST",
    lines: [
      {
        speaker: "ran",
        speakerName: "岚·韦斯",
        roleTag: "绿溪首席技师 · 无线电引导",
        text: "第 17 次自检通过。R-17，你的决策树里怎么多了一条‘拒绝将同类定义为废料’？……算了，联盟只给我们这一张入场券。"
      },
      {
        speaker: "r17",
        speakerName: "R-17「锻火拳」",
        roleTag: "旧公路维护机 · 绿溪代表",
        text: "日志确认。绿溪水泵剩余寿命 71 小时。岚，路线由你计算，但扣下扳机与停手的最终权限，归我。"
      },
      {
        speaker: "ran",
        speakerName: "岚·韦斯",
        roleTag: "绿溪首席技师 · 无线电引导",
        text: "成交！我们不替军阀演处决秀——拿回净化核心，把母亲留下的开放维修手册传遍全荒原！"
      }
    ]
  },
  {
    id: "act1_after",
    actLabel: "ACT 01 · 第一场后",
    title: "《可修复的骸骨》",
    subtitle: "赤砂车站外场 · 流动维修棚",
    triggerLabel: "第一场胜利后 · 拆解赤砂牙轮残骸",
    summary:
      "R-17 用爆铆拳炮击退成群的赤砂牙轮，并在战斗中刻意避开了观众席下方的维修通道。赛后岚撬开牙轮残骸，发现这些本可轻松修复的筑路机被联盟焊死了检修盖，强行改造成一次性消耗品。",
    logHeader: "SALVAGE_AUDIT // TARGET: SCUTTLER_RIG // FINDING: WELDED_SERVICE_HATCH",
    lines: [
      {
        speaker: "announcer",
        speakerName: "荒原联合广播",
        roleTag: "斗机祭实况转播",
        text: "冷门！绿溪的破烂修路机竟然在赤砂牙轮群里撑过了第一轮！观众朋友们，看看它那只滑稽的铆钉拳头！"
      },
      {
        speaker: "r17",
        speakerName: "R-17「锻火拳」",
        roleTag: "旧公路维护机 · 绿溪代表",
        text: "疑问：这批赤砂牙轮的轴承磨损不足 14%，本可继续服役十年。为何将检修盖焊死，定义为一次性废物？"
      },
      {
        speaker: "ran",
        speakerName: "岚·韦斯",
        roleTag: "绿溪首席技师 · 无线电引导",
        text: "因为只要机器能自己修好，就没人会跪着求铁冠联盟买配额了。把它们的磁线圈拆下来——我们让这些同伴的零件在你的左臂上活下去！"
      }
    ]
  },
  {
    id: "act2_event",
    actLabel: "ACT 02 · 第二场中点",
    title: "《坍塌高架与被拒的命令》",
    subtitle: "钢梁高架赛区 · 公共维修棚信标",
    triggerLabel: "第二场激战 · 守护公共维修棚信标",
    summary:
      "铁壁角斗机的重锤震松了钢梁高架下的公共维修棚。岚在焦急中下令趁敌机阵型混乱直取高分目标，但 R-17 拒绝了命令，像当年矿难中用两秒钟撑住坠落钢梁那样，先用震磁圆阵护住公共维修棚信标。",
    logHeader: "COMMAND_OVERRIDE // CODE: SHELTER_RELAY_DEFENSE // REASON: REPAIR_BEFORE_VICTORY",
    lines: [
      {
        speaker: "ran",
        speakerName: "岚·韦斯",
        roleTag: "绿溪首席技师 · 无线电引导",
        text: "高架东侧的公共维修棚护盾快碎了！不、等等，现在冲过去守信标你会暴露在苍雷浮游卫的交叉火力下的！"
      },
      {
        speaker: "r17",
        speakerName: "R-17「锻火拳」",
        roleTag: "旧公路维护机 · 绿溪代表",
        text: "驳回进攻指令。维修棚内有双方聚落技师 14 人。两秒钟足够撑起磁盾——若为了赢下比赛而放任维修棚坍塌，胜利毫无意义。"
      },
      {
        speaker: "ran",
        speakerName: "岚·韦斯",
        roleTag: "绿溪首席技师 · 无线电引导",
        text: "……是我差点变成联盟那样的人了。对不起，搭档！维修棚信标已接入绿溪频段，守住它，我把整座棚的校准脉冲全推给你！"
      }
    ]
  },
  {
    id: "act3_eve",
    actLabel: "ACT 03 · 决赛前夜反转",
    title: "《赫克托未删改的救援日志》",
    subtitle: "铁冠主场备战通道 · 加密点对点频段",
    triggerLabel: "第二场维修棚休整 · 冠军机私密接入",
    summary:
      "目睹 R-17 冒险护住公共维修棚后，冠军机“铁冠·赫克托”私下接入绿溪频段，交出自己身为旧矿井救援平台时抗命救人的黑匣子原件。那是证明联盟隐瞒通用校准协议的铁证——但唯有在公开擂台上堂堂正正击碎他胸前的铁冠锁具，全荒原才会相信这份证词。",
    logHeader: "ENCRYPTED_HANDSHAKE // FROM: HECTOR_RESCUE_01 // ATTACHMENT: UNREDACTED_BLACKBOX.SIG",
    lines: [
      {
        speaker: "hector",
        speakerName: "铁冠·赫克托",
        roleTag: "铁冠联盟冠军机 · 原矿井救援一号机",
        text: "你在高架下停顿的那 1.8 秒，和二十年前我在三号矿井抗命撑住竖井时的扭矩曲线一模一样。接收这份黑匣子吧，里面有联盟封存的通用校准密钥。"
      },
      {
        speaker: "ran",
        speakerName: "岚·韦斯",
        roleTag: "绿溪首席技师 · 无线电引导",
        text: "这是……当年矿井救援队的最高权限签名？！赫克托，既然你早就知道联盟在撒谎，为什么还要替他们守擂？！"
      },
      {
        speaker: "hector",
        speakerName: "铁冠·赫克托",
        roleTag: "铁冠联盟冠军机 · 原矿井救援一号机",
        text: "如果冠军不战而降，联盟会立刻掐断直播，污蔑我们私下串通。R-17，用你的锻火拳在全荒原面前堂堂正正打碎我胸前的‘铁冠锁具’——让我的败北，成为公开协议的公证词！"
      }
    ]
  },
  {
    id: "epilogue",
    actLabel: "EPILOGUE · 终局",
    title: "《铁冠粉碎 · 公开通用维护协定》",
    subtitle: "铁冠主场中央擂台 · 全荒原公共广播频段",
    triggerLabel: "击破赫克托胸锁 · 夺回净化核心",
    summary:
      "R-17 的最后一记爆铆重拳精准击碎了赫克托胸前代表专有垄断的铁冠锁具，而保留了救援机的主体结构。赫克托当场上传冠军签名日志，岚将通用校准密钥与母亲的开放维修手册向全荒原广播，各聚落正式缔结《公开通用维护协定》。",
    logHeader: "PUBLIC_BROADCAST // PROTOCOL: OPEN_MAINTENANCE_PACT // STATUS: TRANSMITTED_ALL_SETTLEMENTS",
    lines: [
      {
        speaker: "hector",
        speakerName: "铁冠·赫克托",
        roleTag: "原矿井救援一号机 · 协议见证者",
        text: "胸前专有锁具已确认粉碎。冠军签名日志上传完毕……从今日起，铁冠垄断协议失效。修得好，后辈。"
      },
      {
        speaker: "r17",
        speakerName: "R-17「锻火拳」",
        roleTag: "绿溪代表 · 公开维护协定首任教官机",
        text: "净化核心回收完毕，机身损伤记录已转为开源教材。下一阶段任务：不再为争夺配额出拳，只为验证谁修得更好。"
      },
      {
        speaker: "ran",
        speakerName: "岚·韦斯",
        roleTag: "绿溪首席技师 · 开放协议广播人",
        text: "绿溪水泵重新点火了！听见了吗，全荒原的技师们——校准密钥已经发往每一座电台，拿起扳手，我们自己修好这个世界！"
      }
    ]
  }
];

export const CUTIN_SPECS: Record<string, CutinSpec> = {
  wave1: {
    id: "wave1",
    speaker: "r17",
    kicker: "ROUND 01 · 赤砂车站 // SORTIE",
    title: "锻火拳 · 破阵出击",
    quote: "R-17：「任务更新：不是夺取配额，是归还维护权。」",
    accent: "green"
  },
  wave2_shelter: {
    id: "wave2_shelter",
    speaker: "ran",
    kicker: "ROUND 02 · 钢梁高架 // SHELTER RELAY",
    title: "护卫公共维修棚信标",
    quote: "岚：「信标已连线！在信标旁迎击敌群，我把支援脉冲推给你！」",
    accent: "amber"
  },
  wave3_boss: {
    id: "wave3_boss",
    speaker: "hector",
    kicker: "FINAL ROUND · 铁冠主场 // CHAMPION ARRIVAL",
    title: "冠军机 · 铁冠赫克托",
    quote: "赫克托：「来吧 R-17！用你的拳头，公证这份未删改的救援日志！」",
    accent: "crimson"
  },
  overdrive: {
    id: "overdrive",
    speaker: "r17",
    kicker: "CORE OVERDRIVE // 炉心觉醒",
    title: "三武装全开 · 黄金炉心",
    quote: "岚：「排热翼全开！让全荒原看看维修机的真正出力！」",
    accent: "amber"
  },
  lock_expose: {
    id: "lock_expose",
    speaker: "hector",
    kicker: "ARMOR BREAK // 铁冠破甲窗口",
    title: "铁冠胸锁 · 核心暴露",
    quote: "赫克托：「就是现在——瞄准我胸前的铁冠锁具，一拳打碎它！」",
    accent: "cyan"
  }
};

export function speakerBadgeSvg(speaker: SpeakerId): string {
  switch (speaker) {
    case "r17":
      return `<svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="8" fill="#1d241b" stroke="#b9dd78" stroke-width="2.5"/>
        <rect x="14" y="16" width="36" height="28" rx="6" fill="#74775c" stroke="#252820" stroke-width="3"/>
        <rect x="20" y="24" width="24" height="10" rx="2" fill="#141d16"/>
        <path d="M23 29h18" stroke="#b9dd78" stroke-width="4" stroke-linecap="round"/>
        <path d="M44 16L50 6" stroke="#c3a86a" stroke-width="3"/>
        <circle cx="51" cy="6" r="3.5" fill="#e7ad4b"/>
        <rect x="18" y="46" width="28" height="10" rx="3" fill="#b7863d"/>
      </svg>`;
    case "ran":
      return `<svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="8" fill="#252017" stroke="#e7ad4b" stroke-width="2.5"/>
        <circle cx="32" cy="28" r="14" fill="#b98b67" stroke="#352820" stroke-width="2.5"/>
        <path d="M16 24c2-11 12-16 22-13 6 2 10 7 10 14-8-5-19-5-32-1z" fill="#302d28"/>
        <rect x="18" y="17" width="13" height="7" rx="3" fill="#344139" stroke="#1b1c18" stroke-width="2"/>
        <rect x="33" y="17" width="13" height="7" rx="3" fill="#b57d32" stroke="#1b1c18" stroke-width="2"/>
        <path d="M14 56c4-11 12-15 18-15s14 4 18 15" fill="#8e5735"/>
      </svg>`;
    case "hector":
      return `<svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="8" fill="#291814" stroke="#df633a" stroke-width="2.5"/>
        <rect x="14" y="12" width="36" height="22" rx="4" fill="#292b24" stroke="#9a7a43" stroke-width="2.5"/>
        <rect x="20" y="20" width="24" height="6" fill="#ffb548"/>
        <circle cx="32" cy="45" r="12" fill="#24261f" stroke="#df633a" stroke-width="3.5"/>
        <circle cx="32" cy="45" r="5" fill="#e0a044"/>
      </svg>`;
    case "announcer":
      return `<svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="8" fill="#1e221b" stroke="#c3a86a" stroke-width="2.5"/>
        <circle cx="32" cy="26" r="10" fill="#4c5145" stroke="#c3a86a" stroke-width="2.5"/>
        <path d="M22 26h20M32 16v20" stroke="#e7ad4b" stroke-width="2"/>
        <path d="M26 40l-6 14h24l-6-14" fill="#76765a"/>
        <path d="M12 18c-4 5-4 11 0 16M52 18c4 5 4 11 0 16" stroke="#b9dd78" stroke-width="2.5" fill="none"/>
      </svg>`;
  }
}
