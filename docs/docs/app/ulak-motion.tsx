"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UlakMotionProps = { variant: "welcome" | "farewell" };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start: number, end: number, value: number): number {
  const progress = clamp01((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

// The supplied full-front reference is used as one intact character sprite.
// Its checkerboard background is removed without cutting the robot's limbs apart.
function prepareCharacter(source: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const crop = { x: 475, y: 24, width: 410, height: 710 };
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(
    source,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height
  );

  const image = ctx.getImageData(0, 0, crop.width, crop.height);
  const pixels = image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // The reference JPG has a neutral grey/white checkerboard. The robot's
    // cream armor is warm-toned, so its color channels remain distinguishable.
    if (max - min < 20 && min > 105) pixels[i + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export default function UlakMotion({ variant }: UlakMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [replayKey, setReplayKey] = useState(0);

  const replay = useCallback(() => {
    setReplayKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const source = new Image();
    source.src = "/1795636155857.jpg";

    let animationFrame = 0;
    let startedAt = 0;
    let disposed = false;
    let hasStarted = false;
    let observer: IntersectionObserver | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let character: HTMLCanvasElement | null = null;

    const drawBeam = (opacity: number, descent: number) => {
      if (opacity <= 0.01 || descent <= 0.01) return;
      const width = canvas.width;
      const bottom = 8 + descent * (canvas.height - 16);
      const halfWidth = 20 + descent * 194;
      const coreHalfWidth = 7 + descent * 76;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "rgba(90,255,0,1)";
      ctx.shadowBlur = 38;

      const outer = ctx.createLinearGradient(0, 0, 0, bottom);
      outer.addColorStop(0, "rgba(245,255,215,1)");
      outer.addColorStop(0.2, "rgba(145,255,0,0.98)");
      outer.addColorStop(0.7, "rgba(65,255,0,0.64)");
      outer.addColorStop(1, "rgba(45,235,0,0.04)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 12, 0);
      ctx.lineTo(width / 2 - halfWidth, bottom);
      ctx.quadraticCurveTo(width / 2, bottom + 22, width / 2 + halfWidth, bottom);
      ctx.lineTo(width / 2 + 12, 0);
      ctx.closePath();
      ctx.fill();

      const core = ctx.createLinearGradient(0, 0, 0, bottom);
      core.addColorStop(0, "rgba(255,255,240,1)");
      core.addColorStop(0.45, "rgba(205,255,105,0.88)");
      core.addColorStop(1, "rgba(105,255,20,0.02)");
      ctx.shadowBlur = 18;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 5, 0);
      ctx.lineTo(width / 2 - coreHalfWidth, bottom - 3);
      ctx.quadraticCurveTo(width / 2, bottom + 8, width / 2 + coreHalfWidth, bottom - 3);
      ctx.lineTo(width / 2 + 5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = (now: number, fixedTime?: number) => {
      if (disposed || !character) return;
      const elapsed = fixedTime ?? (now - startedAt) / 1000;
      const isWelcome = variant === "welcome";
      const idle = !isWelcome && elapsed >= 5.8;
      const idleTime = idle ? elapsed - 5.8 : 0;

      let beamDescent = 0;
      let beamOpacity = 0;
      let characterOpacity = 1;
      let characterY = 0;
      let scale = 0.61;

      if (isWelcome) {
        beamDescent = smoothstep(0.02, 0.9, elapsed);
        beamOpacity = smoothstep(0.02, 0.18, elapsed) *
          (1 - smoothstep(2.55, 3.15, elapsed));
        const arrival = smoothstep(0.55, 1.75, elapsed);
        characterOpacity = smoothstep(0.52, 1.05, elapsed);
        characterY = -150 * (1 - arrival);
        scale = 0.61 * (0.9 + arrival * 0.1);
      } else {
        // Strong green beam is deliberately visible during the farewell lift.
        const beamIn = smoothstep(0.12, 0.8, elapsed);
        const beamOut = smoothstep(4.55, 5.75, elapsed);
        beamDescent = beamIn * (1 - beamOut);
        beamOpacity = smoothstep(0.1, 0.35, elapsed) *
          (1 - smoothstep(5.0, 5.8, elapsed));
        const lift = smoothstep(2.7, 4.5, elapsed);
        characterY = -lift * 190;
        characterOpacity = 1 - smoothstep(3.75, 4.75, elapsed);

        if (idle) {
          beamDescent = 0;
          beamOpacity = 0;
          characterOpacity = 1;
          characterY = Math.sin(idleTime * 1.65) * 3;
          scale = 0.61 * (1 + Math.sin(idleTime * 1.2) * 0.006);
        }
      }

      const breathing = reducedMotion ? 0 : Math.sin(now / 620) * (idle ? 2.3 : 1.1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBeam(beamOpacity, beamDescent);

      if (characterOpacity > 0.01) {
        const drawWidth = character.width * scale;
        const drawHeight = character.height * scale;
        ctx.save();
        ctx.globalAlpha = characterOpacity;
        ctx.shadowColor = "rgba(255,150,45,0.12)";
        ctx.shadowBlur = 12;
        ctx.drawImage(
          character,
          (canvas.width - drawWidth) / 2,
          (canvas.height - drawHeight) / 2 + characterY + breathing,
          drawWidth,
          drawHeight
        );
        ctx.restore();
      }

      if (fixedTime === undefined && !reducedMotion && (isWelcome ? elapsed < 3.2 : true)) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    const start = () => {
      if (disposed || !character) return;
      hasStarted = true;
      startedAt = performance.now();
      cancelAnimationFrame(animationFrame);
      if (reducedMotion) {
        render(performance.now(), variant === "welcome" ? 2.1 : 1.2);
        return;
      }
      animationFrame = requestAnimationFrame(render);
    };

    source.onload = () => {
      if (disposed) return;
      character = prepareCharacter(source);
      if (variant === "welcome") {
        start();
        return;
      }

      // Keep the farewell character visible and breathing while waiting.
      render(performance.now(), 0);
      if (reducedMotion) {
        render(performance.now(), 1.2);
        return;
      }

      if (sectionRef.current) {
        observer = new IntersectionObserver(
          (entries) => {
            if (!hasStarted && entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              start();
            }
          },
          // A low threshold ensures the animation also starts on short mobile viewports.
          { threshold: 0.01, rootMargin: "0px 0px 80px 0px" }
        );
        observer.observe(sectionRef.current);
      }
    };

    source.onerror = () => {
      if (!disposed) console.error("ULAK karakter görseli yüklenemedi:", source.src);
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      source.onload = null;
      source.onerror = null;
    };
  }, [variant, replayKey]);

  return (
    <section
      ref={sectionRef}
      aria-label={variant === "welcome" ? "ULAK karşılama animasyonu" : "ULAK veda animasyonu"}
      className={`ulak-motion ulak-motion--${variant}`}
    >
      <button
        type="button"
        className="ulak-motion__replay"
        onClick={replay}
        aria-label="ULAK animasyonunu yeniden oynat"
      >
        <span className="ulak-motion__character">
          <canvas
            ref={canvasRef}
            width={480}
            height={470}
            role="img"
            aria-label="ULAK robot karakteri; dokunarak animasyonu yeniden oynatın"
          />
        </span>
      </button>
      <div className="ulak-motion__copy">
        <span>{variant === "welcome" ? "ULAK’TAN HABERLER" : "BİZİ TAKİPTE KALIN"}</span>
        <strong>{variant === "welcome" ? "Merhaba, ben ULAK." : "Bir sonraki haberde görüşmek üzere."}</strong>
        <p>{variant === "welcome" ? "Günün gelişmelerini sizin için takip ediyorum." : "Güvenilir haber için ULAK’tan ayrılmayın."}</p>
      </div>
    </section>
  );
}
