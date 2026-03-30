import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Logo } from "./Logo";

interface NavbarProps {
  variant?: "landing" | "auth" | "app";
}

export function Navbar({ variant = "landing" }: NavbarProps) {
  const { user, logout } = useAuth();

  if (variant === "landing") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-background/80 backdrop-blur-sm">
        <Logo />
        <div className="flex items-center gap-3 sm:gap-4">
          {!user && (
            <Link to="/login" className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block">
              Login
            </Link>
          )}
          <Link to="/leaderboard"
            className="rounded-[var(--radius-md)] bg-lime px-4 sm:px-5 py-2 text-sm font-medium text-coal hover:bg-lime/85 transition-colors">
            Leaderboard
          </Link>
        </div>
      </nav>
    );
  }

  if (variant === "auth") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 sm:gap-8">
          <Logo />
          <Link to="/leaderboard" className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block">Leaderboard</Link>
        </div>
        <Link to="/login"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-4 sm:px-5 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span className="hidden sm:inline">Login</span>
        </Link>
      </nav>
    );
  }

  return <AppNavbar user={user} logout={logout} />;
}

const NAV_LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/my-subscriptions", label: "My Subs" },
  { href: "/my-page", label: "My Page" },
] as const;

function AppNavbar({ user, logout }: { user: ReturnType<typeof useAuth>["user"]; logout: () => void }) {
  const { isConnected, address } = useAccount();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-8">
          <Logo />
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} to={href}
                className={`text-sm transition-colors ${pathname === href ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && address ? (
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="address"
            />
          ) : (
            <ConnectButton label="Connect Wallet" showBalance={false} />
          )}

          {user ? (
            <button onClick={logout}
              className="hidden sm:flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          ) : (
            <Link to="/login" className="hidden sm:block rounded-[var(--radius-md)] border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors">
              Login
            </Link>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-1.5 text-muted hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen
                ? <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>
                : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
              }
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed top-[57px] left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm md:hidden">
          <div className="flex flex-col px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} to={href} onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-[var(--radius-md)] text-sm transition-colors ${pathname === href ? "text-foreground bg-surface font-medium" : "text-muted hover:text-foreground hover:bg-surface/50"}`}>
                {label}
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-2">
              {user ? (
                <button onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-muted hover:text-foreground hover:bg-surface/50 transition-colors">
                  Logout
                </button>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-muted hover:text-foreground hover:bg-surface/50 transition-colors">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
