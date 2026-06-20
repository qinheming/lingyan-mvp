import type { GeoPoint } from "./types";

type AmapLngLat = [number, number];

type AmapMap = {
  destroy: () => void;
  setFitView: () => void;
  add: (overlays: unknown[]) => void;
};

type AmapMarker = new (options: { position: AmapLngLat; content?: string; offset?: unknown }) => unknown;
type AmapPixel = new (x: number, y: number) => unknown;
type AmapPolyline = new (options: {
  path: AmapLngLat[];
  strokeColor: string;
  strokeWeight: number;
  strokeOpacity: number;
  strokeStyle?: string;
}) => unknown;
type AmapWalking = new (options: { map: AmapMap; panel?: string; extensions?: string; hideMarkers?: boolean }) => {
  search: (start: AmapLngLat, end: AmapLngLat, callback: (status: string, result: unknown) => void) => void;
};
type AmapDriving = AmapWalking;
type AmapTransfer = new (options: { map: AmapMap; panel?: string; city?: string; cityd?: string; extensions?: string }) => {
  search: (start: AmapLngLat, end: AmapLngLat, callback: (status: string, result: unknown) => void) => void;
};

type AmapNamespace = {
  Map: new (container: HTMLDivElement, options: { center: AmapLngLat; zoom: number; viewMode?: string }) => AmapMap;
  Marker: AmapMarker;
  Pixel: AmapPixel;
  Polyline: AmapPolyline;
  Walking: AmapWalking;
  Driving: AmapDriving;
  Transfer: AmapTransfer;
  plugin: (plugins: string[], callback: () => void) => void;
};

type AmapWindow = Window & {
  AMap?: AmapNamespace;
  _AMapSecurityConfig?: {
    securityJsCode?: string;
  };
};

let amapPromise: Promise<AmapNamespace> | null = null;

export function hasAmapConfig(): boolean {
  return Boolean(import.meta.env.VITE_AMAP_JS_KEY);
}

export function getAmapConfig() {
  return {
    key: import.meta.env.VITE_AMAP_JS_KEY as string | undefined,
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JSCODE as string | undefined,
  };
}

export function toAmapLngLat(point: GeoPoint): AmapLngLat {
  return [point.lng, point.lat];
}

export function loadAmap(): Promise<AmapNamespace> {
  if (amapPromise) return amapPromise;
  const { key, securityJsCode } = getAmapConfig();
  if (!key) return Promise.reject(new Error("AMAP_KEY_MISSING"));

  amapPromise = new Promise((resolve, reject) => {
    const amapWindow = window as AmapWindow;
    if (amapWindow.AMap) {
      resolve(amapWindow.AMap);
      return;
    }
    if (securityJsCode) {
      amapWindow._AMapSecurityConfig = { securityJsCode };
    }

    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Walking,AMap.Driving,AMap.Transfer`;
    script.async = true;
    script.onload = () => {
      if (amapWindow.AMap) resolve(amapWindow.AMap);
      else reject(new Error("AMAP_LOAD_FAILED"));
    };
    script.onerror = () => reject(new Error("AMAP_LOAD_FAILED"));
    document.head.appendChild(script);
  });

  return amapPromise;
}
