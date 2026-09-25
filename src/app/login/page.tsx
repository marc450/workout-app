import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · PPLUL" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const defaultEmail = process.env.ALLOWED_EMAIL ?? "";
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5">
      <div className="flex-1" />
      <div className="anim-rise">
        <p className="text-sm font-medium text-muted">Workout log</p>
        <h1 className="font-display mt-1 text-[88px] text-text">PPLUL</h1>
      </div>
      <div className="mt-10">
        {error === "forbidden" && <p className="mb-4 text-sm text-danger">That account isn&apos;t allowed here.</p>}
        {error === "link" && <p className="mb-4 text-sm text-danger">That link has expired. Request a new code.</p>}
        <LoginForm defaultEmail={defaultEmail} />
      </div>
      <div className="flex-1" />
    </main>
  );
}
