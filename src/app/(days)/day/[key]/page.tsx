import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadSessionOn, loadWeekSummary, loadWorkout } from "@/lib/data";
import { fmtLoad, formatSets } from "@/lib/progress";
import { formatClock, formatDate, isoWeekday, localDate } from "@/lib/time";
import { DAY_BY_KEY, dayForWeekday, isDayKey, targetLabel } from "@/plan";
import { ShowingDay } from "@/components/DayNav";

export const dynamic = "force-dynamic";

const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default async function DayPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isDayKey(key)) notFound();
  const day = DAY_BY_KEY[key];
  const today = localDate();
  const [data, { session, hasLogs }, week] = await Promise.all([loadWorkout(key, today), loadSessionOn(today), loadWeekSummary(today)]);

  // The day the home screen shows today opens there, with its live workout.
  const homeKey = (session && isDayKey(session.day_key) ? session.day_key : null) ?? dayForWeekday(isoWeekday(today))?.key ?? null;
  if (key === homeKey) redirect("/");
  const tile = week.tiles.find((t) => t.dayKey === key);
  const doneThisWeek = tile?.status === "done" && tile.sessionId;
  const loggedToday = hasLogs && session && isDayKey(session.day_key) ? DAY_BY_KEY[session.day_key] : null;

  return (
    <div className="safe-bottom">
      <ShowingDay dayKey={key} />

      <header className="anim-rise px-5 pt-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{WEEKDAY[day.weekday]}</div>
        <h1 className="font-display text-[96px] leading-none text-text">{day.title}</h1>
      </header>

      <div className="mt-4 flex flex-col gap-3 px-4">
        {loggedToday ? (
          <p className="rounded-[14px] bg-surface px-4 py-3 text-sm text-muted">Today is already logged as {loggedToday.title}. One workout per day.</p>
        ) : (
          <Link href={`/?day=${key}`} className="flex h-14 items-center justify-center rounded-[14px] bg-accent text-base font-bold text-accent-ink">
            Train this today
          </Link>
        )}
        {doneThisWeek && (
          <Link href={`/progress/session/${tile.sessionId}`} className="flex h-12 items-center justify-center rounded-[14px] bg-surface text-sm font-semibold text-text">
            Done this week. See the session
          </Link>
        )}

        {day.exercises.map((ex) => {
          const last = data.last[ex.slug];
          const hint = data.hints[ex.slug];
          return (
            <section key={ex.slug} className="rounded-card bg-surface p-4">
              <h2 className="text-[17px] font-semibold text-text">{ex.name}</h2>
              <div className="mt-1 flex gap-3 text-[13px] text-muted">
                <span className="tnum">{targetLabel(ex)}</span>
                <span className="tnum">Rest {formatClock(ex.restSec)}</span>
              </div>
              <div className="mt-1 text-[13px] text-muted">
                {last ? (
                  <span className="tnum">
                    Last ({formatDate(last.session_date, { day: "numeric", month: "short" })}): <span className="text-text/80">{formatSets(last.sets, !!ex.bodyweight)}</span>
                  </span>
                ) : (
                  <span>Not trained yet</span>
                )}
              </div>
              {hint !== undefined && <div className="mt-1 text-[13px] font-semibold text-accent">Next: {fmtLoad(hint, !!ex.bodyweight)}{ex.bodyweight ? "" : " kg"}</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
