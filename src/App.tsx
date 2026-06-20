import { useCallback, useState } from "react";
import { CollapseCanvas } from "./components/CollapseCanvas";
import { AmapRouteMap } from "./components/AmapRouteMap";
import { IntentPanel } from "./components/IntentPanel";
import { LingYanLogo } from "./components/LingYanLogo";
import { OracleMap } from "./components/OracleMap";
import { ResultCard } from "./components/ResultCard";
import { SafetyNotice } from "./components/SafetyNotice";
import { playAmbientTone } from "./lib/audio";
import { hasAmapConfig } from "./lib/amap";
import { getBrowserLocation } from "./lib/geo";
import { generateOracle } from "./lib/oracle";
import type { AppState, GeoPoint, LingYanResult, RadiusKm, RouteMode, RoutePlanStatus, RouteSummary } from "./lib/types";

const DEMO_LOCATION: GeoPoint = {
  lat: 31.230416,
  lng: 121.473701,
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function App() {
  const [intent, setIntent] = useState("灵感");
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(3);
  const [state, setState] = useState<AppState>("input");
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [navigationLocation, setNavigationLocation] = useState<GeoPoint | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>("walking");
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routePlanStatus, setRoutePlanStatus] = useState<RoutePlanStatus | null>(null);
  const [result, setResult] = useState<LingYanResult | null>(null);
  const isBusy = state === "locating" || state === "collapsing";
  const handleNavigationLocationUpdate = useCallback((location: GeoPoint) => {
    setNavigationLocation(location);
  }, []);
  const handleRouteSummaryChange = useCallback((summary: RouteSummary | null) => {
    setRouteSummary(summary);
  }, []);
  const handleRoutePlanStatusChange = useCallback((status: RoutePlanStatus) => {
    setRoutePlanStatus(status);
  }, []);

  async function summonLingYan(useDemoLocation = false) {
    const cleanIntent = intent.trim();
    if (!cleanIntent) {
      setError("请输入一个念头。");
      return;
    }
    if (cleanIntent.length > 20) {
      setError("意图请控制在 20 个字符内。");
      return;
    }
    setError("");
    setResult(null);
    setNavigationLocation(null);
    setRouteSummary(null);
    setRoutePlanStatus(null);
    setState("locating");
    playAmbientTone();

    try {
      const location = useDemoLocation ? DEMO_LOCATION : await getBrowserLocation();
      setUserLocation(location);
      setNavigationLocation(location);
      setState("collapsing");
      const [oracle] = await Promise.all([
        generateOracle({
          intent: cleanIntent,
          radiusKm,
          location,
        }),
        sleep(3600),
      ]);
      setResult(oracle);
      setState("result");
    } catch (err) {
      setState("input");
      setError(err instanceof Error ? err.message : "坐标仍在流动，请稍后重新呼唤。");
    }
  }

  function reset() {
    setState("input");
    setError("");
    setResult(null);
    setNavigationLocation(null);
    setRouteSummary(null);
    setRoutePlanStatus(null);
  }

  return (
    <main className={`app-shell state-${state}`}>
      <div className="ambient-field" />
      {state === "collapsing" && <CollapseCanvas intent={intent} />}

      {state !== "collapsing" && (
        <div className="layout">
          <section className="left-pane">
            <IntentPanel
              intent={intent}
              radiusKm={radiusKm}
              isBusy={isBusy}
              error={error}
              onIntentChange={setIntent}
              onRadiusChange={setRadiusKm}
              onSubmit={() => void summonLingYan(false)}
            />
            {error && (
              <button className="demo-location-button" type="button" onClick={() => void summonLingYan(true)}>
                使用演示位置继续
              </button>
            )}
          </section>

          <section className="right-pane">
            {result && userLocation ? (
              <>
                {hasAmapConfig() ? (
                  <AmapRouteMap
                    userLocation={navigationLocation ?? userLocation}
                    result={result}
                    routeMode={routeMode}
                    onRouteSummaryChange={handleRouteSummaryChange}
                    onRoutePlanStatusChange={handleRoutePlanStatusChange}
                  />
                ) : (
                  <OracleMap userLocation={navigationLocation ?? userLocation} result={result} />
                )}
                <ResultCard
                  result={result}
                  userLocation={navigationLocation ?? userLocation}
                  routeMode={routeMode}
                  routeSummary={routeSummary}
                  routePlanStatus={routePlanStatus}
                  onRouteModeChange={setRouteMode}
                  onLocationUpdate={handleNavigationLocationUpdate}
                  onReset={reset}
                />
              </>
            ) : (
              <div className="empty-oracle">
                <LingYanLogo className="swallow-sketch" title="灵燕标识" />
                <span>Oracle Map</span>
                <h2>灵燕尚未栖息</h2>
                <p>输入一个念头，允许定位，然后等待坐标从城市的缝隙里浮现。</p>
              </div>
            )}
          </section>
        </div>
      )}

      {state !== "collapsing" && <SafetyNotice />}
    </main>
  );
}
