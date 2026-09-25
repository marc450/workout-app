import Link from "next/link";
import { loadExerciseCounts, loadHistory, loadWeeklyVolume } from "@/lib/progressData";
import { fmtKg } from "@/lib/progress";
import { formatDate, formatDuration } from "@/lib/time";
import { DAY_BY_KEY, PLAN } from "@/plan";
import { Sparkline, VolumeBars } from "@/components/charts";
import { Empty, NavLink, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS = ["exercises", "volume", "history"] as const;
type Tab = (typeof TABS)[number];

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "exercises";

  return (
    <main className="safe-bottom">
      <TopBar right={<NavLink href="/">Today</NavLink>} />
      <div className="px-5">
        <h1 className="font-display text-[72px] text-text">Progress</h1>
      </div>
      <nav className="mt-3 flex gap-1 px-4" aria-label="Progress sections">
        {TABS.map((t) => (
          <Link key={t} href={`/progress?tab=${t}`} className={`flex h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold capitalize ${tab === t ? "bg-text text-bg" : "bg-surface text-muted"}`} aria-current={tab === t ? "page" : undefined}>
            {t}
          </Link>
        ))}
      </nav>
      <div className="mt-4 px-4">
        {tab === "exercises" && <Exercises />}
        {tab === "volume" && <Volume />}
        {tab === "history" && <History />}
      </div>
    </main>
  );
}

async function Exercises() {
  const counts = await loadExerciseCounts();
  return (
    <div className="flex flex-col gap-5">
      {PLAN.map((day) => (
        <section key={day.key}>
          <h2 className="font-display px-1 text-[26px] text-muted">{day.title}</h2>
          <ul className="mt-2 overflow-hidden rounded-card bg-surface">
            {day.exercises.map((ex) => {
              const c = counts[ex.slug];
              return (
                <li key={ex.slug}>
                  <Link href={`/progress/exercise/${ex.slug}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 active:bg-surface-2">
                    <span className="text-[15px] font-medium text-text">{ex.name}</span>
                    <span className="tnum shrink-0 text-sm text-muted">
                      {c ? (
                        <>
                          <span className="font-display text-[22px] text-text">{fmtKg(c.best)}</span> kg · {c.sessions}×
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function Volume() {
  const v = await loadWeeklyVolume();
  const total = v.current.reduce((n, c) => n + c.sets, 0);
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">This week · sets per muscle</h2>
          <span className="font-display text-[28px] text-accent">{total}</span>
        </div>
        <div className="mt-2">
          <VolumeBars data={v.current} />
        </div>
      </section>
      <section className="rounded-card bg-surface p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Last 8 weeks</h2>
        <ul className="mt-2 flex flex-col">
          {v.current.map((c) => (
            <li key={c.muscle} className="flex items-center justify-between py-1.5">
              <span className="text-sm capitalize text-text">{c.muscle}</span>
              <div className="flex items-center gap-3">
                <Sparkline values={v.byMuscle[c.muscle]} />
                <span className="tnum w-8 text-right text-sm text-muted">{c.sets}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

async function History() {
  const items = await loadHistory();
  if (items.length === 0) return <Empty title="No sessions yet" body="Your first workout will show up here." />;
  return (
    <ul className="flex flex-col gap-2">
      {items.map(({ session, sets, volume, durationMs }) => (
        <li key={session.id}>
          <Link href={`/progress/session/${session.id}`} className="flex items-center justify-between rounded-card bg-surface px-4 py-3 active:bg-surface-2">
            <div>
              <div className="font-display text-[26px] text-text">{DAY_BY_KEY[session.day_key]?.title ?? session.day_key}</div>
              <div className="text-[13px] text-muted">{formatDate(session.session_date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
            </div>
            <div className="tnum text-right text-[13px] text-muted">
              <div>
                <span className="text-text">{sets}</span> sets · <span className="text-text">{Math.round(volume)}</span> kg
              </div>
              <div>{formatDuration(durationMs)}{session.finished_at ? "" : " · open"}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
