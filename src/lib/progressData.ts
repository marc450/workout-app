import "server-only";
import { EXERCISE_BY_SLUG, MUSCLE_GROUPS, type MuscleGroup } from "@/plan";
import { getServerClient } from "./supabase/server";
import { addDays, isoWeekKey, localDate, weekStart } from "./time";
import type { SessionRow, SetLogRow } from "./types";
import { groupByExerciseSession, setVolume, type ExerciseSessionSummary } from "./progress";

type Joined = SetLogRow & { workout_sessions: { session_date: string } };

async function allLogs() {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("set_logs")
    .select("id, session_id, exercise_slug, set_index, weight_kg, reps, completed_at, workout_sessions!inner(session_date)")
    .order("completed_at", { ascending: false })
    .limit(20000);
  const rows = (data ?? []) as unknown as Joined[];
  const dates: Record<string, string> = {};
  const logs: SetLogRow[] = rows.map(({ workout_sessions, ...log }) => {
    dates[log.session_id] = workout_sessions.session_date;
    return log;
  });
  return { logs, dates };
}

export async function loadExerciseHistory(slug: string): Promise<ExerciseSessionSummary[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("set_logs")
    .select("id, session_id, exercise_slug, set_index, weight_kg, reps, completed_at, workout_sessions!inner(session_date)")
    .eq("exercise_slug", slug)
    .order("completed_at", { ascending: false })
    .limit(5000);
  const rows = (data ?? []) as unknown as Joined[];
  const dates: Record<string, string> = {};
  const logs: SetLogRow[] = rows.map(({ workout_sessions, ...log }) => {
    dates[log.session_id] = workout_sessions.session_date;
    return log;
  });
  return groupByExerciseSession(logs, dates)[slug] ?? [];
}

/** Which exercises have any history (for the list). */
export async function loadExerciseCounts(): Promise<Record<string, { sessions: number; best: number }>> {
  const { logs, dates } = await allLogs();
  const grouped = groupByExerciseSession(logs, dates);
  const out: Record<string, { sessions: number; best: number }> = {};
  for (const [slug, sessions] of Object.entries(grouped)) {
    out[slug] = { sessions: sessions.length, best: Math.max(...sessions.map((s) => s.topWeight)) };
  }
  return out;
}

export type WeeklyVolume = {
  weeks: string[]; // ISO week keys, oldest first
  byMuscle: Record<MuscleGroup, number[]>; // sets per week, aligned with weeks
  current: { muscle: MuscleGroup; sets: number }[]; // this week, sorted desc
};

export async function loadWeeklyVolume(today = localDate()): Promise<WeeklyVolume> {
  const supabase = await getServerClient();
  const thisMonday = weekStart(today);
  const firstMonday = addDays(thisMonday, -7 * 7);
  const weeks: string[] = Array.from({ length: 8 }, (_, i) => isoWeekKey(addDays(firstMonday, i * 7)));

  const { data } = await supabase
    .from("set_logs")
    .select("exercise_slug, workout_sessions!inner(session_date)")
    .gte("workout_sessions.session_date", firstMonday)
    .limit(20000);
  const rows = (data ?? []) as unknown as { exercise_slug: string; workout_sessions: { session_date: string } }[];

  const byMuscle = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, new Array(8).fill(0)])) as Record<MuscleGroup, number[]>;
  for (const r of rows) {
    const ex = EXERCISE_BY_SLUG[r.exercise_slug];
    if (!ex) continue;
    const idx = weeks.indexOf(isoWeekKey(r.workout_sessions.session_date));
    if (idx >= 0) byMuscle[ex.muscle][idx] += 1;
  }
  const current = MUSCLE_GROUPS.map((m) => ({ muscle: m, sets: byMuscle[m][7] })).sort((a, b) => b.sets - a.sets);
  return { weeks, byMuscle, current };
}

export type HistoryItem = { session: SessionRow; sets: number; volume: number; durationMs: number };

export async function loadHistory(limit = 60): Promise<HistoryItem[]> {
  const supabase = await getServerClient();
  const { data: sessions } = await supabase.from("workout_sessions").select("*").order("session_date", { ascending: false }).limit(limit);
  const sess = (sessions ?? []) as SessionRow[];
  if (sess.length === 0) return [];
  const { data: logs } = await supabase
    .from("set_logs")
    .select("session_id, weight_kg, reps, completed_at")
    .in("session_id", sess.map((s) => s.id));
  const rows = (logs ?? []) as Pick<SetLogRow, "session_id" | "weight_kg" | "reps" | "completed_at">[];
  return sess.map((session) => {
    const mine = rows.filter((l) => l.session_id === session.id);
    const start = new Date(session.started_at).getTime();
    const end = session.finished_at ? new Date(session.finished_at).getTime() : Math.max(start, ...mine.map((l) => new Date(l.completed_at).getTime()));
    return { session, sets: mine.length, volume: setVolume(mine), durationMs: Math.max(0, end - start) };
  });
}
