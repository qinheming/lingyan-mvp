import { useEffect, useMemo, useState } from "react";
import { intentLabels } from "../lib/intent";
import { hasAmapConfig } from "../lib/amap";
import { buildNavigationGuide, formatDistance } from "../lib/navigationGuide";
import { AMAP_APP_INSTALL_URL, launchAmapNavigation } from "../lib/navigation";
import { formatRouteDistance } from "../lib/routeSummary";
import type { GeoPoint, LingYanResult, RouteMode, RoutePlanStatus, RouteSummary } from "../lib/types";

type NavigationStatus = "idle" | "launching_amap" | "amap_required";

type ResultCardProps = {
  result: LingYanResult;
  userLocation: GeoPoint;
  routeMode: RouteMode;
  routeSummary: RouteSummary | null;
  routePlanStatus: RoutePlanStatus | null;
  onRouteModeChange: (mode: RouteMode) => void;
  onLocationUpdate: (location: GeoPoint) => void;
  onReset: () => void;
};

const routeModeLabels: Record<RouteMode, string> = {
  walking: "步行",
  driving: "驾车",
  transit: "公交",
};

const routeModeOptions: RouteMode[] = ["walking", "driving", "transit"];

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function ResultCard({
  result,
  userLocation,
  routeMode,
  routeSummary,
  routePlanStatus,
  onRouteModeChange,
  onReset,
}: ResultCardProps) {
  const initialSeconds = useMemo(() => {
    return Math.max(0, Math.floor((new Date(result.resonanceWindow.expiresAt).getTime() - Date.now()) / 1000));
  }, [result.resonanceWindow.expiresAt]);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [copied, setCopied] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState<NavigationStatus>("idle");
  const [navigationError, setNavigationError] = useState("");
  const [activeNavigationMode, setActiveNavigationMode] = useState<RouteMode | null>(null);
  const guide = useMemo(() => buildNavigationGuide(userLocation, result.coordinate), [userLocation, result.coordinate]);
  const isNavigationAttemptActive = navigationStatus !== "idle";
  const isLaunchingAmap = navigationStatus === "launching_amap";
  const shouldShowAmapInstall = navigationStatus === "amap_required";
  const displayedNavigationMode = activeNavigationMode ?? routeMode;
  const currentRoutePlanStatus = routePlanStatus?.mode === routeMode ? routePlanStatus : null;
  const currentRouteSummary = routeSummary?.mode === routeMode ? routeSummary : null;
  const hasRouteForMode = Boolean(currentRouteSummary);
  const routeUnavailable = currentRoutePlanStatus?.state === "unavailable" || currentRoutePlanStatus?.state === "error";
  const amapEnabled = hasAmapConfig();

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [initialSeconds]);

  useEffect(() => {
    setNavigationStatus("idle");
    setNavigationError("");
    setActiveNavigationMode(null);
  }, [result.id]);

  async function copyCoordinate() {
    const text = `${result.coordinate.lat},${result.coordinate.lng}`;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function startLingYanNavigation() {
    setActiveNavigationMode(routeMode);
    setNavigationStatus("launching_amap");
    setNavigationError("正在打开高德地图 App，完整导航、后台定位和语音播报将由高德提供。");

    launchAmapNavigation({
      origin: userLocation,
      destination: result.coordinate,
      mode: routeMode,
      label: result.poi.name,
      onNativeOpened: () => {
        setNavigationStatus("idle");
        setNavigationError("");
        setActiveNavigationMode(null);
      },
      onFallback: () => {
        setNavigationStatus("amap_required");
        setNavigationError("未检测到高德地图 App。请先安装高德地图，再回到灵燕重新开始导航。");
      },
    });
  }

  function resetNavigationAttempt() {
    setNavigationStatus("idle");
    setNavigationError("");
    setActiveNavigationMode(null);
  }

  function changeRouteMode(mode: RouteMode) {
    onRouteModeChange(mode);
    resetNavigationAttempt();
  }

  const navLabel =
    guide.arrived
      ? "已到达灵燕坐标附近"
      : navigationStatus === "launching_amap"
        ? `正在打开高德${routeModeLabels[displayedNavigationMode]}导航`
        : navigationStatus === "amap_required"
          ? "需要安装高德地图"
          : `待打开高德${routeModeLabels[routeMode]}导航`;

  const navHeading = guide.arrived
    ? "完成观测"
    : navigationStatus === "launching_amap"
      ? "交给高德"
      : navigationStatus === "amap_required"
        ? "安装后重试"
        : `向${guide.direction}前进`;
  const distanceLine =
    currentRouteSummary
      ? `高德路线 ${formatRouteDistance(currentRouteSummary.distanceMeters)} · 约 ${currentRouteSummary.durationMinutes} 分钟`
      : routeMode === "walking"
        ? `剩余 ${formatDistance(guide.distanceMeters)} · 步行估算 ${guide.etaMinutes} 分钟`
      : `直线距离 ${formatDistance(guide.distanceMeters)} · 等待高德${routeModeLabels[routeMode]}路线`;
  const primaryActionText =
    navigationStatus === "launching_amap"
      ? "正在打开高德..."
      : `打开高德${routeModeLabels[routeMode]}导航`;
  const routeStatusText = !amapEnabled
    ? "完整导航由高德 App 提供；配置高德 Key 后可在灵燕内显示路线预览"
    : hasRouteForMode
      ? `高德${routeModeLabels[routeMode]}路线已生成，点击按钮进入高德 App 原生导航`
      : routeUnavailable
        ? `高德${routeModeLabels[routeMode]}路线不可用。已显示直线方向，建议切换步行或重新呼唤`
        : currentRoutePlanStatus?.state === "loading"
          ? `正在规划高德${routeModeLabels[routeMode]}路线...`
          : `正在等待高德${routeModeLabels[routeMode]}路线摘要，暂以直线方向辅助`;

  return (
    <aside className="result-card">
      <div className="result-summary">
        <div className="result-topline">
          <span>{intentLabels[result.intentClass]}</span>
          <strong>{formatCountdown(secondsLeft)}</strong>
        </div>
        <h2>{result.poi.name}</h2>
        <p className="result-meta">
          生成距离 {result.poi.distanceMeters}m · {result.poi.publicAccessible ? "公开可达" : "可达性未知"} · {result.seed}
        </p>
        <div className="coordinate-grid">
          <div>
            <span>纬度</span>
            <b>{result.coordinate.lat.toFixed(6)}</b>
          </div>
          <div>
            <span>经度</span>
            <b>{result.coordinate.lng.toFixed(6)}</b>
          </div>
        </div>
      </div>

      <div className="prompt-box">
        <span>微扰指令</span>
        <p>{result.prompt}</p>
      </div>

      <div className={`navigation-panel ${isNavigationAttemptActive ? "active" : ""} status-${navigationStatus}`}>
        <div className="navigation-compass" style={{ transform: `rotate(${guide.bearingDegrees}deg)` }}>
          ↑
        </div>
        <div>
          <span>{navLabel}</span>
          <strong>{navHeading}</strong>
          <p>{distanceLine}</p>
          {currentRouteSummary && (
            <div className="route-summary">
              <b>{currentRouteSummary.title}</b>
              {currentRouteSummary.steps.length > 0 && <span>{currentRouteSummary.steps.join(" · ")}</span>}
            </div>
          )}
          <small>{routeStatusText}</small>
          {navigationError && <em>{navigationError}</em>}
        </div>
      </div>

      <div className="action-grid">
        <div className="route-mode-tabs" aria-label="路线模式">
          {routeModeOptions.map((mode) => (
            <button
              key={mode}
              type="button"
              className={routeMode === mode ? "selected" : ""}
              onClick={() => changeRouteMode(mode)}
            >
              {routeModeLabels[mode]}
            </button>
          ))}
        </div>
        <button
          className="primary-action"
          type="button"
          disabled={isLaunchingAmap}
          onClick={startLingYanNavigation}
        >
          {primaryActionText}
        </button>
        {shouldShowAmapInstall && (
          <a href={AMAP_APP_INSTALL_URL} target="_blank" rel="noreferrer">
            安装高德地图
          </a>
        )}
        {isNavigationAttemptActive && (
          <button type="button" onClick={resetNavigationAttempt}>
            取消
          </button>
        )}
        <button type="button" onClick={copyCoordinate}>
          {copied ? "已复制" : "复制坐标"}
        </button>
        <button type="button" onClick={onReset}>
          重新呼唤
        </button>
      </div>

      <ul className="warning-list">
        {result.safety.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </aside>
  );
}
