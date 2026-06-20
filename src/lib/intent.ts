import type { IntentClass } from "./types";

const KEYWORDS: Record<IntentClass, string[]> = {
  wealth: ["财富", "钱", "财运", "机会", "事业", "工作", "生意", "丰盛", "wealth", "money"],
  inspiration: ["灵感", "创作", "答案", "想法", "写作", "设计", "inspiration", "idea"],
  reunion: ["重逢", "爱情", "想念", "见面", "朋友", "关系", "缘分", "love", "reunion"],
  breakthrough: ["破局", "改变", "勇气", "突破", "离开", "开始", "决心", "break", "change"],
  calm: ["平静", "安宁", "休息", "疗愈", "放下", "松弛", "calm", "peace"],
  unknown: [],
};

export function classifyIntent(intent: string): IntentClass {
  const normalized = intent.trim().toLowerCase();
  for (const [klass, words] of Object.entries(KEYWORDS) as [IntentClass, string[]][]) {
    if (klass !== "unknown" && words.some((word) => normalized.includes(word.toLowerCase()))) {
      return klass;
    }
  }
  return "unknown";
}

export const intentLabels: Record<IntentClass, string> = {
  wealth: "财富",
  inspiration: "灵感",
  reunion: "重逢",
  breakthrough: "破局",
  calm: "平静",
  unknown: "未知",
};

export const poiPreferences: Record<IntentClass, string[]> = {
  wealth: ["business_area", "bookstore", "cafe", "shopping_mall", "bank_area", "square"],
  inspiration: ["bookstore", "park", "gallery", "museum", "university_area", "riverside_walkway"],
  reunion: ["cafe", "flower_shop", "square", "old_street", "park"],
  breakthrough: ["bridge_view", "square", "park_gate", "viewpoint", "sports_ground"],
  calm: ["park", "green_space", "riverside_walkway", "temple_area", "garden"],
  unknown: ["park", "square", "bookstore", "cafe", "green_space", "museum"],
};
