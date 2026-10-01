"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtKg, fmtLoad } from "@/lib/progress";
import { formatDate } from "@/lib/time";

const ACCENT = "#C8FF2E";
const MUTED = "#8B8B90";
const SURFACE2 = "#1C1C1F";

type Point = { date: string; topWeight: number; e1rm: number; bestReps: number; bestLoad: number; totalReps: number };
type Mode = "topWeight" | "e1rm" | "bestReps" | "totalReps";

const LABEL: Record<Mode, string> = { topWeight: "Top set", e1rm: "Est. 1RM", bestReps: "Best set", totalReps: "Total reps" };

/** Weighted exercises chart kg (top set, e1RM); bodyweight exercises chart reps (best set, session total). */
export function ExerciseChart({ points, bodyweight = false }: { points: Point[]; bodyweight?: boolean }) {
  const modes: readonly Mode[] = bodyweight ? ["bestReps", "totalReps"] : ["topWeight", "e1rm"];
  const [mode, setMode] = useState<Mode>(modes[0]);
  const data = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  const value = (v: number, point: Point) => {
    if (!bodyweight) return `${fmtKg(v)} kg`;
    if (mode === "bestReps") return `${v} × ${fmtLoad(point.bestLoad, true)}`;
    return `${v} reps`;
  };
  return (
    <div className="rounded-card bg-surface p-4">
      <div className="flex gap-1 rounded-full bg-surface-2 p-1" role="tablist" aria-label="Chart metric">
        {modes.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`h-10 flex-1 rounded-full text-sm font-semibold ${mode === m ? "bg-text text-bg" : "text-muted"}`}
          >
            {LABEL[m]}
          </button>
        ))}
      </div>
      <div className="mt-3 h-52">
        {data.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">Log two sessions to see a trend.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: "numeric", month: "short" })} tick={{ fill: MUTED, fontSize: 11 }} axisLine={{ stroke: SURFACE2 }} tickLine={false} minTickGap={28} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={44} />
              <Tooltip
                cursor={{ stroke: SURFACE2 }}
                contentStyle={{ background: SURFACE2, border: "none", borderRadius: 12, color: "#F4F4F2", fontSize: 13 }}
                labelFormatter={(d) => formatDate(String(d), { weekday: "short", day: "numeric", month: "short" })}
                formatter={(v, _name, item) => [value(Number(v), item.payload as Point), LABEL[mode]]}
              />
              <Line type="monotone" dataKey={mode} stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 5, fill: ACCENT, strokeWidth: 0 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function VolumeBars({ data }: { data: { muscle: string; sets: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.sets));
  return (
    <div className="h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis type="category" dataKey="muscle" width={84} tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: SURFACE2, border: "none", borderRadius: 12, color: "#F4F4F2", fontSize: 13 }} formatter={(v) => [`${v} sets`, ""]} />
          <Bar dataKey="sets" radius={[0, 6, 6, 0]} isAnimationActive={false} label={{ position: "right", fill: MUTED, fontSize: 12 }}>
            {data.map((d) => (
              <Cell key={d.muscle} fill={d.sets > 0 ? ACCENT : SURFACE2} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));
  const flat = values.every((v) => v === 0);
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <Line type="monotone" dataKey="v" stroke={flat ? SURFACE2 : ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
