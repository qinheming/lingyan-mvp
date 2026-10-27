import type { GeoPoint } from "./types";

const EARTH_RADIUS_M = 6371000;
const KRASOVSKY_A = 6378245.0;
const KRASOVSKY_EE = 0.00669342162296594323;

/**
 * Check whether coordinate is roughly inside mainland China / HK / Macau
 * where GCJ-02 offset applies.
 */
export function isInChinaBbox(point: GeoPoint): boolean {
  return point.lng >= 73.66 && point.lng <= 135.05 && point.lat >= 3.86 && point.lat <= 53.55;
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

/**
 * Convert raw GPS WGS-84 coordinate to GCJ-02 (Amap / Gaode standard).
 */
export function wgs84ToGcj02(point: GeoPoint): GeoPoint {
  if (!isInChinaBbox(point)) return point;
  const dLat = transformLat(point.lng - 105.0, point.lat - 35.0);
  const dLng = transformLng(point.lng - 105.0, point.lat - 35.0);
  const radLat = (point.lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - KRASOVSKY_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const mgLat = point.lat + (dLat * 180.0) / (((KRASOVSKY_A * (1 - KRASOVSKY_EE)) / (magic * sqrtMagic)) * Math.PI);
  const mgLng = point.lng + (dLng * 180.0) / ((KRASOVSKY_A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return {
    lat: Number(mgLat.toFixed(6)),
    lng: Number(mgLng.toFixed(6)),
  };
}

/**
 * Convert GCJ-02 coordinate back to WGS-84 (for OSM / CartoDB / Google Maps).
 */
export function gcj02ToWgs84(point: GeoPoint): GeoPoint {
  if (!isInChinaBbox(point)) return point;
  const gcj = wgs84ToGcj02(point);
  return {
    lat: Number((point.lat * 2 - gcj.lat).toFixed(6)),
    lng: Number((point.lng * 2 - gcj.lng).toFixed(6)),
  };
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

export function bearingDegrees(a: GeoPoint, b: GeoPoint): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const toDeg = (v: number) => (v * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.round((toDeg(Math.atan2(y, x)) + 360) % 360);
}

export function directionLabel(bearing: number): string {
  const labels = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return labels[Math.round(bearing / 45) % labels.length];
}

export function offsetPoint(origin: GeoPoint, distanceM: number, bearingDeg: number): GeoPoint {
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const angular = distanceM / EARTH_RADIUS_M;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return {
    lat: Number(((lat2 * 180) / Math.PI).toFixed(6)),
    lng: Number(((lng2 * 180) / Math.PI).toFixed(6)),
  };
}

/**
 * Returns browser location automatically calibrated to GCJ-02 for China.
 */
export function getBrowserLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("当前浏览器不支持定位。"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rawWgs84: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        resolve(wgs84ToGcj02(rawWgs84));
      },
      () => reject(new Error("无法读取当前位置。请允许定位，或使用演示位置继续。")),
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 60000,
      },
    );
  });
}
