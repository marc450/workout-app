"use client";

import { useEffect, useRef } from "react";
import { fmtKg, fmtLoad } from "@/lib/progress";
import { formatClock } from "@/lib/time";
import { setRules, type Exercise } from "@/plan";

export type PrevSet = { weight: number; reps: number };

type Props = {
  exercise: Exercise;
  setIndex: number; // 1-based
  weight: number | null; // what the row currently holds; null before a first weight is entered
  prev: PrevSet | null; // the same set last session
  hint: number | undefined; // progression suggestion for this exercise, if any
  note: string;
  onApplyHint: () => void;
  onStart: () => void;
};

/** "60 kg", "BW", "BW +5 kg". */
function loadText(weight: number, bodyweight: boolean): string {
  const s = fmtLoad(weight, bodyweight);
  return bodyweight && weight === 0 ? s : `${s} kg`;
}

/** One line on what to go for, judged against the same set last session. */
function aimLine(ex: Exercise, weight: number | null, prev: PrevSet | null, hint: number | undefined): string {
  if (!prev) return ex.bodyweight ? "First time. Bodyweight only, add load once you clear the range." : "First time. Find a weight that lands in the range.";
  const was = `Last time ${loadText(prev.weight, !!ex.bodyweight)} × ${prev.reps}`;
  if (weight !== null && weight > prev.weight) return `${was}. New weight, aim for ${ex.repMin} or more.`;
  if (weight !== null && weight < prev.weight) return `${was}. Lighter today, aim for ${ex.repMax}.`;
  if (prev.reps >= ex.repMax) {
    return hint !== undefined && weight !== hint ? `${was}. Every set hit ${ex.repMax}, take the extra weight.` : `${was}. Match it.`;
  }
  return `${was}. Aim for ${Math.min(prev.reps + 1, ex.repMax)}.`;
}

/**
 * Bottom sheet shown when the rest ends (or on demand): the target and the rules for the next set.
 * Stays until "Start set" or the backdrop is tapped.
 */
export function SetBriefing({ exercise: ex, setIndex, weight, prev, hint, note, onApplyHint, onStart }: Props) {
  const startRef = useRef<HTMLButtonElement>(null);
  const bodyweight = !!ex.bodyweight;
  const showHint = hint !== undefined && weight !== hint;

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStart();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <div className="anim-fade-in fixed inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
      <button type="button" className="absolute inset-0 touch-none bg-bg/70 backdrop-blur-sm" aria-label="Close" onClick={onStart} />
      <div
        className="anim-slide-up relative max-h-[88dvh] overflow-y-auto rounded-t-[24px] bg-surface-2 px-5 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>Next up</span>
          <span className="tnum">
            Set {setIndex} of {ex.sets} · Rest {formatClock(ex.restSec)}
          </span>
        </div>
        <h2 id="briefing-title" className="font-display mt-1 text-[36px] text-text">
          {ex.name}
        </h2>

        <div className="font-display tnum mt-4 leading-none text-accent">
          <span className="text-[48px]">{weight === null ? "—" : fmtLoad(weight, bodyweight)}</span>
          {weight !== null && (!bodyweight || weight > 0) && <span className="ml-1 text-[20px] text-muted">kg</span>}
          <span className="mx-3 text-[28px] text-muted">×</span>
          <span className="text-[48px]">
            {ex.repMin}–{ex.repMax}
          </span>
          {ex.perSide && <span className="ml-1 text-[20px] text-muted">/ side</span>}
        </div>
        <p className="mt-2 text-[14px] text-text/90">{aimLine(ex, weight, prev, hint)}</p>
        {showHint && (
          <button
            type="button"
            onClick={onApplyHint}
            className="mt-3 inline-flex h-10 items-center rounded-full bg-accent px-4 text-[14px] font-bold text-accent-ink active:opacity-80"
            aria-label={`Apply progression: ${bodyweight ? `bodyweight plus ${fmtKg(hint)} kg` : `${fmtKg(hint)} kg`}`}
          >
            +{fmtKg(ex.incrementKg)} kg{bodyweight ? " added" : ""} → {fmtLoad(hint, bodyweight)}
          </button>
        )}

        <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">Rules</div>
        <Bullets items={setRules(ex)} />
        {ex.cues && ex.cues.length > 0 && (
          <>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Form</div>
            <Bullets items={ex.cues} />
          </>
        )}
        {note && (
          <div className="mt-4 rounded-[10px] bg-surface px-3 py-2 text-[13px] text-text">
            <span className="text-muted">Your note · </span>
            <span className="whitespace-pre-wrap">{note}</span>
          </div>
        )}

        <button ref={startRef} type="button" onClick={onStart} className="mt-5 h-14 w-full rounded-[14px] bg-accent text-lg font-bold text-accent-ink active:opacity-80">
          Start set
        </button>
      </div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1.5 text-[14px] text-text/90">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span className="text-muted" aria-hidden="true">
            ·
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
