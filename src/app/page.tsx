import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FeatureTabs } from "@/components/FeatureTabs";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="landing" />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-36 pb-24">
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />

        <h1 className="relative text-center text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight">
          <span className="text-foreground">Prove Your Edge.</span>
          <br />
          <span className="text-lime">Privately.</span>
        </h1>

        <p className="relative mt-6 max-w-lg text-center text-lg text-muted leading-relaxed">
          A platform where creators prove and monetize their edge, and
          followers make informed moves based on real performance.
        </p>

        <Link
          href="/signup"
          className="relative mt-10 rounded-[var(--radius-lg)] bg-lime px-8 py-3.5 text-base font-semibold text-coal hover:bg-lime/85 transition-colors"
        >
          Get Started
        </Link>
      </section>

      {/* Feature Tabs Section */}
      <section className="px-6 pb-28">
        <FeatureTabs />
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-lime flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-coal" />
            </div>
            <span className="text-sm font-semibold text-foreground">maetra</span>
          </div>
          <p className="text-xs text-muted">
            Built on Aleo. Powered by zero-knowledge proofs.
          </p>
        </div>
      </footer>
    </div>
  );
}
