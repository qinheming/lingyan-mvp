import { hasAmapConfig, loadAmap, toAmapLngLat } from "./amap";
import { distanceMeters, gcj02ToWgs84, wgs84ToGcj02 } from "./geo";
import type { GeoPoint, IntentClass, PoiCandidate } from "./types";

const AMAP_KEYWORDS: Record<IntentClass, string> = {
  wealth: "商业广场|书店|咖啡厅|创意园|美术馆",
  inspiration: "书店|艺术馆|博物馆|公园|图书馆|咖啡厅",
  reunion: "咖啡厅|花店|公园|步行街|甜品店",
  breakthrough: "公园|广场|观景台|体育场|大桥",
  calm: "公园|植物园|绿地|寺庙|图书馆|茶馆",
  unknown: "公园|广场|书店|咖啡厅|美术馆",
};

const CATEGORY_MAP: Record<string, string> = {
  书店: "bookstore",
  图书馆: "bookstore",
  咖啡: "cafe",
  茶: "cafe",
  公园: "park",
  绿地: "green_space",
  花园: "garden",
  植物: "garden",
  广场: "square",
  步行街: "shopping_mall",
  商场: "shopping_mall",
  美术馆: "gallery",
  艺术: "gallery",
  博物馆: "museum",
  展馆: "museum",
  花店: "flower_shop",
  寺: "temple_area",
  庙: "temple_area",
  体育: "sports_ground",
  运动: "sports_ground",
  桥: "bridge_view",
  滨江: "riverside_walkway",
  河: "riverside_walkway",
};

function inferCategory(name: string, typeStr = ""): string {
  const combined = `${name} ${typeStr}`;
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (combined.includes(kw)) return cat;
  }
  return "park";
}

type AmapPoiItem = {
  id?: string;
  name?: string;
  address?: string | string[];
  type?: string;
  location?: { lat?: number; lng?: number; getLat?: () => number; getLng?: () => number };
};

export async function searchAmapNearbyPois(
  origin: GeoPoint,
  radiusMeters: number,
  intentClass: IntentClass,
): Promise<PoiCandidate[]> {
  if (!hasAmapConfig()) return [];
  try {
    const AMap = await loadAmap();
    return await new Promise<PoiCandidate[]>((resolve) => {
      const timeout = window.setTimeout(() => resolve([]), 2600);
      AMap.plugin(["AMap.PlaceSearch"], () => {
        const searcher = new AMap.PlaceSearch({
          pageSize: 18,
          pageIndex: 1,
          extensions: "base",
        });
        searcher.searchNearBy(
          AMAP_KEYWORDS[intentClass] ?? AMAP_KEYWORDS.unknown,
          toAmapLngLat(origin),
          Math.min(radiusMeters, 5000),
          (status, result) => {
            window.clearTimeout(timeout);
            if (status !== "complete" || !result || typeof result !== "object") {
              resolve([]);
              return;
            }
            const poiList = (result as { poiList?: { pois?: AmapPoiItem[] } }).poiList?.pois ?? [];
            const candidates: PoiCandidate[] = [];
            for (const item of poiList) {
              if (!item.name || !item.location) continue;
              const lat =
                typeof item.location.getLat === "function"
                  ? item.location.getLat()
                  : Number(item.location.lat);
              const lng =
                typeof item.location.getLng === "function"
                  ? item.location.getLng()
                  : Number(item.location.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
              const loc = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
              const dist = distanceMeters(origin, loc);
              if (dist < 60 || dist > radiusMeters) continue;
              const addr = Array.isArray(item.address) ? item.address[0] : item.address;
              candidates.push({
                id: item.id || `amap_${candidates.length}`,
                name: item.name,
                address: typeof addr === "string" ? addr : undefined,
                category: inferCategory(item.name, item.type),
                location: loc,
                publicAccessible: true,
                safety: "safe_public",
                source: "amap",
              });
            }
            resolve(candidates);
          },
        );
      });
    });
  } catch {
    return [];
  }
}

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function searchOsmNearbyPois(
  originGcj02: GeoPoint,
  radiusMeters: number,
  intentClass: IntentClass,
): Promise<PoiCandidate[]> {
  const wgsOrigin = gcj02ToWgs84(originGcj02);
  const r = Math.min(Math.max(radiusMeters, 600), 4000);
  const queryByIntent: Record<IntentClass, string> = {
    wealth: `node["shop"="books"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["amenity"="cafe"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});way["leisure"="park"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});`,
    inspiration: `node["shop"="books"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["tourism"~"museum|gallery"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["amenity"~"library|cafe"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});way["leisure"="park"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});`,
    reunion: `node["amenity"="cafe"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["shop"="florist"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});way["leisure"="park"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});`,
    breakthrough: `way["leisure"="park"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["tourism"="viewpoint"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["amenity"="cafe"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});`,
    calm: `way["leisure"~"park|garden"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["amenity"~"library|place_of_worship"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});`,
    unknown: `way["leisure"="park"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["amenity"~"cafe|library"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});node["shop"="books"](around:${r},${wgsOrigin.lat},${wgsOrigin.lng});`,
  };

  const overpassQuery = `[out:json][timeout:3];(${queryByIntent[intentClass] ?? queryByIntent.unknown});out center 20;`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2400);

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!response.ok) return [];
    const data = (await response.json()) as { elements?: OverpassElement[] };
    const elements = data.elements ?? [];
    const candidates: PoiCandidate[] = [];

    for (const el of elements) {
      const rawLat = el.lat ?? el.center?.lat;
      const rawLon = el.lon ?? el.center?.lon;
      if (!rawLat || !rawLon) continue;
      const tags = el.tags ?? {};
      const name = tags["name:zh"] || tags.name;
      if (!name) continue;
      const gcjLoc = wgs84ToGcj02({ lat: rawLat, lng: rawLon });
      const dist = distanceMeters(originGcj02, gcjLoc);
      if (dist < 60 || dist > radiusMeters) continue;

      let category = inferCategory(name);
      if (tags.shop === "books" || tags.amenity === "library") category = "bookstore";
      else if (tags.amenity === "cafe") category = "cafe";
      else if (tags.tourism === "museum") category = "museum";
      else if (tags.tourism === "gallery") category = "gallery";
      else if (tags.leisure === "park" || tags.leisure === "garden") category = "park";

      candidates.push({
        id: `osm_${el.id}`,
        name,
        address: tags["addr:street"] ? `${tags["addr:street"]}${tags["addr:housenumber"] ?? ""}` : undefined,
        category,
        location: gcjLoc,
        publicAccessible: true,
        safety: "safe_public",
        source: "osm",
      });
    }
    return candidates;
  } catch {
    window.clearTimeout(timer);
    return [];
  }
}
