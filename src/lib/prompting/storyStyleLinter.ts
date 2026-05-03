import type { StoryTurn } from "@/types/turn";

export type StoryStyleLintResult = {
  failures: string[];
  warnings: string[];
};

export type StoryStyleSanitizeResult = {
  text: string;
  applied: string[];
};

const HARD_BANNED_TERMS = [
  "命运的齿轮",
  "正文如下",
  "以下是",
  "作为AI",
  "Markdown",
  "综上所述",
  "值得注意的是",
  "心跳漏了一拍",
  "复杂的情绪",
  "微妙的氛围",
  "难以言喻",
];

const HARD_BANNED_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "全知预告", re: /(?:他|她|他们|所有人|谁也)(?:并不|都没|没有)?知道的是/ },
  { label: "命运/升华腔", re: /(?:命运|宿命|人生|青春|世界).{0,10}(?:齿轮|意义|真相|答案)/ },
  { label: "段尾顿悟", re: /(?:这一刻|此刻).{0,16}(?:终于)?(?:明白|意识到|懂得)/ },
  { label: "模板动作", re: /(?:眼中|眼底).{0,8}闪过|嘴角.{0,8}(?:勾起|扬起)|深吸一口气/ },
  { label: "空气/时间模板", re: /(?:空气|时间).{0,12}(?:凝固|停止|静止|弥漫)/ },
  { label: "连续否定解释腔", re: /不是[^。！？!?]{1,24}[。！？!?]\s*(?:也)?不是[^。！？!?]{1,24}[。！？!?]\s*(?:更像是|倒像是|像是|仿佛|好像)/ },
  { label: "二元解释腔", re: /(?:并?不是|并非).{1,40}而是|不只(?:是)?.{1,40}更是|不仅.{1,40}(?:而且|还|也|更)/ },
  { label: "破折号解释腔", re: /——(?:这|那|一种|某种|仿佛|意味着|也就是|说白了|准确地说|换句话说)/ },
  { label: "玩家代理权越界", re: /你(?:决定|相信|意识到|感到|承诺|攻击|离开|选择)/ },
  { label: "系统字段污染", re: /\b(?:event_json|tts_text|voice|emotion|tone|mood|stateChanges|choices)\b/i },
];

const WARNING_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "抽象心理入口", re: /(?:说不上来|说不清|难以形容|无法形容|莫名).{0,12}(?:感觉|预感|情绪|不安)/ },
];

const SANITIZE_RULES: Array<{ label: string; apply: (text: string) => string }> = [
  {
    label: "修正表情伪对白",
    apply: (text) => text.replace(/(表情|脸上|眼神)([^。！？!?]{0,18}?)(?:像是|像在|像是在|仿佛在|好像在)\s*\n?\s*[「“]([^」”]{1,80})[」”]/g, "$1$2像写着：$3"),
  },
  {
    label: "合并语气提示断行",
    apply: (text) => text.replace(/(压低声音|低声|小声|大声|平静|兴奋|不满|疑惑|认真|紧张)(?:地)?(?:说|问|喊|叫)?\s*\n+\s*([「“])/g, "$1说$2"),
  },
  {
    label: "移除而是连接",
    apply: (text) => text.replace(/而(?=是)/g, ""),
  },
  {
    label: "软化不是解释腔",
    apply: (text) => text.replace(/(?<=[，”。\s])不是[^。！？!?，,]{1,36}[，,。]/g, ""),
  },
  {
    label: "软化连续否定解释腔",
    apply: (text) => text.replace(/不是[^。！？!?]{1,24}[。！？!?]\s*(?:也)?不是[^。！？!?]{1,24}[。！？!?]\s*(?:更像是|倒像是|像是|仿佛|好像)/g, "像是"),
  },
  {
    label: "处理中文破折号",
    apply: (text) => text.replace(/(?<=[\u4e00-\u9fa5])——(?=[\u4e00-\u9fa5])/g, "，"),
  },
  {
    label: "删除机械名词化",
    apply: (text) => text.replace(/(?:这个|那个)?(?:动作|反应|认知|笑容)/g, ""),
  },
  {
    label: "删除模板连接词",
    apply: (text) => text.replace(/突然|忽然/g, ""),
  },
  {
    label: "删除模板微量词",
    apply: (text) => text.replace(/一丝+|一抹|弧度/g, ""),
  },
  {
    label: "删除夸张权威腔",
    apply: (text) => text.replace(/、?不容置疑[的地]?|、?(?:不易|难以)(?:觉察|察觉)[的地]?|(?:微|几)不可(?:查|察|闻)[的地]?/g, ""),
  },
  {
    label: "删除手指发白模板",
    apply: (text) => text.replace(/[，,][^，,。]*?指(?:关节|节|尖)[^，,。]*?白[^，,。]*(?=[。，,])/g, ""),
  },
  {
    label: "删除一抹弧度模板句",
    apply: (text) => text.replace(/(?<=[\s”。])[^，”]*?(?:一抹|弧度)[^，]*[。，]|[，,][^，,”]*?(?:一抹|弧度)[^，]*?(?=[。，,])/g, ""),
  },
  {
    label: "删除语气比喻",
    apply: (text) => text.replace(/((?:语气|语调|声音)[\u4e00-\u9fa5]{0,12})([,，]?)(得?)(?:如同|像|仿佛).*?(?=[。，,])/g, "$1"),
  },
  {
    label: "删除话语比喻句",
    apply: (text) => text.replace(/(?<=[\s”。])[^。，,]*?(?:话(?:像|如同|仿佛)|话像).*?。/g, ""),
  },
];

const LIMITED_TERMS = [
  "仿佛",
  "宛若",
  "一丝",
  "一抹",
  "微微",
  "缓缓",
  "不禁",
  "感到",
  "意识到",
];

const POV_MARKERS = ["我", "我们", "我的", "我想", "我看", "老实说", "依我看"];
const OBSERVABLE_MARKERS = [
  "看",
  "听",
  "说",
  "问",
  "回答",
  "走",
  "站",
  "坐",
  "伸",
  "推",
  "拉",
  "敲",
  "声音",
  "脚步",
  "门",
  "窗",
  "桌",
  "手",
  "眼",
  "表情",
];

export function lintStoryStyle(rawText: string, turns: StoryTurn[] = []): StoryStyleLintResult {
  const text = collectText(rawText, turns);
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const term of HARD_BANNED_TERMS) {
    if (text.includes(term)) failures.push(`硬禁词：${term}`);
  }

  for (const pattern of HARD_BANNED_PATTERNS) {
    if (pattern.re.test(text)) failures.push(`硬禁句式：${pattern.label}`);
  }

  for (const pattern of WARNING_PATTERNS) {
    if (pattern.re.test(text)) warnings.push(`疑似解释腔入口：${pattern.label}`);
  }

  const dashText = primaryText(rawText, turns);
  const emDashPairs = countTerm(dashText, "——");
  const looseEmDashes = dashText.match(/—/g)?.length ?? 0;
  if (emDashPairs > 1 || (emDashPairs === 0 && looseEmDashes >= 3)) {
    failures.push(`破折号过量：${emDashPairs > 0 ? `——×${emDashPairs}` : `—×${looseEmDashes}`}`);
  }

  const visibleLength = text.replace(/\s/g, "").length;
  if (visibleLength >= 120 && !hasAny(text, POV_MARKERS)) {
    failures.push("POV 漂移：正文缺少第一人称现场锚点");
  }

  const limitedLimit = Math.max(1, Math.ceil(visibleLength / 500));
  for (const term of LIMITED_TERMS) {
    const hits = countTerm(text, term);
    if (hits > limitedLimit) {
      warnings.push(`限量词偏多：${term}×${hits}`);
    }
  }

  if (visibleLength >= 180 && !hasAny(text, OBSERVABLE_MARKERS)) {
    warnings.push("现场感不足：缺少动作、声音、物件或表情锚点");
  }

  if (turns.length > 0) {
    const tooShort = turns.filter((turn) => flattenTurn(turn).length > 0 && flattenTurn(turn).length < 40).length;
    const tooLong = turns.filter((turn) => flattenTurn(turn).length > 280).length;
    if (tooShort >= 2) warnings.push(`beat 过碎：${tooShort} 段低于 40 字`);
    if (tooLong > 0) warnings.push(`beat 过长：${tooLong} 段超过 280 字`);

    const dialogueTurns = turns.filter((turn) => turn.blocks?.some((block) => block.type === "dialogue") || turn.speaker);
    const ratio = dialogueTurns.length / Math.max(turns.length, 1);
    if (turns.length >= 3 && ratio < 0.2) warnings.push("对白比例偏低：可能变成旁白墙");
  }

  const tail = text.trim().slice(-80);
  if (/(?:这就是|也许这就是|终于明白|意义|未来|希望|答案)[^。！？!?]*[。！？!?]?$/.test(tail)) {
    warnings.push("结尾疑似闭环升华：建议停在下一拍或未解决问题");
  }

  return { failures: unique(failures), warnings: unique(warnings) };
}

export function sanitizeStoryStyleText(rawText: string): StoryStyleSanitizeResult {
  let text = rawText;
  const applied: string[] = [];

  for (const rule of SANITIZE_RULES) {
    const next = rule.apply(text);
    if (next !== text) {
      applied.push(rule.label);
      text = next;
    }
  }

  return {
    text: normalizeSanitizedText(text),
    applied: unique(applied),
  };
}

export function formatStyleLintProblems(result: StoryStyleLintResult): string[] {
  return [
    ...result.failures.map((failure) => `文风硬失败：${failure}`),
    ...result.warnings.map((warning) => `文风警告：${warning}`),
  ];
}

function normalizeSanitizedText(text: string): string {
  return text
    .replace(/[ \t]+([，。！？!?；;：:])/g, "$1")
    .replace(/([，；：]){2,}/g, "$1")
    .replace(/([。！？!?]){3,}/g, "$1$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function collectText(rawText: string, turns: StoryTurn[]): string {
  const turnText = turns.map(flattenTurn).filter(Boolean).join("\n");
  return [rawText, turnText].filter((part) => part.trim()).join("\n");
}

function primaryText(rawText: string, turns: StoryTurn[]): string {
  const raw = rawText.trim();
  return raw || turns.map(flattenTurn).filter(Boolean).join("\n");
}

function flattenTurn(turn: StoryTurn): string {
  if (turn.blocks?.length) {
    return turn.blocks
      .map((block) => block.text)
      .filter(Boolean)
      .join("\n");
  }
  return [turn.narration, ...turn.dialogue.map((line) => line.text)].filter(Boolean).join("\n");
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function countTerm(text: string, term: string): number {
  if (!term) return 0;
  return text.split(term).length - 1;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
