export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "calves"
  | "abs";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "adductors",
  "calves",
  "abs",
];

export type Exercise = {
  slug: string; // stable id, e.g. "bench-press-barbell"
  name: string;
  muscle: MuscleGroup; // used for weekly volume
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  incrementKg: number; // step for the +/- stepper and progression hint
  perSide?: boolean; // reps are per leg or arm, show "/ side"
  bodyweight?: boolean; // weight field means added load, default 0
};

export type DayKey = "push" | "pull" | "legs" | "upper" | "lower";

export type Day = {
  key: DayKey;
  weekday: 1 | 2 | 3 | 4 | 5; // 1 = Monday
  title: string;
  exercises: Exercise[];
};

export const PLAN: Day[] = [
  {
    key: "push",
    weekday: 1,
    title: "Push",
    exercises: [
      { slug: "bench-press-barbell", name: "Bench Press (Barbell)", muscle: "chest", sets: 3, repMin: 6, repMax: 10, restSec: 150, incrementKg: 2.5 },
      { slug: "shoulder-press-dumbbell", name: "Shoulder Press (Dumbbell)", muscle: "shoulders", sets: 3, repMin: 10, repMax: 12, restSec: 120, incrementKg: 2 },
      { slug: "low-cable-fly", name: "Low Cable Fly", muscle: "chest", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5 },
      { slug: "triceps-extension-dumbbell", name: "Triceps Extension (Dumbbell)", muscle: "triceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2 },
      { slug: "rope-pushdown", name: "Rope Pushdown", muscle: "triceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5 },
      { slug: "lateral-raise-dumbbell", name: "Lateral Raise (Dumbbell)", muscle: "shoulders", sets: 3, repMin: 12, repMax: 20, restSec: 90, incrementKg: 2 },
    ],
  },
  {
    key: "pull",
    weekday: 2,
    title: "Pull",
    exercises: [
      { slug: "bent-over-row-barbell", name: "Bent Over Row (Barbell)", muscle: "back", sets: 3, repMin: 6, repMax: 10, restSec: 150, incrementKg: 2.5 },
      { slug: "lat-pulldown", name: "Lat Pulldown", muscle: "back", sets: 3, repMin: 8, repMax: 12, restSec: 120, incrementKg: 2.5 },
      { slug: "biceps-curl-dumbbell", name: "Biceps Curl (Dumbbell)", muscle: "biceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2 },
      { slug: "hammer-curl-dumbbell", name: "Hammer Curl (Dumbbell)", muscle: "biceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2 },
      { slug: "face-pull", name: "Face Pull", muscle: "shoulders", sets: 3, repMin: 15, repMax: 25, restSec: 90, incrementKg: 2.5 },
    ],
  },
  {
    key: "legs",
    weekday: 3,
    title: "Legs",
    exercises: [
      { slug: "leg-press", name: "Leg Press", muscle: "quads", sets: 4, repMin: 8, repMax: 12, restSec: 150, incrementKg: 5 },
      { slug: "leg-extension", name: "Leg Extension", muscle: "quads", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5 },
      { slug: "seated-leg-curl", name: "Seated Leg Curl", muscle: "hamstrings", sets: 3, repMin: 10, repMax: 12, restSec: 90, incrementKg: 2.5 },
      { slug: "adductor-machine", name: "Adductor Machine", muscle: "adductors", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5 },
      { slug: "standing-calf-raise", name: "Standing Calf Raise", muscle: "calves", sets: 3, repMin: 10, repMax: 15, restSec: 90, incrementKg: 5 },
    ],
  },
  {
    key: "upper",
    weekday: 4,
    title: "Upper",
    exercises: [
      { slug: "pull-up", name: "Pull Up", muscle: "back", sets: 3, repMin: 5, repMax: 10, restSec: 150, incrementKg: 2.5, bodyweight: true },
      { slug: "incline-press-dumbbell", name: "Incline Press (Dumbbell)", muscle: "chest", sets: 3, repMin: 8, repMax: 10, restSec: 120, incrementKg: 2 },
      { slug: "chest-supported-row", name: "Chest-Supported Row", muscle: "back", sets: 3, repMin: 8, repMax: 12, restSec: 120, incrementKg: 2.5 },
      { slug: "shoulder-press-machine", name: "Shoulder Press (Machine)", muscle: "shoulders", sets: 3, repMin: 10, repMax: 12, restSec: 120, incrementKg: 2.5 },
      { slug: "cable-lateral-raise", name: "Cable Lateral Raise", muscle: "shoulders", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5 },
    ],
  },
  {
    key: "lower",
    weekday: 5,
    title: "Lower",
    exercises: [
      { slug: "hip-thrust", name: "Hip Thrust", muscle: "glutes", sets: 4, repMin: 8, repMax: 12, restSec: 150, incrementKg: 5 },
      { slug: "lying-leg-curl", name: "Lying Leg Curl", muscle: "hamstrings", sets: 3, repMin: 10, repMax: 12, restSec: 90, incrementKg: 2.5 },
      { slug: "back-extension-45", name: "45° Back Extension", muscle: "glutes", sets: 3, repMin: 10, repMax: 15, restSec: 90, incrementKg: 2.5, bodyweight: true },
      { slug: "single-leg-leg-extension", name: "Single-Leg Leg Extension", muscle: "quads", sets: 2, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, perSide: true },
      { slug: "seated-calf-raise", name: "Seated Calf Raise", muscle: "calves", sets: 4, repMin: 12, repMax: 20, restSec: 90, incrementKg: 5 },
      { slug: "cable-crunch", name: "Cable Crunch", muscle: "abs", sets: 4, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5 },
    ],
  },
];

export const DAY_BY_KEY: Record<DayKey, Day> = Object.fromEntries(
  PLAN.map((d) => [d.key, d]),
) as Record<DayKey, Day>;

export const EXERCISE_BY_SLUG: Record<string, Exercise> = Object.fromEntries(
  PLAN.flatMap((d) => d.exercises.map((e) => [e.slug, e])),
);

export function dayForWeekday(weekday: number): Day | null {
  return PLAN.find((d) => d.weekday === weekday) ?? null;
}

export function isDayKey(value: string): value is DayKey {
  return value in DAY_BY_KEY;
}

export function targetLabel(e: Exercise): string {
  return `${e.sets} × ${e.repMin}-${e.repMax}${e.perSide ? " / side" : ""}`;
}
