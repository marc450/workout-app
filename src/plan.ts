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
  incrementKg: number; // jump for the progression hint (the stepper always moves 1 kg)
  perSide?: boolean; // reps are per leg or arm, show "/ side"
  bodyweight?: boolean; // weight field means added load, default 0
  cues?: string[]; // form cues shown in the set briefing before each set
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
      { slug: "bench-press-barbell", name: "Bench Press (Barbell)", muscle: "chest", sets: 3, repMin: 6, repMax: 10, restSec: 150, incrementKg: 2.5, cues: ["Shoulder blades pinned, feet planted.", "Bar to the lower chest, elbows at about 45°.", "Short pause on the chest, no bounce."] },
      { slug: "shoulder-press-dumbbell", name: "Shoulder Press (Dumbbell)", muscle: "shoulders", sets: 3, repMin: 10, repMax: 12, restSec: 120, incrementKg: 2, cues: ["Ribs down, no arching the lower back.", "Lower until the dumbbells reach ear height.", "Press up and slightly in."] },
      { slug: "low-cable-fly", name: "Low Cable Fly", muscle: "chest", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, cues: ["Slight bend in the elbows, keep it the whole set.", "Sweep up and in, squeeze at the top for a second.", "Let the chest stretch at the bottom."] },
      { slug: "triceps-extension-dumbbell", name: "Triceps Extension (Dumbbell)", muscle: "triceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2, cues: ["Elbows point up and stay still.", "Lower behind the head until the triceps stretch.", "Lock out without flaring the elbows."] },
      { slug: "lateral-raise-dumbbell", name: "Lateral Raise (Dumbbell)", muscle: "shoulders", sets: 3, repMin: 12, repMax: 20, restSec: 90, incrementKg: 2, cues: ["Lead with the elbows, slight bend.", "Stop at shoulder height.", "Control the way down, no swing."] },
      { slug: "rope-pushdown", name: "Rope Pushdown", muscle: "triceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, cues: ["Elbows pinned to the sides.", "Split the rope at the bottom and lock out.", "Only the forearms move."] },
    ],
  },
  {
    key: "pull",
    weekday: 2,
    title: "Pull",
    exercises: [
      { slug: "bent-over-row-barbell", name: "Bent Over Row (Barbell)", muscle: "back", sets: 3, repMin: 6, repMax: 10, restSec: 150, incrementKg: 2.5, cues: ["Hinge to about 45°, back flat.", "Pull to the lower ribs, elbows close.", "No torso swing to finish a rep."] },
      { slug: "lat-pulldown", name: "Lat Pulldown", muscle: "back", sets: 3, repMin: 8, repMax: 12, restSec: 120, incrementKg: 2.5, cues: ["Chest up, lean back slightly.", "Pull the elbows down and to the hips.", "Full stretch at the top of every rep."] },
      { slug: "biceps-curl-dumbbell", name: "Biceps Curl (Dumbbell)", muscle: "biceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2, cues: ["Elbows stay beside the body.", "Supinate on the way up.", "Lower under control, full extension."] },
      { slug: "face-pull", name: "Face Pull", muscle: "shoulders", sets: 3, repMin: 15, repMax: 25, restSec: 90, incrementKg: 2.5, cues: ["Pull to the forehead, elbows high.", "Finish with the hands beside the ears.", "Light weight, squeeze the rear delts."] },
      { slug: "hammer-curl-dumbbell", name: "Hammer Curl (Dumbbell)", muscle: "biceps", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2, cues: ["Neutral grip the whole way.", "No swinging, elbows fixed.", "Squeeze at the top."] },
    ],
  },
  {
    key: "legs",
    weekday: 3,
    title: "Legs",
    exercises: [
      { slug: "leg-press", name: "Leg Press", muscle: "quads", sets: 4, repMin: 8, repMax: 12, restSec: 150, incrementKg: 5, cues: ["Feet mid-platform, shoulder width.", "Lower until the thighs touch the torso, lower back stays on the pad.", "Don't lock the knees at the top."] },
      { slug: "leg-extension", name: "Leg Extension", muscle: "quads", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, cues: ["Pad on the shins just above the ankles.", "Full lockout, pause for a second.", "Lower slowly, no drop."] },
      { slug: "seated-leg-curl", name: "Seated Leg Curl", muscle: "hamstrings", sets: 3, repMin: 10, repMax: 12, restSec: 90, incrementKg: 2.5, cues: ["Hips pinned, pad tight on the thighs.", "Curl all the way under the seat.", "Let it back slowly to full extension."] },
      { slug: "adductor-machine", name: "Adductor Machine", muscle: "adductors", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, cues: ["Sit tall, hips back in the seat.", "Squeeze together and hold for a second.", "Open slowly, stop before the stretch hurts."] },
      { slug: "standing-calf-raise", name: "Standing Calf Raise", muscle: "calves", sets: 3, repMin: 10, repMax: 15, restSec: 90, incrementKg: 5, cues: ["Full stretch at the bottom, pause for a second.", "Rise onto the big toe.", "No bouncing out of the bottom."] },
    ],
  },
  {
    key: "upper",
    weekday: 4,
    title: "Upper",
    exercises: [
      { slug: "pull-up", name: "Pull Up", muscle: "back", sets: 3, repMin: 5, repMax: 10, restSec: 150, incrementKg: 2.5, bodyweight: true, cues: ["Start from a dead hang.", "Chin over the bar, chest to the bar if you can.", "Lower under control, no kipping."] },
      { slug: "incline-press-dumbbell", name: "Incline Press (Dumbbell)", muscle: "chest", sets: 3, repMin: 8, repMax: 10, restSec: 120, incrementKg: 2, cues: ["Bench at about 30°.", "Lower to the upper chest, elbows about 45°.", "Press up and slightly together."] },
      { slug: "chest-supported-row", name: "Chest-Supported Row", muscle: "back", sets: 3, repMin: 8, repMax: 12, restSec: 120, incrementKg: 2.5, cues: ["Chest stays on the pad the whole set.", "Pull the elbows back and squeeze the shoulder blades.", "Full stretch forward between reps."] },
      { slug: "shoulder-press-machine", name: "Shoulder Press (Machine)", muscle: "shoulders", sets: 3, repMin: 10, repMax: 12, restSec: 120, incrementKg: 2.5, cues: ["Seat so the handles start at ear height.", "Ribs down, back against the pad.", "Lock out without shrugging."] },
      { slug: "cable-lateral-raise", name: "Cable Lateral Raise", muscle: "shoulders", sets: 3, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, cues: ["Cable at the lowest setting, lean slightly away.", "Raise to shoulder height, lead with the elbow.", "Slow on the way down."] },
    ],
  },
  {
    key: "lower",
    weekday: 5,
    title: "Lower",
    exercises: [
      { slug: "hip-thrust", name: "Hip Thrust", muscle: "glutes", sets: 4, repMin: 8, repMax: 12, restSec: 150, incrementKg: 5, cues: ["Shoulder blades on the bench, chin tucked.", "Drive through the heels to a full lockout, squeeze the glutes.", "Lower until the hips almost touch the floor."] },
      { slug: "lying-leg-curl", name: "Lying Leg Curl", muscle: "hamstrings", sets: 3, repMin: 10, repMax: 12, restSec: 90, incrementKg: 2.5, cues: ["Hips pressed into the pad.", "Curl until the pad touches the glutes.", "Lower slowly to full extension."] },
      { slug: "back-extension-45", name: "45° Back Extension", muscle: "glutes", sets: 3, repMin: 10, repMax: 15, restSec: 90, incrementKg: 2.5, bodyweight: true, cues: ["Pad just below the hip bones.", "Hinge at the hips, back neutral.", "Squeeze the glutes at the top, don't hyperextend."] },
      { slug: "single-leg-leg-extension", name: "Single-Leg Leg Extension", muscle: "quads", sets: 2, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, perSide: true, cues: ["Full lockout, pause for a second.", "Lower slowly, no drop.", "Same reps on both sides."] },
      { slug: "seated-calf-raise", name: "Seated Calf Raise", muscle: "calves", sets: 4, repMin: 12, repMax: 20, restSec: 90, incrementKg: 5, cues: ["Full stretch at the bottom, pause for a second.", "Rise onto the big toe.", "No bouncing out of the bottom."] },
      { slug: "cable-crunch", name: "Cable Crunch", muscle: "abs", sets: 4, repMin: 12, repMax: 15, restSec: 90, incrementKg: 2.5, cues: ["Hips stay still, curl the spine.", "Elbows to the knees.", "Let the abs stretch back up, don't pull with the arms."] },
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

/** The rules that apply to every set of this exercise, in the order they are shown in the set briefing. */
export function setRules(e: Exercise): string[] {
  const load = e.bodyweight ? `+${e.incrementKg} kg added load` : `+${e.incrementKg} kg`;
  const rules = [
    `Stay in ${e.repMin}–${e.repMax} reps${e.perSide ? " per side" : ""}. Stop the set when form breaks.`,
    `Under ${e.repMin}: keep the weight next time.`,
    `${e.repMax} on every set at the same weight: ${load} next session.`,
  ];
  if (e.bodyweight) rules.push("Bodyweight exercise. Log only the added load.");
  if (e.perSide) rules.push("Same reps on both sides. Log the weaker side.");
  return rules;
}
