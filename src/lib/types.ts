export type RadiusKm = 1 | 3 | 5;
export type RouteMode = "walking" | "driving" | "transit";

export type RouteSummary = {
  mode: RouteMode;
  distanceMeters: number;
  durationMinutes: number;
  title: string;
  steps: string[];
  source: "amap" | "straight_line";
};

export type RoutePlanState = "idle" | "loading" | "available" | "unavailable" | "error";

export type RoutePlanStatus = {
  mode: RouteMode;
  state: RoutePlanState;
  message: string;
};

export type AppState = "input" | "locating" | "collapsing" | "result" | "error";

export type IntentClass =
  | "wealth"
  | "inspiration"
  | "reunion"
  | "breakthrough"
  | "calm"
  | "unknown";

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type LingYanRequest = {
  intent: string;
  radiusKm: RadiusKm;
  location: GeoPoint;
};

export type PoiSource = "amap" | "osm" | "deterministic";

export type PoiCandidate = {
  id: string;
  name: string;
  address?: string;
  category: string;
  location: GeoPoint;
  publicAccessible: boolean;
  safety: "safe_public" | "unknown" | "blocked";
  source?: PoiSource;
};

export type OracleCardData = {
  title: string;
  verse: string;
  placeLine: string;
  placeLineSource: string;
  placeInsight: string;
  task: string;
  echoQuestion: string;
  aiGenerated?: boolean;
};

export type LingYanResult = {
  id: string;
  createdAt?: string;
  intent: string;
  intentClass: IntentClass;
  coordinate: GeoPoint;
  poi: {
    name: string;
    address?: string;
    category: string;
    distanceMeters: number;
    publicAccessible: boolean;
    source?: PoiSource;
  };
  resonanceWindow: {
    expiresAt: string;
    seconds: number;
  };
  prompt: string;
  oracleCard: OracleCardData;
  navigation: {
    google: string;
    amap: string;
    baidu: string;
  };
  safety: {
    level: "safe_public" | "unknown";
    warnings: string[];
  };
  seed: string;
};

export type OracleHistoryEntry = {
  id: string;
  createdAt: string;
  intent: string;
  intentClass: IntentClass;
  poiName: string;
  poiAddress?: string;
  coordinate: GeoPoint;
  cardTitle: string;
  verse: string;
  task: string;
  echoQuestion: string;
  echoAnswer?: string;
  arrivedAt?: string;
};
