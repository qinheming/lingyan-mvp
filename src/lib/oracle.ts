import { distanceMeters, offsetPoint } from "./geo";
import { classifyIntent, poiPreferences } from "./intent";
import { buildNavigationLinks } from "./navigation";
import { buildOracleCard } from "./oracleCard";
import { buildQuantumPrompt } from "./prompts";
import { numberFromHash, sha256 } from "./random";
import type { LingYanRequest, LingYanResult, PoiCandidate } from "./types";

const SAFE_NAMES: Record<string, string[]> = {
  business_area: ["玻璃幕墙下的开放步道", "写字楼外的公共广场", "街角商务庭院"],
  bookstore: ["临街书店附近", "书店橱窗外", "阅读空间入口"],
  cafe: ["咖啡馆外的公共座位", "街角咖啡门前", "安静咖啡馆附近"],
  shopping_mall: ["商场外广场", "商业街入口", "步行街拐角"],
  bank_area: ["银行外公共步道", "金融街开放空间"],
  square: ["公共广场中央偏北", "城市广场边缘", "开阔广场入口"],
  park: ["公园入口附近", "公园步道转角", "树影覆盖的步道旁"],
  gallery: ["展廊入口附近", "艺术空间外侧"],
  museum: ["博物馆外公共区域", "展馆前广场"],
  university_area: ["大学周边公共街角", "校园外书店附近"],
  riverside_walkway: ["水边安全步道", "河岸开放步道", "桥下安全步行区"],
  flower_shop: ["花店门口附近", "有植物的街角"],
  old_street: ["老街路口", "旧街巷入口"],
  bridge_view: ["桥边观景步道", "桥下开放步道"],
  park_gate: ["公园入口", "绿地入口"],
  viewpoint: ["开阔观景点", "高处平台边缘"],
  sports_ground: ["运动场外公共步道", "球场外开放区域"],
  green_space: ["街边绿地", "树阵步道", "小型公共绿地"],
  temple_area: ["寺庙周边公共步道", "安静街巷入口"],
  garden: ["花园入口", "绿植围合的小径"],
};

const WARNINGS = ["请遵守交通规则", "请勿进入私人、危险或禁止区域", "如现场不适合停留，请重新呼唤灵燕"];

function makeCandidate(originLat: number, originLng: number, category: string, idx: number, hash: string, radiusM: number): PoiCandidate {
  const base = numberFromHash(hash, (idx * 4) % 48, 6);
  const bearing = (base + idx * 47) % 360;
  const minDistance = Math.min(220, Math.max(90, radiusM * 0.14));
  const distance = minDistance + (base % Math.max(180, Math.round(radiusM - minDistance)));
  const names = SAFE_NAMES[category] ?? ["公开可达地点"];
  return {
    id: `${category}_${idx}`,
    name: names[base % names.length],
    category,
    location: offsetPoint({ lat: originLat, lng: originLng }, distance, bearing),
    publicAccessible: true,
    safety: "safe_public",
  };
}

function safetyFilter(candidates: PoiCandidate[], origin: { lat: number; lng: number }, radiusM: number): PoiCandidate[] {
  return candidates.filter((candidate) => {
    if (!candidate.publicAccessible || candidate.safety === "blocked") return false;
    const distance = distanceMeters(origin, candidate.location);
    return distance <= radiusM && distance >= 60;
  });
}

export async function generateOracle(request: LingYanRequest): Promise<LingYanResult> {
  const intent = request.intent.trim();
  const intentClass = classifyIntent(intent);
  const radiusM = request.radiusKm * 1000;
  const day = new Date().toISOString().slice(0, 10);
  const seedRaw = `${intent}:${request.location.lat.toFixed(3)}:${request.location.lng.toFixed(3)}:${day}:${request.radiusKm}`;
  const hash = await sha256(seedRaw);
  const preferred = poiPreferences[intentClass];
  const candidates = preferred.flatMap((category, idx) =>
    Array.from({ length: 3 }, (_, offset) =>
      makeCandidate(request.location.lat, request.location.lng, category, idx * 3 + offset, hash, radiusM),
    ),
  );
  const safeCandidates = safetyFilter(candidates, request.location, radiusM);
  if (!safeCandidates.length) {
    throw new Error("这片区域暂时没有适合停留的灵燕栖息地，请扩大半径。");
  }
  const pickIndex = numberFromHash(hash, 0, 8) % safeCandidates.length;
  const selected = safeCandidates[pickIndex];
  const promptSeed = numberFromHash(hash, 8, 8);
  const windowSeconds = 5400 + (numberFromHash(hash, 16, 4) % 5400);
  const expires = new Date(Date.now() + windowSeconds * 1000);
  const coordinate = selected.location;
  return {
    id: `ly_${hash.slice(0, 8)}`,
    intent,
    intentClass,
    coordinate,
    poi: {
      name: selected.name,
      category: selected.category,
      distanceMeters: distanceMeters(request.location, coordinate),
      publicAccessible: true,
    },
    resonanceWindow: {
      expiresAt: expires.toISOString(),
      seconds: windowSeconds,
    },
    prompt: buildQuantumPrompt(intentClass, promptSeed),
    oracleCard: buildOracleCard(intentClass, hash),
    navigation: buildNavigationLinks(coordinate),
    safety: {
      level: "safe_public",
      warnings: WARNINGS,
    },
    seed: `ly_${hash.slice(0, 12)}`,
  };
}
