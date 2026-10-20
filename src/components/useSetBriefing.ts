"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Opt-out for the set briefing: the sheet that shows the target and rules for the next set
 * when the rest ends. On by default; only an explicit off is stored.
 */
const KEY = "lift.setBriefing";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

/** Persisted setting. Reads localStorage after mount to avoid a hydration mismatch. */
export function useSetBriefingSetting(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setEnabledState(read()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try {
      if (v) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, "0");
    } catch {
      /* ignore */
    }
  }, []);

  return [enabled, setEnabled];
}
