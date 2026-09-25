import { notFound } from "next/navigation";
import { loadSessionSummary } from "@/lib/data";
import { localDate } from "@/lib/time";
import { SummaryCard } from "@/components/SummaryCard";
import { TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const summary = await loadSessionSummary(id);
  if (!summary) notFound();
  const isToday = summary.session.session_date === localDate();
  return (
    <main className="safe-bottom">
      <TopBar back="/progress?tab=history" title="History" />
      <SummaryCard summary={summary} showSets editHref={isToday ? "/?edit=1" : undefined} />
    </main>
  );
}
