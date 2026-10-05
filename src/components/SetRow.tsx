"use client";

import { useEffect, useRef, useState } from "react";
import { fmtKg, fmtLoad } from "@/lib/progress";

/** The weight stepper always moves in whole kilos, whatever the exercise's progression jump. */
const STEP_KG = 1;

export type RowStatus = "idle" | "saving" | "done" | "error";

type Props = {
  index: number;
  weight: number | null;
  reps: number;
  status: RowStatus;
  active: boolean;
  repMin: number;
  repMax: number;
  bodyweight: boolean;
  perSide: boolean;
  onChange: (v: { weight?: number | null; reps?: number }) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
};

export function SetRow({ index, weight, reps, status, active, repMin, repMax, bodyweight, perSide, onChange, onConfirm, onUnconfirm }: Props) {
  const done = status === "done";
  const canConfirm = weight !== null || bodyweight;
  const range = reps < repMin ? "below" : reps > repMax ? "above" : "in";
  // Reps outside the target range: the set counts, but the card drops to an outline.
  const offTarget = range !== "in";
  // A bodyweight exercise stores the added load; 0 means plain bodyweight.
  const load = weight ?? 0;
  const unit = bodyweight ? (load > 0 ? "kg added" : "bodyweight") : "kg";

  if (done) {
    return (
      <button
        type="button"
        onClick={onUnconfirm}
        className={`anim-pop flex h-16 w-full items-center gap-3 rounded-[14px] px-4 ${offTarget ? "bg-surface text-accent ring-2 ring-inset ring-accent" : "bg-accent text-accent-ink"}`}
        aria-label={`Set ${index} done: ${bodyweight ? (load > 0 ? `bodyweight plus ${fmtKg(load)} kg` : "bodyweight") : `${fmtKg(load)} kg`} × ${reps}.${range === "below" ? ` Below target ${repMin} to ${repMax} reps.` : range === "above" ? ` Above target ${repMin} to ${repMax} reps.` : ""} Tap to edit`}
      >
        <span className="w-6 text-left text-sm font-bold opacity-70">{index}</span>
        <span className="font-display flex-1 text-left text-[30px]">
          {fmtLoad(load, bodyweight)}
          {(!bodyweight || load > 0) && <span className="ml-1 text-[16px] font-bold opacity-70">kg</span>}
          <span className="mx-3 opacity-50">×</span>
          {reps}
          {perSide && <span className="ml-1 text-[16px] font-bold opacity-70">/ side</span>}
        </span>
        {offTarget && (
          <span className="font-sans tnum shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-bold" aria-hidden="true">
            {reps} / {repMin}–{repMax}
          </span>
        )}
        <CheckIcon />
      </button>
    );
  }

  return (
    <div
      className={`relative flex flex-col gap-2 rounded-[14px] px-2 pb-2 pt-2 transition-opacity ${active ? "bg-surface-2" : "opacity-45"}`}
      aria-current={active ? "step" : undefined}
    >
      <span className="absolute left-2 top-1 text-[10px] font-bold leading-none text-muted" aria-hidden="true">
        {index}
      </span>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_52px] items-center gap-2 pt-2">
        <Stepper
          value={weight}
          display={weight === null ? "—" : bodyweight ? (weight > 0 ? `+${fmtKg(weight)}` : "BW") : fmtKg(weight)}
          unit={unit}
          big={active}
          onDec={() => onChange({ weight: Math.max(0, (weight ?? 0) - STEP_KG) })}
          onInc={() => onChange({ weight: (weight ?? 0) + STEP_KG })}
          onInput={(v) => onChange({ weight: v })}
          decimal
        />
        <Stepper
          value={reps}
          display={String(reps)}
          unit={perSide ? "/side" : "reps"}
          big={active}
          onDec={() => onChange({ reps: Math.max(0, reps - 1) })}
          onInc={() => onChange({ reps: reps + 1 })}
          onInput={(v) => onChange({ reps: Math.max(0, Math.round(v ?? 0)) })}
          tone={range === "below" ? "danger" : range === "above" ? "pr" : undefined}
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm || status === "saving"}
          aria-label={`Confirm set ${index}`}
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-colors ${
            active ? "bg-accent text-accent-ink" : "bg-surface text-muted"
          } disabled:opacity-40`}
        >
          {status === "saving" ? <Spinner /> : <CheckIcon />}
        </button>
      </div>
      {range !== "in" && active && (
        <p className={`px-1 text-[12px] font-semibold ${range === "below" ? "text-danger" : "text-pr"}`} role="status">
          {range === "below" ? `Below target: ${repMin}–${repMax} reps` : `Above target: ${repMin}–${repMax} reps. Add weight next time.`}
        </p>
      )}
      {status === "error" && (
        <button type="button" onClick={onConfirm} className="flex h-9 items-center justify-between rounded-[10px] bg-danger/15 px-3 text-sm font-semibold text-danger">
          Not saved <span>Retry</span>
        </button>
      )}
    </div>
  );
}

function Stepper({
  value,
  display,
  unit,
  big,
  onDec,
  onInc,
  onInput,
  decimal,
  tone,
}: {
  value: number | null;
  display: string;
  unit: string;
  big: boolean;
  onDec: () => void;
  onInc: () => void;
  onInput: (v: number | null) => void;
  decimal?: boolean;
  tone?: "danger" | "pr";
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  function commit() {
    const n = parseFloat(text.trim().replace(",", "."));
    onInput(Number.isFinite(n) ? n : value);
    setEditing(false);
  }

  const long = display.length > 3;
  const toneClass = tone === "danger" ? "text-danger" : tone === "pr" ? "text-pr" : "";
  return (
    <div className="flex min-w-0 items-center">
      <button type="button" onClick={onDec} aria-label={`Decrease ${unit}`} className="flex h-14 w-9 shrink-0 items-center justify-center rounded-l-[12px] bg-surface text-xl font-bold text-muted active:bg-border">
        −
      </button>
      {editing ? (
        <input
          ref={ref}
          // A number input silently drops the comma the German decimal keyboard types, so take text and parse it ourselves.
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          onChange={(e) => setText(e.target.value.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          className="font-display h-14 w-full min-w-0 bg-surface text-center text-[26px] text-accent outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setText(value === null ? "" : String(value));
            setEditing(true);
          }}
          className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center bg-surface"
          aria-label={`${display} ${unit}, tap to type`}
        >
          <span className={`font-display tnum leading-none transition-colors ${toneClass} ${big ? (long ? "text-[26px]" : "text-[32px]") : long ? "text-[20px]" : "text-[24px]"}`}>{display}</span>
          <span className="mt-0.5 text-[10px] font-semibold leading-none text-muted">{unit}</span>
        </button>
      )}
      <button type="button" onClick={onInc} aria-label={`Increase ${unit}`} className="flex h-14 w-9 shrink-0 items-center justify-center rounded-r-[12px] bg-surface text-xl font-bold text-muted active:bg-border">
        +
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Spinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
}
