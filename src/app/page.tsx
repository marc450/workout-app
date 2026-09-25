import { loadSessionSummary, loadWeekSummary, loadWorkout } from "@/lib/data";
import { isoWeekday, localDate } from "@/lib/time";
import { dayForWeekday } from "@/plan";
import { SummaryCard } from "@/components/SummaryCard";
import { WeekSummary } from "@/components/WeekSummary";
import { WorkoutScreen } from "@/components/WorkoutScreen";
import { NavLink, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const today = localDate();
  const weekday = isoWeekday(today);
  const day = dayForWeekday(weekday);

  if (!day) {
    const week = await loadWeekSummary(today);
    return (
      <main className="safe-bottom">
        <TopBar right={<NavLink href="/progress">Progress</NavLink>} />
        <WeekSummary week={week} heading="Rest day" />
      </main>
    );
  }

  const data = await loadWorkout(day.key, today);

  if (data.session?.finished_at && edit !== "1") {
    const summary = await loadSessionSummary(data.session.id);
    return (
      <main className="safe-bottom">
        <TopBar right={<NavLink href="/progress">Progress</NavLink>} />
        {summary && <SummaryCard summary={summary} editHref="/?edit=1" showSets />}
      </main>
    );
  }

  return (
    <main>
      <TopBar right={<NavLink href="/progress">Progress</NavLink>} />
      <WorkoutScreen key={data.session?.id ?? "new"} data={data} editing={edit === "1" && !!data.session?.finished_at} />
    </main>
  );
}
