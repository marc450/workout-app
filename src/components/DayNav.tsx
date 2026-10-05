"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import type { WeekTile } from "@/lib/data";
import { formatDate } from "@/lib/time";
import type { DayKey } from "@/plan";

const STATUS: Record<WeekTile["status"], { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-accent text-accent-ink" },
  "in-progress": { label: "In progress", cls: "bg-accent/30 text-text" },
  missed: { label: "Missed", cls: "bg-surface-2 text-muted line-through" },
  today: { label: "Today", cls: "bg-surface-2 text-text" },
  upcoming: { label: "Upcoming", cls: "bg-surface text-muted" },
};

const ShownDay = createContext<(key: DayKey | null) => void>(() => {});

/**
 * Mon to Fri strip shared by the home screen and the day pages. It lives in their layout, so it stays
 * mounted across navigation and the highlight slides from the old day to the tapped one right away.
 */
export function DayNav({ tiles, children }: { tiles: WeekTile[]; children: React.ReactNode }) {
  // The day the current page shows, reported by the page itself.
  const [shown, setShown] = useState<DayKey | null>(null);
  // A tap moves the highlight before the page arrives; once the page reports, it wins again.
  const [tapped, setTapped] = useState<{ key: DayKey; from: DayKey | null } | null>(null);
  const selected = tapped && tapped.from === shown ? tapped.key : shown;
  const idx = tiles.findIndex((t) => t.dayKey === selected);

  function tap(key: DayKey) {
    if (key === selected) return;
    const from = tiles.findIndex((t) => t.dayKey === selected);
    const to = tiles.findIndex((t) => t.dayKey === key);
    // The page content slides in from the side of the tapped day.
    document.documentElement.setAttribute("data-day-dir", from === -1 ? "" : to > from ? "right" : "left");
    setTapped({ key, from: shown });
  }

  return (
    <ShownDay.Provider value={setShown}>
      <nav aria-label="This week" className="relative mx-4 mb-2 flex">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-1/5 px-[3px] transition-[transform,opacity] duration-300 ease-spring ${idx === -1 ? "opacity-0" : "opacity-100"}`}
          style={{ transform: `translateX(${Math.max(idx, 0) * 100}%)` }}
        >
          <span className="block h-full rounded-[12px] ring-2 ring-inset ring-accent" />
        </span>
        {tiles.map((t) => {
          const s = STATUS[t.status];
          return (
            <Link
              key={t.date}
              href={`/day/${t.dayKey}`}
              onClick={() => tap(t.dayKey)}
              aria-current={t.dayKey === selected ? "page" : undefined}
              aria-label={`${formatDate(t.date, { weekday: "long" })}: ${t.title}, ${s.label}`}
              className="w-1/5 px-[3px]"
            >
              <span className={`flex h-12 flex-col items-center justify-center rounded-[12px] ${s.cls}`}>
                <span className="text-[10px] font-semibold uppercase leading-none tracking-wider opacity-70">{formatDate(t.date, { weekday: "short" })}</span>
                <span className="font-display mt-1 max-w-full truncate px-1 text-[16px] leading-none">{t.title}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      {children}
    </ShownDay.Provider>
  );
}

/** Rendered by a page to tell the strip which day it shows (null for the rest-day screen). */
export function ShowingDay({ dayKey }: { dayKey: DayKey | null }) {
  const setShown = useContext(ShownDay);
  useEffect(() => setShown(dayKey), [dayKey, setShown]);
  return null;
}
