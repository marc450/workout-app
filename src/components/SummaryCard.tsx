import Link from "next/link";
import type { SessionSummary } from "@/lib/data";
import { fmtKg, formatSets } from "@/lib/progress";
import { formatDate, formatDuration } from "@/lib/time";
import { DAY_BY_KEY } from "@/plan";
import { Stat } from "./ui";

export function SummaryCard({ summary, editHref, showSets = false }: { summary: SessionSummary; editHref?: string; showSets?: boolean }) {
  const { session, durationMs, setsDone, volume, prs, hints, logs } = summary;
  const day = DAY_BY_KEY[session.day_key];
  const total = day.exercises.reduce((n, e) => n + e.sets, 0);

  return (
    <div className="anim-rise px-4">
      <div className="rounded-card bg-surface p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {formatDate(session.session_date, { weekday: "long", day: "numeric", month: "long" })}
          {!session.finished_at && " · in progress"}
        </div>
        <h1 className="font-display mt-1 text-[72px] text-text">{day.title} done</h1>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Time" value={formatDuration(durationMs)} />
          <Stat label="Sets" value={`${setsDone}`} unit={`/${total}`} />
          <Stat label="Volume" value={volume >= 10000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)}`} unit={volume >= 10000 ? "" : "kg"} />
        </div>

        {prs.length > 0 && (
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-pr">Personal records</div>
            <ul className="mt-2 flex flex-col gap-2">
              {prs.map((p) => (
                <li key={p.slug} className="flex items-center justify-between rounded-[12px] bg-pr/10 px-3 py-2">
                  <span className="text-sm font-semibold text-text">{p.name}</span>
                  <span className="font-display tnum text-[24px] text-pr">
                    {fmtKg(p.weight)} × {p.reps}
                    <span className="ml-2 text-[13px] font-bold text-muted">e1RM {Math.round(p.e1rm)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Next time</div>
          {hints.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Same weights. Hit the top of every rep range to earn a step up.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {hints.map((h) => (
                <li key={h.slug} className="flex items-center justify-between rounded-[12px] bg-surface-2 px-3 py-2">
                  <span className="text-sm font-semibold text-text">{h.name}</span>
                  <span className="font-display tnum text-[24px] text-accent">
                    {fmtKg(h.from)} → {fmtKg(h.to)}
                    <span className="ml-1 text-[13px] font-bold text-muted">kg{h.bodyweight ? " added" : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {showSets && (
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sets</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {day.exercises.map((ex) => {
                const sets = logs.filter((l) => l.exercise_slug === ex.slug);
                return (
                  <li key={ex.slug} className="flex items-baseline justify-between gap-3 py-1">
                    <span className="text-sm text-text">{ex.name}</span>
                    <span className="tnum shrink-0 text-sm text-muted">{sets.length ? formatSets(sets) : "—"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {editHref && (
          <Link href={editHref} className="mt-6 flex h-12 items-center justify-center rounded-[12px] bg-surface-2 text-sm font-semibold text-text">
            View / edit sets
          </Link>
        )}
      </div>
    </div>
  );
}
