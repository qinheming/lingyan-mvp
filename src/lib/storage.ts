import type { GeoPoint, LingYanResult, OracleHistoryEntry } from "./types";

const ACTIVE_ORACLE_KEY = "lingyan_active_oracle_v1";
const HISTORY_KEY = "lingyan_history_v1";
const MAX_HISTORY = 24;

type StoredActiveSession = {
  result: LingYanResult;
  userLocation: GeoPoint;
};

export function saveActiveOracle(result: LingYanResult, userLocation: GeoPoint): void {
  try {
    const payload: StoredActiveSession = { result, userLocation };
    window.localStorage.setItem(ACTIVE_ORACLE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export function loadActiveOracle(): StoredActiveSession | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_ORACLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredActiveSession;
    if (!parsed?.result?.resonanceWindow?.expiresAt || !parsed?.userLocation) return null;
    const expiresAtMs = new Date(parsed.result.resonanceWindow.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      window.localStorage.removeItem(ACTIVE_ORACLE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveOracle(): void {
  try {
    window.localStorage.removeItem(ACTIVE_ORACLE_KEY);
  } catch {
    // Ignore
  }
}

export function loadOracleHistory(): OracleHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? (list as OracleHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordOracleToHistory(result: LingYanResult): OracleHistoryEntry[] {
  try {
    const current = loadOracleHistory();
    const existingIdx = current.findIndex((item) => item.id === result.id);
    const entry: OracleHistoryEntry = {
      id: result.id,
      createdAt: result.createdAt ?? new Date().toISOString(),
      intent: result.intent,
      intentClass: result.intentClass,
      poiName: result.poi.name,
      poiAddress: result.poi.address,
      coordinate: result.coordinate,
      cardTitle: result.oracleCard.title,
      verse: result.oracleCard.verse,
      task: result.oracleCard.task,
      echoQuestion: result.oracleCard.echoQuestion,
      echoAnswer: existingIdx >= 0 ? current[existingIdx].echoAnswer : undefined,
      arrivedAt: existingIdx >= 0 ? current[existingIdx].arrivedAt : undefined,
    };
    const next =
      existingIdx >= 0
        ? current.map((item, idx) => (idx === existingIdx ? entry : item))
        : [entry, ...current].slice(0, MAX_HISTORY);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function updateHistoryEcho(id: string, echoAnswer: string, markArrived = false): OracleHistoryEntry[] {
  try {
    const current = loadOracleHistory();
    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            echoAnswer: echoAnswer.trim() || item.echoAnswer,
            arrivedAt: markArrived ? item.arrivedAt ?? new Date().toISOString() : item.arrivedAt,
          }
        : item,
    );
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}
