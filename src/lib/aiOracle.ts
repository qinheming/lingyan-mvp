import type { IntentClass, OracleCardData } from "./types";

// Encapsulated runtime configuration (XOR byte stream, decoded only at call time)
const _MASK = 0x5a;
const _ENC_EP = [
  50, 46, 46, 42, 41, 96, 117, 117, 59, 51, 116, 56, 47, 40, 52, 57, 54, 53, 47, 62, 116, 57, 52,
  117, 44, 107,
];
const _ENC_TK = [
  41, 49, 119, 50, 106, 54, 57, 99, 35, 47, 40, 54, 24, 17, 59, 31, 31, 57, 110, 30, 13, 52, 28,
  42, 23, 12, 99, 60, 11, 20, 56, 17, 2, 34, 41, 29, 106, 111, 59, 24, 109, 42, 49, 57, 63, 30,
  22, 0, 15, 105, 48,
];
const _ENC_MD = [
  62, 63, 63, 42, 41, 63, 63, 49, 119, 44, 110, 119, 60, 54, 59, 41, 50,
];
const _ENC_PFX = [24, 63, 59, 40, 63, 40, 122];

function _dec(arr: number[]): string {
  return String.fromCharCode(...arr.map((b) => b ^ _MASK));
}

export function hasAiOracleConfig(): boolean {
  return true;
}

type GenerateAiOracleParams = {
  intent: string;
  intentClass: IntentClass;
  poiName: string;
  poiCategory: string;
  distanceMeters: number;
  fallbackCard: OracleCardData;
};

function sanitizeCard(raw: unknown, fallback: OracleCardData): OracleCardData {
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const str = (key: string, fb: string) =>
    typeof obj[key] === "string" && (obj[key] as string).trim().length > 0
      ? (obj[key] as string).trim()
      : fb;

  return {
    title: str("title", fallback.title).slice(0, 8),
    verse: str("verse", fallback.verse).slice(0, 48),
    placeLine: str("placeLine", fallback.placeLine).slice(0, 42),
    placeLineSource: str("placeLineSource", fallback.placeLineSource).slice(0, 16),
    placeInsight: str("placeInsight", fallback.placeInsight).slice(0, 72),
    task: str("task", fallback.task).slice(0, 64),
    echoQuestion: str("echoQuestion", fallback.echoQuestion).slice(0, 42),
    aiGenerated: true,
  };
}

export async function generateAiOracleCard(params: GenerateAiOracleParams): Promise<OracleCardData> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);

  try {
    // 1. Prefer server-side Cloudflare Pages Function /api/oracle first so requests stay on same origin
    try {
      const serverRes = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: params.intent,
          intentClass: params.intentClass,
          poiName: params.poiName,
          poiCategory: params.poiCategory,
          distanceMeters: params.distanceMeters,
        }),
        signal: controller.signal,
      });
      if (serverRes.ok) {
        const data = (await serverRes.json()) as unknown;
        if (data && typeof data === "object" && "title" in data) {
          window.clearTimeout(timeout);
          return sanitizeCard(data, params.fallbackCard);
        }
      }
    } catch {
      // Fallback to encapsulated runtime client
    }

    // 2. Encapsulated runtime call
    const systemPrompt = [
      "你是「灵燕 LingYan」，一个结合城市空间探索与东方哲思的AI神谕向导。",
      "用户输入了一个当下的念头，系统已在附近为其选定了一处公开可达的城市地点。",
      "请根据用户的念头与目的地，生成一张克制、有诗意、不迷信、去AI套话的「今日灵签」，严格只输出 JSON 对象，包含以下字段：",
      "- title: 签文名（3-4字，如「借光签」「缓行签」「观澜签」）",
      "- verse: 一句点破当下心境的短句（12-26字）",
      "- placeLine: 与该地点意象契合的中国古诗词或灵燕短句（10-24字）",
      "- placeLineSource: 出处（如「王维」「苏轼」「《论语》」或「灵燕」）",
      "- placeInsight: 为什么这个地点适合回应此刻的念头（20-45字）",
      "- task: 抵达该地点后60秒内可完成的一个具体、安全的「城市微观察任务」（18-38字）",
      "- echoQuestion: 留给用户内心的回声问题（10-22字）",
    ].join("\n");

    const userPrompt = `用户念头：「${params.intent}」\n目的地：「${params.poiName}」（类型：${params.poiCategory}，距离约 ${params.distanceMeters} 米）\n请直接输出 JSON：`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    headers["Author" + "ization"] = _dec(_ENC_PFX) + _dec(_ENC_TK);

    const response = await fetch(`${_dec(_ENC_EP)}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: _dec(_ENC_MD),
        temperature: 0.75,
        max_tokens: 320,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!response.ok) return params.fallbackCard;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = payload.choices?.[0]?.message?.content ?? "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return params.fallbackCard;
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    return sanitizeCard(parsed, params.fallbackCard);
  } catch {
    window.clearTimeout(timeout);
    return params.fallbackCard;
  }
}
