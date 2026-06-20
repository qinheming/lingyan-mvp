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

export type PoiCandidate = {
  id: string;
  name: string;
  category: string;
  location: GeoPoint;
  publicAccessible: boolean;
  safety: "safe_public" | "unknown" | "blocked";
};

export type LingYanResult = {
  id: string;
  intent: string;
  intentClass: IntentClass;
  coordinate: GeoPoint;
  poi: {
    name: string;
    category: string;
    distanceMeters: number;
    publicAccessible: boolean;
  };
  resonanceWindow: {
    expiresAt: string;
    seconds: number;
  };
  prompt: string;
  oracleCard: {
    title: string;
    verse: string;
    task: string;
    echoQuestion: string;
  };
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
