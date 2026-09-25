"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "pplul.rest";

type Stored = { endAt: number; total: number; label: string };

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored;
    return typeof v.endAt === "number" ? v : null;
  } catch {
    return null;
  }
}

function write(v: Stored | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

let audioCtx: AudioContext | null = null;

/** Must be called from a user gesture at least once so iOS lets us play later. */
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    /* no audio */
  }
}

function beep() {
  try {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [0, 0.18, 0.36].forEach((t) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.14);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.15);
    });
  } catch {
    /* ignore */
  }
}

export function haptic(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export function useRestTimer() {
  const [state, setState] = useState<Stored | null>(null);
  const [remaining, setRemaining] = useState<number>(Infinity);
  const firedRef = useRef(false);

  // Restore a running timer after a reload (localStorage is only available after mount).
  useEffect(() => {
    const id = window.setTimeout(() => {
      const s = read();
      if (s && s.endAt > Date.now()) setState(s);
      else write(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!state) return;
    firedRef.current = false;
    const tick = () => {
      const left = (state.endAt - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        haptic([200, 100, 200]);
        beep();
      }
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 250);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state]);

  const start = useCallback((seconds: number, label: string) => {
    const s = { endAt: Date.now() + seconds * 1000, total: seconds, label };
    write(s);
    setRemaining(seconds);
    setState(s);
  }, []);

  const adjust = useCallback((deltaSec: number) => {
    setState((s) => {
      if (!s) return s;
      const base = Math.max(Date.now(), s.endAt);
      const next = { ...s, endAt: Math.max(Date.now() + 1000, base + deltaSec * 1000), total: Math.max(15, s.total + deltaSec) };
      write(next);
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    write(null);
    setState(null);
  }, []);

  const fired = !!state && remaining <= 0;

  // Auto-dismiss a few seconds after it fired.
  useEffect(() => {
    if (!fired) return;
    const id = window.setTimeout(stop, 6000);
    return () => window.clearTimeout(id);
  }, [fired, stop]);

  return { active: !!state, remaining: Number.isFinite(remaining) ? remaining : state?.total ?? 0, total: state?.total ?? 0, label: state?.label ?? "", fired, start, adjust, stop };
}

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (!("wakeLock" in navigator)) return;
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* denied or unsupported */
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && !cancelled) request();
    };
    request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}
