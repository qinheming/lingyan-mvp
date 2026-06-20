import { LingYanLogo } from "./LingYanLogo";
import type { RadiusKm } from "../lib/types";

type IntentPanelProps = {
  intent: string;
  radiusKm: RadiusKm;
  isBusy: boolean;
  error: string;
  onIntentChange: (value: string) => void;
  onRadiusChange: (value: RadiusKm) => void;
  onSubmit: () => void;
};

const radiusOptions: RadiusKm[] = [1, 3, 5];
const quickIntents = ["财富", "灵感", "重逢", "破局", "平静"];

export function IntentPanel({
  intent,
  radiusKm,
  isBusy,
  error,
  onIntentChange,
  onRadiusChange,
  onSubmit,
}: IntentPanelProps) {
  const tooLong = intent.length > 20;
  const disabled = isBusy || !intent.trim() || tooLong;

  return (
    <section className="intent-panel">
      <div className="brand-row">
        <div>
          <span className="eyebrow">LingYan Field Interface</span>
          <h1>灵燕</h1>
        </div>
        <LingYanLogo className="brand-mark" title="灵燕标识" />
      </div>
      <p className="lead">输入一个念头，让城市回应你。</p>

      <div className={`intent-input-shell ${intent ? "active" : ""} ${tooLong ? "invalid" : ""}`}>
        <input
          value={intent}
          maxLength={24}
          onChange={(event) => onIntentChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !disabled) onSubmit();
          }}
          placeholder="财富 / 重逢 / 破局 / 灵感"
          aria-label="输入意图"
        />
        <span>{intent.length}/20</span>
      </div>

      <div className="quick-row" aria-label="快速意图">
        {quickIntents.map((item) => (
          <button key={item} type="button" onClick={() => onIntentChange(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="radius-block">
        <div className="section-label">共鸣半径</div>
        <div className="radius-row">
          {radiusOptions.map((radius) => (
            <button
              key={radius}
              type="button"
              className={radiusKm === radius ? "selected" : ""}
              onClick={() => onRadiusChange(radius)}
            >
              {radius}km
            </button>
          ))}
        </div>
      </div>

      {error && <div className="inline-error">{error}</div>}
      {tooLong && <div className="inline-error">意图请控制在 20 个字符内。</div>}

      <button className="summon-button" type="button" disabled={disabled} onClick={onSubmit}>
        {isBusy ? "灵燕正在飞行..." : "呼唤灵燕"}
      </button>

      <p className="safety-line">
        灵燕提供城市探索提示，不保证财富、情感、健康、职业等现实结果。请遵守交通规则，不进入危险或私人区域。
      </p>
    </section>
  );
}
