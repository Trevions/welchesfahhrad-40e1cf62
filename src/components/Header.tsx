import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { BikeProfileBadge } from "./BikeProfileBadge";
import { useBookmarks } from "@/hooks/use-bookmarks";


const nav = [
  { to: "/", label: "Startseite", exact: true },
  { to: "/fahrraeder", label: "Fahrräder" },
  { to: "/e-bikes", label: "E-Bikes" },
  { to: "/ratgeber", label: "Ratgeber" },
  { to: "/vergleich", label: "Vergleich" },
];

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { bookmarks } = useBookmarks();

  return (
    <header className="sticky top-0 z-50 hidden md:block bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-[1400px] px-8">
        <div className="flex h-16 items-center justify-between gap-8">
          {/* Wordmark */}
          <Link to="/" className="flex items-baseline whitespace-nowrap">
            <span className="font-display text-xl xl:text-2xl font-black italic tracking-tight leading-none">
              WelchesFahrrad<span className="text-signal">.</span>
            </span>
            <span className="ml-1 font-display text-xl xl:text-2xl font-black italic leading-none text-signal">
              DE
            </span>
          </Link>

          {/* Center nav */}
          <ul className="flex items-center gap-1">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`group relative px-4 py-2 eyebrow transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`absolute left-4 right-4 -bottom-px h-px bg-signal transition-transform origin-left ${
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <Link
              to="/merkliste"
              aria-label="Merkliste"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-signal hover:text-signal"
            >
              <Bookmark className="h-3.5 w-3.5" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-signal text-[10px] font-bold text-background shadow-glow">
                  {bookmarks.length}
                </span>
              )}
            </Link>
            <BikeProfileBadge />
          </div>
        </div>
      </div>
    </header>
  );
}
