"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { Avatar, cx } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const { db, ready, user, login } = useStore();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("admin@malwabuilders.com");
  const [password, setPassword] = useState("admin123");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    // small delay so signing in feels like a real round-trip
    window.setTimeout(() => {
      const res = login(email, password);
      setBusy(false);
      if (!res.ok) {
        setError(res.error ?? "Login failed");
        return;
      }
      toast.success("Welcome back", "Signed in to Malwa Builders Admin");
      router.replace("/dashboard");
    }, 450);
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ background: "linear-gradient(160deg,#0e1319 0%,#141b24 55%,#0a0d12 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(224,177,88,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(224,177,88,.5) 1px,transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(224,177,88,.22),transparent 65%)" }}
        />

        <div className="relative">
          <Logo size="md" onDark />
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-[40px] font-bold leading-[1.1] tracking-tight text-white">
            Har project, har rupee —<br />
            <span style={{ color: "var(--accent)" }}>one clean dashboard.</span>
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed text-white/60">
            Projects and their payment schedules, customers, material rates, vendor commitments,
            WhatsApp reminders and the photos on your website — all in one place, with an Excel
            download on every page.
          </p>
        </div>

        <p className="relative text-[11.5px] text-white/35">
          © {new Date().getFullYear()} Malwa Builders · Ks Grewal Road, Atma Nagar, Jagraon
        </p>
      </section>

      <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[26rem]">
          <div className="mb-7 lg:hidden">
            <Logo size="md" />
          </div>

          <h2 className="font-display text-[26px] font-bold tracking-tight text-ink">Sign in</h2>
          <p className="mt-1 text-[13px] text-muted">Use your Malwa Builders account to continue.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@malwabuilders.com"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-ink"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="anim-fade rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12.5px] font-medium text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full py-2.5" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="mb-2.5 flex items-center gap-2">
              <KeyRound size={13} className="text-gold" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Accounts — tap to fill</p>
            </div>
            <div className="space-y-1.5">
              {db.users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    setError(null);
                  }}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    email === u.email
                      ? "border-[var(--accent)] bg-gold-soft"
                      : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
                  )}
                >
                  <Avatar name={u.name} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{u.name}</span>
                      <code className="rounded bg-surface-3 px-1.5 py-0.5 text-[10.5px] text-muted">{u.password}</code>
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-muted">{u.designation}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              This panel runs entirely in your browser on sample data. Use the Excel download in
              Settings to keep a backup.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
