import Link from "next/link";
import type { loadWeekSummary } from "@/lib/data";
import type { DayKey } from "@/plan";
import { formatDate } from "@/lib/time";
import { Stat } from "./ui";

type Week = Awaited<ReturnType<typeof loadWeekSummary>>;

const STATUS: Record<Week["tiles"][number]["status"], { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-accent text-accent-ink" },
  "in-progress": { label: "In progress", cls: "bg-accent/30 text-text" },
  missed: { label: "Missed", cls: "bg-surface-2 text-muted line-through" },
  today: { label: "Today", cls: "bg-surface-2 text-text" },
  upcoming: { label: "Upcoming", cls: "bg-surface text-muted" },
};

/** The workout on the home screen opens there; every other day opens its own page. */
function dayHref(dayKey: DayKey, currentKey: DayKey | null): string {
  return dayKey === currentKey ? "/" : `/day/${dayKey}`;
}

/** Compact Mon to Fri row above the workout, so every day of the plan is one tap away. */
export function WeekStrip({ week, currentKey }: { week: Week; currentKey: DayKey | null }) {
  return (
    <nav aria-label="This week" className="grid grid-cols-5 gap-1.5 px-4 pb-2">
      {week.tiles.map((t) => {
        const current = t.dayKey === currentKey;
        const s = STATUS[t.status];
        return (
          <Link
            key={t.date}
            href={dayHref(t.dayKey, currentKey)}
            aria-current={current ? "page" : undefined}
            aria-label={`${formatDate(t.date, { weekday: "long" })}: ${t.title}, ${s.label}`}
            className={`flex h-12 flex-col items-center justify-center rounded-[12px] ${s.cls} ${current ? "ring-2 ring-inset ring-accent" : ""}`}
          >
            <span className="text-[10px] font-semibold uppercase leading-none tracking-wider opacity-70">{formatDate(t.date, { weekday: "short" })}</span>
            <span className="font-display mt-1 truncate text-[16px] leading-none">{t.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function WeekSummary({ week, heading = "This week" }: { week: Week; heading?: string }) {
  return (
    <div className="anim-rise px-4">
      <div className="px-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {formatDate(week.monday, { day: "numeric", month: "short" })} – {formatDate(week.tiles[4].date, { day: "numeric", month: "short" })}
        </div>
        <h1 className="font-display text-[72px] text-text">{heading}</h1>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {week.tiles.map((t) => {
          const s = STATUS[t.status];
          const inner = (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{formatDate(t.date, { weekday: "short" })}</div>
              <div className="font-display mt-1 truncate text-[19px] leading-none">{t.title}</div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider opacity-70">{s.label}</div>
            </>
          );
          return (
            <Link key={t.date} href={dayHref(t.dayKey, null)} className={`flex min-h-[88px] flex-col rounded-[14px] p-2 ${s.cls}`}>
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-card bg-surface p-5">
        <Stat label="Sets this week" value={String(week.totalSets)} accent />
        <Stat label="Volume" value={week.totalVolume >= 10000 ? (week.totalVolume / 1000).toFixed(1) : String(Math.round(week.totalVolume))} unit={week.totalVolume >= 10000 ? "t" : "kg"} />
      </div>

      <Link href="/progress" className="mt-4 flex h-14 items-center justify-center rounded-[14px] bg-surface text-base font-semibold text-text">
        Progress
      </Link>
    </div>
  );
}
