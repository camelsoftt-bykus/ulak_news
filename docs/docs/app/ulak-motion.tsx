"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UlakMotionProps = { variant: "welcome" | "farewell" };
type Crop = { x: number; y: number; w: number; h: number };
type PartName = "head" | "torso" | "armLeft" | "armRight" | "legLeft" | "legRight";
type ArmName = "armLeft" | "armRight";
type RigPartName = "upperLeft" | "upperRight" | "foreLeft" | "foreRight" | "handLeft" | "handRight";

// Gövde ve kafa: eski parça sayfası
const PART_SHEET = "/1795656495621.jpg";
// Eklemli kol parçaları: üst kol, ön kol ve eller ayrı sprite olarak kullanılır.
const RIG_SHEET = "/1795733381339.jpg";
// Geri dönüş kol sprite'ları, eklemli parçalar yüklenemezse kullanılır.
const ARM_SHEET = "/1795638496249.jpg";
// Bacaklar: önden referans
const FRONT_REFERENCE = "/1795636155857.jpg";

const ASSET_COUNT = 4;

const PART_CROPS: Record<"head" | "torso", Crop> = {
  head: { x: 30, y: 52, w: 355, h: 310 },
  torso: { x: 412, y: 118, w: 205, h: 292 },
};

// Kol kırpmaları, yeni sayfada piksel ölçümüyle belirlendi.
// Sol kol 664–807 x 145–435, sağ kol 851–984 x 143–436.
const ARM_CROPS: Record<ArmName, Crop> = {
  armLeft: { x: 660, y: 141, w: 152, h: 299 },
  armRight: { x: 847, y: 139, w: 141, h: 301 },
};

const FRONT_LEG_CROPS: Record<"legLeft" | "legRight", Crop> = {
  legLeft: { x: 570, y: 470, w: 122, h: 245 },
  legRight: { x: 685, y: 470, w: 122, h: 245 },
};

// Ayrı üst kol, ön kol ve el kırpmaları; kaynak görsel 704 x 1524.
const RIG_CROPS: Record<RigPartName, Crop> = {
  upperLeft: { x: 94, y: 302, w: 106, h: 158 },
  upperRight: { x: 506, y: 302, w: 112, h: 158 },
  foreLeft: { x: 91, y: 486, w: 78, h: 153 },
  foreRight: { x: 544, y: 486, w: 79, h: 153 },
  handLeft: { x: 94, y: 665, w: 82, h: 103 },
  handRight: { x: 522, y: 665, w: 104, h: 103 },
};
// Fallback kol çizimi için eski sprite ölçeği ve omuz pivotları.
const ARM_SCALE = 176 / 304;
const ARM_PIVOTS: Record<ArmName, { x: number; y: number }> = {
  armLeft: { x: 123, y: 29 }, armRight: { x: 23, y: 27 },
};
const RIG_SCALE = 0.56;
const RIG_PIVOTS: Record<RigPartName, { x: number; y: number }> = {
  upperLeft: { x: 72, y: 29 }, upperRight: { x: 29, y: 29 },
  foreLeft: { x: 39, y: 14 }, foreRight: { x: 39, y: 14 },
  handLeft: { x: 41, y: 13 }, handRight: { x: 52, y: 13 },
};

const TORSO = { x: 153, y: 174, w: 174, h: 212 };

const SHOULDER_LEFT = { x: 176, y: 239 };
const SHOULDER_RIGHT = { x: 310, y: 239 };
const ARM_OUT_ANGLE = 0.1;
// Tek sol kolun selamlaşma/kaldırma açısı.
const WAVE_ANGLE = (122 * Math.PI) / 180;

type SpriteMap = Partial<Record<PartName, HTMLCanvasElement>>;
type RigSpriteMap = Partial<Record<RigPartName, HTMLCanvasElement>>;

function preparePart(source: HTMLImageElement, crop: Crop, background: "cyan" | "checker"): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = crop.w;
  canvas.height = crop.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const frame = ctx.getImageData(0, 0, crop.w, crop.h);
  const pixels = frame.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    if (background === "cyan") {
      const cyan = g > 145 && b > 145 && r < 110 && Math.min(g, b) - r > 55;
      const cyanEdge = g > 125 && b > 125 && r < 135 && Math.min(g, b) - r > 32;
      if (cyan) pixels[i + 3] = 0;
      else if (cyanEdge) pixels[i + 3] = Math.round(pixels[i + 3] * 0.16);
    } else {
      // The checkerboard is neutral grey/white; the warm cream/orange robot
      // remains chromatically distinct. Softly feather edge pixels.
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min < 18 && min > 100) pixels[i + 3] = 0;
      else if (max - min < 26 && min > 145) pixels[i + 3] = Math.round(pixels[i + 3] * 0.18);
    }
  }

  ctx.putImageData(frame, 0, 0);
  return canvas;
}

function prepareRigPart(source: HTMLImageElement, crop: Crop): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = crop.w; canvas.height = crop.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const frame = ctx.getImageData(0, 0, crop.w, crop.h);
  const p = frame.data;
  for (let i = 0; i < p.length; i += 4) {
    const rr=p[i], gg=p[i+1], bb=p[i+2];
    const spread=Math.max(rr,gg,bb)-Math.min(rr,gg,bb);
    if (rr > 242 && gg > 242 && bb > 238 && spread < 18) p[i+3]=0;
    else if (rr > 232 && gg > 232 && bb > 228 && spread < 15) p[i+3]=Math.round(p[i+3]*0.18);
  }
  ctx.putImageData(frame,0,0);
  return canvas;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start: number, end: number, value: number): number {
  const p = clamp01((value - start) / (end - start));
  return p * p * (3 - 2 * p);
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

    const partImage = new Image();
    const armImage = new Image();
    const rigImage = new Image();
    const frontImage = new Image();

    partImage.src = PART_SHEET;
    armImage.src = ARM_SHEET;
    rigImage.src = RIG_SHEET;
    frontImage.src = FRONT_REFERENCE;

    const sprites: SpriteMap = {};
    const rigSprites: RigSpriteMap = {};
    let readyCount = 0;
    let animationFrame = 0;
    let startedAt = 0;
    let disposed = false;
    let started = false;
    let observer: IntersectionObserver | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const drawPart = (
      name: PartName,
      x: number,
      y: number,
      width: number,
      height: number,
      angle = 0,
      pivotX = width / 2,
      pivotY = height * 0.12
    ) => {
      const sprite = sprites[name];
      if (!sprite) return;
      ctx.save();
      ctx.translate(x + pivotX, y + pivotY);
      ctx.rotate(angle);
      ctx.drawImage(sprite, -pivotX, -pivotY, width, height);
      ctx.restore();
    };

    // Omuz -> üst kol -> dirsek -> ön kol -> bilek -> el zinciri.
    const drawJointArm = (side: "Left" | "Right", shoulderX: number, shoulderY: number, shoulderAngle: number, elbowBend: number, wristAngle: number) => {
      const upperName: RigPartName = side === "Left" ? "upperLeft" : "upperRight";
      const foreName: RigPartName = side === "Left" ? "foreLeft" : "foreRight";
      const handName: RigPartName = side === "Left" ? "handLeft" : "handRight";
      const upper=rigSprites[upperName], fore=rigSprites[foreName], hand=rigSprites[handName];
      if (!upper || !fore || !hand) return;
      const up=RIG_PIVOTS[upperName], fp=RIG_PIVOTS[foreName], hp=RIG_PIVOTS[handName];
      const elbowLocal = side === "Left" ? {x:-49*RIG_SCALE,y:91*RIG_SCALE} : {x:55*RIG_SCALE,y:91*RIG_SCALE};
      ctx.save();
      ctx.translate(shoulderX,shoulderY);
      ctx.rotate(shoulderAngle);
      ctx.drawImage(upper,-up.x*RIG_SCALE,-up.y*RIG_SCALE,upper.width*RIG_SCALE,upper.height*RIG_SCALE);
      ctx.translate(elbowLocal.x,elbowLocal.y);
      ctx.rotate((side === "Left" ? -0.10 : 0.10)+elbowBend);
      ctx.drawImage(fore,-fp.x*RIG_SCALE,-fp.y*RIG_SCALE,fore.width*RIG_SCALE,fore.height*RIG_SCALE);
      ctx.translate(0,121*RIG_SCALE);
      ctx.rotate(wristAngle);
      if (side === "Left" && variant === "farewell") {
        // Vedada eli bilek ekseninde yatay aynala; avuç/el yönü ters tarafa bakmasın.
        ctx.scale(-1, 1);
        ctx.drawImage(hand, -(hand.width - hp.x) * RIG_SCALE, -hp.y * RIG_SCALE, hand.width * RIG_SCALE, hand.height * RIG_SCALE);
      } else {
        ctx.drawImage(hand, -hp.x * RIG_SCALE, -hp.y * RIG_SCALE, hand.width * RIG_SCALE, hand.height * RIG_SCALE);
      }
      ctx.restore();
    };

    // Eski kol çizimi, yeni parça görseli yüklenemezse geri dönüş olarak kalır.
    const drawArm = (name: ArmName, shoulderX: number, shoulderY: number, angle: number) => {
      const sprite = sprites[name];
      if (!sprite) return;
      const pivot = ARM_PIVOTS[name];

      ctx.save();
      ctx.translate(shoulderX, shoulderY);
      ctx.rotate(angle);
      ctx.drawImage(
        sprite,
        -pivot.x * ARM_SCALE,
        -pivot.y * ARM_SCALE,
        sprite.width * ARM_SCALE,
        sprite.height * ARM_SCALE
      );
      ctx.restore();
    };

    const drawBeam = (opacity: number, descent: number) => {
      if (opacity <= 0.01 || descent <= 0.01) return;
      const w = canvas.width;
      const bottom = 8 + descent * (canvas.height - 16);
      const half = 22 + descent * 190;
      const coreHalf = 8 + descent * 72;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "rgba(90,255,0,1)";
      ctx.shadowBlur = 36;
      const glow = ctx.createLinearGradient(0, 0, 0, bottom);
      glow.addColorStop(0, "rgba(250,255,220,1)");
      glow.addColorStop(0.2, "rgba(145,255,0,0.98)");
      glow.addColorStop(0.7, "rgba(65,255,0,0.62)");
      glow.addColorStop(1, "rgba(45,235,0,0.03)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 13, 0);
      ctx.lineTo(w / 2 - half, bottom);
      ctx.quadraticCurveTo(w / 2, bottom + 20, w / 2 + half, bottom);
      ctx.lineTo(w / 2 + 13, 0);
      ctx.closePath();
      ctx.fill();
      const core = ctx.createLinearGradient(0, 0, 0, bottom);
      core.addColorStop(0, "rgba(255,255,245,1)");
      core.addColorStop(0.45, "rgba(205,255,105,0.9)");
      core.addColorStop(1, "rgba(105,255,20,0.02)");
      ctx.shadowBlur = 18;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 5, 0);
      ctx.lineTo(w / 2 - coreHalf, bottom - 3);
      ctx.quadraticCurveTo(w / 2, bottom + 8, w / 2 + coreHalf, bottom - 3);
      ctx.lineTo(w / 2 + 5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = (now: number, fixedTime?: number) => {
      if (disposed || readyCount !== ASSET_COUNT) return;
      const t = fixedTime ?? (now - startedAt) / 1000;
      const welcome = variant === "welcome";
      const idle = !welcome && t >= 5.8;
      const idleT = idle ? t - 5.8 : 0;

      let beamIn = 0;
      let beamOpacity = 0;
      let characterOpacity = 1;
      let characterY = 0;
      let raise = 0;
      let nod = 0;

      if (welcome) {
        beamIn = smoothstep(0.02, 0.9, t);
        beamOpacity = smoothstep(0.02, 0.18, t) * (1 - smoothstep(2.55, 3.15, t));
        const arrival = smoothstep(0.55, 1.75, t);
        characterOpacity = smoothstep(0.52, 1.05, t);
        characterY = -105 * (1 - arrival);
        nod = t > 1.8 && t < 2.8 ? Math.sin(((t - 1.8) / 1.0) * Math.PI) * 0.055 : 0;
      } else {
        raise = smoothstep(0.35, 1.55, t);
        nod = t > 1.6 && t < 2.35 ? Math.sin(((t - 1.6) / 0.75) * Math.PI) * 0.045 : 0;
        const beamArrival = smoothstep(2.0, 2.72, t);
        const beamRetraction = smoothstep(4.35, 5.35, t);
        beamIn = beamArrival * (1 - beamRetraction);
        beamOpacity = smoothstep(2.0, 2.35, t) * (1 - smoothstep(4.85, 5.65, t));
        const lift = smoothstep(2.85, 4.3, t);
        characterY = -lift * 178;
        characterOpacity = 1 - smoothstep(3.55, 4.45, t);
        if (idle) {
          beamIn = 0;
          beamOpacity = 0;
          characterOpacity = 1;
          characterY = Math.sin(idleT * 1.65) * 2.5;
          raise = 0;
          nod = Math.sin(idleT * 1.25) * 0.025;
        }
      }

      const breathing = reducedMotion ? 0 : Math.sin(now / 650) * (idle ? 2.1 : 1.0);
      // El sallama yumuşak girip çıkar; omuz açısına salınım eklenmez.
      const waveEnvelope = !welcome
        ? smoothstep(1.55, 1.8, t) * (1 - smoothstep(2.6, 2.9, t))
        : 0;
      const wave = waveEnvelope * Math.sin((t - 1.6) * Math.PI * 2 * 1.2) * 0.10;
      const armSwayWrist = idle && !reducedMotion
        ? Math.sin(idleT * 1.6) * 0.018
        : 0;
      const legSway = idle && !reducedMotion ? Math.sin(idleT * 1.4) * 0.012 : 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBeam(beamOpacity, beamIn);

      if (characterOpacity > 0.01) {
        ctx.save();
        ctx.globalAlpha = characterOpacity;
        ctx.translate(canvas.width / 2, 235 + characterY + breathing);
        ctx.scale(0.72, 0.72);
        ctx.translate(-canvas.width / 2, -235);

        // Front-view feet/legs match the supplied complete-character reference.
        // The two leg sprites are kept vertical and move only by a tiny symmetric sway.
        // Kaynak görseldeki sağ/sol bacak parçaları yer değiştirilerek çizilir.
        // Ayak uçlarını dışa çevir: ekranda soldaki bacak +, sağdaki bacak - açı alır.
        const TOE_OUT_ANGLE = (10 * Math.PI) / 180;
        drawPart("legRight", 166, 310, 72, 142, TOE_OUT_ANGLE + legSway, 36, 12);
        drawPart("legLeft", 242, 310, 72, 142, -TOE_OUT_ANGLE - legSway, 36, 12);

        // Kollar tek bir sabit z-sırasında, daima gövdenin arkasında çizilir.
        const rigReady = Boolean(
          rigSprites.upperLeft && rigSprites.foreLeft && rigSprites.handLeft &&
          rigSprites.upperRight && rigSprites.foreRight && rigSprites.handRight
        );

        if (rigReady) {
          // Sağ kol: omuz salınımı yok.
          drawJointArm(
            "Right",
            SHOULDER_RIGHT.x,
            SHOULDER_RIGHT.y,
            0.12,
            -0.18,
            0
          );

          // Sol kol: kaldırma omuz/dirsekten, sallama yalnızca bilekten.
          const leftShoulder = -0.12 + raise * 2.05;
          const leftElbow = 0.18 + raise * 0.72;
          const leftWrist = wave * 2 + armSwayWrist;
          drawJointArm(
            "Left",
            SHOULDER_LEFT.x,
            SHOULDER_LEFT.y,
            leftShoulder,
            leftElbow,
            leftWrist
          );
        } else {
          // Eski tek-parça sprite yedeği: eklemli bilek hareketi desteklenmez.
          // Ölçülmemiş rig koordinatlarına veya kafa/gövde geometrisine dokunulmaz.
          drawArm("armRight", SHOULDER_RIGHT.x, SHOULDER_RIGHT.y, -ARM_OUT_ANGLE);
          const fallbackLeftAngle = lerp(ARM_OUT_ANGLE, WAVE_ANGLE, raise);
          drawArm("armLeft", SHOULDER_LEFT.x, SHOULDER_LEFT.y, fallbackLeftAngle);
        }

        drawPart("torso", TORSO.x, TORSO.y, TORSO.w, 212);
        drawPart("head", 119, 8, 242, 198, nod, 121, 176);
        ctx.restore();
      }

      if (fixedTime === undefined && !reducedMotion && (welcome ? t < 3.2 : true)) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    const start = () => {
      if (disposed || readyCount !== ASSET_COUNT) return;
      started = true;
      startedAt = performance.now();
      cancelAnimationFrame(animationFrame);
      if (reducedMotion) {
        render(performance.now(), welcomeTime());
        return;
      }
      animationFrame = requestAnimationFrame(render);
    };

    const welcomeTime = () => variant === "welcome" ? 2.25 : 1.2;

    const onAssetsReady = () => {
      readyCount += 1;
      if (readyCount !== ASSET_COUNT || disposed) return;

      sprites.head = preparePart(partImage, PART_CROPS.head, "cyan");
      sprites.torso = preparePart(partImage, PART_CROPS.torso, "cyan");
      sprites.armLeft = preparePart(armImage, ARM_CROPS.armLeft, "cyan");
      sprites.armRight = preparePart(armImage, ARM_CROPS.armRight, "cyan");
      for (const name of Object.keys(RIG_CROPS) as RigPartName[]) rigSprites[name] = prepareRigPart(rigImage, RIG_CROPS[name]);
      sprites.legLeft = preparePart(frontImage, FRONT_LEG_CROPS.legLeft, "checker");
      sprites.legRight = preparePart(frontImage, FRONT_LEG_CROPS.legRight, "checker");

      if (variant === "welcome") {
        start();
        return;
      }

      render(performance.now(), 0);
      if (reducedMotion) {
        render(performance.now(), 1.2);
        return;
      }
      if (sectionRef.current) {
        observer = new IntersectionObserver((entries) => {
          if (!started && entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            start();
          }
        }, { threshold: 0.01, rootMargin: "0px 0px 120px 0px" });
        observer.observe(sectionRef.current);
      }
    };

    partImage.onload = onAssetsReady;
    armImage.onload = onAssetsReady;
    rigImage.onload = onAssetsReady;
    frontImage.onload = onAssetsReady;
    partImage.onerror = () => console.error("ULAK parça görseli yüklenemedi:", PART_SHEET);
    armImage.onerror = () => console.error("ULAK kol görseli yüklenemedi:", ARM_SHEET);
    rigImage.onerror = () => console.error("ULAK eklemli uzuv görseli yüklenemedi:", RIG_SHEET);
    frontImage.onerror = () => console.error("ULAK önden referans görseli yüklenemedi:", FRONT_REFERENCE);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      partImage.onload = null;
      armImage.onload = null;
      rigImage.onload = null;
      frontImage.onload = null;
      partImage.onerror = null;
      armImage.onerror = null;
      rigImage.onerror = null;
      frontImage.onerror = null;
    };
  }, [variant, replayKey]);

  return (
    <section
      ref={sectionRef}
      aria-label={variant === "welcome" ? "ULAK karşılama animasyonu" : "ULAK veda animasyonu"}
      className={`ulak-motion ulak-motion--${variant}`}
    >
      <button type="button" className="ulak-motion__replay" onClick={replay} aria-label="ULAK animasyonunu yeniden oynat">
        <span className="ulak-motion__character">
          <canvas ref={canvasRef} width={480} height={470} role="img" aria-label="ULAK robot karakteri; dokunarak animasyonu yeniden oynatın" />
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
