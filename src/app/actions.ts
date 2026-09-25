"use server";

import { revalidatePath } from "next/cache";
import { isDayKey, type DayKey } from "@/plan";
import { getServerClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/time";
import type { SessionRow } from "@/lib/types";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Creates today's session if it doesn't exist yet. The date is validated server-side: only today (Europe/Zurich). */
export async function ensureSession(dayKey: DayKey): Promise<Result<SessionRow>> {
  if (!isDayKey(dayKey)) return { ok: false, error: "Invalid day" };
  const supabase = await getServerClient();
  const date = localDate();
  const { data: existing } = await supabase.from("workout_sessions").select("*").eq("session_date", date).maybeSingle();
  if (existing) return { ok: true, data: existing as SessionRow };
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ day_key: dayKey, session_date: date })
    .select("*")
    .single();
  if (error) {
    // Race with a parallel confirm: fetch the row that won.
    const { data: again } = await supabase.from("workout_sessions").select("*").eq("session_date", date).maybeSingle();
    if (again) return { ok: true, data: again as SessionRow };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as SessionRow };
}

export async function confirmSet(input: {
  sessionId: string;
  exerciseSlug: string;
  setIndex: number;
  weightKg: number;
  reps: number;
}): Promise<Result<{ id: string; completed_at: string }>> {
  const { sessionId, exerciseSlug, setIndex, weightKg, reps } = input;
  if (!Number.isFinite(weightKg) || weightKg < 0 || !Number.isInteger(reps) || reps < 0 || !Number.isInteger(setIndex) || setIndex < 1) {
    return { ok: false, error: "Invalid values" };
  }
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("set_logs")
    .upsert(
      { session_id: sessionId, exercise_slug: exerciseSlug, set_index: setIndex, weight_kg: weightKg, reps, completed_at: new Date().toISOString() },
      { onConflict: "session_id,exercise_slug,set_index" },
    )
    .select("id, completed_at")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function unconfirmSet(input: { sessionId: string; exerciseSlug: string; setIndex: number }): Promise<Result> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", input.sessionId)
    .eq("exercise_slug", input.exerciseSlug)
    .eq("set_index", input.setIndex);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function finishSession(sessionId: string): Promise<Result> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/progress");
  return { ok: true, data: undefined };
}

export async function reopenSession(sessionId: string): Promise<Result> {
  const supabase = await getServerClient();
  const { error } = await supabase.from("workout_sessions").update({ finished_at: null }).eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function saveNote(exerciseSlug: string, note: string): Promise<Result> {
  const supabase = await getServerClient();
  const trimmed = note.trim();
  if (trimmed === "") {
    const { error } = await supabase.from("exercise_notes").delete().eq("exercise_slug", exerciseSlug);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: undefined };
  }
  const { error } = await supabase
    .from("exercise_notes")
    .upsert({ exercise_slug: exerciseSlug, note: trimmed, updated_at: new Date().toISOString() }, { onConflict: "user_id,exercise_slug" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}
