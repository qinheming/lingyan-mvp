import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAmap, toAmapLngLat } from "../lib/amap";
import { extractAmapRouteSummary } from "../lib/routeSummary";
import { LingYanLogo } from "./LingYanLogo";
import type { GeoPoint, LingYanResult, RouteMode, RoutePlanStatus, RouteSummary } from "../lib/types";

type AmapRouteMapProps = {
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

export function AmapRouteMap({
  userLocation,
  result,
  routeMode,
  onRouteSummaryChange,
  onRoutePlanStatusChange,
}: AmapRouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<{ destroy: () => void } | null>(null);
  const [status, setStatus] = useState("正在加载高德地图...");
  const updateStatus = (nextStatus: RoutePlanStatus) => {
    setStatus(nextStatus.message);
    onRoutePlanStatusChange(nextStatus);
  };

  useEffect(() => {
    let cancelled = false;
    async function renderAmap() {
      if (!mapRef.current) return;
      onRouteSummaryChange(null);
      updateStatus({
        mode: routeMode,
        state: "loading",
        message: `正在加载高德${routeModeLabels[routeMode]}路线...`,
      });
      try {
        const AMap = await loadAmap();
        if (cancelled || !mapRef.current) return;
        mapInstanceRef.current?.destroy();

        const start = toAmapLngLat(userLocation);
        const end = toAmapLngLat(result.coordinate);
        const map = new AMap.Map(mapRef.current, {
          center: end,
          zoom: 15,
          viewMode: "2D",
        });
        updateStatus({
          mode: routeMode,
          state: "loading",
          message: `高德地图已加载，正在规划${routeModeLabels[routeMode]}路线...`,
        });

        const startMarker = new AMap.Marker({
          position: start,
          content: '<div class="amap-user-dot"></div>',
          offset: new AMap.Pixel(-9, -9),
        });
        const targetMarker = new AMap.Marker({
          position: end,
          content: renderToStaticMarkup(
            <div className="amap-lingyan-marker">
              <LingYanLogo title="灵燕坐标" />
            </div>,
          ),
          offset: new AMap.Pixel(-29, -29),
        });
        const fallbackLine = new AMap.Polyline({
          path: [start, end],
          strokeColor: "#b45309",
          strokeWeight: 4,
          strokeOpacity: 0.7,
          strokeStyle: "dashed",
        });
        map.add([startMarker, targetMarker, fallbackLine]);

        let routeResolved = false;
        const routeTimer = window.setTimeout(() => {
          if (!routeResolved && !cancelled) {
            onRouteSummaryChange(null);
            updateStatus({
              mode: routeMode,
              state: "unavailable",
              message: `高德${routeModeLabels[routeMode]}路线暂未返回，已显示直线方向`,
            });
            map.setFitView();
          }
        }, 4200);

        const pluginName =
          routeMode === "driving" ? "AMap.Driving" : routeMode === "transit" ? "AMap.Transfer" : "AMap.Walking";

        AMap.plugin([pluginName], () => {
          if (cancelled) return;
          const routePlanner =
            routeMode === "driving"
              ? new AMap.Driving({ map, extensions: "all" })
              : routeMode === "transit"
                ? new AMap.Transfer({ map, city: "北京市", cityd: "北京市", extensions: "all" })
                : new AMap.Walking({ map, extensions: "all" });
          routePlanner.search(start, end, (routeStatus, routeResult) => {
            routeResolved = true;
            window.clearTimeout(routeTimer);
            if (routeStatus === "complete") {
              const summary = extractAmapRouteSummary(routeResult, routeMode);
              onRouteSummaryChange(summary);
              updateStatus({
                mode: routeMode,
                state: summary ? "available" : "unavailable",
                message: summary
                  ? `高德${routeModeLabels[routeMode]}路线已生成`
                  : `高德${routeModeLabels[routeMode]}路线已返回，摘要暂不可用`,
              });
            } else {
              onRouteSummaryChange(null);
              updateStatus({
                mode: routeMode,
                state: "unavailable",
                message: `高德${routeModeLabels[routeMode]}路线暂不可用，已显示直线方向`,
              });
            }
            map.setFitView();
          });
        });

        mapInstanceRef.current = map;
      } catch {
        updateStatus({
          mode: routeMode,
          state: "error",
          message: "高德地图未配置或加载失败",
        });
      }
    }

    void renderAmap();
    return () => {
      cancelled = true;
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
  }, [onRoutePlanStatusChange, onRouteSummaryChange, result.id, result.coordinate, routeMode, userLocation]);

  return (
    <div className="amap-route-shell">
      <div className="oracle-map amap-route-map" ref={mapRef} aria-label="高德灵燕路线地图" />
      <div className="amap-route-status">{status}</div>
    </div>
  );
}
