"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UlakMotionProps = { variant: "welcome" | "farewell" };
type Crop = { x: number; y: number; w: number; h: number };

// Existing 1024x1024 sheet coordinates. These are retained from the current
// branch, but still require visual verification against the source image.
const PARTS = {
  head: { x: 35, y: 55, w: 350, h: 285 },
  torso: { x: 418, y: 125, w: 195, h: 275 },
  armLeft: { x: 650, y: 140, w: 170, h: 305 },
  armRight: { x: 830, y: 140, w: 175, h: 305 },
  legLeft: { x: 95, y: 545, w: 245, h: 415 },
  legRight: { x: 690, y: 545, w: 245, h: 415 },
} satisfies Record<string, Crop>;

type PartName = keyof typeof PARTS;
type SpriteMap = Partial<Record<PartName, HTMLCanvasElement>>;

function preparePart(source: HTMLImageElement, crop: Crop): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = crop.w;
  canvas.height = crop.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const imageData = ctx.getImageData(0, 0, crop.w, crop.h);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const cyanDifference = Math.min(green, blue) - red;

    if (green > 145 && blue > 145 && red < 105 && cyanDifference > 65) {
      pixels[i + 3] = 0;
    } else if (green > 125 && blue > 125 && red < 130 && cyanDifference > 38) {
      pixels[i + 3] = Math.round(pixels[i + 3] * 0.12);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start: number, end: number, value: number): number {
  const progress = clamp01((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
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
    source.src = "/1795638599702.jpg";

    let animationFrame = 0;
    let startedAt = 0;
    let disposed = false;
    let hasPlayed = false;
    let observer: IntersectionObserver | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprites: SpriteMap = {};

    const drawPart = (
      name: PartName,
      x: number,
      y: number,
      width: number,
      height: number,
      angle = 0,
      pivotX = width / 2,
      pivotY = 0
    ) => {
      const sprite = sprites[name];
      if (!sprite) return;

      ctx.save();
      ctx.translate(x + pivotX, y + pivotY);
      ctx.rotate(angle);
      ctx.drawImage(sprite, -pivotX, -pivotY, width, height);
      ctx.restore();
    };

    const drawBeam = (opacity: number, descent: number) => {
      if (opacity <= 0.01 || descent <= 0.01) return;

      const width = canvas.width;
      const height = canvas.height;
      const bottom = 12 + descent * (height - 24);
      const halfWidth = 24 + descent * 184;
      const coreHalfWidth = 8 + descent * 68;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.shadowColor = "rgba(90,255,0,0.95)";
      ctx.shadowBlur = 28;

      const outer = ctx.createLinearGradient(0, 0, 0, bottom);
      outer.addColorStop(0, "rgba(245,255,220,0.98)");
      outer.addColorStop(0.18, "rgba(145,255,0,0.9)");
      outer.addColorStop(0.62, "rgba(55,245,0,0.5)");
      outer.addColorStop(1, "rgba(45,230,0,0.04)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 18, 0);
      ctx.lineTo(width / 2 - halfWidth, bottom);
      ctx.quadraticCurveTo(width / 2, bottom + 20, width / 2 + halfWidth, bottom);
      ctx.lineTo(width / 2 + 18, 0);
      ctx.closePath();
      ctx.fill();

      const core = ctx.createLinearGradient(0, 0, 0, bottom);
      core.addColorStop(0, "rgba(255,255,240,0.98)");
      core.addColorStop(0.42, "rgba(185,255,75,0.72)");
      core.addColorStop(1, "rgba(100,255,25,0.02)");
      ctx.shadowBlur = 12;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 7, 0);
      ctx.lineTo(width / 2 - coreHalfWidth, bottom - 3);
      ctx.quadraticCurveTo(width / 2, bottom + 8, width / 2 + coreHalfWidth, bottom - 3);
      ctx.lineTo(width / 2 + 7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = (now: number, fixedTime?: number) => {
      if (disposed) return;

      const elapsed = fixedTime ?? (now - startedAt) / 1000;
      const isWelcome = variant === "welcome";

      let beamDescent = 0;
      let beamOpacity = 0;
      let characterOpacity = 1;
      let characterY = 0;
      let characterScale = 1;
      let headNod = 0;
      let saluteProgress = 0;

      if (isWelcome) {
        // Light descends first; ULAK starts materialising shortly afterward.
        beamDescent = smoothstep(0.05, 0.85, elapsed);
        beamOpacity = smoothstep(0.08, 0.32, elapsed) *
          (1 - smoothstep(2.45, 3.15, elapsed));
        const arrival = smoothstep(0.62, 1.85, elapsed);
        characterOpacity = smoothstep(0.62, 1.2, elapsed);
        characterY = (1 - arrival) * -118;
        characterScale = 0.82 + arrival * 0.18;
        if (elapsed >= 1.9 && elapsed <= 2.8) {
          headNod = Math.sin(((elapsed - 1.9) / 0.9) * Math.PI) * 0.075;
        }
      } else {
        // Salute completes before the beam begins its descent.
        saluteProgress = smoothstep(0.35, 1.65, elapsed);
        if (elapsed >= 1.75 && elapsed <= 2.5) {
          headNod = Math.sin(((elapsed - 1.75) / 0.75) * Math.PI) * 0.065;
        }
        beamDescent = smoothstep(2.0, 2.72, elapsed);
        beamOpacity = smoothstep(2.0, 2.35, elapsed) *
          (1 - smoothstep(4.45, 5.05, elapsed));
        const departure = smoothstep(2.85, 4.25, elapsed);
        characterY = -departure * 178;
        characterScale = 1 - departure * 0.2;
        characterOpacity = 1 - smoothstep(3.45, 4.35, elapsed);
      }

      const breathing = reducedMotion ? 0 : Math.sin(now / 680) * 1.2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBeam(beamOpacity, beamDescent);

      if (characterOpacity > 0.01) {
        ctx.save();
        ctx.globalAlpha = characterOpacity;
        ctx.translate(canvas.width / 2, 248 + characterY + breathing);
        ctx.scale(characterScale, characterScale);
        ctx.translate(-canvas.width / 2, -248);

        // Keep the original complete limb sprites intact. The current sheet does
        // not provide confirmed upper-arm/forearm layers, so no artificial elbow cut is made.
        drawPart("legLeft", 157, 318, 80, 136);
        drawPart("legRight", 243, 318, 80, 136);
        drawPart("torso", 153, 171, 174, 220);

        // Viewer-left arm is the character's right arm and performs the salute.
        // This is a shoulder rotation only; a separate elbow bend needs a split sprite.
        drawPart("armRight", 76, 164, 112, 204, -saluteProgress * 0.98, 94, 22);
        drawPart("armLeft", 292, 164, 112, 204, 0, 18, 22);
        drawPart("head", 112, 8, 256, 207, headNod, 128, 188);

        ctx.restore();
      }

      if (!reducedMotion && (isWelcome ? elapsed < 3.2 : elapsed < 5.1)) {
        animationFrame = requestAnimationFrame(render);
      } else {
        hasPlayed = true;
      }
    };

    const start = () => {
      if (disposed) return;
      hasPlayed = true;
      startedAt = performance.now();
      cancelAnimationFrame(animationFrame);

      if (reducedMotion) {
        // Show a still, accessible pose instead of running the full animation.
        render(performance.now(), variant === "welcome" ? 2.3 : 1.8);
        return;
      }
      animationFrame = requestAnimationFrame(render);
    };

    source.onload = () => {
      if (disposed) return;
      (Object.keys(PARTS) as PartName[]).forEach((name) => {
        sprites[name] = preparePart(source, PARTS[name]);
      });

      if (variant === "welcome") {
        start();
        return;
      }

      // Farewell stays in a neutral idle pose until its section enters view.
      render(performance.now(), 0);
      if (reducedMotion) {
        render(performance.now(), 1.8);
        hasPlayed = true;
        return;
      }

      if (sectionRef.current) {
        observer = new IntersectionObserver(
          (entries) => {
            if (!hasPlayed && entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              start();
            }
          },
          { threshold: 0.3 }
        );
        observer.observe(sectionRef.current);
      }
    };

    source.onerror = () => {
      if (!disposed) ctx.clearRect(0, 0, canvas.width, canvas.height);
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
