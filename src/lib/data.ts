import "server-only";
import { DAY_BY_KEY, type DayKey, isDayKey } from "@/plan";
import { getServerClient } from "./supabase/server";
import { addDays, localDate, weekStart } from "./time";
import type { NoteRow, SessionRow, SetLogRow } from "./types";
import { groupByExerciseSession, progressionHint, sessionHints, sessionPrs, setVolume } from "./progress";

export type LastResult = { session_date: string; sets: SetLogRow[] };

export type WorkoutData = {
  dayKey: DayKey;
  date: string;
  session: SessionRow | null;
  logs: SetLogRow[]; // today's logs
  notes: Record<string, string>;
  last: Record<string, LastResult>; // per slug, most recent previous session
  hints: Record<string, number>; // per slug, suggested weight
};

/** Everything the workout screen needs for one day. */
export async function loadWorkout(dayKey: DayKey, date: string): Promise<WorkoutData> {
  const supabase = await getServerClient();
  const slugs = DAY_BY_KEY[dayKey].exercises.map((e) => e.slug);

  const [sessionRes, notesRes, historyRes] = await Promise.all([
    supabase.from("workout_sessions").select("*").eq("session_date", date).maybeSingle(),
    supabase.from("exercise_notes").select("exercise_slug, note, updated_at").in("exercise_slug", slugs),
    supabase
      .from("set_logs")
      .select("id, session_id, exercise_slug, set_index, weight_kg, reps, completed_at, workout_sessions!inner(session_date)")
      .in("exercise_slug", slugs)
      .order("completed_at", { ascending: false })
      .limit(4000),
  ]);

  const session = (sessionRes.data as SessionRow | null) ?? null;
  const notes: Record<string, string> = {};
  for (const n of (notesRes.data ?? []) as NoteRow[]) notes[n.exercise_slug] = n.note;

  type Joined = SetLogRow & { workout_sessions: { session_date: string } };
  const rows = (historyRes.data ?? []) as unknown as Joined[];

  const logs: SetLogRow[] = [];
  const last: Record<string, LastResult> = {};
  for (const r of rows) {
    const sd = r.workout_sessions.session_date;
    const { workout_sessions: _ignored, ...log } = r;
    void _ignored;
    if (sd === date) {
      logs.push(log);
      continue;
    }
    if (sd > date) continue;
    const cur = last[r.exercise_slug];
    if (!cur) last[r.exercise_slug] = { session_date: sd, sets: [log] };
    else if (cur.session_date === sd) cur.sets.push(log);
    // rows are newest first, so the first session seen per slug is the most recent one
  }
  for (const l of Object.values(last)) l.sets.sort((a, b) => a.set_index - b.set_index);

  const hints: Record<string, number> = {};
  for (const ex of DAY_BY_KEY[dayKey].exercises) {
    const l = last[ex.slug];
    if (!l) continue;
    const h = progressionHint(ex, l.sets);
    if (h !== null) hints[ex.slug] = h;
  }

  return { dayKey, date, session, logs, notes, last, hints };
}

export type SessionSummary = {
  session: SessionRow;
  durationMs: number;
  setsDone: number;
  volume: number;
  prs: ReturnType<typeof sessionPrs>;
  hints: ReturnType<typeof sessionHints>;
  logs: SetLogRow[];
};

export async function loadSessionSummary(sessionId: string): Promise<SessionSummary | null> {
  const supabase = await getServerClient();
  const { data: session } = await supabase.from("workout_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return null;
  const s = session as SessionRow;
  if (!isDayKey(s.day_key)) return null;
  const slugs = DAY_BY_KEY[s.day_key].exercises.map((e) => e.slug);

  const { data } = await supabase
    .from("set_logs")
    .select("id, session_id, exercise_slug, set_index, weight_kg, reps, completed_at, workout_sessions!inner(session_date)")
    .in("exercise_slug", slugs)
    .order("completed_at", { ascending: false })
    .limit(4000);

  type Joined = SetLogRow & { workout_sessions: { session_date: string } };
  const rows = (data ?? []) as unknown as Joined[];
  const dates: Record<string, string> = {};
  const all: SetLogRow[] = rows.map(({ workout_sessions, ...log }) => {
    dates[log.session_id] = workout_sessions.session_date;
    return log;
  });
  const grouped = groupByExerciseSession(all, dates);
  const logs = all.filter((l) => l.session_id === sessionId);

  const start = new Date(s.started_at).getTime();
  const end = s.finished_at ? new Date(s.finished_at).getTime() : Math.max(start, ...logs.map((l) => new Date(l.completed_at).getTime()));

  return {
    session: s,
    durationMs: Math.max(0, end - start),
    setsDone: logs.length,
    volume: setVolume(logs),
    prs: sessionPrs(sessionId, grouped),
    hints: sessionHints(sessionId, grouped),
    logs,
  };
}

export type WeekTile = { date: string; dayKey: DayKey; title: string; status: "done" | "missed" | "today" | "upcoming" | "in-progress"; sessionId?: string };

export async function loadWeekSummary(today = localDate()) {
  const supabase = await getServerClient();
  const monday = weekStart(today);
  const friday = addDays(monday, 4);
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .gte("session_date", monday)
    .lte("session_date", friday);
  const sess = (sessions ?? []) as SessionRow[];
  const ids = sess.map((s) => s.id);
  const { data: logs } = ids.length
    ? await supabase.from("set_logs").select("session_id, weight_kg, reps").in("session_id", ids)
    : { data: [] as Pick<SetLogRow, "session_id" | "weight_kg" | "reps">[] };
  const logRows = (logs ?? []) as Pick<SetLogRow, "session_id" | "weight_kg" | "reps">[];

  const tiles: WeekTile[] = [];
  for (let i = 0; i < 5; i++) {
    const date = addDays(monday, i);
    const dayKey = (["push", "pull", "legs", "upper", "lower"] as DayKey[])[i];
    const s = sess.find((x) => x.session_date === date);
    const hasSets = s ? logRows.some((l) => l.session_id === s.id) : false;
    let status: WeekTile["status"];
    if (s && (s.finished_at || hasSets)) status = s.finished_at ? "done" : date === today ? "in-progress" : "done";
    else if (date === today) status = "today";
    else if (date < today) status = "missed";
    else status = "upcoming";
    tiles.push({ date, dayKey, title: DAY_BY_KEY[dayKey].title, status, sessionId: s?.id });
  }
  return {
    monday,
    tiles,
    totalSets: logRows.length,
    totalVolume: setVolume(logRows),
  };
}
