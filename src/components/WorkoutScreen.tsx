"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirmSet, ensureSession, finishSession, unconfirmSet } from "@/app/actions";
import type { WorkoutData } from "@/lib/data";
import { fmtKg, formatSets, round2 } from "@/lib/progress";
import { formatClock, formatDate, formatDuration } from "@/lib/time";
import { DAY_BY_KEY, targetLabel, type Exercise } from "@/plan";
import { NoteEditor } from "./NoteEditor";
import { SetRow, type RowStatus } from "./SetRow";
import { haptic, unlockAudio, useRestTimer, useWakeLock } from "./useRestTimer";

type Row = { weight: number | null; reps: number; status: RowStatus };
type Rows = Record<string, Row[]>;

function initialRows(data: WorkoutData, exercises: Exercise[]): Rows {
  const rows: Rows = {};
  for (const ex of exercises) {
    const last = data.last[ex.slug]?.sets ?? [];
    const lastFallback = last[last.length - 1];
    rows[ex.slug] = Array.from({ length: ex.sets }, (_, i) => {
      const idx = i + 1;
      const logged = data.logs.find((l) => l.exercise_slug === ex.slug && l.set_index === idx);
      if (logged) return { weight: Number(logged.weight_kg), reps: logged.reps, status: "done" as const };
      const prev = last.find((l) => l.set_index === idx) ?? lastFallback;
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
  const [now, setNow] = useState(() => Date.now());
  const sessionPromise = useRef<Promise<string | null> | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const rest = useRestTimer();

  const totalSets = exercises.reduce((n, e) => n + e.sets, 0);
  const doneSets = Object.values(rows).flat().filter((r) => r.status === "done").length;
  const active = startedAt !== null && !data.session?.finished_at;
  useWakeLock(active || doneSets > 0);

  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const getSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!sessionPromise.current) {
      sessionPromise.current = ensureSession(data.dayKey).then((res) => {
        if (!res.ok) {
          sessionPromise.current = null;
          return null;
        }
        setSessionId(res.data.id);
        setStartedAt(new Date(res.data.started_at).getTime());
        return res.data.id;
      });
    }
    return sessionPromise.current;
  }, [sessionId, data.dayKey]);

  const update = useCallback((slug: string, idx: number, patch: Partial<Row>) => {
    setRows((r) => ({ ...r, [slug]: r[slug].map((row, i) => (i === idx ? { ...row, ...patch } : row)) }));
  }, []);

  async function confirm(ex: Exercise, idx: number) {
    const row = rows[ex.slug][idx];
    const weight = row.weight ?? 0;
    unlockAudio();
    haptic(12);
    update(ex.slug, idx, { status: "saving", weight });
    rest.start(ex.restSec, ex.name);

    const sid = await getSession();
    if (!sid) {
      update(ex.slug, idx, { status: "error" });
      return;
    }
    const res = await confirmSet({ sessionId: sid, exerciseSlug: ex.slug, setIndex: idx + 1, weightKg: round2(weight), reps: row.reps });
    if (!res.ok) {
      update(ex.slug, idx, { status: "error" });
      return;
    }
    update(ex.slug, idx, { status: "done" });

    // Auto-scroll to the next exercise once this one is complete.
    const remaining = rows[ex.slug].filter((r, i) => i !== idx && r.status !== "done").length;
    if (remaining === 0) {
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
    const res = await unconfirmSet({ sessionId, exerciseSlug: ex.slug, setIndex: idx + 1 });
    update(ex.slug, idx, { status: res.ok ? "idle" : "done" });
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
    haptic([30, 40, 30]);
    router.replace("/");
    router.refresh();
  }

  const elapsed = startedAt ? now - startedAt : 0;
  const currentSlug = useMemo(() => exercises.find((e) => rows[e.slug].some((r) => r.status !== "done"))?.slug ?? null, [exercises, rows]);

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
      </header>

      <div className="mt-6 flex flex-col gap-3 px-4">
        {exercises.map((ex) => {
          const exRows = rows[ex.slug];
          const activeIdx = exRows.findIndex((r) => r.status !== "done");
          const last = data.last[ex.slug];
          const hint = data.hints[ex.slug];
          const isCurrent = ex.slug === currentSlug;
          const complete = activeIdx === -1;
          return (
            <section
              key={ex.slug}
              ref={(el) => {
                cardRefs.current[ex.slug] = el;
              }}
              className={`scroll-mt-4 rounded-card bg-surface p-3 transition-opacity ${complete ? "opacity-70" : ""}`}
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
                      aria-label={`Apply progression: ${fmtKg(hint)} kg`}
                    >
                      +{fmtKg(ex.incrementKg)} kg{ex.bodyweight ? " added" : ""} → {fmtKg(hint)}
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
                      Last ({formatDate(last.session_date, { day: "numeric", month: "short" })}): <span className="text-text/80">{formatSets(last.sets)}</span>
                    </span>
                  ) : (
                    <span>First time. Enter a weight.</span>
                  )}
                </div>
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
                    bodyweight={!!ex.bodyweight}
                    perSide={!!ex.perSide}
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
            disabled={doneSets === 0 || !sessionId || finishing}
            className="h-16 w-full rounded-[14px] bg-text text-lg font-bold text-bg disabled:opacity-30"
          >
            {finishing ? "Finishing…" : doneSets === totalSets ? "Finish workout" : `Finish (${doneSets}/${totalSets} sets)`}
          </button>
        )}
        {finishError && <p className="mt-2 text-sm text-danger">{finishError}</p>}
      </div>

      {rest.active && (
        <div
          className={`anim-slide-up fixed inset-x-0 bottom-0 z-20 ${rest.fired ? "anim-flash" : ""}`}
          role="timer"
          aria-live="polite"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-3 rounded-card bg-surface-2 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
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
