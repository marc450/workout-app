"use client";

import { useEffect, useRef } from "react";

/** Viewport coordinates in CSS px the particles burst out from. */
export type BurstOrigin = { x: number; y: number };

const COLORS = ["#c8ff2e", "#ffd23f", "#f4f4f2", "#ff5b4a", "#7ad7ff"];

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Centre of an element in viewport px, or the middle of the screen when it isn't mounted. */
export function centerOf(el: HTMLElement | null | undefined): BurstOrigin {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight) };
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  round: boolean;
  life: number; // in frames at 60 fps
};

function spawn(origin: BurstOrigin, count: number, power: number, spread: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * spread;
    const speed = (5 + Math.random() * 9) * power;
    return {
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 5 + Math.random() * 5,
      h: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.25,
      life: 70 + Math.random() * 50,
    };
  });
}

type Props = {
  id: string;
  origin: BurstOrigin;
  /** Number of particles. */
  count?: number;
  /** Launch speed multiplier. */
  power?: number;
  /** Width of the launch cone as a fraction of a half turn; 1 is a wide fan, 2 is all directions. */
  spread?: number;
  /** Called once with the burst's id when every particle has settled; keep it stable. */
  onDone: (id: string) => void;
};

/**
 * One confetti burst drawn on a full-viewport canvas that ignores pointer events.
 * Mount an instance per burst and drop it again in onDone.
 */
export function Confetti({ id, origin, count = 90, power = 1, spread = 0.9, onDone }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    const parts = spawn(origin, count, power, spread);
    const start = performance.now();
    let last = start;
    let raf = 0;
    let finished = false;

    const frame = (t: number) => {
      const dt = Math.min(32, t - last) / (1000 / 60);
      last = t;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of parts) {
        if (p.life <= 0 || p.y > h + 20) continue;
        p.vy += 0.32 * dt;
        p.vx *= 0.985 ** dt;
        p.vy *= 0.985 ** dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life -= dt;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 25));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.h / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Squash the width as it tumbles so the flakes look like they flip in the air.
          ctx.fillRect((-p.w / 2) * Math.cos(p.rot * 2), -p.h / 2, p.w * Math.abs(Math.cos(p.rot * 2)) + 1, p.h);
        }
        ctx.restore();
      }
      if (alive > 0 && t - start < 5000) {
        raf = requestAnimationFrame(frame);
      } else {
        finished = true;
        onDone(id);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      if (!finished) cancelAnimationFrame(raf);
    };
  }, [id, origin, count, power, spread, onDone]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50 h-full w-full" aria-hidden="true" />;
}
