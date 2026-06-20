import type { RouteMode, RouteSummary } from "./types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function minutesFromSeconds(seconds: number | null): number {
  if (!seconds || seconds <= 0) return 1;
  return Math.max(1, Math.round(seconds / 60));
}

function extractPathSummary(path: UnknownRecord, mode: RouteMode): RouteSummary | null {
  const distance = readNumber(path.distance);
  const duration = readNumber(path.time) ?? readNumber(path.duration);
  const steps = asArray(path.steps)
    .map((step) => asRecord(step))
    .filter((step): step is UnknownRecord => Boolean(step))
    .map((step) => readString(step.instruction))
    .filter(Boolean)
    .slice(0, 4);
  if (!distance) return null;
  return {
    mode,
    distanceMeters: Math.round(distance),
    durationMinutes: minutesFromSeconds(duration),
    title: steps.length ? steps[0] : "高德推荐路线",
    steps,
    source: "amap",
  };
}

export function extractAmapRouteSummary(result: unknown, mode: RouteMode): RouteSummary | null {
  const root = asRecord(result);
  if (!root) return null;
  const route = asRecord(root.route) ?? root;

  if (mode === "transit") {
    const transit = asRecord(asArray(route.plans)[0]) ?? asRecord(asArray(route.transits)[0]);
    if (!transit) return null;
    const distance = readNumber(transit.distance);
    const duration = readNumber(transit.time) ?? readNumber(transit.duration);
    const segments = asArray(transit.segments)
      .map((segment) => asRecord(segment))
      .filter((segment): segment is UnknownRecord => Boolean(segment));
    const steps = segments
      .map((segment) => {
        const walking = asRecord(segment.walking);
        const bus = asRecord(segment.bus);
        const buslines = asArray(bus?.buslines);
        const busline = asRecord(buslines[0]);
        const walkInstruction = readString(asRecord(asArray(walking?.steps)[0])?.instruction);
        const busName = readString(busline?.name);
        return busName || walkInstruction;
      })
      .filter(Boolean)
      .slice(0, 4);
    if (!distance) return null;
    return {
      mode,
      distanceMeters: Math.round(distance),
      durationMinutes: minutesFromSeconds(duration),
      title: steps.length ? steps[0] : "高德公交推荐路线",
      steps,
      source: "amap",
    };
  }

  const path = asRecord(asArray(route.routes)[0]) ?? asRecord(asArray(route.paths)[0]);
  return path ? extractPathSummary(path, mode) : null;
}

export function formatRouteDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(2)} km`;
  return `${distanceMeters} m`;
}
