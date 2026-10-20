"use client";

import { useEffect, useState } from "react";
import { ToggleRow } from "./ui";
import { haptic } from "./useRestTimer";
import { SHORTCUT_NAME, isIOS } from "./useClockTimer";

type Props = { enabled: boolean; onChange: (v: boolean) => void };

/** iOS-only opt-in: start a Clock timer through the Shortcuts app on every confirmed set. */
export function ClockTimerSetting({ enabled, onChange }: Props) {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setIos(isIOS()), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!ios) return null;

  return (
    <ToggleRow
      title="iOS Clock timer"
      body={`Runs the “${SHORTCUT_NAME}” Shortcut after each set`}
      enabled={enabled}
      onChange={(v) => {
        haptic(8);
        onChange(v);
      }}
    />
  );
}
