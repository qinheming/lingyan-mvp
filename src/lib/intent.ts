import type { IntentClass } from "./types";

const KEYWORDS: Record<IntentClass, string[]> = {
  wealth: [
    "财富", "钱", "财运", "机会", "事业", "工作", "生意", "丰盛", "升职", "加薪",
    "创业", "副业", "客户", "订单", "搞钱", "投资", "成交", "收入", "wealth", "money",
  ],
  inspiration: [
    "灵感", "创作", "答案", "想法", "写作", "设计", "点子", "创意", "卡壳", "画画",
    "写歌", "思考", "发散", "好奇", "新奇", "艺术", "看展", "读书", "inspiration", "idea",
  ],
  reunion: [
    "重逢", "爱情", "想念", "见面", "朋友", "关系", "缘分", "偶遇", "恋爱", "复合",
    "喜欢", "陪伴", "孤单", "脱单", "表白", "约会", "温情", "故人", "love", "reunion",
  ],
  breakthrough: [
    "破局", "改变", "勇气", "突破", "离开", "开始", "决心", "迷茫", "困局", "内耗",
    "辞职", "选择", "决定", "重启", "出发", "方向", "瓶颈", "突围", "break", "change",
  ],
  calm: [
    "平静", "安宁", "休息", "疗愈", "放下", "松弛", "发呆", "散步", "吹风", "安静",
    "焦虑", "累", "疲惫", "烦躁", "失眠", "喘口气", "静一静", "放空", "压力", "难过", "calm", "peace",
  ],
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
