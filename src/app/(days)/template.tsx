/** Remounts on every day change, so the content slides in from the side of the tapped day. */
export default function DaysTemplate({ children }: { children: React.ReactNode }) {
  return <div className="anim-day">{children}</div>;
}
