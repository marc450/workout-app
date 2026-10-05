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

export function totalReps(sets: Pick<SetLogRow, "reps">[]): number {
  return sets.reduce((sum, s) => sum + s.reps, 0);
}

export type BestSet = { weight: number; reps: number };

/**
 * Positive when `a` ranks above `b`. Weighted exercises rank by Epley e1RM.
 * Bodyweight exercises rank by added load first and reps at that load second:
 * once reps top out the plan adds load, so a heavier set with fewer reps is still progress.
 */
export function compareBest(a: BestSet, b: BestSet, bodyweight: boolean): number {
  if (bodyweight) return a.weight - b.weight || a.reps - b.reps;
  return epley(a.weight, a.reps) - epley(b.weight, b.reps);
}

/** The set that ranks a session, per `compareBest`. */
export function bestSet(sets: Pick<SetLogRow, "weight_kg" | "reps">[], bodyweight: boolean): BestSet | null {
  let best: BestSet | null = null;
  for (const s of sets) {
    const cand = { weight: Number(s.weight_kg), reps: s.reps };
    if (best === null || compareBest(cand, best, bodyweight) > 0) best = cand;
  }
  return best;
}

/**
 * "60 × 10, 10, 9" or "60 × 10, 62.5 × 8" when weights differ.
 * For a bodyweight exercise the weight is the added load: "BW × 10, 10, 9" or "BW +5 × 8, BW × 10".
 */
export function formatSets(sets: Pick<SetLogRow, "weight_kg" | "reps" | "set_index">[], bodyweight = false): string {
  const sorted = [...sets].sort((a, b) => a.set_index - b.set_index);
  if (sorted.length === 0) return "";
  const weights = new Set(sorted.map((s) => Number(s.weight_kg)));
  if (weights.size === 1) {
    return `${fmtLoad(Number(sorted[0].weight_kg), bodyweight)} × ${sorted.map((s) => s.reps).join(", ")}`;
  }
  return sorted.map((s) => `${fmtLoad(Number(s.weight_kg), bodyweight)} × ${s.reps}`).join(", ");
}

/** "60" for a weighted exercise; "BW" or "BW +5" when the exercise is done at bodyweight and the number is the added load. */
export function fmtLoad(n: number, bodyweight: boolean): string {
  if (!bodyweight) return fmtKg(n);
  return n > 0 ? `BW +${fmtKg(n)}` : "BW";
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

export type SetGoal = { weight: number; reps: number };

/** Next session's target per planned set. `step` is set when the weight goes up (see `progressionHint`). */
export type Goal = { sets: SetGoal[]; step: { from: number; to: number } | null };

/**
 * The goal for the next session, from the last one's sets; null without history.
 * Earned step: the new weight at repMin on every set. Otherwise the same weight per set
 * and one more rep, capped at repMax, never below what was done (sets already above the range stay there).
 * A set missing from last time (fewer sets logged) copies the last logged set.
 */
export function nextGoal(exercise: Exercise, lastSets: Pick<SetLogRow, "weight_kg" | "reps" | "set_index">[]): Goal | null {
  if (lastSets.length === 0) return null;
  const sorted = [...lastSets].sort((a, b) => a.set_index - b.set_index);
  const to = progressionHint(exercise, sorted);
  if (to !== null) {
    return { sets: Array.from({ length: exercise.sets }, () => ({ weight: to, reps: exercise.repMin })), step: { from: Number(sorted[0].weight_kg), to } };
  }
  const sets = Array.from({ length: exercise.sets }, (_, i) => {
    const prev = sorted.find((s) => s.set_index === i + 1) ?? sorted[sorted.length - 1];
    return { weight: Number(prev.weight_kg), reps: Math.max(prev.reps, Math.min(prev.reps + 1, exercise.repMax)) };
  });
  return { sets, step: null };
}

/** "16 × 10, 10, 10", formatted like logged sets. */
export function formatGoal(goal: Goal, bodyweight = false): string {
  return formatSets(
    goal.sets.map((s, i) => ({ weight_kg: s.weight, reps: s.reps, set_index: i + 1 })),
    bodyweight,
  );
}

/** Every set logged, each at the goal's weight or heavier and at its reps or more. */
export function goalHit(goal: Goal, sets: SetGoal[]): boolean {
  return sets.length >= goal.sets.length && goal.sets.every((g, i) => sets[i].weight >= g.weight && sets[i].reps >= g.reps);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ExerciseSessionSummary = {
  session_id: string;
  session_date: string;
  sets: SetLogRow[];
  bodyweight: boolean;
  best: BestSet;
  topWeight: number;
  e1rm: number;
  volume: number;
  totalReps: number;
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
    const bodyweight = !!EXERCISE_BY_SLUG[slug]?.bodyweight;
    const sessions = Object.entries(bySlug[slug]).map(([session_id, sets]) => ({
      session_id,
      session_date: sessionDates[session_id] ?? "",
      sets: sets.sort((a, b) => a.set_index - b.set_index),
      bodyweight,
      best: bestSet(sets, bodyweight) as BestSet, // sets is never empty here
      topWeight: topWeight(sets),
      e1rm: bestE1rm(sets),
      volume: setVolume(sets),
      totalReps: totalReps(sets),
    }));
    sessions.sort((a, b) => (a.session_date < b.session_date ? 1 : a.session_date > b.session_date ? -1 : 0));
    out[slug] = sessions;
  }
  return out;
}

export type PrHit = {
  slug: string;
  name: string;
  bodyweight: boolean;
  /** The set that set the record. */
  weight: number;
  reps: number;
  e1rm: number;
  /** The best set before this session. */
  previous: BestSet;
};

/**
 * PRs in the given session: its best set beats every previous session's (requires at least one previous session).
 * Weighted exercises compare by e1RM, bodyweight exercises by added load then reps (see `compareBest`).
 */
export function sessionPrs(
  sessionId: string,
  grouped: Record<string, ExerciseSessionSummary[]>,
): PrHit[] {
  const hits: PrHit[] = [];
  for (const [slug, sessions] of Object.entries(grouped)) {
    const current = sessions.find((s) => s.session_id === sessionId);
    if (!current || (!current.bodyweight && current.e1rm <= 0)) continue;
    const previous = sessions.filter((s) => s.session_id !== sessionId && s.session_date <= current.session_date);
    if (previous.length === 0) continue;
    const previousBest = previous.map((s) => s.best).reduce((b, s) => (compareBest(s, b, current.bodyweight) > 0 ? s : b));
    if (compareBest(current.best, previousBest, current.bodyweight) > 0) {
      hits.push({ slug, name: EXERCISE_BY_SLUG[slug]?.name ?? slug, bodyweight: current.bodyweight, ...current.best, e1rm: current.e1rm, previous: previousBest });
    }
  }
  return hits;
}

export type NextTimeGoal = { slug: string; name: string; goal: Goal; bodyweight: boolean };

/** Next session's goal per exercise, set by this session's logs, in plan order. */
export function sessionGoals(sessionId: string, exercises: Exercise[], grouped: Record<string, ExerciseSessionSummary[]>): NextTimeGoal[] {
  const goals: NextTimeGoal[] = [];
  for (const ex of exercises) {
    const current = grouped[ex.slug]?.find((s) => s.session_id === sessionId);
    const goal = current ? nextGoal(ex, current.sets) : null;
    if (goal) goals.push({ slug: ex.slug, name: ex.name, goal, bodyweight: !!ex.bodyweight });
  }
  return goals;
}
