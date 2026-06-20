import { useEffect, useMemo, useState } from "react";
import { intentLabels } from "../lib/intent";
import { getBrowserLocation } from "../lib/geo";
import { hasAmapConfig } from "../lib/amap";
import { buildNavigationGuide, formatDistance } from "../lib/navigationGuide";
import { launchAmapNavigation } from "../lib/navigation";
import { formatRouteDistance } from "../lib/routeSummary";
import { canSpeak, speakNavigation, stopSpeaking } from "../lib/speech";
import type { GeoPoint, LingYanResult, RouteMode, RoutePlanStatus, RouteSummary } from "../lib/types";

type NavigationStatus = "idle" | "launching_amap" | "locating" | "active" | "error";

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
  onLocationUpdate,
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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const guide = useMemo(() => buildNavigationGuide(userLocation, result.coordinate), [userLocation, result.coordinate]);
  const isNavigating =
    navigationStatus === "launching_amap" ||
    navigationStatus === "locating" ||
    navigationStatus === "active" ||
    navigationStatus === "error";
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

  useEffect(() => {
    if (navigationStatus !== "active" && navigationStatus !== "error") return;
    if (!navigator.geolocation) {
      setNavigationError("当前浏览器不支持实时定位，已使用初始位置估算。");
      setNavigationStatus("error");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onLocationUpdate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setNavigationStatus("active");
        setNavigationError("");
      },
      () => {
        setNavigationError("实时定位暂不可用，已使用最近一次位置估算。");
        setNavigationStatus("error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 8000,
        timeout: 12000,
      },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [navigationStatus, onLocationUpdate]);

  async function copyCoordinate() {
    const text = `${result.coordinate.lat},${result.coordinate.lng}`;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function startBuiltInNavigation(reason?: string) {
    setActiveNavigationMode(routeMode);
    setNavigationStatus("locating");
    setNavigationError(reason ?? `正在读取浏览器当前位置，准备进入${routeModeLabels[routeMode]}导航。`);
    if (voiceEnabled) {
      speakNavigation(
        reason
          ? `未检测到高德地图，已切换灵燕内置${routeModeLabels[routeMode]}导航，正在读取当前位置。`
          : `灵燕${routeModeLabels[routeMode]}导航开始，正在读取当前位置。`,
      );
    }
    try {
      const location = await getBrowserLocation();
      onLocationUpdate(location);
      setNavigationStatus("active");
      setNavigationError("");
      if (voiceEnabled) {
        speakNavigation(
          `灵燕${routeModeLabels[routeMode]}导航已启动。请向${guide.direction}前进，剩余${formatDistance(
            guide.distanceMeters,
          )}。`,
        );
      }
    } catch {
      setNavigationStatus("error");
      setNavigationError("无法读取当前位置。请在浏览器地址栏左侧允许定位；当前先用最近一次位置估算。");
      if (voiceEnabled) speakNavigation("无法读取当前位置。请允许浏览器定位，当前先使用最近一次位置估算。");
    }
  }

  function startLingYanNavigation() {
    setActiveNavigationMode(routeMode);
    setNavigationStatus("launching_amap");
    setNavigationError(`正在尝试打开高德地图；如果未安装，将自动进入灵燕内置${routeModeLabels[routeMode]}导航。`);
    if (voiceEnabled) speakNavigation(`正在尝试打开高德地图${routeModeLabels[routeMode]}导航。`);

    launchAmapNavigation({
      destination: result.coordinate,
      mode: routeMode,
      label: result.poi.name,
      onNativeOpened: () => {
        setNavigationStatus("idle");
        setNavigationError("");
        setActiveNavigationMode(null);
      },
      onFallback: () => {
        void startBuiltInNavigation("未检测到高德地图，已进入灵燕内置导航。请保持页面在前台。");
      },
    });
  }

  function exitLingYanNavigation() {
    setNavigationStatus("idle");
    setNavigationError("");
    setActiveNavigationMode(null);
    if (voiceEnabled) speakNavigation("已退出灵燕导航。");
    else stopSpeaking();
  }

  function changeRouteMode(mode: RouteMode) {
    onRouteModeChange(mode);
    if (isNavigating) {
      setActiveNavigationMode(mode);
      setNavigationStatus("active");
      setNavigationError("");
      if (voiceEnabled) speakNavigation(`已切换为${routeModeLabels[mode]}导航，正在重新规划路线。`);
      return;
    }
    setActiveNavigationMode(null);
    if (voiceEnabled) speakNavigation(`已选择${routeModeLabels[mode]}路线。`);
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (next) speakNavigation("语音播报已开启。");
    else stopSpeaking();
  }

  const navLabel =
    guide.arrived
      ? "已到达灵燕坐标附近"
      : navigationStatus === "launching_amap"
        ? `正在打开高德${routeModeLabels[displayedNavigationMode]}导航`
        : navigationStatus === "locating"
          ? `正在进入${routeModeLabels[displayedNavigationMode]}导航`
          : isNavigating && routeUnavailable && activeNavigationMode === routeMode
            ? `${routeModeLabels[displayedNavigationMode]}路线不可用`
            : navigationStatus === "active"
              ? `${routeModeLabels[displayedNavigationMode]}导航中`
              : navigationStatus === "error"
                ? "定位需要确认"
                : `待开始${routeModeLabels[routeMode]}导航`;

  const navHeading = guide.arrived
    ? "完成观测"
    : navigationStatus === "launching_amap"
      ? "高德优先"
      : navigationStatus === "locating"
        ? `正在校准${routeModeLabels[displayedNavigationMode]}起点`
        : isNavigating && routeUnavailable && activeNavigationMode === routeMode
          ? "当前为直线辅助"
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
      : navigationStatus === "locating"
        ? "正在读取当前位置..."
        : isNavigating
          ? `刷新${routeModeLabels[routeMode]}导航`
          : `开始${routeModeLabels[routeMode]}导航`;
  const routeStatusText = !amapEnabled
    ? "当前为灵燕内置导航；配置高德 Key 后启用高德路线"
    : hasRouteForMode
      ? isNavigating && activeNavigationMode === routeMode
        ? `高德${routeModeLabels[routeMode]}路线已生成，正在使用${routeModeLabels[routeMode]}导航`
        : `高德${routeModeLabels[routeMode]}路线已生成，点击开始进入${routeModeLabels[routeMode]}导航`
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

      <div className={`navigation-panel ${isNavigating ? "active" : ""} status-${navigationStatus}`}>
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
          disabled={navigationStatus === "launching_amap" || navigationStatus === "locating"}
          onClick={startLingYanNavigation}
        >
          {primaryActionText}
        </button>
        {isNavigating && (
          <button type="button" onClick={exitLingYanNavigation}>
            退出导航
          </button>
        )}
        <button type="button" disabled={!canSpeak()} onClick={toggleVoice}>
          {voiceEnabled ? "关闭语音" : "开启语音"}
        </button>
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
