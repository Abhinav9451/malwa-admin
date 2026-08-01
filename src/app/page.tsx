"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";

export default function Home() {
  const { ready, user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [ready, user, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Logo size="lg" />
      <p className="text-[13px] text-muted">Loading your workspace…</p>
    </main>
  );
}
