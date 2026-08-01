"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, user } = useStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo size="lg" />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <div className="anim-fade mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
