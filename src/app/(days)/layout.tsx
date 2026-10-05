import { loadWeekSummary } from "@/lib/data";
import { DayNav } from "@/components/DayNav";
import { NavLink, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Home and the day pages share the top bar and the week strip, so the strip survives navigation between days. */
export default async function DaysLayout({ children }: { children: React.ReactNode }) {
  const week = await loadWeekSummary();
  return (
    <main>
      <TopBar right={<NavLink href="/progress">Progress</NavLink>} />
      <DayNav tiles={week.tiles}>{children}</DayNav>
    </main>
  );
}
