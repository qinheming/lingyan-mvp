import { useEffect, useRef } from "react";

type CollapseCanvasProps = {
  intent: string;
};

const messages = [
  "正在校准你的城市坐标...",
  "正在检索语义共振点...",
  "正在排除不可抵达区域...",
  "正在让随机性穿过日常...",
  "灵燕正在衔来一枚坐标...",
];

export function CollapseCanvas({ intent }: CollapseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const canvasEl = canvas;
    const ctx = context;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const seed = Array.from(intent).reduce((acc, char) => acc + char.charCodeAt(0), 17);
    const particles = Array.from({ length: 160 }, (_, index) => ({
      angle: (index / 160) * Math.PI * 2,
      radius: 80 + ((index * 37 + seed) % 260),
      speed: 0.002 + (((index + seed) % 9) / 10000),
      size: 1 + ((index + seed) % 3),
      hue: 190 + ((index * 13 + seed) % 70),
    }));

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(time: number) {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const collapse = Math.min(1, time / 4600);
      const pulse = 0.5 + Math.sin(time / 360) * 0.5;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
      gradient.addColorStop(0, "rgba(56,189,248,0.16)");
      gradient.addColorStop(0.35, "rgba(15,23,42,0.35)");
      gradient.addColorStop(1, "rgba(7,11,20,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        const inward = particle.radius * (1 - collapse * 0.72);
        const angle = particle.angle + time * particle.speed + collapse * 2.4;
        const wobble = Math.sin(time / 500 + index) * 12;
        const x = cx + Math.cos(angle) * (inward + wobble);
        const y = cy + Math.sin(angle) * (inward * 0.62 + wobble);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${particle.hue}, 95%, ${62 + pulse * 14}%, ${0.42 + collapse * 0.35})`;
        ctx.arc(x, y, particle.size + collapse * 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(time / 700) * 0.08);
      ctx.strokeStyle = `rgba(245,196,107,${0.5 + pulse * 0.32})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-34, 8);
      ctx.quadraticCurveTo(-8, -24, 24, -8);
      ctx.quadraticCurveTo(4, -3, -34, 8);
      ctx.moveTo(12, -9);
      ctx.quadraticCurveTo(28, -26, 47, -18);
      ctx.moveTo(12, -5);
      ctx.quadraticCurveTo(31, 10, 51, 3);
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [intent]);

  return (
    <section className="collapse-stage">
      <canvas ref={canvasRef} />
      <div className="collapse-copy">
        <span>Wavefunction Collapse</span>
        <h2>{intent || "意图"} 正在穿过城市</h2>
        <div className="message-rail">
          {messages.map((message, index) => (
            <p key={message} style={{ animationDelay: `${index * 0.75}s` }}>
              {message}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
