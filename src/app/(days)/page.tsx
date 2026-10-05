import { loadSessionOn, loadSessionSummary, loadWeekSummary, loadWorkout } from "@/lib/data";
import { isoWeekday, localDate } from "@/lib/time";
import { DAY_BY_KEY, dayForWeekday, isDayKey } from "@/plan";
import { ShowingDay } from "@/components/DayNav";
import { SummaryCard } from "@/components/SummaryCard";
import { WeekSummary } from "@/components/WeekSummary";
import { WorkoutScreen } from "@/components/WorkoutScreen";

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ edit?: string; day?: string }> }) {
  const { edit, day: pick } = await searchParams;
  const today = localDate();
  const { session, hasLogs } = await loadSessionOn(today);

  // Once a set is logged, today's session decides the workout. Before that, ?day= trains another day's workout instead of the scheduled one.
  const sessionDay = session && isDayKey(session.day_key) ? DAY_BY_KEY[session.day_key] : null;
  const pickedDay = pick && isDayKey(pick) ? DAY_BY_KEY[pick] : null;
  const day = (hasLogs ? sessionDay : (pickedDay ?? sessionDay)) ?? dayForWeekday(isoWeekday(today));

  if (!day) {
    const week = await loadWeekSummary(today);
    return (
      <div className="safe-bottom">
        <ShowingDay dayKey={null} />
        <WeekSummary week={week} heading="Rest day" />
      </div>
    );
  }

  const data = await loadWorkout(day.key, today);
  // A session started as another day doesn't belong to this workout until its day is switched on the first set.
  if (data.session && data.session.day_key !== day.key) data.session = null;

  if (data.session?.finished_at && edit !== "1") {
    const summary = await loadSessionSummary(data.session.id);
    return (
      <div className="safe-bottom">
        <ShowingDay dayKey={day.key} />
        {summary && <SummaryCard summary={summary} editHref="/?edit=1" showSets />}
      </div>
    );
  }

  return (
    <>
      <ShowingDay dayKey={day.key} />
      <WorkoutScreen key={`${day.key}-${data.session?.id ?? "new"}`} data={data} editing={edit === "1" && !!data.session?.finished_at} />
    </>
  );
}
