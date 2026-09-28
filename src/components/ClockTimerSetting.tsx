"use client";

import { useEffect, useState } from "react";
import { haptic } from "./useRestTimer";
import { SHORTCUT_NAME, isIOS, openClockTimer } from "./useClockTimer";

type Props = { enabled: boolean; onChange: (v: boolean) => void };

/** iOS-only opt-in: start a Clock timer through the Shortcuts app on every confirmed set. */
export function ClockTimerSetting({ enabled, onChange }: Props) {
  const [ios, setIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setIos(isIOS()), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!ios) return null;

  return (
    <div className="mt-3 rounded-card bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setShowHelp((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={showHelp}>
          <div className="text-[13px] font-semibold text-text">iOS Clock timer</div>
          <div className="text-[12px] text-muted">{enabled ? "Rings from the lock screen. Tap for setup." : "Off. Tap for setup."}</div>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="iOS Clock timer"
          onClick={() => {
            haptic(8);
            onChange(!enabled);
            if (!enabled) setShowHelp(true);
          }}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${enabled ? "bg-accent" : "bg-surface-2"}`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full transition-[left] ${enabled ? "left-7 bg-accent-ink" : "left-1 bg-muted"}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {showHelp && (
        <div className="mt-3 border-t border-border pt-3 text-[13px] leading-relaxed text-muted">
          <p className="text-text">
            One-time setup. Create a Shortcut named <span className="font-semibold">{SHORTCUT_NAME}</span>:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Open the Shortcuts app and tap +.</li>
            <li>
              Rename it to <span className="font-semibold text-text">{SHORTCUT_NAME}</span> exactly.
            </li>
            <li>
              Add the action <span className="font-semibold text-text">Start Timer</span> (Clock).
            </li>
            <li>
              Set the duration to <span className="font-semibold text-text">Shortcut Input</span> and the unit to seconds.
            </li>
            <li>
              Optional: add <span className="font-semibold text-text">Open App</span> → Lift at the end to jump back.
            </li>
          </ol>
          <p className="mt-2">
            Each confirmed set then opens Shortcuts for a moment and starts the timer. Use the back link in the status bar to return. Skipping or
            adjusting the rest in Lift does not change the Clock timer.
          </p>
          <button
            type="button"
            onClick={() => {
              haptic(8);
              openClockTimer(10);
            }}
            className="mt-3 h-11 w-full rounded-[12px] bg-surface-2 text-sm font-bold text-text"
          >
            Test with a 10 s timer
          </button>
        </div>
      )}
    </div>
  );
}
