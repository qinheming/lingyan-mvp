import type { GeoPoint, RouteMode } from "./types";

const AMAP_SOURCE_APPLICATION = "lingyan-ai";
export const AMAP_IOS_INSTALL_URL = "https://apps.apple.com/cn/app/id461703208";
export const AMAP_ANDROID_INSTALL_URL = "https://mobile.amap.com/";

const amapUriModes: Record<RouteMode, string> = {
  walking: "walk",
  driving: "car",
  transit: "bus",
};

const amapIosPathTypes: Record<RouteMode, string> = {
  driving: "0",
  transit: "1",
  walking: "2",
};

const amapAndroidPathTypes: Record<RouteMode, string> = {
  driving: "0",
  transit: "1",
  walking: "2",
};

type AmapNavigationUrlOptions = {
  origin?: GeoPoint;
  destination: GeoPoint;
  mode: RouteMode;
  label?: string;
  originLabel?: string;
};

function normalizeLabel(label: string): string {
  return label.trim() || "灵燕坐标";
}

function encodeLabel(label: string): string {
  return encodeURIComponent(normalizeLabel(label));
}

export function buildNavigationLinks(point: GeoPoint) {
  const label = encodeLabel("灵燕坐标");
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`,
    amap: buildAmapUniversalNavigationUrl({
      destination: point,
      mode: "walking",
      label: "灵燕坐标",
    }),
    baidu: `https://api.map.baidu.com/marker?location=${point.lat},${point.lng}&title=${label}&content=${label}&output=html`,
  };
}

function formatAmapPoint(point: GeoPoint, label: string): string {
  return `${point.lng},${point.lat},${normalizeLabel(label)}`;
}

export function buildAmapUniversalNavigationUrl({
  origin,
  destination,
  mode,
  label = "灵燕坐标",
  originLabel = "我的位置",
}: AmapNavigationUrlOptions): string {
  const params = new URLSearchParams({
    to: formatAmapPoint(destination, label),
    mode: amapUriModes[mode],
    policy: "1",
    coordinate: "gaode",
    callnative: "1",
  });
  if (origin) params.set("from", formatAmapPoint(origin, originLabel));
  return `https://uri.amap.com/navigation?${params.toString()}`;
}

export function buildAmapNativeNavigationUrl(
  destination: GeoPoint,
  mode: RouteMode,
  label = "灵燕坐标",
  origin?: GeoPoint,
  originLabel = "我的位置",
): string {
  const params = new URLSearchParams({
    sourceApplication: AMAP_SOURCE_APPLICATION,
    dlat: String(destination.lat),
    dlon: String(destination.lng),
    dname: normalizeLabel(label),
    dev: "0",
    t: amapIosPathTypes[mode],
  });
  if (origin) {
    params.set("slat", String(origin.lat));
    params.set("slon", String(origin.lng));
    params.set("sname", normalizeLabel(originLabel));
  }
  return `iosamap://path?${params.toString()}`;
}

export function buildAmapAndroidNavigationUrl(
  destination: GeoPoint,
  mode: RouteMode,
  label = "灵燕坐标",
  origin?: GeoPoint,
  originLabel = "我的位置",
): string {
  const params = new URLSearchParams({
    sourceApplication: AMAP_SOURCE_APPLICATION,
    dlat: String(destination.lat),
    dlon: String(destination.lng),
    dname: normalizeLabel(label),
    dev: "0",
    t: amapAndroidPathTypes[mode],
  });
  if (origin) {
    params.set("slat", String(origin.lat));
    params.set("slon", String(origin.lng));
    params.set("sname", normalizeLabel(originLabel));
  }
  return `amapuri://route/plan?${params.toString()}`;
}

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroidDevice(): boolean {
  return /Android|HarmonyOS|HUAWEI|HONOR/i.test(navigator.userAgent);
}

export function getAmapInstallUrl(): string {
  return isAndroidDevice() ? AMAP_ANDROID_INSTALL_URL : AMAP_IOS_INSTALL_URL;
}

export function getDeviceNavigationLabel(): string {
  if (isIosDevice()) return "iPhone";
  if (isAndroidDevice()) return "安卓/华为";
  return "当前设备";
}

type LaunchAmapNavigationOptions = {
  origin?: GeoPoint;
  destination: GeoPoint;
  mode: RouteMode;
  label?: string;
  originLabel?: string;
  timeoutMs?: number;
  onNativeOpened?: () => void;
  onFallback: () => void;
};

export function launchAmapNavigation({
  origin,
  destination,
  mode,
  label = "灵燕坐标",
  originLabel = "我的位置",
  timeoutMs = 1600,
  onNativeOpened,
  onFallback,
}: LaunchAmapNavigationOptions): () => void {
  let openedNative = false;
  let finished = false;
  let fallbackTimer = 0;

  const cleanup = () => {
    window.clearTimeout(fallbackTimer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handleNativeOpened);
  };

  const finish = (opened: boolean) => {
    if (finished) return;
    finished = true;
    cleanup();
    if (opened) onNativeOpened?.();
    else onFallback();
  };

  function handleNativeOpened() {
    openedNative = true;
    finish(true);
  }

  function handleVisibilityChange() {
    if (document.hidden) handleNativeOpened();
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handleNativeOpened);

  fallbackTimer = window.setTimeout(() => {
    finish(openedNative);
  }, timeoutMs);

  window.location.href = isIosDevice()
    ? buildAmapNativeNavigationUrl(destination, mode, label, origin, originLabel)
    : isAndroidDevice()
      ? buildAmapAndroidNavigationUrl(destination, mode, label, origin, originLabel)
    : buildAmapUniversalNavigationUrl({
        origin,
        destination,
        mode,
        label,
        originLabel,
      });

  return cleanup;
}
