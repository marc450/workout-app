import { notFound } from "next/navigation";
import { loadExerciseHistory } from "@/lib/progressData";
import { compareBest, fmtKg, fmtLoad, formatSets } from "@/lib/progress";
import { formatDate } from "@/lib/time";
import { EXERCISE_BY_SLUG, targetLabel } from "@/plan";
import { ExerciseChart } from "@/components/charts";
import { Empty, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ex = EXERCISE_BY_SLUG[slug];
  if (!ex) notFound();
  const sessions = await loadExerciseHistory(slug);
  const bodyweight = !!ex.bodyweight;
  const best = sessions.reduce((b, s) => (compareBest(s.best, b.best, bodyweight) > 0 ? s : b), sessions[0]);
  const bestWeight = Math.max(0, ...sessions.map((s) => s.topWeight));

  return (
    <main className="safe-bottom">
      <TopBar back="/progress" title="Exercises" />
      <div className="px-5">
        <h1 className="font-display text-[44px] text-text">{ex.name}</h1>
        <p className="text-sm text-muted">{targetLabel(ex)} · rest {ex.restSec}s · {ex.muscle}</p>
      </div>
      <div className="mt-4 flex flex-col gap-4 px-4">
        {sessions.length > 0 && best && (
          <div className="flex items-center justify-between rounded-card bg-pr/10 px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-pr">Best ever</div>
              <div className="text-[13px] text-muted">{formatDate(best.session_date, { day: "numeric", month: "short", year: "numeric" })}</div>
            </div>
            <div className="text-right">
              {bodyweight ? (
                <>
                  <div className="font-display tnum text-[34px] text-pr">
                    {fmtLoad(best.best.weight, true)} <span className="text-[16px] text-muted">× {best.best.reps}</span>
                  </div>
                  <div className="tnum text-[13px] text-muted">{best.totalReps} reps that session</div>
                </>
              ) : (
                <>
                  <div className="font-display tnum text-[34px] text-pr">
                    {fmtKg(bestWeight)} <span className="text-[16px] text-muted">kg</span>
                  </div>
                  <div className="tnum text-[13px] text-muted">e1RM {Math.round(best.e1rm)} kg</div>
                </>
              )}
            </div>
          </div>
        )}
        <ExerciseChart bodyweight={bodyweight} points={sessions.map((s) => ({ date: s.session_date, topWeight: s.topWeight, e1rm: Math.round(s.e1rm * 10) / 10, bestReps: s.best.reps, bestLoad: s.best.weight, totalReps: s.totalReps }))} />
        {sessions.length === 0 ? (
          <Empty title="No history yet" />
        ) : (
          <ul className="overflow-hidden rounded-card bg-surface">
            {sessions.map((s) => (
              <li key={s.session_id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted">{formatDate(s.session_date, { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="tnum text-[15px] font-medium text-text">{formatSets(s.sets, bodyweight)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
