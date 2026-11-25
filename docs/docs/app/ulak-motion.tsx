"use client";

import { useEffect, useRef } from "react";

type UlakMotionProps = { variant: "welcome" | "farewell" };

type Sprite = { x: number; y: number; w: number; h: number };

const SPRITES = {
  head: { x: 34, y: 54, w: 350, h: 320 },
  body: { x: 410, y: 128, w: 210, h: 286 },
  leftArm: { x: 650, y: 130, w: 170, h: 310 },
  rightArm: { x: 820, y: 130, w: 170, h: 310 },
  leftLeg: { x: 112, y: 540, w: 220, h: 410 },
  rightLeg: { x: 700, y: 540, w: 220, h: 410 },
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
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    // Remove the uniform turquoise key while retaining warm orange highlights.
    if (g > 145 && b > 145 && r < 95 && Math.min(g, b) - r > 75) {
      pixels[i + 3] = 0;
    } else if (g > 125 && b > 125 && r < 125 && Math.min(g, b) - r > 42) {
      pixels[i + 3] = Math.max(0, pixels[i + 3] - 150);
    }
  }
  context.putImageData(frame, 0, 0);
  return canvas;
}

export default function UlakMotion({ variant }: UlakMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

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

    const observer = variant === "farewell" && sectionRef.current
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting) && !visible) {
            visible = true;
            startedAt = performance.now();
            finished = false;
            raf = requestAnimationFrame(draw);
          }
        }, { threshold: 0.45 })
      : null;
    if (observer && sectionRef.current) observer.observe(sectionRef.current);

    const keyed: Partial<Record<keyof typeof SPRITES, HTMLCanvasElement>> = {};
    const draw = (now: number) => {
      if (disposed || !context) return;
      if (!startedAt) startedAt = now;
      const elapsed = visible ? (now - startedAt) / 1000 : 0;
      const t = reducedMotion ? 5 : elapsed;
      const fadeIn = variant === "welcome" ? Math.min(1, t / 0.9) : 1;
      const fadeOut = variant === "farewell" && visible ? Math.max(0, 1 - Math.max(0, t - 3.1) / 0.9) : 1;
      const opacity = variant === "welcome" ? fadeIn : (visible ? fadeOut : 1);
      const nod = variant === "welcome"
        ? (t < 1.2 ? 0 : t < 2.25 ? Math.sin(((t - 1.2) / 1.05) * Math.PI) * 0.13 : 0)
        : (t > 2.25 && t < 3.0 ? Math.sin(((t - 2.25) / 0.75) * Math.PI) * 0.1 : 0);
      const armRaise = variant === "welcome"
        ? (t > 1.1 && t < 2.7 ? -Math.sin(((t - 1.1) / 1.6) * Math.PI) * 0.25 : 0)
        : (t < 2.6 ? 0 : Math.min(1, (t - 2.6) / 0.55) * -1.12);

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.globalAlpha = opacity;
      const bob = reducedMotion ? 0 : Math.sin(now / 650) * 2;
      // Legs and torso form a compact, centered presenter silhouette.
      const drawPart = (key: keyof typeof SPRITES, x: number, y: number, w: number, h: number, angle = 0, pivotX = w / 2, pivotY = 0) => {
        const part = keyed[key];
        if (!part) return;
        context.save();
        context.translate(x + pivotX, y + pivotY);
        context.rotate(angle);
        context.drawImage(part, -pivotX, -pivotY, w, h);
        context.restore();
      };

      drawPart("leftLeg", 158, 305 + bob, 54, 104);
      drawPart("rightLeg", 211, 305 + bob, 54, 104);
      drawPart("body", 137, 172 + bob, 150, 190);
      drawPart("leftArm", 78, 184 + bob, 78, 142, variant === "welcome" ? 0.08 : 0.04, 64, 18);
      drawPart("rightArm", 264, 184 + bob, 78, 142, armRaise, 14, 18);
      drawPart("head", 106, 15 + bob, 212, 194, nod, 106, 166);
      context.restore();

      if (variant === "welcome" && t > 4.2) finished = true;
      if (variant === "farewell" && visible && t > 4.1) finished = true;
      if (variant === "welcome" ? !finished : visible && !finished) raf = requestAnimationFrame(draw);
    };

    image.onload = () => {
      (Object.keys(SPRITES) as Array<keyof typeof SPRITES>).forEach((key) => {
        keyed[key] = makeKeyedCrop(image, SPRITES[key]);
      });
      startedAt = performance.now();
      raf = requestAnimationFrame(draw);
    };
    image.onerror = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [variant]);

  return (
    <section
      ref={sectionRef}
      aria-label={variant === "welcome" ? "ULAK karşılama animasyonu" : "ULAK selamlama animasyonu"}
      className={`ulak-motion ulak-motion--${variant}`}
    >
      <div className="ulak-motion__character">
        <canvas ref={canvasRef} width={420} height={430} role="img" aria-label="Turuncu ve krem renkli ULAK robot karakteri" />
      </div>
      <div className="ulak-motion__copy">
        <span>{variant === "welcome" ? "ULAK’TAN HABERLER" : "BİZİ TAKİPTE KALIN"}</span>
        <strong>{variant === "welcome" ? "Merhaba, ben ULAK." : "Bir sonraki haberde görüşmek üzere."}</strong>
        <p>{variant === "welcome" ? "Günün gelişmelerini sizin için takip ediyorum." : "Güvenilir haber için ULAK’tan ayrılmayın."}</p>
      </div>
    </section>
  );
}
