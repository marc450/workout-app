import type { DayKey } from "@/plan";

export type SessionRow = {
  id: string;
  user_id: string;
  day_key: DayKey;
  session_date: string;
  started_at: string;
  finished_at: string | null;
};

export type SetLogRow = {
  id: string;
  session_id: string;
  exercise_slug: string;
  set_index: number;
  weight_kg: number;
  reps: number;
  completed_at: string;
};

export type NoteRow = {
  exercise_slug: string;
  note: string;
  updated_at: string;
};

export type SetValue = { weight: number; reps: number };
