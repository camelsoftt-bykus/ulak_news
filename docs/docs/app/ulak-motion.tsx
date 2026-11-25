"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UlakMotionProps = { variant: "welcome" | "farewell" };
type Crop = { x: number; y: number; w: number; h: number };

// Coordinates are based on the 1024x1024 uploaded ULAK parts sheet.
const PARTS = {
  head: { x: 35, y: 55, w: 350, h: 285 },
  torso: { x: 418, y: 125, w: 195, h: 275 },
  armLeft: { x: 650, y: 140, w: 170, h: 305 },
  armRight: { x: 830, y: 140, w: 175, h: 305 },
  legLeft: { x: 95, y: 545, w: 245, h: 415 },
  legRight: { x: 690, y: 545, w: 245, h: 415 },
} satisfies Record<string, Crop>;

function preparePart(source: HTMLImageElement, crop: Crop) {
  const canvas = document.createElement("canvas");
  canvas.width = crop.w;
  canvas.height = crop.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const pixels = ctx.getImageData(0, 0, crop.w, crop.h);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const red = pixels.data[i], green = pixels.data[i + 1], blue = pixels.data[i + 2];
    const chroma = Math.min(green, blue) - red;
    if (green > 145 && blue > 145 && red < 105 && chroma > 65) pixels.data[i + 3] = 0;
    else if (green > 125 && blue > 125 && red < 130 && chroma > 38) {
      pixels.data[i + 3] = Math.round(pixels.data[i + 3] * 0.12);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export default function UlakMotion({ variant }: UlakMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [replayKey, setReplayKey] = useState(0);
  const replay = useCallback(() => setReplayKey((value) => value + 1), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const source = new Image();
    source.src = "/1795638599702.jpg";
    let raf = 0;
    let startedAt = 0;
    let active = variant === "welcome";
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts: Partial<Record<keyof typeof PARTS, HTMLCanvasElement>> = {};

    const part = (name: keyof typeof PARTS, x: number, y: number, w: number, h: number, angle = 0, px = w / 2, py = 0, mirror = false) => {
      const sprite = parts[name];
      if (!sprite) return;
      ctx.save();
      ctx.translate(x + px, y + py);
      ctx.rotate(angle);
      if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(sprite, -px, -py, w, h);
      ctx.restore();
    };

    const render = (now: number) => {
      if (disposed) return;
      const t = reduced ? 5 : (now - startedAt) / 1000;
      const entering = variant === "welcome";
      const beamIn = entering ? Math.max(0, 1 - t / 1.45) : 0;
      const beamOut = !entering && active ? Math.max(0, Math.min(1, (t - 3.25) / 1.1)) : 0;
      const beam = Math.max(beamIn, beamOut);
      const arrival = entering ? Math.max(0, Math.min(1, (t - 0.2) / 1.3)) : 1 - beamOut;
      const ease = arrival * arrival * (3 - 2 * arrival);
      const fade = entering ? Math.min(1, t / 1.05) : (active ? Math.max(0, 1 - Math.max(0, t - 3.65) / 0.85) : 1);
      const salute = !entering && active ? Math.max(0, Math.min(1, (t - 1.0) / 1.35)) : 0;
      const saluteEase = salute * salute * (3 - 2 * salute);
      const saluteAngle = -saluteEase * 0.92;
      const nod = entering
        ? (t > 1.65 && t < 2.55 ? Math.sin(((t - 1.65) / 0.9) * Math.PI) * 0.085 : 0)
        : (t > 2.85 && t < 3.5 ? Math.sin(((t - 2.85) / 0.65) * Math.PI) * 0.075 : 0);
      const floatY = reduced ? 0 : Math.sin(now / 700) * 1.5;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // UFO light cone: the craft stays off-screen; only its soft beam is visible.
      if (beam > 0.01) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.88, beam * 0.9);
        const top = ctx.createRadialGradient(240, 0, 5, 240, 0, 250);
        top.addColorStop(0, "rgba(226,255,218,0.98)");
        top.addColorStop(0.22, "rgba(139,255,120,0.72)");
        top.addColorStop(0.58, "rgba(58,220,94,0.38)");
        top.addColorStop(1, "rgba(25,190,90,0)");
        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.moveTo(205, 0);
        ctx.lineTo(35, 435);
        ctx.quadraticCurveTo(240, 470, 445, 435);
        ctx.lineTo(275, 0);
        ctx.closePath();
        ctx.fill();
        const glow = ctx.createRadialGradient(240, 390, 8, 240, 390, 205);
        glow.addColorStop(0, "rgba(190,255,150,0.62)");
        glow.addColorStop(0.48, "rgba(66,235,112,0.22)");
        glow.addColorStop(1, "rgba(35,210,105,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 210, 480, 260);
        ctx.restore();
      }

      // The beam controls scale and opacity, creating a gentle materialisation/dematerialisation.
      const scale = 0.82 + ease * 0.18;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(240, 250 + floatY + (1 - ease) * 65);
      ctx.scale(scale, scale);
      ctx.translate(-240, -250);

      // Legs and torso use the original complete pieces, aligned at their socket centres.
      part("legLeft", 160, 322, 78, 132);
      part("legRight", 242, 322, 78, 132);
      part("torso", 153, 174, 174, 220);

      // Shoulder caps overlap the torso edge intentionally, hiding cut seams.
      // Character's right arm is on the viewer's left and performs the salute.
      part("armRight", 73, 177, 112, 202, saluteAngle, 99, 28);
      part("armLeft", 295, 177, 112, 202, 0, 13, 28, true);
      part("head", 112, 8, 256, 207, nod, 128, 188);
      ctx.restore();

      if (entering ? t < 4.1 : active && t < 5.1) raf = requestAnimationFrame(render);
    };

    const start = () => {
      active = true;
      startedAt = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    };

    const observer = variant === "farewell" && sectionRef.current
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting) && !active) start();
        }, { threshold: 0.3 })
      : null;
    if (observer && sectionRef.current) observer.observe(sectionRef.current);

    source.onload = () => {
      (Object.keys(PARTS) as Array<keyof typeof PARTS>).forEach((key) => { parts[key] = preparePart(source, PARTS[key]); });
      if (variant === "welcome") start();
      else {
        startedAt = performance.now() - 900;
        render(performance.now());
      }
    };
    source.onerror = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [variant, replayKey]);

  return (
    <section ref={sectionRef} aria-label={variant === "welcome" ? "ULAK ışınlanarak karşılama animasyonu" : "ULAK ışınlanarak asker selamıyla veda animasyonu"} className={`ulak-motion ulak-motion--${variant}`}>
      <button type="button" className="ulak-motion__replay" onClick={replay} aria-label="ULAK animasyonunu yeniden oynat" title="Tekrar oynat">
        <span className="ulak-motion__character">
          <canvas ref={canvasRef} width={480} height={470} role="img" aria-label="UFO ışık hüzmesiyle beliren ULAK robotu; dokunarak animasyonu tekrarlayın" />
        </span>
      </button>
      <div className="ulak-motion__copy">
        <span>{variant === "welcome" ? "ULAK’TAN HABERLER" : "BİZİ TAKİPTE KALIN"}</span>
        <strong>{variant === "welcome" ? "Merhaba, ben ULAK." : "Bir sonraki haberde görüşmek üzere."}</strong>
        <p>{variant === "welcome" ? "Günün gelişmelerini sizin için takip ediyorum." : "Güvenilir haber için ULAK’tan ayrılmayın."}</p>
        <small>Karaktere dokunarak animasyonu tekrar oynatabilirsiniz.</small>
      </div>
    </section>
  );
}
