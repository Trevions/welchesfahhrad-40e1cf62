import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listPublicBikes } from "@/lib/bikes.functions";
import { BikeCard } from "@/components/bikes/BikeCard";
import { BIKE_TYPES } from "@/lib/bike-types";
import { Search, Heart, Sparkles, ArrowRight, Settings2 } from "lucide-react";
import { useBikeFavorites } from "@/hooks/use-bike-favorites";
import { useBikeProfile, summarizeProfile } from "@/lib/bike-profile";
import { matchBikeToProfile } from "@/lib/bike-match";

const bikesQuery = queryOptions({
  queryKey: ["public-bikes"],
  queryFn: () => listPublicBikes(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/fahrraeder/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(bikesQuery),
  head: () => ({
    meta: [
      { title: "Fahrräder & E-Bikes — welchesfahrrad.de" },
      {
        name: "description",
        content:
          "Entdecke geprüfte Fahrräder und E-Bikes mit vollständigen Spezifikationen, Motor- und Akkudaten, Tests und Empfehlungen.",
      },
      { property: "og:title", content: "Fahrräder & E-Bikes — welchesfahrrad.de" },
      {
        property: "og:description",
        content: "Die Fahrrad-Datenbank für Deutschland: alle Specs, Motoren, Reichweiten, Bewertungen.",
      },
      { property: "og:url", content: "/fahrraeder" },
    ],
    links: [{ rel: "canonical", href: "/fahrraeder" }],
  }),
  errorComponent: ({ error }) => (
    <div className="pt-32 px-6 text-center">
      <h1 className="font-display text-3xl font-black">Fehler</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => null,
  component: FahrraederPage,
});

type Filter = "all" | "bike" | "ebike";

function FahrraederPage() {
  const { data } = useSuspenseQuery(bikesQuery);
  const { favorites } = useBikeFavorites();
  const profile = useBikeProfile();
  const hasProfile = !!profile && profile.bikeTypes.length > 0;
  const [filter, setFilter] = useState<Filter>("all");
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");

  const bikes = useMemo(() => {
    const filtered = data.bikes.filter((b) => {
      if (filter !== "all" && b.category !== filter) return false;
      if (type !== "all" && b.bike_type !== type) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        if (!`${b.brand} ${b.model}`.toLowerCase().includes(s)) return false;
      }
      return true;
    });
    if (!hasProfile) return filtered.map((b) => ({ bike: b, percent: null as number | null }));
    return filtered
      .map((b) => ({ bike: b, percent: matchBikeToProfile(b, profile!).percent }))
      .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
  }, [data.bikes, filter, type, q, hasProfile, profile]);

  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="relative aurora-bg overflow-hidden">
        <div className="relative z-[1] mx-auto max-w-[1400px] px-4 md:px-8 py-12 md:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-3 py-1.5 eyebrow text-signal">
            Die Fahrrad-Datenbank
          </span>
          <h1 className="font-display font-black tracking-tight leading-[0.95] text-[clamp(2.25rem,7vw,5rem)] max-w-3xl">
            Fahrräder <span className="italic font-light text-muted-foreground">& E-Bikes</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">
            Alle Modelle mit vollständigen Spezifikationen, transparenten Bewertungen und Hersteller-Links.
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <section className="sticky top-16 z-20 bg-background/70 backdrop-blur-xl border-b border-border/60">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "bike", "ebike"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-semibold border transition-colors ${
                  filter === f
                    ? "bg-signal text-[#050505] border-signal shadow-glow"
                    : "bg-card border-border text-muted-foreground hover:border-signal hover:text-signal"
                }`}
              >
                {f === "all" ? "Alle" : f === "bike" ? "Fahrräder" : "E-Bikes"}
              </button>
            ))}
            <Link
              to="/favoriten"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold border border-border bg-card text-foreground hover:border-signal hover:text-signal transition-colors"
            >
              <Heart className={"h-3.5 w-3.5 " + (favorites.length > 0 ? "fill-signal text-signal" : "")} />
              Favoriten{favorites.length > 0 ? ` (${favorites.length})` : ""}
            </Link>
            <span className="text-xs text-muted-foreground tabular-nums">
              {bikes.length} {bikes.length === 1 ? "Modell" : "Modelle"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Marke oder Modell…"
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-card rounded-full border border-border focus:border-signal outline-none"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full bg-card border border-border outline-none focus:border-signal"
            >
              <option value="all">Alle Typen</option>
              {BIKE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="mx-auto max-w-[1400px] px-4 md:px-8 py-8 md:py-12">
        {/* Personalisierungs-Hinweis */}
        {hasProfile ? (
          <Link
            to="/mein-rad"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl glass-card p-3 md:p-4 hover-lift glow-signal group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                <Sparkles className="h-4 w-4 text-signal" />
              </span>
              <div className="min-w-0">
                <div className="eyebrow-sm text-signal">Sortiert nach deinem RadProfil</div>
                <div className="text-sm font-display font-bold truncate">
                  {summarizeProfile(profile) || "Profil bearbeiten"}
                </div>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 eyebrow-sm text-muted-foreground group-hover:text-foreground">
              <Settings2 className="h-3 w-3" />
              <span className="hidden sm:inline">Anpassen</span>
            </span>
          </Link>
        ) : (
          <Link
            to="/mein-rad"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl glass-card border-dashed p-3 md:p-4 hover-lift glow-signal group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                <Sparkles className="h-4 w-4 text-signal" />
              </span>
              <div className="min-w-0">
                <div className="eyebrow-sm text-signal">Persönlicher Match-Score</div>
                <div className="text-sm text-muted-foreground">
                  Größe, Budget & Vorlieben eintragen — Räder werden automatisch nach Passung sortiert.
                </div>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-signal text-signal-foreground px-3 py-2 eyebrow-sm shadow-glow">
              Starten <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        )}

        {bikes.length === 0 ? (
          <div className="rounded-2xl glass-card border-dashed p-16 text-center text-sm text-muted-foreground">
            Keine Fahrräder gefunden.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {bikes.map(({ bike, percent }) => (
              <BikeCard key={bike.id} bike={bike} matchPercent={percent} />
            ))}
          </div>
        )}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-signal">
            ← zurück zur Startseite
          </Link>
        </div>
      </section>
    </div>
  );
}
