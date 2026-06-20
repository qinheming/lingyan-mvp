import type { GeoPoint } from "./types";

const EARTH_RADIUS_M = 6371000;

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

export function getBrowserLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("当前浏览器不支持定位。"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => reject(new Error("无法读取当前位置。请允许定位，或稍后再试。")),
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 60000,
      },
    );
  });
}
