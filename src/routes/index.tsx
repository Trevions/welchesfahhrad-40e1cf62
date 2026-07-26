import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bike,
  Zap,
  Sparkles,
  Star,
  GitCompareArrows,
  MapPin,
  Wrench,
  Battery,
  ShieldCheck,
  BadgeEuro,
  Search,
  CornerDownLeft,
} from "lucide-react";
import { listPublicBikes } from "@/lib/bikes.functions";
import { getPublicArticles } from "@/lib/articles.functions";
import { articleImageUrl } from "@/lib/article-image-url";
import { useBikeProfile } from "@/lib/bike-profile";
import { matchBikeToProfile } from "@/lib/bike-match";
import { BikeCompareButton } from "@/components/bikes/BikeCompareButton";
import heroBike from "@/assets/hero-bike.jpg";
import ebikeImg from "@/assets/ebike.jpg";
import ratgeberImg from "@/assets/ratgeber.jpg";

const homeQuery = queryOptions({
  queryKey: ["home-data"],
  queryFn: async () => {
    const [bikesRes, articlesRes] = await Promise.all([
      listPublicBikes(),
      getPublicArticles(),
    ]);
    return { bikes: bikesRes.bikes, articles: articlesRes.articles };
  },
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  head: () => ({
    meta: [
      { title: "WelchesFahrrad.de – Finde das perfekte Fahrrad. Vergleiche Tausende Modelle." },
      {
        name: "description",
        content:
          "Deutschlands größtes Fahrrad-Vergleichsportal. Vergleiche Tausende Fahrräder, E-Bikes und Marken. Finde mit wenigen Klicks das Fahrrad, das zu dir passt.",
      },
      { property: "og:title", content: "WelchesFahrrad.de – Finde das perfekte Fahrrad" },
      {
        property: "og:description",
        content: "Vergleiche Tausende Fahrräder, E-Bikes und Marken auf WelchesFahrrad.de.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:image", content: heroBike },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroBike },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "WelchesFahrrad.de",
          url: "https://welchesfahrrad.de/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://welchesfahrrad.de/fahrraeder?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "WelchesFahrrad.de",
          url: "https://welchesfahrrad.de/",
          logo: "https://welchesfahrrad.de/icons/icon-192.png",
          description:
            "Deutschlands Fahrrad- und E-Bike-Vergleichsplattform.",
        }),
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="pt-32 px-6 text-center">
      <h2 className="font-display text-3xl font-black">Fehler beim Laden</h2>
      <p className="mt-3 text-muted-foreground text-sm">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => null,
  component: Home,
});

/* --------------- static content --------------- */

type Cat = { name: string; slug: string; hint: string; ebike?: boolean };

const POPULAR_CATEGORIES: Cat[] = [
  { name: "Mountainbike", slug: "mountainbike", hint: "Trail & Enduro" },
  { name: "Trekkingbike", slug: "trekking", hint: "Alltag & Tour" },
  { name: "Gravel Bike", slug: "gravel", hint: "Asphalt & Schotter" },
  { name: "Rennrad", slug: "rennrad", hint: "Straße & Race" },
  { name: "City Bike", slug: "city", hint: "Stadt & Pendeln" },
  { name: "Kinderfahrrad", slug: "kinder", hint: "12″–26″" },
  { name: "Lastenrad", slug: "lastenrad", hint: "Familie & Cargo" },
  { name: "SUV Bike", slug: "suv", hint: "Robust & flexibel" },
  { name: "E-Mountainbike", slug: "e-mtb", hint: "Bosch · Shimano", ebike: true },
  { name: "E-Trekkingbike", slug: "e-trekking", hint: "Bosch CX", ebike: true },
  { name: "E-Citybike", slug: "e-city", hint: "Alltag mit Boost", ebike: true },
  { name: "E-Gravel", slug: "e-gravel", hint: "Leicht & schnell", ebike: true },
];

const POPULAR_BRANDS = [
  "Cube",
  "Canyon",
  "Trek",
  "Specialized",
  "Scott",
  "Haibike",
  "Focus",
  "Ghost",
  "Cannondale",
  "Bulls",
  "KTM",
  "Riese & Müller",
  "Gazelle",
  "Orbea",
  "Bergamont",
];

const RATGEBER_ITEMS = [
  { title: "Welches Fahrrad passt zu mir?", tag: "Kaufberatung", icon: Sparkles },
  { title: "Welche Rahmengröße brauche ich?", tag: "Passform", icon: Wrench },
  { title: "Bosch oder Shimano?", tag: "E-Bike Motor", icon: Battery },
  { title: "Hardtail oder Fully?", tag: "MTB", icon: MapPin },
  { title: "E-Bike kaufen 2026", tag: "Ratgeber", icon: Zap },
  { title: "Gravel oder Rennrad?", tag: "Road", icon: Bike },
];

/* --------------- helpers --------------- */

/** Custom bike SVG with independently-spinnable wheels for the hero search. */
function BikeIcon({ spin = false, fast = false, className = "" }: { spin?: boolean; fast?: boolean; className?: string }) {
  const wheel = spin
    ? fast
      ? "animate-wheel-spin-fast"
      : "animate-wheel-spin"
    : "";
  return (
    <svg
      viewBox="0 0 32 20"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* frame */}
      <path d="M7 14 L14 14 L20 6 L25 14" />
      <path d="M14 14 L18 6 L22 6" />
      <path d="M20 6 L20 4" />
      {/* seat + bar */}
      <path d="M12.5 14 L14.5 14" />
      <path d="M22 6 L23.5 6" />
      {/* wheels — spin group */}
      <g className={wheel} style={{ transformOrigin: "7px 14px", transformBox: "fill-box" as any }}>
        <circle cx="7" cy="14" r="4.6" />
        <path d="M7 9.4 L7 18.6 M2.4 14 L11.6 14 M3.7 10.7 L10.3 17.3 M3.7 17.3 L10.3 10.7" strokeWidth="0.7" opacity="0.6" />
      </g>
      <g className={wheel} style={{ transformOrigin: "25px 14px", transformBox: "fill-box" as any }}>
        <circle cx="25" cy="14" r="4.6" />
        <path d="M25 9.4 L25 18.6 M20.4 14 L29.6 14 M21.7 10.7 L28.3 17.3 M21.7 17.3 L28.3 10.7" strokeWidth="0.7" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Glass pill index badge tying sections together — "01 — Kategorien" */
function SectionIndex({ n, label }: { n: string; label: string }) {
  return (
    <div
      data-reveal
      className="inline-flex items-center gap-2.5 rounded-full glass-card !shadow-none px-4 py-1.5"
    >
      <span className="font-mono text-xs font-bold text-signal tabular-nums">{n}</span>
      <span className="h-3 w-px bg-border" />
      <span className="eyebrow text-muted-foreground">{label}</span>
    </div>
  );
}

function BikeProductCard({
  bike,
  match,
  index = 0,
}: {
  bike: any;
  match: number | null;
  index?: number;
}) {
  const img = articleImageUrl(bike.image_url ?? "") || bike.image_url || "/og.jpg";
  const rating =
    bike.expert_rating != null
      ? Number(bike.expert_rating).toFixed(1)
      : null;
  return (
    <article
      data-reveal
      style={{ transitionDelay: `${Math.min(index, 6) * 60}ms` }}
      className="group relative flex flex-col bg-card rounded-2xl border border-border/60 shadow-glass hover-lift overflow-hidden"
    >
      <div className="absolute top-3 right-3 z-10">
        <BikeCompareButton slug={bike.slug} variant="card" />
      </div>
      {match != null && (
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-signal text-signal-foreground text-[10px] font-black uppercase tracking-wider px-2.5 py-1 tabular-nums shadow-glow">
          <Sparkles className="h-2.5 w-2.5" />
          {match}% passend
        </span>
      )}
      <Link
        to="/fahrraeder/$slug"
        params={{ slug: bike.slug }}
        className="block"
      >
        <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 overflow-hidden">
          <img
            src={img}
            alt={`${bike.brand} ${bike.model}${bike.year ? ` (${bike.year})` : ""}`}
            loading="lazy"
            decoding="async"
            width={720}
            height={540}
            className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-[1.06]"
          />
        </div>
        <div className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {bike.brand}
            </span>
            {bike.bike_type && (
              <span className="text-[10px] font-medium text-muted-foreground rounded-full border border-border px-2 py-0.5">
                {bike.bike_type}
              </span>
            )}
          </div>
          <h3 className="font-display text-xl leading-tight font-bold line-clamp-2 min-h-[3.2rem] transition-colors group-hover:text-signal">
            {bike.model}
          </h3>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {bike.price_eur != null ? (
                <div className="font-mono font-bold text-lg tabular-nums">
                  {bike.price_eur.toLocaleString("de-DE")} €
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Preis auf Anfrage</div>
              )}
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {bike.category === "ebike" ? "E-Bike" : "Fahrrad"}
                {bike.year ? ` · ${bike.year}` : ""}
              </div>
            </div>
            {rating && (
              <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                <Star className="h-3 w-3 fill-signal text-signal" strokeWidth={0} />
                <span className="text-xs font-bold tabular-nums">{rating}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
      <div className="flex gap-2 px-5 pb-5">
        <Link
          to="/fahrraeder/$slug"
          params={{ slug: bike.slug }}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-foreground text-background text-[11px] uppercase tracking-wider font-bold py-2.5 hover:bg-signal hover:text-signal-foreground transition-colors"
        >
          Details
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          to="/vergleich"
          className="inline-flex items-center justify-center gap-1 rounded-full border border-border text-[11px] uppercase tracking-wider font-bold py-2.5 px-4 hover:border-signal hover:text-signal transition-colors"
        >
          <GitCompareArrows className="h-3 w-3" />
          Vergleichen
        </Link>
      </div>
    </article>
  );
}

function CategoryCard({ cat, index = 0 }: { cat: Cat; index?: number }) {
  return (
    <Link
      data-reveal
      style={{ transitionDelay: `${Math.min(index, 8) * 45}ms` }}
      to="/fahrraeder"
      className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 md:p-5 aspect-[5/4] md:aspect-[4/5] overflow-hidden hover-lift glow-signal"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(120% 80% at 80% 100%, color-mix(in oklab, var(--signal) 22%, transparent), transparent 60%)",
        }}
      />
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            cat.ebike
              ? "bg-signal text-signal-foreground"
              : "border border-border bg-background text-foreground"
          }`}
        >
          {cat.ebike ? (
            <Zap className="h-3 w-3" />
          ) : (
            <span className="inline-block group-hover:animate-wheel-spin-fast">
              <Bike className="h-3 w-3" />
            </span>
          )}
          {cat.ebike ? "E-Bike" : "Fahrrad"}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-signal group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <h3 className="font-display text-lg md:text-2xl font-bold leading-tight tracking-tight">
          {cat.name}
        </h3>
        <p className="mt-0.5 text-[11px] md:text-xs text-muted-foreground">{cat.hint}</p>
      </div>
    </Link>
  );
}

/* --------------- page --------------- */

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  const profile = useBikeProfile();
  const hasProfile = !!profile && (profile as any).bikeTypes?.length > 0;

  const topBikes = useMemo(() => {
    const list = data.bikes.slice(0, 40);
    const scored = list.map((b) => ({
      bike: b,
      match: hasProfile ? matchBikeToProfile(b as any, profile as any).percent : null,
    }));
    if (hasProfile) scored.sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
    return scored.slice(0, 8);
  }, [data.bikes, hasProfile, profile]);

  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  type SearchHit =
    | { kind: "bike"; slug: string; title: string; sub: string; image: string; eyebrow: string }
    | { kind: "ratgeber"; slug: string; title: string; sub: string; image: string; eyebrow: string }
    | { kind: "category"; slug: string; title: string; sub: string; eyebrow: string };

  const results = useMemo<SearchHit[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const bikeHits: SearchHit[] = data.bikes
      .filter((b: any) =>
        [b.brand, b.model, b.bike_type ?? "", b.category ?? ""].join(" ").toLowerCase().includes(term),
      )
      .slice(0, 6)
      .map((b: any) => ({
        kind: "bike",
        slug: b.slug,
        title: `${b.brand} ${b.model}`,
        sub: [b.bike_type, b.year, b.price_eur != null ? `${b.price_eur.toLocaleString("de-DE")} €` : null]
          .filter(Boolean)
          .join(" · "),
        image: articleImageUrl(b.image_url ?? "") || b.image_url || "/og.jpg",
        eyebrow: b.category === "ebike" ? "E-Bike" : "Fahrrad",
      }));
    const ratgeberHits: SearchHit[] = data.articles
      .filter((a: any) =>
        [a.title, a.excerpt ?? "", a.category ?? ""].join(" ").toLowerCase().includes(term),
      )
      .slice(0, 3)
      .map((a: any) => ({
        kind: "ratgeber",
        slug: a.slug,
        title: a.title,
        sub: a.excerpt ?? "",
        image: articleImageUrl(a.image ?? "") || a.image || "/og.jpg",
        eyebrow: a.category ?? "Ratgeber",
      }));
    const catHits: SearchHit[] = POPULAR_CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(term),
    )
      .slice(0, 2)
      .map((c) => ({
        kind: "category",
        slug: c.slug,
        title: c.name,
        sub: c.hint,
        eyebrow: c.ebike ? "E-Bike Kategorie" : "Kategorie",
      }));
    return [...bikeHits, ...ratgeberHits, ...catHits];
  }, [q, data.bikes, data.articles]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const goToHit = (hit: SearchHit) => {
    setFocused(false);
    if (hit.kind === "bike") navigate({ to: "/fahrraeder/$slug", params: { slug: hit.slug } });
    else if (hit.kind === "ratgeber") navigate({ to: "/artikel/$slug", params: { slug: hit.slug } });
    else navigate({ to: "/fahrraeder" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setFocused(false);
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[active];
      if (hit) goToHit(hit);
    }
  };

  const ratgeberArticles = useMemo(
    () => data.articles.filter((a: any) => a.category === "Ratgeber").slice(0, 6),
    [data.articles],
  );

  const totalBikes = data.bikes.length;
  const totalEbikes = data.bikes.filter((b) => b.category === "ebike").length;

  return (
    <>
      {/* ============== HERO ============== */}
      <section aria-labelledby="hero-heading" className="relative aurora-bg overflow-hidden">
        <div className="relative z-[1] mx-auto max-w-[1280px] px-4 md:px-8 pt-10 md:pt-16 pb-10 md:pb-14">
          {/* Trust ribbon — glass pill chips */}
          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
            <span className="inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal animate-pulse-soft" />
              Deutschlands Fahrrad-Vergleichsportal
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-signal" /> 100 % unabhängig
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
              <BadgeEuro className="h-3.5 w-3.5 text-signal" /> Preisvergleich in Echtzeit
            </span>
          </div>

          <h1
            id="hero-heading"
            className="mt-6 font-display font-black tracking-tight leading-[0.95] text-[clamp(2.25rem,6.8vw,4.75rem)] animate-fade-up"
          >
            <span className="kinetic inline-block">Finde das perfekte</span>
            <span className="block">
              <span className="relative inline-block">
                <span className="relative z-10 px-1 text-shine">Fahrrad</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 md:bottom-2 h-3 md:h-4 bg-signal/25 blur-md -z-0"
                />
              </span>
              .
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-up" style={{ animationDelay: "100ms" }}>
            Vergleiche Tausende Fahrräder, E-Bikes und Marken. Finde mit wenigen
            Klicks das Fahrrad, das wirklich zu dir passt.
          </p>

          {/* Search — glass, glowing on focus */}
          <div ref={searchRef} className="relative mt-7 animate-scale-in" style={{ animationDelay: "180ms" }}>
            <div
              role="search"
              aria-label="Fahrrad-Suche"
              className={`relative flex w-full items-stretch rounded-2xl glass-card overflow-hidden transition-shadow duration-500 ${
                focused ? "!shadow-glow" : ""
              }`}
            >
              <label htmlFor="hero-search" className="sr-only">
                Fahrrad, Marke, Kategorie oder Ratgeber suchen
              </label>
              <span className="flex items-center pl-5 pr-3 text-signal">
                <Search className="h-5 w-5" />
              </span>
              <input
                id="hero-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={onKeyDown}
                placeholder="Fahrrad, Marke, Kategorie oder Ratgeber suchen…"
                className="flex-1 min-w-0 bg-transparent py-4 md:py-5 pr-5 text-base outline-none placeholder:text-muted-foreground/70"
                autoComplete="off"
              />
            </div>

            {focused && q.trim() && (
              <div className="absolute left-0 right-0 top-full mt-3 z-40 rounded-2xl glass-card !shadow-elevated overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {results.length > 0 ? `${results.length} Ergebnisse` : "Keine Treffer"}
                  </span>
                  <div className="hidden md:flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>↑↓ Navigieren</span>
                    <span className="flex items-center gap-1">
                      <CornerDownLeft className="h-3 w-3" /> Öffnen
                    </span>
                  </div>
                </div>
                <ul className="max-h-[60vh] overflow-y-auto py-1">
                  {results.length === 0 && (
                    <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Nichts für „{q}" gefunden. Probiere eine Marke oder Kategorie.
                    </li>
                  )}
                  {results.map((r, i) => (
                    <li key={`${r.kind}-${r.slug}-${i}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => goToHit(r)}
                        className={`w-full flex items-center gap-4 px-4 py-3 text-left border-l-2 transition-colors ${
                          i === active
                            ? "bg-signal/10 border-signal"
                            : "border-transparent hover:bg-accent/40"
                        }`}
                      >
                        {"image" in r ? (
                          <img
                            src={r.image}
                            alt=""
                            width={64}
                            height={48}
                            loading="lazy"
                            className="h-12 w-16 rounded-lg object-cover bg-muted shrink-0"
                          />
                        ) : (
                          <span className="h-12 w-16 rounded-lg bg-muted shrink-0 flex items-center justify-center text-foreground/60">
                            <Bike className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-signal mb-0.5">
                            {r.eyebrow}
                          </div>
                          <div className="font-display text-base md:text-lg font-bold leading-snug truncate">
                            {r.title}
                          </div>
                          {r.sub && (
                            <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
                          )}
                        </div>
                        <ArrowRight
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            i === active ? "translate-x-1 text-signal" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Stats row — floating glass tiles */}
          <div className="mt-6 grid grid-cols-3 gap-3 md:max-w-xl">
            {[
              { value: totalBikes.toLocaleString("de-DE"), label: "Modelle" },
              { value: totalEbikes.toLocaleString("de-DE"), label: "E-Bikes" },
              { value: `${POPULAR_BRANDS.length}+`, label: "Marken" },
            ].map((s, i) => (
              <div
                key={s.label}
                data-reveal
                style={{ transitionDelay: `${i * 80}ms` }}
                className="glass-card !rounded-xl px-3 py-3 md:px-4 md:py-4 hover-lift"
              >
                <div className="font-mono text-xl md:text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="mt-0.5 eyebrow-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Two category rows — compact glass tiles */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Link
              data-reveal
              to="/fahrraeder"
              className="group relative flex items-center gap-4 rounded-2xl glass-card p-4 md:p-5 hover-lift glow-signal"
            >
              <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-xl">
                <img
                  src={heroBike}
                  alt="Mountainbike auf einem Alpentrail — Kategorie Fahrräder"
                  width={160}
                  height={160}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Bike className="h-3 w-3" /> Kategorie
                </span>
                <h2 className="mt-0.5 font-display text-xl md:text-2xl font-black leading-tight tracking-tight">
                  Fahrräder
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  MTB, Gravel, Rennrad, City & mehr
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:text-signal group-hover:translate-x-1" />
            </Link>

            <Link
              data-reveal
              style={{ transitionDelay: "80ms" }}
              to="/e-bikes"
              className="group relative flex items-center gap-4 rounded-2xl glass-card p-4 md:p-5 hover-lift glow-signal"
            >
              <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-xl">
                <img
                  src={ebikeImg}
                  alt="Premium E-Bike mit Bosch Antrieb — Kategorie E-Bikes"
                  width={160}
                  height={160}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                />
                <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-signal text-signal-foreground">
                  <Zap className="h-3 w-3" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Zap className="h-3 w-3" /> E-Bike
                </span>
                <h2 className="mt-0.5 font-display text-xl md:text-2xl font-black leading-tight tracking-tight">
                  E-Bikes
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  Bosch, Shimano & Co. — Pedelec bis Premium-E-MTB
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:text-signal group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============== POPULAR CATEGORIES ============== */}
      <section aria-labelledby="cats-heading" className="py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-10">
            <SectionIndex n="01" label="Kategorien" />
            <Link
              to="/fahrraeder"
              className="inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-4 py-2 text-xs font-bold uppercase tracking-wider hover-lift"
            >
              Alle Kategorien <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <h2
            id="cats-heading"
            data-reveal
            className="mb-6 md:mb-10 font-display text-2xl md:text-4xl font-black tracking-tight"
          >
            Beliebte Kategorien
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {POPULAR_CATEGORIES.map((c, i) => (
              <CategoryCard key={c.slug} cat={c} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ============== POPULAR BRANDS ============== */}
      <section aria-labelledby="brands-heading" className="py-14 md:py-20 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--signal) 6%, transparent), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-10">
            <SectionIndex n="02" label="Marken" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-10">
            <h2
              id="brands-heading"
              data-reveal
              className="font-display text-2xl md:text-4xl font-black tracking-tight"
            >
              Beliebte Marken
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Von Premium-Herstellern bis zu Direct-to-Consumer-Marken – alle
              führenden Namen an einem Ort.
            </p>
          </div>
          <ul
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-3"
            role="list"
          >
            {POPULAR_BRANDS.map((b, i) => (
              <li key={b} data-reveal style={{ transitionDelay: `${Math.min(i, 8) * 35}ms` }}>
                <Link
                  to="/fahrraeder"
                  className="group flex items-center justify-center rounded-xl bg-card border border-border/60 shadow-glass h-14 md:h-16 px-3 hover-lift glow-signal"
                >
                  <span className="font-display text-sm md:text-base font-bold tracking-tight group-hover:text-signal transition-colors text-center truncate">
                    {b}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============== TOP FAHRRÄDER ============== */}
      {topBikes.length > 0 && (
        <section aria-labelledby="top-heading" className="py-14 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-10">
              <SectionIndex n="03" label="Bestenliste" />
              <Link
                to="/fahrraeder"
                className="inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-4 py-2 text-xs font-bold uppercase tracking-wider hover-lift"
              >
                Alle ansehen <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-10">
              <h2
                id="top-heading"
                data-reveal
                className="font-display text-2xl md:text-4xl font-black tracking-tight"
              >
                Top Fahrräder
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {hasProfile
                  ? "Sortiert nach deinem RadProfil."
                  : "Ausgewählte Modelle mit den besten Bewertungen und Testergebnissen."}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {topBikes.map(({ bike, match }, i) => (
                <BikeProductCard key={bike.id} bike={bike} match={match} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============== BIKE FINDER CTA ============== */}
      <section aria-labelledby="finder-heading" className="py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <div
            data-reveal
            className="relative overflow-hidden rounded-3xl bg-foreground text-background p-7 md:p-12 shadow-elevated"
          >
            <div
              aria-hidden
              className="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-40"
              style={{
                background: "radial-gradient(closest-side, var(--signal), transparent 70%)",
              }}
            />
            <div
              aria-hidden
              className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full blur-3xl opacity-25"
              style={{
                background: "radial-gradient(closest-side, #7c5cff, transparent 70%)",
              }}
            />
            <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-8">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-signal text-signal-foreground text-[10px] font-black uppercase tracking-wider px-2.5 py-1 shadow-glow">
                  <Sparkles className="h-3 w-3" /> Bike Finder
                </span>
                <h2
                  id="finder-heading"
                  className="mt-4 font-display text-2xl md:text-4xl font-black tracking-tight leading-[1.05]"
                >
                  Welches Fahrrad passt zu dir?
                </h2>
                <p className="mt-3 max-w-xl text-sm md:text-base text-background/75 leading-relaxed">
                  Beantworte ein paar kurze Fragen zu Fahrstil, Budget und Körpergröße
                  – wir finden dein perfektes Fahrrad in unter 60 Sekunden.
                </p>
              </div>
              <Link
                data-magnetic="0.25"
                to="/mein-rad"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-signal text-signal-foreground px-7 py-3.5 text-sm md:text-base font-black uppercase tracking-wider hover:gap-3 transition-all shadow-glow"
              >
                <span className="group-hover:animate-wheel-spin-fast inline-block"><BikeIcon className="h-4 w-6" /></span>
                Jetzt Fahrrad finden
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============== RATGEBER ============== */}
      <section aria-labelledby="guide-heading" className="py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-10">
            <SectionIndex n="04" label="Ratgeber" />
            <Link
              to="/ratgeber"
              className="inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-4 py-2 text-xs font-bold uppercase tracking-wider hover-lift"
            >
              Alle Ratgeber <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <h2
            id="guide-heading"
            data-reveal
            className="mb-6 md:mb-10 font-display text-2xl md:text-4xl font-black tracking-tight"
          >
            Aktuelle Kaufberatung
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {(ratgeberArticles.length >= 6
              ? ratgeberArticles.map((a: any, i) => ({
                  key: a.slug,
                  title: a.title,
                  tag: a.category,
                  image: a.image,
                  href: `/artikel/${a.slug}` as const,
                  icon: RATGEBER_ITEMS[i]?.icon ?? Sparkles,
                }))
              : RATGEBER_ITEMS.map((r) => ({
                  key: r.title,
                  title: r.title,
                  tag: r.tag,
                  image: ratgeberImg as string,
                  href: "/ratgeber" as const,
                  icon: r.icon,
                }))
            ).map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  data-reveal
                  style={{ transitionDelay: `${Math.min(i, 5) * 60}ms` }}
                  to={item.href as any}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border/60 shadow-glass hover-lift"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={450}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
                    />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white text-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                      <Icon className="h-3 w-3" /> {item.tag}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg md:text-xl font-bold leading-tight tracking-tight line-clamp-2 group-hover:text-signal transition-colors">
                      {item.title}
                    </h3>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                      Lesen <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
