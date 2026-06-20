import { bearingDegrees, directionLabel, distanceMeters } from "./geo";
import type { GeoPoint } from "./types";

const WALKING_SPEED_M_PER_MINUTE = 72;
const ARRIVAL_THRESHOLD_M = 45;

export type NavigationGuide = {
  distanceMeters: number;
  bearingDegrees: number;
  direction: string;
  etaMinutes: number;
  arrived: boolean;
};

export function buildNavigationGuide(current: GeoPoint, destination: GeoPoint): NavigationGuide {
  const distance = distanceMeters(current, destination);
  const bearing = bearingDegrees(current, destination);
  return {
    distanceMeters: distance,
    bearingDegrees: bearing,
    direction: directionLabel(bearing),
    etaMinutes: Math.max(1, Math.ceil(distance / WALKING_SPEED_M_PER_MINUTE)),
    arrived: distance <= ARRIVAL_THRESHOLD_M,
  };
}

export function formatDistance(distance: number): string {
  if (distance >= 1000) return `${(distance / 1000).toFixed(1)} km`;
  return `${distance} m`;
}
