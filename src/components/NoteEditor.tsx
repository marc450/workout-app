"use client";

import { useEffect, useRef, useState } from "react";
import { saveNote } from "@/app/actions";

export function NoteEditor({ slug, initial }: { slug: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  function schedule(value: string) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(value), 700);
  }

  async function persist(value: string) {
    setState("saving");
    const res = await saveNote(slug, value);
    setState(res.ok ? "saved" : "error");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 w-full items-start gap-2 rounded-[10px] px-2 py-2 text-left text-sm active:bg-surface-2"
      >
        <NoteIcon />
        {text ? <span className="whitespace-pre-wrap text-text">{text}</span> : <span className="text-muted">Add a note</span>}
      </button>
    );
  }

  return (
    <div className="rounded-[10px] bg-surface-2 p-2">
      <textarea
        ref={ref}
        value={text}
        rows={2}
        placeholder="Seat 4, grip wide…"
        onChange={(e) => {
          setText(e.target.value);
          schedule(e.target.value);
        }}
        onBlur={() => {
          if (timer.current) window.clearTimeout(timer.current);
          persist(text);
          setOpen(false);
        }}
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
      />
      <div className="text-[11px] text-muted">
        {state === "saving" && "Saving…"}
        {state === "saved" && "Saved"}
        {state === "error" && <span className="text-danger">Not saved</span>}
      </div>
    </div>
  );
}

function NoteIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16v12l-4 4H4z" />
      <path d="M16 20v-4h4" />
    </svg>
  );
}
