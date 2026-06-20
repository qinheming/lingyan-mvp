import type { GeoPoint, RouteMode } from "./types";

const AMAP_SOURCE_APPLICATION = "lingyan-ai";
export const AMAP_APP_INSTALL_URL = "https://apps.apple.com/cn/app/id461703208";

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

function encodeLabel(label: string): string {
  return encodeURIComponent(label.trim() || "灵燕坐标");
}

export function buildNavigationLinks(point: GeoPoint) {
  const label = encodeLabel("灵燕坐标");
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`,
    amap: buildAmapUniversalNavigationUrl(point, "walking", "灵燕坐标"),
    baidu: `https://api.map.baidu.com/marker?location=${point.lat},${point.lng}&title=${label}&content=${label}&output=html`,
  };
}

export function buildAmapUniversalNavigationUrl(point: GeoPoint, mode: RouteMode, label = "灵燕坐标"): string {
  const destinationLabel = encodeLabel(label);
  return `https://uri.amap.com/navigation?to=${point.lng},${point.lat},${destinationLabel}&mode=${amapUriModes[mode]}&policy=1&coordinate=gaode&callnative=1`;
}

export function buildAmapNativeNavigationUrl(point: GeoPoint, mode: RouteMode, label = "灵燕坐标"): string {
  const destinationLabel = encodeLabel(label);
  return `iosamap://path?sourceApplication=${AMAP_SOURCE_APPLICATION}&dlat=${point.lat}&dlon=${point.lng}&dname=${destinationLabel}&dev=0&t=${amapIosPathTypes[mode]}`;
}

type LaunchAmapNavigationOptions = {
  destination: GeoPoint;
  mode: RouteMode;
  label?: string;
  timeoutMs?: number;
  onNativeOpened?: () => void;
  onFallback: () => void;
};

export function launchAmapNavigation({
  destination,
  mode,
  label = "灵燕坐标",
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

  window.location.href = buildAmapNativeNavigationUrl(destination, mode, label);

  return cleanup;
}
