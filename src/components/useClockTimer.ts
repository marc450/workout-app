"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Opt-in iOS Clock timer via the Shortcuts app.
 *
 * A web app cannot run in the background on iOS, so the in-app rest timer is silent
 * once the phone is locked or another app is open. As a workaround, Lift can hand the
 * rest duration to a user-created Shortcut that starts a Clock timer. That timer rings
 * on the lock screen, in other apps and regardless of the silent switch.
 */

const KEY = "lift.clockTimer";

/** Name of the Shortcut the user creates once. Must match exactly. */
export const SHORTCUT_NAME = "Lift Rest";

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Build the URL that runs the Shortcut with the duration in seconds as text input. */
export function clockTimerUrl(seconds: number): string {
  const s = Math.max(1, Math.round(seconds));
  return `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${s}`;
}

/** Must be called from a user gesture: iOS only follows custom URL schemes on a tap. */
export function openClockTimer(seconds: number) {
  try {
    window.location.href = clockTimerUrl(seconds);
  } catch {
    /* ignore */
  }
}

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Persisted opt-in. Reads localStorage after mount to avoid a hydration mismatch. */
export function useClockTimerSetting(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setEnabledState(read()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try {
      if (v) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return [enabled, setEnabled];
}
