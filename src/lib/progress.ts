import { EXERCISE_BY_SLUG, type Exercise } from "@/plan";
import type { SetLogRow } from "./types";

/** Epley estimated 1RM. */
export function epley(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function setVolume(sets: Pick<SetLogRow, "weight_kg" | "reps">[]): number {
  return sets.reduce((sum, s) => sum + Number(s.weight_kg) * s.reps, 0);
}

export function bestE1rm(sets: Pick<SetLogRow, "weight_kg" | "reps">[]): number {
  return sets.reduce((best, s) => Math.max(best, epley(Number(s.weight_kg), s.reps)), 0);
}

export function topWeight(sets: Pick<SetLogRow, "weight_kg">[]): number {
  return sets.reduce((best, s) => Math.max(best, Number(s.weight_kg)), 0);
}

/** "60 × 10, 10, 9" or "60 × 10, 62.5 × 8" when weights differ. */
export function formatSets(sets: Pick<SetLogRow, "weight_kg" | "reps" | "set_index">[]): string {
  const sorted = [...sets].sort((a, b) => a.set_index - b.set_index);
  if (sorted.length === 0) return "";
  const weights = new Set(sorted.map((s) => Number(s.weight_kg)));
  if (weights.size === 1) {
    return `${fmtKg(Number(sorted[0].weight_kg))} × ${sorted.map((s) => s.reps).join(", ")}`;
  }
  return sorted.map((s) => `${fmtKg(Number(s.weight_kg))} × ${s.reps}`).join(", ");
}

export function fmtKg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(n * 10 === Math.floor(n * 10) ? 1 : 2).replace(/\.?0+$/, "");
}

/**
 * Double progression: hint when every planned set was logged at the same weight
 * and every set reached repMax. Returns the suggested new weight or null.
 */
export function progressionHint(exercise: Exercise, lastSets: Pick<SetLogRow, "weight_kg" | "reps">[]): number | null {
  if (lastSets.length < exercise.sets) return null;
  const w = Number(lastSets[0].weight_kg);
  const sameWeight = lastSets.every((s) => Number(s.weight_kg) === w);
  const allMax = lastSets.every((s) => s.reps >= exercise.repMax);
  if (!sameWeight || !allMax) return null;
  return round2(w + exercise.incrementKg);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ExerciseSessionSummary = {
  session_id: string;
  session_date: string;
  sets: SetLogRow[];
  topWeight: number;
  e1rm: number;
  volume: number;
};

/** Group logs by exercise slug, then by session (ordered newest first). */
export function groupByExerciseSession(
  logs: SetLogRow[],
  sessionDates: Record<string, string>,
): Record<string, ExerciseSessionSummary[]> {
  const bySlug: Record<string, Record<string, SetLogRow[]>> = {};
  for (const l of logs) {
    (bySlug[l.exercise_slug] ??= {})[l.session_id] ??= [];
    bySlug[l.exercise_slug][l.session_id].push(l);
  }
  const out: Record<string, ExerciseSessionSummary[]> = {};
  for (const slug of Object.keys(bySlug)) {
    const sessions = Object.entries(bySlug[slug]).map(([session_id, sets]) => ({
      session_id,
      session_date: sessionDates[session_id] ?? "",
      sets: sets.sort((a, b) => a.set_index - b.set_index),
      topWeight: topWeight(sets),
      e1rm: bestE1rm(sets),
      volume: setVolume(sets),
    }));
    sessions.sort((a, b) => (a.session_date < b.session_date ? 1 : a.session_date > b.session_date ? -1 : 0));
    out[slug] = sessions;
  }
  return out;
}

export type PrHit = { slug: string; name: string; e1rm: number; previousBest: number; weight: number; reps: number };

/** PRs in the given session: best e1RM beats every previous session (requires at least one previous session). */
export function sessionPrs(
  sessionId: string,
  grouped: Record<string, ExerciseSessionSummary[]>,
): PrHit[] {
  const hits: PrHit[] = [];
  for (const [slug, sessions] of Object.entries(grouped)) {
    const current = sessions.find((s) => s.session_id === sessionId);
    if (!current || current.e1rm <= 0) continue;
    const previous = sessions.filter((s) => s.session_id !== sessionId && s.session_date <= current.session_date);
    if (previous.length === 0) continue;
    const previousBest = Math.max(...previous.map((s) => s.e1rm));
    if (current.e1rm > previousBest) {
      const best = current.sets.reduce((b, s) => (epley(Number(s.weight_kg), s.reps) > epley(Number(b.weight_kg), b.reps) ? s : b), current.sets[0]);
      hits.push({ slug, name: EXERCISE_BY_SLUG[slug]?.name ?? slug, e1rm: current.e1rm, previousBest, weight: Number(best.weight_kg), reps: best.reps });
    }
  }
  return hits;
}

export type NextTimeHint = { slug: string; name: string; from: number; to: number; bodyweight: boolean };

/** Progression hints earned by a session's logs. */
export function sessionHints(sessionId: string, grouped: Record<string, ExerciseSessionSummary[]>): NextTimeHint[] {
  const hints: NextTimeHint[] = [];
  for (const [slug, sessions] of Object.entries(grouped)) {
    const ex = EXERCISE_BY_SLUG[slug];
    const current = sessions.find((s) => s.session_id === sessionId);
    if (!ex || !current) continue;
    const to = progressionHint(ex, current.sets);
    if (to !== null) hints.push({ slug, name: ex.name, from: Number(current.sets[0].weight_kg), to, bodyweight: !!ex.bodyweight });
  }
  return hints;
}
