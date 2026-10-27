import type { LingYanResult } from "./types";

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = "";
  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderOraclePosterBlob(result: LingYanResult): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const width = 750;
  const height = 1060;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0b1325");
  bg.addColorStop(0.55, "#112240");
  bg.addColorStop(1, "#172a45");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient glow
  const glow = ctx.createRadialGradient(width * 0.78, height * 0.2, 10, width * 0.78, height * 0.2, 340);
  glow.addColorStop(0, "rgba(248, 200, 107, 0.22)");
  glow.addColorStop(1, "rgba(248, 200, 107, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Outer card frame
  ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, width - 84, height - 84);

  // Header brand
  ctx.fillStyle = "#38bdf8";
  ctx.font = "800 18px Inter, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("LINGYAN ORACLE · 灵燕今日灵签", 82, 102);

  // Date & seed
  const dateStr = new Date().toISOString().slice(0, 10);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 16px Inter, monospace";
  ctx.fillText(`${dateStr} · ${result.seed}`, 82, 134);

  // Card Title & Intent badge
  ctx.fillStyle = "#f8c86b";
  ctx.font = "900 54px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(result.oracleCard.title, 82, 218);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 22px 'PingFang SC', sans-serif";
  ctx.fillText(`所求念头：「${result.intent}」`, 82, 266);

  // Verse
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 28px 'PingFang SC', sans-serif";
  const verseLines = wrapLines(ctx, result.oracleCard.verse, width - 164);
  let y = 330;
  for (const line of verseLines) {
    ctx.fillText(line, 82, y);
    y += 42;
  }

  // Quote box
  y += 18;
  ctx.fillStyle = "rgba(248, 200, 107, 0.1)";
  ctx.fillRect(82, y, width - 164, 136);
  ctx.fillStyle = "#f8c86b";
  ctx.fillRect(82, y, 5, 136);

  ctx.fillStyle = "#fef3c7";
  ctx.font = "700 24px 'PingFang SC', serif";
  const placeLines = wrapLines(ctx, `“${result.oracleCard.placeLine}”`, width - 208);
  let qy = y + 48;
  for (const line of placeLines.slice(0, 2)) {
    ctx.fillText(line, 106, qy);
    qy += 36;
  }
  ctx.fillStyle = "#f59e0b";
  ctx.font = "600 18px 'PingFang SC', sans-serif";
  ctx.fillText(`—— ${result.oracleCard.placeLineSource}`, 106, y + 114);

  // Task & Echo Question
  y += 184;
  ctx.fillStyle = "#38bdf8";
  ctx.font = "800 18px 'PingFang SC', sans-serif";
  ctx.fillText("城市微任务", 82, y);
  y += 34;
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 22px 'PingFang SC', sans-serif";
  for (const line of wrapLines(ctx, result.oracleCard.task, width - 164)) {
    ctx.fillText(line, 82, y);
    y += 34;
  }

  y += 22;
  ctx.fillStyle = "#38bdf8";
  ctx.font = "800 18px 'PingFang SC', sans-serif";
  ctx.fillText("灵燕回声", 82, y);
  y += 34;
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 22px 'PingFang SC', sans-serif";
  for (const line of wrapLines(ctx, result.oracleCard.echoQuestion, width - 164)) {
    ctx.fillText(line, 82, y);
    y += 34;
  }

  // Destination footer box
  const footerY = height - 210;
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fillRect(82, footerY, width - 164, 128);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
  ctx.strokeRect(82, footerY, width - 164, 128);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 26px 'PingFang SC', sans-serif";
  ctx.fillText(`栖息坐标：${result.poi.name}`, 106, footerY + 46);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 18px Inter, monospace";
  ctx.fillText(
    `GCJ-02  ${result.coordinate.lat.toFixed(5)}°N, ${result.coordinate.lng.toFixed(5)}°E · 距离 ${result.poi.distanceMeters}m`,
    106,
    footerY + 84,
  );
  ctx.fillStyle = "#64748b";
  ctx.font = "500 15px 'PingFang SC', sans-serif";
  ctx.fillText("输入一个念头，让城市回应你 · LingYan Field Interface", 106, footerY + 110);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
