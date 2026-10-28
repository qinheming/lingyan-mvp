import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import { distanceMeters, gcj02ToWgs84, wgs84ToGcj02 } from "../lib/geo";
import { LingYanLogo } from "./LingYanLogo";
import type { GeoPoint, LingYanResult, RouteMode, RoutePlanStatus, RouteSummary } from "../lib/types";

type OracleMapProps = {
  userLocation: GeoPoint;
  result: LingYanResult;
  routeMode: RouteMode;
  onRouteSummaryChange: (summary: RouteSummary | null) => void;
  onRoutePlanStatusChange: (status: RoutePlanStatus) => void;
};

const routeModeLabels: Record<RouteMode, string> = {
  walking: "步行",
  driving: "驾车",
  transit: "公交",
};

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    legs?: Array<{
      steps?: Array<{
        name?: string;
        maneuver?: {
          type?: string;
          modifier?: string;
        };
      }>;
    }>;
  }>;
};

export function OracleMap({
  userLocation,
  result,
  routeMode,
  onRouteSummaryChange,
  onRoutePlanStatusChange,
}: OracleMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const [status, setStatus] = useState("正在加载高德地图与路线...");

  useEffect(() => {
    if (!mapRef.current) return;
    if (instanceRef.current) {
      instanceRef.current.remove();
      instanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    }).setView([result.coordinate.lat, result.coordinate.lng], 15);

    // Direct Amap official Chinese vector road tiles (GCJ-02 native, fast in mainland China, no JS key needed)
    L.tileLayer(
      "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
      {
        subdomains: ["1", "2", "3", "4"],
        maxZoom: 18,
      },
    ).addTo(map);

    const swallowIcon = L.divIcon({
      className: "swallow-marker",
      html: renderToStaticMarkup(
        <div className="swallow-marker__shell">
          <LingYanLogo title="灵燕坐标" />
        </div>,
      ),
      iconSize: [54, 54],
      iconAnchor: [27, 27],
    });

    const userIcon = L.divIcon({
      className: "user-marker",
      html: "<div></div>",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([result.coordinate.lat, result.coordinate.lng], { icon: swallowIcon }).addTo(map);
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
    L.circle([result.coordinate.lat, result.coordinate.lng], {
      radius: 140,
      color: "#2563eb",
      fillColor: "#60a5fa",
      fillOpacity: 0.14,
      weight: 2,
    }).addTo(map);

    routeRef.current = L.polyline(
      [
        [userLocation.lat, userLocation.lng],
        [result.coordinate.lat, result.coordinate.lng],
      ],
      {
        color: "#2563eb",
        weight: 5,
        opacity: 0.86,
      },
    ).addTo(map);

    map.fitBounds(
      L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [result.coordinate.lat, result.coordinate.lng],
      ]),
      {
        maxZoom: 16,
        padding: [68, 68],
      },
    );

    L.control
      .attribution({
        prefix: "高德地图 · GCJ-02",
      })
      .addTo(map);

    instanceRef.current = map;
    return () => {
      map.remove();
      instanceRef.current = null;
      userMarkerRef.current = null;
      routeRef.current = null;
    };
  }, [result.id]);

  // Real street-level route geometry planning (OSRM with GCJ-02 calibration)
  useEffect(() => {
    let cancelled = false;
    async function planRoute() {
      const modeLabel = routeModeLabels[routeMode];
      setStatus(`正在规划${modeLabel}路线...`);
      onRoutePlanStatusChange({
        mode: routeMode,
        state: "loading",
        message: `正在规划${modeLabel}路线...`,
      });

      const startWgs = gcj02ToWgs84(userLocation);
      const endWgs = gcj02ToWgs84(result.coordinate);
      const profile = routeMode === "driving" ? "driving" : "foot";

      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 3600);
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${startWgs.lng},${startWgs.lat};${endWgs.lng},${endWgs.lat}?overview=full&geometries=geojson&steps=true`,
          { signal: controller.signal },
        );
        window.clearTimeout(timer);
        if (cancelled) return;

        if (res.ok) {
          const data = (await res.json()) as OsrmResponse;
          const firstRoute = data.routes?.[0];
          const coords = firstRoute?.geometry?.coordinates ?? [];
          if (coords.length >= 2 && routeRef.current) {
            const gcjLatLngs: [number, number][] = coords.map(([lng, lat]) => {
              const gcj = wgs84ToGcj02({ lat, lng });
              return [gcj.lat, gcj.lng];
            });
            routeRef.current.setLatLngs(gcjLatLngs);
            instanceRef.current?.fitBounds(L.latLngBounds(gcjLatLngs), {
              maxZoom: 16,
              padding: [64, 64],
            });

            const distM = Math.round(firstRoute?.distance ?? distanceMeters(userLocation, result.coordinate));
            const speedMetersPerMin = routeMode === "driving" ? 420 : routeMode === "transit" ? 260 : 75;
            const durationMin = Math.max(1, Math.round(distM / speedMetersPerMin));

            const roadNames = Array.from(
              new Set(
                (firstRoute?.legs?.[0]?.steps ?? [])
                  .map((s) => (s.name || "").trim())
                  .filter((n) => n.length > 0 && !n.includes("unnamed")),
              ),
            ).slice(0, 4);

            const summary: RouteSummary = {
              mode: routeMode,
              distanceMeters: distM,
              durationMinutes: durationMin,
              title: roadNames.length > 0 ? `途经 ${roadNames[0]}` : `高德${modeLabel}推荐路线`,
              steps: roadNames.length > 0 ? roadNames.map((n) => `沿${n}前行`) : [`向${result.poi.name}方向前往`],
              source: "amap",
            };

            onRouteSummaryChange(summary);
            const msg = `高德${modeLabel}路线已就绪 · 全程 ${(distM / 1000).toFixed(1)} km（约 ${durationMin} 分钟）`;
            setStatus(msg);
            onRoutePlanStatusChange({
              mode: routeMode,
              state: "available",
              message: msg,
            });
            return;
          }
        }
      } catch {
        // Fallback to direct line with estimated summary
      }

      if (cancelled) return;
      const straightDist = distanceMeters(userLocation, result.coordinate);
      const estDist = Math.round(straightDist * 1.22);
      const speed = routeMode === "driving" ? 420 : routeMode === "transit" ? 260 : 75;
      const estMin = Math.max(1, Math.round(estDist / speed));

      const fallbackSummary: RouteSummary = {
        mode: routeMode,
        distanceMeters: estDist,
        durationMinutes: estMin,
        title: `高德${modeLabel}推荐方向`,
        steps: [`前往 ${result.poi.name}`],
        source: "amap",
      };
      onRouteSummaryChange(fallbackSummary);
      const msg = `高德${modeLabel}路线已就绪 · 约 ${(estDist / 1000).toFixed(1)} km（${estMin} 分钟）`;
      setStatus(msg);
      onRoutePlanStatusChange({
        mode: routeMode,
        state: "available",
        message: msg,
      });
    }

    void planRoute();
    return () => {
      cancelled = true;
    };
  }, [onRoutePlanStatusChange, onRouteSummaryChange, result.coordinate, result.poi.name, routeMode, userLocation]);

  return (
    <div className="amap-route-shell">
      <div className="oracle-map amap-route-map" ref={mapRef} aria-label="高德灵燕路线地图" />
      <div className="amap-route-status">{status}</div>
    </div>
  );
}
