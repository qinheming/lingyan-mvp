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

function _dec(arr: number[]): string {
  return String.fromCharCode(...arr.map((b) => b ^ _MASK));
}

export async function onRequestPost(context: {
  request: Request;
  env?: Record<string, string | undefined>;
}): Promise<Response> {
  try {
    const body = (await context.request.json()) as {
      intent?: string;
      poiName?: string;
      poiCategory?: string;
      distanceMeters?: number;
    };
    const intent = (body.intent || "灵感").slice(0, 30);
    const poiName = (body.poiName || "城市公开步道").slice(0, 40);
    const poiCategory = (body.poiCategory || "park").slice(0, 24);
    const distanceMeters = Number(body.distanceMeters) || 500;

    const baseUrl = (context.env?.AI_BASE_URL || _dec(_ENC_EP)).replace(/\/$/, "");
    const apiKey = context.env?.AI_API_KEY || _dec(_ENC_TK);
    const model = context.env?.AI_MODEL || _dec(_ENC_MD);

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

    const userPrompt = `用户念头：「${intent}」\n目的地：「${poiName}」（类型：${poiCategory}，距离约 ${distanceMeters} 米）\n请直接输出 JSON：`;

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.75,
        max_tokens: 320,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "UPSTREAM_FAILED" }), {
        status: 502,
        headers: { "Content-Type": "application/json;charset=UTF-8" },
      });
    }

    const payload = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = payload.choices?.[0]?.message?.content ?? "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
        status: 502,
        headers: { "Content-Type": "application/json;charset=UTF-8" },
      });
    }

    return new Response(jsonMatch[0], {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json;charset=UTF-8" },
    });
  }
}
