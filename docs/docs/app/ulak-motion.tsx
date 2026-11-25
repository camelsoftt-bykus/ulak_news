"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UlakMotionProps = { variant: "welcome" | "farewell" };
type Sprite = { x: number; y: number; w: number; h: number };

const SPRITES = {
  head: { x: 28, y: 48, w: 365, h: 325 },
  body: { x: 410, y: 118, w: 215, h: 300 },
  // The sheet supplies complete articulated arm assemblies, not clean elbow-separated layers.
  leftArm: { x: 650, y: 135, w: 175, h: 315 },
  rightArm: { x: 835, y: 135, w: 175, h: 315 },
  leftLeg: { x: 95, y: 545, w: 255, h: 415 },
  rightLeg: { x: 695, y: 545, w: 240, h: 415 },
} satisfies Record<string, Sprite>;

function makeKeyedCrop(image: HTMLImageElement, sprite: Sprite) {
  const canvas = document.createElement("canvas");
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;
  context.drawImage(image, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
  const frame = context.getImageData(0, 0, sprite.w, sprite.h);
  const pixels = frame.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2];
    const chroma = Math.min(green, blue) - red;
    if (green > 145 && blue > 145 && red < 105 && chroma > 65) pixels[i + 3] = 0;
    else if (green > 125 && blue > 125 && red < 130 && chroma > 38) {
      pixels[i + 3] = Math.round(pixels[i + 3] * 0.18);
    }
  }
  context.putImageData(frame, 0, 0);
  return canvas;
}

export default function UlakMotion({ variant }: UlakMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [replayKey, setReplayKey] = useState(0);
  const replay = useCallback(() => setReplayKey((value) => value + 1), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.src = "/1795638599702.jpg";
    let raf = 0;
    let startedAt = 0;
    let visible = variant === "welcome";
    let finished = false;
    let disposed = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const keyed: Partial<Record<keyof typeof SPRITES, HTMLCanvasElement>> = {};

    const drawPart = (
      key: keyof typeof SPRITES, x: number, y: number, w: number, h: number,
      angle = 0, pivotX = w / 2, pivotY = 0,
    ) => {
      const part = keyed[key];
      if (!part) return;
      context.save();
      context.translate(x + pivotX, y + pivotY);
      context.rotate(angle);
      context.drawImage(part, -pivotX, -pivotY, w, h);
      context.restore();
    };

    const draw = (now: number) => {
      if (disposed) return;
      if (!startedAt) startedAt = now;
      const t = reducedMotion ? 5 : (now - startedAt) / 1000;
      const fadeIn = variant === "welcome" ? Math.min(1, t / 0.75) : 1;
      const fadeOut = variant === "farewell" && visible ? Math.max(0, 1 - Math.max(0, t - 3.8) / 0.8) : 1;
      const nod = variant === "welcome"
        ? (t > 1.0 && t < 2.25 ? Math.sin(((t - 1.0) / 1.25) * Math.PI) * 0.095 : 0)
        : (t > 3.0 && t < 3.8 ? Math.sin(((t - 3.0) / 0.8) * Math.PI) * 0.075 : 0);
      // Slow shoulder lift, then elbow-like angle from the supplied bent arm artwork.
      const saluteProgress = variant === "farewell" ? Math.max(0, Math.min(1, (t - 1.0) / 1.45)) : 0;
      const saluteEase = saluteProgress * saluteProgress * (3 - 2 * saluteProgress);
      const saluteAngle = -saluteEase * 1.12;
      const bob = reducedMotion ? 0 : Math.sin(now / 850) * 1.2;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.globalAlpha = variant === "welcome" ? fadeIn : (visible ? fadeOut : 1);

      // Back arm first, then legs and torso, so the shoulder sockets tuck behind the body.
      drawPart("leftArm", 74, 202 + bob, 105, 184, 0.12, 88, 18);
      drawPart("leftLeg", 163, 365 + bob, 73, 112);
      drawPart("rightLeg", 226, 365 + bob, 73, 112);
      drawPart("body", 145, 190 + bob, 190, 218);

      // Saluting arm rotates from its shoulder toward the temple; the head remains unobstructed until the hand arrives.
      drawPart("rightArm", 286, 202 + bob, 105, 184, saluteAngle, 18, 18);
      drawPart("head", 105, 18 + bob, 270, 225, nod, 135, 190);
      context.restore();

      if (variant === "welcome" && t > 3.7) finished = true;
      if (variant === "farewell" && visible && t > 4.7) finished = true;
      if (variant === "welcome" ? !finished : visible && !finished) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      visible = true;
      finished = false;
      startedAt = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    const observer = variant === "farewell" && sectionRef.current
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting) && !visible) start();
        }, { threshold: 0.35 })
      : null;
    if (observer && sectionRef.current) observer.observe(sectionRef.current);

    image.onload = () => {
      (Object.keys(SPRITES) as Array<keyof typeof SPRITES>).forEach((key) => {
        keyed[key] = makeKeyedCrop(image, SPRITES[key]);
      });
      if (variant === "welcome") start();
      else {
        // Keep the farewell character visible in a neutral pose until it enters view.
        startedAt = performance.now();
        context.clearRect(0, 0, canvas.width, canvas.height);
        draw(startedAt);
        cancelAnimationFrame(raf);
      }
    };
    image.onerror = () => context.clearRect(0, 0, canvas.width, canvas.height);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [variant, replayKey]);

  return (
    <section
      ref={sectionRef}
      aria-label={variant === "welcome" ? "ULAK karşılama animasyonu" : "ULAK asker selamıyla veda animasyonu"}
      className={`ulak-motion ulak-motion--${variant}`}
    >
      <button
        type="button"
        className="ulak-motion__replay"
        onClick={replay}
        aria-label="ULAK animasyonunu yeniden oynat"
        title="Tekrar oynat"
      >
        <span className="ulak-motion__character">
          <canvas ref={canvasRef} width={480} height={470} role="img" aria-label="ULAK robot karakteri; dokunarak selamını tekrar izleyin" />
          <span className="ulak-motion__tap-hint">↻ Tekrar izle</span>
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
