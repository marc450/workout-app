"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirmSet, ensureSession, finishSession, unconfirmSet } from "@/app/actions";
import type { LastResult, WorkoutData } from "@/lib/data";
import { fmtKg, fmtLoad, formatSets, round2, setVolume, totalReps } from "@/lib/progress";
import { formatClock, formatDate, formatDuration } from "@/lib/time";
import { DAY_BY_KEY, targetLabel, type Exercise } from "@/plan";
import { type BurstOrigin, Confetti, centerOf, prefersReducedMotion } from "./Celebration";
import { ClockTimerSetting } from "./ClockTimerSetting";
import { NoteEditor } from "./NoteEditor";
import { SetRow, type RowStatus } from "./SetRow";
import { openClockTimer, useClockTimerSetting } from "./useClockTimer";
import { haptic, unlockAudio, useRestTimer, useWakeLock } from "./useRestTimer";

type Row = { weight: number | null; reps: number; status: RowStatus };
type Rows = Record<string, Row[]>;
type Burst = { id: string; origin: BurstOrigin; count: number; power: number; spread: number };
type Finished = { volume: number; delta: number | null };

/** Total kg lifted across the confirmed sets. */
function doneVolume(rows: Row[]): number {
  return rows.reduce((sum, r) => (r.status === "done" ? sum + (r.weight ?? 0) * r.reps : sum), 0);
}

/** Total reps across the confirmed sets. */
function doneReps(rows: Row[]): number {
  return rows.reduce((sum, r) => (r.status === "done" ? sum + r.reps : sum), 0);
}

/**
 * How much the exercise beat its previous session by: kg of total volume, or total reps for a bodyweight exercise.
 * Null when it isn't complete yet, has no previous session, or didn't beat it.
 */
function beatBy(rows: Row[], last: LastResult | undefined, bodyweight: boolean): number | null {
  if (!last || last.sets.length === 0 || rows.some((r) => r.status !== "done")) return null;
  const delta = bodyweight ? doneReps(rows) - totalReps(last.sets) : round2(doneVolume(rows) - setVolume(last.sets));
  return delta > 0 ? delta : null;
}

/**
 * Session volume against the sum of every exercise's previous session; null when any exercise lifted today has no history.
 * Bodyweight exercises are left out: their kg volume is only the added load and says nothing about progress.
 */
function sessionDelta(rows: Rows, exercises: Exercise[], last: Record<string, LastResult>): number | null {
  let today = 0;
  let previous = 0;
  for (const ex of exercises) {
    if (ex.bodyweight || !rows[ex.slug].some((r) => r.status === "done")) continue;
    const l = last[ex.slug];
    if (!l || l.sets.length === 0) return null;
    today += doneVolume(rows[ex.slug]);
    previous += setVolume(l.sets);
  }
  if (previous === 0) return null;
  const delta = round2(today - previous);
  return delta > 0 ? delta : null;
}

/** The set logged at this index last session, falling back to its final set. */
function lastSet(last: LastResult | undefined, idx: number) {
  const sets = last?.sets ?? [];
  return sets.find((l) => l.set_index === idx) ?? sets[sets.length - 1];
}

/** A save that has not answered by now is treated as lost (iOS can freeze or drop it when Shortcuts takes over). */
const SAVE_TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error("Timed out")), ms);
    p.then(
      (v) => {
        window.clearTimeout(id);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(id);
        reject(e);
      },
    );
  });
}

/** Resolves once the page is in the foreground again, so a retry doesn't fire while Shortcuts or the Clock app is open. */
function whenVisible(): Promise<void> {
  if (document.visibilityState === "visible") return Promise.resolve();
  return new Promise((resolve) => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVis);
      resolve();
    };
    document.addEventListener("visibilitychange", onVis);
  });
}

function initialRows(data: WorkoutData, exercises: Exercise[]): Rows {
  const rows: Rows = {};
  for (const ex of exercises) {
    rows[ex.slug] = Array.from({ length: ex.sets }, (_, i) => {
      const idx = i + 1;
      const logged = data.logs.find((l) => l.exercise_slug === ex.slug && l.set_index === idx);
      if (logged) return { weight: Number(logged.weight_kg), reps: logged.reps, status: "done" as const };
      const prev = lastSet(data.last[ex.slug], idx);
      if (prev) return { weight: Number(prev.weight_kg), reps: prev.reps, status: "idle" as const };
      return { weight: ex.bodyweight ? 0 : null, reps: ex.repMin, status: "idle" as const };
    });
  }
  return rows;
}

export function WorkoutScreen({ data, editing = false }: { data: WorkoutData; editing?: boolean }) {
  const router = useRouter();
  const day = DAY_BY_KEY[data.dayKey];
  const exercises = day.exercises;
  const [rows, setRows] = useState<Rows>(() => initialRows(data, exercises));
  const [sessionId, setSessionId] = useState<string | null>(data.session?.id ?? null);
  const [startedAt, setStartedAt] = useState<number | null>(data.session ? new Date(data.session.started_at).getTime() : null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  // Exercises that already got their confetti (or were complete on load), so an unconfirm + reconfirm doesn't replay it.
  const [celebrated] = useState(() => new Set(exercises.filter((e) => beatBy(rows[e.slug], data.last[e.slug], !!e.bodyweight) !== null).map((e) => e.slug)));
  const [now, setNow] = useState<number | null>(null); // set after mount to avoid a hydration mismatch
  const sessionPromise = useRef<Promise<string | null> | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const rest = useRestTimer();
  const [clockTimer, setClockTimer] = useClockTimerSetting();

  const totalSets = exercises.reduce((n, e) => n + e.sets, 0);
  const doneSets = Object.values(rows).flat().filter((r) => r.status === "done").length;
  const active = startedAt !== null && !data.session?.finished_at;
  useWakeLock(active || doneSets > 0);

  useEffect(() => {
    if (!startedAt) return;
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [startedAt]);

  const getSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!sessionPromise.current) {
      sessionPromise.current = ensureSession(data.dayKey).then(
        (res) => {
          if (!res.ok) {
            sessionPromise.current = null;
            return null;
          }
          setSessionId(res.data.id);
          setStartedAt(new Date(res.data.started_at).getTime());
          return res.data.id;
        },
        () => {
          // Network failure: forget the promise so the next attempt asks again.
          sessionPromise.current = null;
          return null;
        },
      );
    }
    return sessionPromise.current;
  }, [sessionId, data.dayKey]);

  const update = useCallback((slug: string, idx: number, patch: Partial<Row>) => {
    setRows((r) => ({ ...r, [slug]: r[slug].map((row, i) => (i === idx ? { ...row, ...patch } : row)) }));
  }, []);

  const removeBurst = useCallback((id: string) => setBursts((b) => b.filter((x) => x.id !== id)), []);

  function burst(origin: BurstOrigin, opts: { count: number; power: number; spread: number }) {
    if (prefersReducedMotion()) return;
    setBursts((b) => [...b, { id: `${Date.now()}-${b.length}`, origin, ...opts }]);
  }

  /** Saves one set, retrying once after the page is back in front. The upsert makes a repeat harmless. */
  async function saveSet(ex: Exercise, idx: number, weight: number, reps: number): Promise<boolean> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await whenVisible();
      try {
        const sid = await withTimeout(getSession(), SAVE_TIMEOUT_MS);
        if (!sid) continue;
        const res = await withTimeout(confirmSet({ sessionId: sid, exerciseSlug: ex.slug, setIndex: idx + 1, weightKg: round2(weight), reps }), SAVE_TIMEOUT_MS);
        if (res.ok) return true;
      } catch {
        // Dropped or frozen by the switch to Shortcuts, or offline: try again.
      }
    }
    return false;
  }

  async function confirm(ex: Exercise, idx: number) {
    const row = rows[ex.slug][idx];
    const weight = row.weight ?? 0;
    // Retrying a set that failed to save shouldn't restart the rest or open the Clock app again.
    const retry = row.status === "error";
    unlockAudio();
    haptic(12);
    update(ex.slug, idx, { status: "saving", weight });
    // Send the request before leaving for Shortcuts so it is already on its way.
    const saved = saveSet(ex, idx, weight, row.reps);
    if (!retry) {
      rest.start(ex.restSec, ex.name);
      // Still inside the tap, so iOS lets us hand the rest to the Clock app via Shortcuts.
      if (clockTimer) openClockTimer(ex.restSec);
    }

    if (!(await saved)) {
      update(ex.slug, idx, { status: "error" });
      return;
    }
    update(ex.slug, idx, { status: "done" });

    // Auto-scroll to the next exercise once this one is complete.
    const remaining = rows[ex.slug].filter((r, i) => i !== idx && r.status !== "done").length;
    if (remaining === 0) {
      // Celebrate the first time this exercise beats its last session's total volume (total reps for bodyweight).
      const doneRows = rows[ex.slug].map((r, i) => (i === idx ? { ...r, weight, status: "done" as const } : r));
      if (!editing && !celebrated.has(ex.slug) && beatBy(doneRows, data.last[ex.slug], !!ex.bodyweight) !== null) {
        celebrated.add(ex.slug);
        haptic([20, 40, 20, 40, 40]);
        burst(centerOf(cardRefs.current[ex.slug]), { count: 80, power: 1, spread: 1.2 });
      }
      const pos = exercises.findIndex((e) => e.slug === ex.slug);
      const next = exercises.slice(pos + 1).find((e) => rows[e.slug].some((r) => r.status !== "done"));
      if (next) {
        window.setTimeout(() => cardRefs.current[next.slug]?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
      }
    }
  }

  async function unconfirm(ex: Exercise, idx: number) {
    if (!sessionId) return;
    haptic(8);
    update(ex.slug, idx, { status: "saving" });
    try {
      const res = await withTimeout(unconfirmSet({ sessionId, exerciseSlug: ex.slug, setIndex: idx + 1 }), SAVE_TIMEOUT_MS);
      update(ex.slug, idx, { status: res.ok ? "idle" : "done" });
    } catch {
      update(ex.slug, idx, { status: "done" });
    }
  }

  function applyHint(ex: Exercise, weight: number) {
    haptic(8);
    setRows((r) => ({ ...r, [ex.slug]: r[ex.slug].map((row) => (row.status === "done" ? row : { ...row, weight })) }));
  }

  async function finish() {
    if (!sessionId) return;
    setFinishing(true);
    setFinishError(null);
    const res = await finishSession(sessionId);
    if (!res.ok) {
      setFinishing(false);
      setFinishError(res.error);
      return;
    }
    rest.stop();
    haptic([30, 40, 30, 40, 60]);
    setFinished({ volume: Object.values(rows).reduce((sum, r) => sum + doneVolume(r), 0), delta: sessionDelta(rows, exercises, data.last) });
    burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.8 }, { count: 180, power: 1.6, spread: 0.7 });
    // Let the celebration land before the summary replaces this screen.
    window.setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, prefersReducedMotion() ? 900 : 2200);
  }

  const elapsed = startedAt && now ? now - startedAt : 0;
  const currentSlug = useMemo(() => exercises.find((e) => rows[e.slug].some((r) => r.status !== "done"))?.slug ?? null, [exercises, rows]);
  const beats = useMemo(() => {
    const out: Record<string, number> = {};
    for (const ex of exercises) {
      const d = beatBy(rows[ex.slug], data.last[ex.slug], !!ex.bodyweight);
      if (d !== null) out[ex.slug] = d;
    }
    return out;
  }, [exercises, rows, data.last]);

  return (
    <div className="pb-40">
      <header className="px-5 pt-2">
        <div className="flex items-end justify-between">
          <h1 className="font-display text-[96px] text-text">{day.title}</h1>
          <div className="mb-3 text-right">
            <div className="font-display text-[34px] leading-none text-accent">
              {doneSets}
              <span className="text-muted">/{totalSets}</span>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">sets</div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm font-medium text-muted">
          <span>{formatDate(data.date, { weekday: "long", day: "numeric", month: "long" })}</span>
          <span aria-hidden="true">·</span>
          <span className="tnum" aria-label="Session time">
            {startedAt ? formatDuration(elapsed) : "0:00"}
          </span>
          {editing && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-text">Editing</span>}
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(doneSets / totalSets) * 100}%` }} />
        </div>
        {!editing && <ClockTimerSetting enabled={clockTimer} onChange={setClockTimer} />}
      </header>

      <div className="mt-6 flex flex-col gap-3 px-4">
        {exercises.map((ex) => {
          const exRows = rows[ex.slug];
          const activeIdx = exRows.findIndex((r) => r.status !== "done");
          const last = data.last[ex.slug];
          const hint = data.hints[ex.slug];
          const isCurrent = ex.slug === currentSlug;
          const beat = beats[ex.slug];
          return (
            <section
              key={ex.slug}
              ref={(el) => {
                cardRefs.current[ex.slug] = el;
              }}
              className="scroll-mt-4 rounded-card bg-surface p-3"
              aria-label={ex.name}
            >
              <div className="px-1 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className={`text-[17px] font-semibold leading-tight ${isCurrent ? "text-text" : "text-text/90"}`}>{ex.name}</h2>
                  {hint !== undefined && (
                    <button
                      type="button"
                      onClick={() => applyHint(ex, hint)}
                      className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[13px] font-bold text-accent-ink active:opacity-80"
                      aria-label={`Apply progression: ${ex.bodyweight ? `bodyweight plus ${fmtKg(hint)} kg` : `${fmtKg(hint)} kg`}`}
                    >
                      +{fmtKg(ex.incrementKg)} kg{ex.bodyweight ? " added" : ""} → {fmtLoad(hint, !!ex.bodyweight)}
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
                  <span className="tnum">{targetLabel(ex)}</span>
                  <span className="tnum">Rest {formatClock(ex.restSec)}</span>
                  {ex.bodyweight && <span>Bodyweight + load</span>}
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {last ? (
                    <span className="tnum">
                      Last ({formatDate(last.session_date, { day: "numeric", month: "short" })}): <span className="text-text/80">{formatSets(last.sets, !!ex.bodyweight)}</span>
                    </span>
                  ) : (
                    <span>{ex.bodyweight ? "First time. Bodyweight, add kg only if you use extra load." : "First time. Enter a weight."}</span>
                  )}
                </div>
                {beat !== undefined && (
                  <div className="anim-pop mt-2 inline-flex items-center gap-1.5 rounded-full bg-pr/15 px-2.5 py-1 text-[12px] font-bold text-pr" role="status">
                    <span aria-hidden="true">▲</span>
                    Beat last time · +{fmtKg(beat)} {ex.bodyweight ? "reps" : "kg"} total
                  </div>
                )}
                <NoteEditor slug={ex.slug} initial={data.notes[ex.slug] ?? ""} />
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {exRows.map((row, i) => (
                  <SetRow
                    key={i}
                    index={i + 1}
                    weight={row.weight}
                    reps={row.reps}
                    status={row.status}
                    active={i === activeIdx}
                    stepKg={ex.incrementKg}
                    repMin={ex.repMin}
                    repMax={ex.repMax}
                    bodyweight={!!ex.bodyweight}
                    perSide={!!ex.perSide}
                    lastWeight={last ? Number(lastSet(last, i + 1)?.weight_kg) : undefined}
                    onChange={(v) => update(ex.slug, i, v)}
                    onConfirm={() => confirm(ex, i)}
                    onUnconfirm={() => unconfirm(ex, i)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 px-4">
        {editing ? (
          <button type="button" onClick={() => router.push("/")} className="h-14 w-full rounded-[14px] bg-surface text-lg font-semibold text-text">
            Back to summary
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={doneSets === 0 || !sessionId || finishing || finished !== null}
            className="h-16 w-full rounded-[14px] bg-text text-lg font-bold text-bg disabled:opacity-30"
          >
            {finishing ? "Finishing…" : doneSets === totalSets ? "Finish workout" : `Finish (${doneSets}/${totalSets} sets)`}
          </button>
        )}
        {finishError && <p className="mt-2 text-sm text-danger">{finishError}</p>}
      </div>

      {finished && (
        <div className="anim-fade-in fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg/90 px-6 text-center backdrop-blur-sm" role="status" aria-live="assertive">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-muted">Workout complete</div>
          <div className="font-display anim-pop-big mt-2 text-[72px] text-accent">{day.title} done</div>
          <div className="font-display tnum mt-4 text-[40px] leading-none text-text">
            {fmtKg(round2(finished.volume))}
            <span className="ml-1 text-[20px] text-muted">kg lifted</span>
          </div>
          {finished.delta !== null && (
            <div className="anim-rise mt-4 inline-flex items-center gap-1.5 rounded-full bg-pr/15 px-3.5 py-1.5 text-[14px] font-bold text-pr" style={{ animationDelay: "250ms" }}>
              <span aria-hidden="true">▲</span>
              +{fmtKg(finished.delta)} kg vs last time
            </div>
          )}
        </div>
      )}

      {bursts.map((b) => (
        <Confetti key={b.id} id={b.id} origin={b.origin} count={b.count} power={b.power} spread={b.spread} onDone={removeBurst} />
      ))}

      {rest.active && !finished && (
        <div
          className="anim-slide-up fixed inset-x-0 bottom-0 z-20"
          role="timer"
          aria-live="polite"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className={`mx-3 rounded-card bg-surface-2 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] ${rest.fired ? "anim-flash" : ""}`}>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => rest.adjust(-15)} className="h-12 w-16 rounded-[12px] bg-surface text-sm font-bold text-text">
                −15
              </button>
              <div className="flex-1 text-center">
                <div className={`font-display tnum text-[44px] leading-none ${rest.remaining <= 0 ? "" : "text-accent"}`}>
                  {rest.remaining <= 0 ? "GO" : formatClock(rest.remaining)}
                </div>
                <div className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{rest.label}</div>
              </div>
              <button type="button" onClick={() => rest.adjust(15)} className="h-12 w-16 rounded-[12px] bg-surface text-sm font-bold text-text">
                +15
              </button>
              <button type="button" onClick={rest.stop} className="h-12 w-16 rounded-[12px] bg-surface text-sm font-bold text-muted">
                Skip
              </button>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
              <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, (rest.remaining / rest.total) * 100))}%`, transition: "width 250ms linear" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
