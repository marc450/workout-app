"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export function LoginForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}/auth/confirm` },
    });
    setBusy(false);
    if (error) {
      setError(error.message.includes("Signups not allowed") ? "This email isn't allowed." : error.message);
      return;
    }
    setStep("code");
  }

  async function verify(value: string) {
    if (value.length < 6 || value.length > 10 || busy) return;
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: value, type: "email" });
    if (error) {
      setBusy(false);
      setError(`Wrong or expired code. (${error.message})`);
      setCode("");
      codeRef.current?.focus();
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 rounded-[14px] bg-surface px-4 text-lg outline-none focus:ring-2 focus:ring-accent"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy || !email}
          className="mt-2 h-14 rounded-[14px] bg-accent text-lg font-semibold text-accent-ink disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verify(code);
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-muted">
        Enter the code sent to <span className="text-text">{email}</span>. The email also has a link, but the code works inside the installed app.
      </p>
      <label className="sr-only" htmlFor="code">
        Sign-in code
      </label>
      <input
        ref={codeRef}
        id="code"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={10}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className="font-display h-20 rounded-[14px] bg-surface text-center text-[40px] tracking-[0.2em] outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy || code.length < 6}
        className="mt-2 h-14 rounded-[14px] bg-accent text-lg font-semibold text-accent-ink disabled:opacity-50"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
        }}
        className="h-12 text-sm font-medium text-muted"
      >
        Use a different email
      </button>
    </form>
  );
}
