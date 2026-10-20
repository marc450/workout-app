import Link from "next/link";

export function TopBar({ title, right, back }: { title?: string; right?: React.ReactNode; back?: string }) {
  return (
    <header className="safe-top flex items-center justify-between px-5 pb-2">
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <Link href={back} aria-label="Back" className="-ml-2 flex h-12 w-12 items-center justify-center rounded-full text-muted active:bg-surface-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        )}
        {title && <span className="truncate text-sm font-semibold text-muted">{title}</span>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex h-12 items-center rounded-full bg-surface px-4 text-sm font-semibold text-text active:bg-surface-2">
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-card bg-surface p-4 ${className}`}>{children}</section>;
}

export function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display mt-1 text-[40px] leading-none ${accent ? "text-accent" : "text-text"}`}>
        {value}
        {unit && <span className="ml-1 text-[20px] text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-card bg-surface px-5 py-10 text-center">
      <div className="font-display text-[32px] text-muted">{title}</div>
      {body && <p className="mt-2 text-sm text-muted">{body}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** A labelled on/off switch in a card, for the settings under the workout header. */
export function ToggleRow({ title, body, enabled, onChange }: { title: string; body: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-card bg-surface px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="text-[12px] text-muted">{body}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={() => onChange(!enabled)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${enabled ? "bg-accent" : "bg-surface-2"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full transition-[left] ${enabled ? "left-7 bg-accent-ink" : "left-1 bg-muted"}`} aria-hidden="true" />
      </button>
    </div>
  );
}
