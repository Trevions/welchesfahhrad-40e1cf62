import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink, Zap, Check, X, ArrowLeft, Scale, Share2, Printer, Copy,
  Award, Star, ShieldCheck, Wrench, Battery, Activity, Leaf, Map as MapIcon, MessageSquare,
  ChevronDown, Search, Calendar, ZoomIn,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getPublicBikeBySlug } from "@/lib/bikes.functions";
import { articleImageUrl } from "@/lib/article-image-url";
import { BikeRatingRadar } from "@/components/bikes/BikeRatingRadar";
import { BikeImageLightbox } from "@/components/bikes/BikeImageLightbox";
import { BikePrintSheet } from "@/components/bikes/BikePrintSheet";
import { compareStore, subscribeCompare } from "@/lib/bike-compare";
import { BikeFavoriteButton } from "@/components/bikes/BikeFavoriteButton";
import { BikeMatchCard } from "@/components/bikes/BikeMatchCard";
import { ShareMenu } from "@/components/ShareMenu";
import { listBikeReviews, submitBikeReview, type BikeReview } from "@/lib/bike-reviews.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import type { Bike } from "@/lib/bike-types";

const bikeQuery = (slug: string) =>
  queryOptions({
    queryKey: ["bike", slug],
    queryFn: () => getPublicBikeBySlug({ data: { slug } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/fahrraeder/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(bikeQuery(params.slug));
    if (!res.bike) throw notFound();
    return res;
  },
  head: ({ params, loaderData }) => {
    const b = loaderData?.bike;
    if (!b) return { meta: [{ title: "Fahrrad — welchesfahrrad.de" }] };
    const title = b.meta_title || `${b.brand} ${b.model}${b.year ? ` (${b.year})` : ""} — Test, Specs & Bewertung | welchesfahrrad.de`;
    const desc =
      b.meta_description ||
      b.excerpt ||
      b.ai_summary?.best_for ||
      `Alle Specs, Geometrie, Reichweite, Wartung und Bewertungen zum ${b.brand} ${b.model}${b.year ? ` (${b.year})` : ""}.`;
    const ogRaw = b.og_image_url ?? b.image_url ?? b.gallery?.[0] ?? "";
    const og = articleImageUrl(ogRaw) || ogRaw || "/og.jpg";
    const url = `https://welchesfahrrad.de/fahrraeder/${params.slug}`;
    const product: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${b.brand} ${b.model}`,
      brand: { "@type": "Brand", name: b.brand },
      model: b.model,
      image: og,
      description: desc,
      category: b.category === "ebike" ? "E-Bike" : "Fahrrad",
    };
    if (b.price_eur) {
      product.offers = {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: b.price_eur,
        availability: "https://schema.org/InStock",
        url: b.manufacturer_url || url,
      };
    }
    if (b.expert_rating || b.ratings?.overall) {
      product.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: b.expert_rating ?? b.ratings.overall,
        bestRating: 10,
        ratingCount: 1,
      };
    }
    const modified = b.updated_at ?? b.published_at ?? undefined;
    const published = b.published_at ?? b.updated_at ?? undefined;
    if (modified) product.dateModified = modified;
    if (published) product.releaseDate = published;
    product.sku = b.slug;
    product.mpn = `${b.brand}-${b.model}${b.year ? `-${b.year}` : ""}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
    product.url = url;
    const catUrl = "https://welchesfahrrad.de/fahrraeder";
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Start", item: "https://welchesfahrrad.de/" },
        { "@type": "ListItem", position: 2, name: "Fahrräder", item: catUrl },
        { "@type": "ListItem", position: 3, name: `${b.brand} ${b.model}`, item: url },
      ],
    };
    const scripts: any[] = [
      { type: "application/ld+json", children: JSON.stringify(product) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
    ];
    if ((b.faq ?? []).length > 0) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: b.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      });
    }
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: og },
        { property: "og:image:alt", content: `${b.brand} ${b.model}` },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        { property: "og:site_name", content: "welchesfahrrad.de" },
        { property: "og:locale", content: "de_DE" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@welchesfahrrad_de" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: og },
        ...(b.keywords?.length ? [{ name: "keywords", content: b.keywords.join(", ") }] : []),
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "alternate", hrefLang: "de-DE", href: url },
        { rel: "alternate", hrefLang: "x-default", href: url },
      ],
      scripts,
    };
  },

  errorComponent: ({ error }) => (
    <div className="pt-32 px-6 text-center">
      <h1 className="font-display text-3xl font-black">Fehler</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="pt-32 px-6 text-center">
      <h1 className="font-display text-3xl font-black">Fahrrad nicht gefunden</h1>
      <Link to="/fahrraeder" className="mt-4 inline-block text-signal underline">
        Zur Übersicht
      </Link>
    </div>
  ),
  component: BikeDetailPage,
});

// ---------- helpers ----------

const SECTIONS: { id: string; label: string }[] = [
  { id: "overview", label: "Überblick" },
  { id: "quick-facts", label: "Quick Facts" },
  { id: "suitability", label: "Für wen?" },
  { id: "specs", label: "Spezifikationen" },
  { id: "geometry", label: "Geometrie" },
  { id: "configuration", label: "Konfiguration" },
  { id: "ebike-system", label: "E-Bike System" },
  { id: "range", label: "Reichweite" },
  { id: "performance", label: "Fahrgefühl" },
  { id: "maintenance", label: "Wartung" },
  { id: "costs", label: "Kosten" },
  { id: "environment", label: "Umwelt" },
  { id: "safety", label: "Sicherheit" },
  { id: "accessories", label: "Zubehör" },
  { id: "ai-analysis", label: "KI-Analyse" },
  { id: "pros-cons", label: "Pro & Contra" },
  { id: "faq", label: "FAQ" },
  { id: "history", label: "Historie" },
  { id: "comparable", label: "Vergleichbare" },
  { id: "reviews", label: "Bewertungen" },
];

const SUIT_LABELS: Record<string, string> = {
  beginner: "Anfänger", intermediate: "Fortgeschritten", pro: "Profi",
  commuting: "Pendeln", touring: "Tour", gravel: "Gravel", mountain: "Mountainbike",
  bikepacking: "Bikepacking", city: "Stadt", family: "Familie", cargo: "Cargo", racing: "Racing",
};

const PERF_LABELS: Record<string, string> = {
  comfort: "Komfort", handling: "Handling", cornering: "Kurven", stability: "Stabilität",
  acceleration: "Beschleunigung", climbing: "Bergauf", descending: "Bergab",
  offroad: "Offroad", city: "Stadt", longdistance: "Langstrecke",
  sportiness: "Sportlichkeit", suspension: "Federung",
};

// ---------- page ----------

function BikeDetailPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(bikeQuery(params.slug));
  const b = data.bike!;
  const heroImg = articleImageUrl(b.image_url ?? "") || b.image_url || b.gallery?.[0] || "/og.jpg";
  const allImages = useMemo(() => {
    const list = [b.image_url, ...(b.gallery ?? [])].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [b.image_url, b.gallery]);
  const [active, setActive] = useState<string>("overview");
  const [activeImg, setActiveImg] = useState<string>(heroImg);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = (src: string) => {
    const i = allImages.indexOf(src);
    setLightboxIndex(i >= 0 ? i : 0);
  };
  const [query, setQuery] = useState("");

  // Scrollspy
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const seen = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio));
        let best = "overview"; let bestR = 0;
        seen.forEach((r, id) => { if (r > bestR) { bestR = r; best = id; } });
        if (bestR > 0) setActive(best);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.5, 1] },
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    observers.push(obs);
    return () => observers.forEach((o) => o.disconnect());
  }, [b.id]);

  const visibleSections = useMemo(() => {
    const ebikeOnly = new Set(["ebike-system", "range", "costs"]);
    const base = b.category === "ebike" ? SECTIONS : SECTIONS.filter((s) => !ebikeOnly.has(s.id));
    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter((s) => s.label.toLowerCase().includes(q));
  }, [query, b.category]);

  return (
    <>
    <article className="bg-background print:hidden">

      {/* HERO */}
      <header id="overview" className="border-b border-border bg-card scroll-mt-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-6 md:py-10 border-x border-border">
          <Link to="/fahrraeder" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-signal mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Alle Fahrräder
          </Link>
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-12 items-start">
            <BikeGallery bike={b} active={activeImg} onSelect={setActiveImg} onOpen={openLightbox} />
            <div>
              <div className="eyebrow text-signal">{b.brand}</div>
              <h1 className="font-display font-black tracking-tight leading-[0.95] text-[clamp(2rem,6vw,3.75rem)] mt-2">
                {b.model}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-mono">
                {b.category === "ebike" && (
                  <span className="inline-flex items-center gap-1 bg-signal text-[#050505] text-[10px] uppercase tracking-wider font-bold px-2 py-1">
                    <Zap className="h-3 w-3" /> E-Bike
                  </span>
                )}
                {b.bike_type && <span className="px-2 py-0.5 border border-border">{b.bike_type}</span>}
                {b.year && <span>Modelljahr {b.year}</span>}
                {b.availability && <span className="text-emerald-500">{b.availability}</span>}
              </div>

              {b.awards.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {b.awards.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-1">
                      <Award className="h-3 w-3" /> {a.name}{a.year ? ` ${a.year}` : ""}
                    </span>
                  ))}
                </div>
              )}

              {b.excerpt && <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">{b.excerpt}</p>}

              {/* Rating + price */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {b.expert_rating != null && (
                  <RatingBox label="Experten-Note" value={b.expert_rating} />
                )}
                <UserRatingBox bikeId={b.id} />
                {b.price_eur != null && (
                  <div className="border border-border p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">UVP ab</div>
                    <div className="font-display text-xl md:text-2xl font-black tabular-nums">
                      {b.price_eur.toLocaleString("de-DE")} €
                    </div>
                    {b.price_date && (
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Stand: {new Date(b.price_date).toLocaleDateString("de-DE")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Match zum RadProfil */}
              <BikeMatchCard bike={b} />

              {/* Actions */}
              <ActionBar bike={b} />

              <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Hinweis: welchesfahrrad.de verkauft keine Räder — wir verlinken zum Hersteller.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* STICKY NAV + CONTENT */}
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 border-x border-border">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-24 py-10">
              <div className="relative mb-3">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Abschnitt suchen…"
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <nav className="space-y-0.5 text-xs">
                {visibleSections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`block py-1.5 px-2 border-l-2 transition-colors ${
                      active === s.id
                        ? "border-signal text-foreground font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile sticky tab strip */}
          <div className="lg:hidden sticky top-14 z-20 -mx-4 mb-4 mt-4 bg-background/95 backdrop-blur border-y border-border overflow-x-auto">
            <div className="flex gap-1 px-4 py-2">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`}
                  className={`whitespace-nowrap text-[11px] uppercase tracking-wider px-2.5 py-1 border ${
                    active === s.id ? "bg-signal text-[#050505] border-signal" : "border-border text-muted-foreground"
                  }`}>{s.label}</a>
              ))}
            </div>
          </div>

          <main className="py-6 lg:py-10 space-y-12 md:space-y-16">
            <QuickFactsSection b={b} />
            <SuitabilitySection b={b} />
            <SpecsSection b={b} />
            <GeometrySection b={b} />
            <ConfigurationSection b={b} />
            {b.category === "ebike" && <EbikeSystemSection b={b} />}
            <RangeSection b={b} />
            <PerformanceSection b={b} />
            <MaintenanceSection b={b} />
            <CostsSection b={b} />
            <EnvironmentSection b={b} />
            <SafetySection b={b} />
            <AccessoriesSection b={b} />
            <AiAnalysisSection b={b} />
            <ProsConsSection b={b} />
            <FaqSection b={b} />
            <HistorySection b={b} />
            <ComparableModelsSection b={b} />
            <ReviewsSection bikeId={b.id} />
          </main>
        </div>
      </div>

      {/* GALLERY full */}
      {b.gallery.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-12 border-x border-border">
            <h2 className="font-display font-black text-2xl md:text-3xl mb-6">Galerie</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {b.gallery.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openLightbox(g)}
                  aria-label="Bild vergrößern"
                  className="group relative aspect-square bg-zinc-100 dark:bg-zinc-900 overflow-hidden cursor-zoom-in"
                >
                  <img
                    src={articleImageUrl(g) || g}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/70 text-white text-[10px] uppercase tracking-wider font-mono px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-3 w-3" /> Zoom
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {lightboxIndex !== null && allImages.length > 0 && (
        <BikeImageLightbox
          images={allImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          alt={`${b.brand} ${b.model}`}
        />
      )}
    </article>
    <BikePrintSheet bike={b} />
    </>
  );
}


// ---------- subcomponents ----------

function BikeGallery({
  bike,
  active,
  onSelect,
  onOpen,
}: {
  bike: Bike;
  active: string;
  onSelect: (s: string) => void;
  onOpen: (src: string) => void;
}) {
  const main = articleImageUrl(active) || active;
  const thumbs = useMemo(() => {
    const list = [bike.image_url, ...bike.gallery].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [bike]);
  return (
    <div>
      <button
        type="button"
        onClick={() => onOpen(active)}
        aria-label="Bild vergrößern"
        className="relative w-full aspect-[4/3] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black overflow-hidden cursor-zoom-in group"
      >
        <div className="absolute inset-0 flex items-center justify-center p-6 md:p-10">
          <img
            src={main}
            alt={`${bike.brand} ${bike.model}`}
            className="max-h-full max-w-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-black/70 text-white text-[10px] uppercase tracking-wider font-mono px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-3 w-3" /> Zoom
        </span>
      </button>
      {thumbs.length > 1 && (
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {thumbs.slice(0, 6).map((t, i) => {
            const url = articleImageUrl(t) || t;
            const isActive = url === main;
            return (
              <button key={i} onClick={() => onSelect(t)}
                className={`relative aspect-square overflow-hidden border-2 ${isActive ? "border-signal" : "border-transparent"} bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black flex items-center justify-center p-1`}>
                <img src={url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RatingBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {label}
      </div>
      <div className="font-display text-xl md:text-2xl font-black tabular-nums mt-0.5">{value.toFixed(1)}<span className="text-sm text-muted-foreground font-normal">/10</span></div>
    </div>
  );
}

function UserRatingBox({ bikeId }: { bikeId: string }) {
  const fetchReviews = useServerFn(listBikeReviews);
  const { data } = useQuery({
    queryKey: ["bike-reviews", bikeId],
    queryFn: () => fetchReviews({ data: { bikeId } }),
    staleTime: 30_000,
  });
  return (
    <div className="border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <MessageSquare className="h-3 w-3" /> Nutzer
      </div>
      <div className="font-display text-xl md:text-2xl font-black tabular-nums mt-0.5">
        {data && data.count > 0 ? data.average.toFixed(1) : "—"}
        <span className="text-sm text-muted-foreground font-normal">{data && data.count ? ` (${data.count})` : ""}</span>
      </div>
    </div>
  );
}

function ActionBar({ bike }: { bike: Bike }) {
  const [inCompare, setInCompare] = useState(false);
  useEffect(() => {
    setInCompare(compareStore.has(bike.slug));
    return subscribeCompare(() => setInCompare(compareStore.has(bike.slug)));
  }, [bike.slug]);

  const handleCompare = () => {
    const res = compareStore.toggle(bike.slug);
    if (res.full) toast.error(`Maximal ${compareStore.MAX} Räder vergleichbar`);
    else toast.success(res.added ? "Zum Vergleich hinzugefügt" : "Aus Vergleich entfernt");
  };

  const handleCopySpecs = async () => {
    const lines: string[] = [`# ${bike.brand} ${bike.model}${bike.year ? ` (${bike.year})` : ""}`];
    Object.entries(bike.specs || {}).forEach(([k, v]) => v && lines.push(`- ${k}: ${v}`));
    if (bike.ebike) Object.entries(bike.ebike).forEach(([k, v]) => v != null && v !== "" && lines.push(`- ${k}: ${v}`));
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Spezifikationen kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <button onClick={handleCompare}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-bold border transition-colors ${
          inCompare ? "bg-signal text-[#050505] border-signal" : "border-border text-foreground hover:border-signal hover:text-signal"
        }`}>
        <Scale className="h-3.5 w-3.5" /> {inCompare ? "Im Vergleich" : "Vergleichen"}
      </button>
      <BikeFavoriteButton
        variant="full"
        bike={{
          slug: bike.slug,
          brand: bike.brand,
          model: bike.model,
          year: bike.year ?? null,
          image: bike.image_url ?? "",
          category: bike.category ?? null,
          bikeType: bike.bike_type ?? null,
          priceEur: bike.price_eur ?? null,
        }}
      />
      <ShareMenu url={`https://welchesfahrrad.de/fahrraeder/${bike.slug}`} title={`${bike.brand} ${bike.model}`} text={bike.excerpt ?? ""} image={bike.image_url ?? ""}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-bold border border-border text-foreground hover:border-signal hover:text-signal" />
      <button onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-bold border border-border text-foreground hover:border-signal hover:text-signal">
        <Printer className="h-3.5 w-3.5" /> Drucken
      </button>
      <button onClick={handleCopySpecs}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-bold border border-border text-foreground hover:border-signal hover:text-signal">
        <Copy className="h-3.5 w-3.5" /> Specs kopieren
      </button>
      {bike.manufacturer_url && (
        <a href={bike.manufacturer_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-signal text-[#050505] px-4 py-2 text-xs uppercase tracking-wider font-bold hover:opacity-90">
          Hersteller <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon?: any; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="flex items-center gap-2 mb-5">
        {Icon && <Icon className="h-5 w-5 text-signal" />}
        <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function hasDisplayValue(value: any): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some(hasDisplayValue);
  if (typeof value === "object") return Object.values(value).some(hasDisplayValue);
  return true;
}

function humanizeKey(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bMm\b/g, "mm")
    .replace(/\bCm\b/g, "cm")
    .replace(/\bKg\b/g, "kg")
    .replace(/\bKmh\b/g, "km/h")
    .replace(/\bWh\b/g, "Wh")
    .replace(/\bNm\b/g, "Nm");
}

function formatPrimitive(v: any): string {
  if (typeof v === "boolean") return v ? "Ja" : "Nein";
  if (v == null) return "";
  if (typeof v === "object") {
    if (Array.isArray(v)) {
      return v.map((x) => (x && typeof x === "object" ? formatPrimitiveList(x) : String(x))).join(", ");
    }
    const o = v as Record<string, any>;
    const name = o.name ?? o.title ?? o.label ?? o.item ?? o.text;
    if (name != null && typeof name !== "object") return String(name);
    return formatPrimitiveList(v);
  }
  return String(v);
}

/** Render any value cleanly: primitive, list of primitives, list of objects, or nested object. */
function SmartValue({ value }: { value: any }) {
  if (!hasDisplayValue(value)) return <span className="text-muted-foreground">—</span>;

  // Array
  if (Array.isArray(value)) {
    const clean = value.filter(hasDisplayValue);
    const allPrim = clean.every((v) => typeof v !== "object" || v == null);
    if (allPrim) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {clean.map((v, i) => (
            <span
              key={i}
              className="inline-block text-xs bg-muted/60 border border-border px-2 py-0.5 rounded-sm"
            >
              {formatPrimitive(v)}
            </span>
          ))}
        </div>
      );
    }
    // Array of objects — render compact rows
    return (
      <ul className="space-y-1.5">
        {clean.map((item, i) => (
          <li
            key={i}
            className="text-sm border-l-2 border-signal/40 pl-2.5 py-0.5"
          >
            <ObjectInline value={item} />
          </li>
        ))}
      </ul>
    );
  }

  // Object
  if (typeof value === "object") {
    return (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {Object.entries(value)
          .filter(([, v]) => hasDisplayValue(v))
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1 border-b border-border/60">
              <dt className="text-muted-foreground">{humanizeKey(k)}</dt>
              <dd className="text-right font-medium">
                {typeof v === "object" ? <SmartValue value={v} /> : formatPrimitive(v)}
              </dd>
            </div>
          ))}
      </dl>
    );
  }

  return <span>{formatPrimitive(value)}</span>;
}

/** Compact one-line rendering of an object: bold name + light key:val chips */
function ObjectInline({ value }: { value: any }) {
  if (value == null || typeof value !== "object") return <span>{formatPrimitive(value)}</span>;
  const entries = Object.entries(value).filter(([, v]) => hasDisplayValue(v));
  const nameEntry = entries.find(([k]) => /^(name|title|label)$/i.test(k));
  const rest = entries.filter(([k]) => k !== nameEntry?.[0]);
  return (
    <div>
      {nameEntry && <span className="font-medium">{formatPrimitive(nameEntry[1])}</span>}
      {rest.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {rest.map(([k, v]) => (
            <span key={k}>
              <span className="uppercase tracking-wider text-[10px]">{humanizeKey(k)}:</span>{" "}
              <span className="text-foreground/80">
                {typeof v === "object" ? formatPrimitiveList(v) : formatPrimitive(v)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatPrimitiveList(v: any): string {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? "…" : formatPrimitive(x))).join(", ");
  if (typeof v === "object" && v != null)
    return Object.entries(v)
      .filter(([, x]) => hasDisplayValue(x))
      .map(([k, x]) => `${humanizeKey(k)}: ${formatPrimitive(x)}`)
      .join(" · ");
  return formatPrimitive(v);
}

function isComplex(v: any): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.some((x) => x && typeof x === "object");
  if (typeof v === "object") return true;
  return false;
}

function QuickFactsSection({ b }: { b: Bike }) {
  const facts: { label: string; value: string }[] = [];
  if (b.specs?.weight_kg) facts.push({ label: "Gewicht", value: `${b.specs.weight_kg} kg` });
  if (b.specs?.frame_material) facts.push({ label: "Rahmen", value: String(b.specs.frame_material) });
  if (b.category === "ebike" && b.ebike?.motor_nm) facts.push({ label: "Motor", value: `${b.ebike.motor_nm} Nm` });
  if (b.category === "ebike" && b.ebike?.battery_wh) facts.push({ label: "Akku", value: `${b.ebike.battery_wh} Wh` });
  if (b.category === "ebike" && b.ebike?.range_tour_km) facts.push({ label: "Reichweite", value: `${b.ebike.range_tour_km} km` });
  if (b.category === "ebike" && b.ebike?.assist_kmh) facts.push({ label: "Top-Speed", value: `${b.ebike.assist_kmh} km/h` });
  if (b.specs?.wheels) facts.push({ label: "Räder", value: String(b.specs.wheels) });
  if (b.specs?.drivetrain) facts.push({ label: "Schaltung", value: String(b.specs.drivetrain) });
  if (b.specs?.brakes) facts.push({ label: "Bremsen", value: String(b.specs.brakes) });
  if (b.specs?.tire_size) facts.push({ label: "Reifen", value: String(b.specs.tire_size) });
  if (!facts.length) return null;
  return (
    <Section id="quick-facts" title="Quick Facts" icon={Activity}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {facts.map((f, i) => (
          <div key={i} className="border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <div className="font-display text-lg font-black mt-1 tabular-nums">{f.value}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ScoreBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 bg-border w-full">
      <div className="h-full bg-signal transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SuitabilitySection({ b }: { b: Bike }) {
  const entries = Object.entries(b.suitability || {}).filter(([_, v]) => typeof v === "number");
  if (!entries.length) return null;
  return (
    <Section id="suitability" title="Für wen ist dieses Rad?" icon={Star}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="border border-border p-3">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <div className="text-xs font-semibold">{SUIT_LABELS[k] ?? k}</div>
              <div className="tabular-nums text-sm font-mono">{Number(v).toFixed(1)}</div>
            </div>
            <ScoreBar value={Number(v)} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function SpecsSection({ b }: { b: Bike }) {
  // Strip `configuration` — rendered as its own dedicated section below.
  const { configuration: _cfg, ...specsRest } = (b.specs ?? {}) as Record<string, any>;
  const groups: { title: string; data: Record<string, any> }[] = [
    { title: "Rahmen & Komponenten", data: specsRest },
    { title: "Cockpit", data: b.cockpit },
    { title: "Laufradsatz", data: b.wheelset },
    { title: "Antrieb (Detail)", data: b.drivetrain_detail },
    { title: "Bremsen (Detail)", data: b.brakes_detail },
  ].filter((g) => g.data && Object.values(g.data).some(hasDisplayValue));
  if (!groups.length) return null;
  return (
    <Section id="specs" title="Vollständige Spezifikationen" icon={Wrench}>
      <Accordion type="multiple" defaultValue={["g0"]} className="border border-border">
        {groups.map((g, i) => {
          const entries = Object.entries(g.data).filter(([, v]) => hasDisplayValue(v));
          const simple = entries.filter(([, v]) => !isComplex(v));
          const complex = entries.filter(([, v]) => isComplex(v));
          return (
            <AccordionItem key={i} value={`g${i}`} className="border-b border-border last:border-b-0">
              <AccordionTrigger className="px-4 hover:no-underline">{g.title}</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {simple.length > 0 && (
                  <dl className="grid sm:grid-cols-2 gap-x-8">
                    {simple.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-2 border-b border-border text-sm">
                        <dt className="text-muted-foreground">{humanizeKey(k)}</dt>
                        <dd className="text-right font-medium">{formatPrimitive(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {complex.length > 0 && (
                  <Accordion type="multiple" className={`${simple.length > 0 ? "mt-6" : ""} space-y-2`}>
                    {complex.map(([k, v]) => (
                      <AccordionItem key={k} value={k} className="border border-border bg-muted/20 rounded-none">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline group hover:bg-muted/40 transition-colors">
                          <span className="eyebrow text-signal">{humanizeKey(k)}</span>
                          <span className="ml-auto mr-2 text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors hidden group-data-[state=closed]:inline sm:inline">
                            Details anzeigen
                          </span>
                          <span className="ml-auto mr-2 text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors hidden group-data-[state=open]:inline sm:inline">
                            Details ausblenden
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <SmartValue value={v} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Section>
  );
}


function GeometrySection({ b }: { b: Bike }) {
  const g: Record<string, any> = (b.geometry as any) || {};
  if (!Object.values(g).some(hasDisplayValue)) return null;

  // Normalise by_size to array-of-objects (accepts array OR object keyed by size)
  const bySize = normaliseBySize(g.by_size);

  // Overview cards: primitive top-level values only (skip by_size + nested)
  const overview = Object.entries(g).filter(
    ([k, v]) => k !== "by_size" && hasDisplayValue(v) && !isComplex(v),
  );
  const nested = Object.entries(g).filter(
    ([k, v]) => k !== "by_size" && hasDisplayValue(v) && isComplex(v),
  );

  return (
    <Section id="geometry" title="Geometrie" icon={Activity}>
      {overview.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {overview.map(([k, v]) => (
            <div key={k} className="border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{humanizeKey(k)}</div>
              <div className="font-display text-lg font-black mt-1 tabular-nums">{formatPrimitive(v)}</div>
            </div>
          ))}
        </div>
      )}

      {bySize.length > 0 && (
        <div className="mt-6">
          <GeometryBySizeMatrix rows={bySize} />
          <p className="mt-3 text-xs text-muted-foreground italic">
            Herstellerangaben ohne optionales Zubehör · auf dem Smartphone seitlich wischbar.
          </p>
        </div>
      )}

      {nested.length > 0 && (
        <div className="mt-6 space-y-4">
          {nested.map(([k, v]) => (
            <div key={k} className="border border-border bg-muted/20 p-4">
              <div className="eyebrow text-signal mb-3">{humanizeKey(k)}</div>
              <SmartValue value={v} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function normaliseBySize(raw: any): Record<string, any>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((r) => r && typeof r === "object");
  if (typeof raw === "object") {
    return Object.entries(raw)
      .filter(([, v]) => v && typeof v === "object")
      .map(([sizeKey, v]) => ({ size: sizeKey, ...(v as object) }));
  }
  return [];
}

const GEOMETRY_ROW_LABELS: Record<string, string> = {
  body_height: "Körpergröße",
  rider_height_cm: "Körpergröße",
  top_tube_cm: "Oberrohr",
  top_tube_mm: "Oberrohr",
  reach_cm: "Reach",
  reach_mm: "Reach",
  stack_cm: "Stack",
  stack_mm: "Stack",
  wheelbase_cm: "Radstand",
  wheelbase_mm: "Radstand",
  standover_cm: "Überstandshöhe",
  standover_mm: "Überstandshöhe",
  head_tube_mm: "Steuerrohr",
  head_tube_cm: "Steuerrohr",
  seat_tube_mm: "Sitzrohr",
  seat_tube_cm: "Sitzrohr",
  overall_length_cm: "Gesamtlänge",
  overall_length_mm: "Gesamtlänge",
  weight_kg: "Gewicht",
  head_angle: "Lenkwinkel",
  seat_angle: "Sitzwinkel",
  bb_drop_mm: "Tretlagerabsenkung",
  chainstay_mm: "Kettenstrebe",
};

function unitFor(key: string): string {
  if (/_mm$/.test(key)) return "mm";
  if (/_cm$/.test(key)) return "cm";
  if (/_kg$/.test(key)) return "kg";
  if (/angle$/.test(key)) return "°";
  return "";
}

function GeometryBySizeMatrix({ rows }: { rows: Record<string, any>[] }) {
  // Detect the "size" identifier per row
  const sizeKey =
    Object.keys(rows[0] ?? {}).find((k) => /^size(_cm|_mm)?$|^rahmengr|^frame_size$/i.test(k)) ?? "size";
  // Collect all measurement keys across all rows (preserve first-seen order)
  const measureKeys: string[] = [];
  rows.forEach((r) =>
    Object.keys(r).forEach((k) => {
      if (k === sizeKey) return;
      if (!hasDisplayValue(r[k])) return;
      if (!measureKeys.includes(k)) measureKeys.push(k);
    }),
  );
  if (measureKeys.length === 0) return null;

  return (
    <div className="border border-border overflow-x-auto -mx-4 md:mx-0" style={{ WebkitOverflowScrolling: "touch" }}>
      <table className="w-full text-sm border-collapse min-w-[480px]">
        <thead>
          <tr className="bg-muted/40">
            <th className="sticky left-0 z-10 bg-muted/40 text-left px-3 md:px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b-2 border-border">
              Maß
            </th>
            {rows.map((r, i) => (
              <th
                key={i}
                className="px-3 md:px-4 py-3 text-right border-b-2 border-border whitespace-nowrap"
              >
                <span className="font-display font-black text-base text-foreground">
                  {String(r[sizeKey] ?? `#${i + 1}`)}
                </span>
                {/_cm$/.test(sizeKey) && (
                  <span className="text-[10px] text-muted-foreground ml-1">cm</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {measureKeys.map((mk, ri) => {
            const label = GEOMETRY_ROW_LABELS[mk] ?? humanizeKey(mk);
            const unit = unitFor(mk);
            const zebra = ri % 2 === 1;
            return (
              <tr key={mk} className={zebra ? "bg-muted/20" : ""}>
                <td
                  className={`sticky left-0 z-[1] px-3 md:px-4 py-2.5 text-muted-foreground whitespace-nowrap border-r border-border ${zebra ? "bg-muted/20" : "bg-background"}`}
                >
                  {label}
                </td>
                {rows.map((r, i) => (
                  <td
                    key={i}
                    className="px-3 md:px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-medium"
                  >
                    {hasDisplayValue(r[mk]) ? `${formatPrimitive(r[mk])}${unit ? " " + unit : ""}` : "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Configuration ----------

const CONFIG_GROUP_LABELS: Record<string, string> = {
  frame_colors: "Rahmenfarbe",
  frame_sizes: "Rahmengröße",
  cockpit_options: "Cockpit & Display",
  battery_options: "Akku",
  brake_options: "Bremsen",
  fork_options: "Federgabel",
  tire_options: "Reifen",
  tail_light_options: "Rücklicht",
  handlebar_options: "Lenker",
  seatpost_options: "Sattelstütze",
  additional_equipment: "Zubehör ab Werk",
  equipment_komfort: "Zubehör · Komfort",
  equipment_sicherheit: "Zubehör · Sicherheit",
  equipment_transport: "Zubehör · Transport",
};
const CONFIG_GROUP_ORDER = [
  "frame_colors",
  "cockpit_options",
  "battery_options",
  "brake_options",
  "fork_options",
  "tire_options",
  "tail_light_options",
  "handlebar_options",
  "seatpost_options",
  "equipment_komfort",
  "equipment_sicherheit",
  "equipment_transport",
  "additional_equipment",
];

const COLOR_SWATCHES: Record<string, string> = {
  "black matt": "#1C1C1C",
  black: "#1C1C1C",
  "dark red": "#7A2320",
  red: "#7A2320",
  "petrol matt": "#2F5560",
  petrol: "#2F5560",
  white: "#EDEAE3",
  silver: "#C7C4BC",
  blue: "#2B4A7A",
  green: "#3B5E3A",
  grey: "#6E6B64",
  gray: "#6E6B64",
};
function swatchFor(name: string): string | null {
  const n = name.toLowerCase();
  const key = Object.keys(COLOR_SWATCHES).find((k) => n.includes(k));
  return key ? COLOR_SWATCHES[key] : null;
}

function categorizeEquipment(cfg: Record<string, any>): Record<string, any> {
  if (!Array.isArray(cfg.additional_equipment) || cfg.equipment_komfort) return cfg;
  const buckets: Record<string, any[]> = {
    equipment_komfort: [],
    equipment_sicherheit: [],
    equipment_transport: [],
  };
  const rules: [RegExp, string][] = [
    [/komfort|sattel|feder|griff/i, "equipment_komfort"],
    [/rx|chip|schloss|lock|abs|alarm|gps/i, "equipment_sicherheit"],
    [/träger|tasche|gepäck|transport|anhänger/i, "equipment_transport"],
  ];
  cfg.additional_equipment.forEach((item: any) => {
    const name = String(item?.name ?? "");
    const hit = rules.find(([re]) => re.test(name));
    buckets[hit ? hit[1] : "equipment_transport"].push(item);
  });
  const { additional_equipment: _drop, ...rest } = cfg;
  return { ...rest, ...buckets };
}

function ConfigOptionRow({ opt }: { opt: any }) {
  const [open, setOpen] = useState(false);
  const name = String(opt?.name ?? opt?.label ?? opt ?? "");
  const surcharge: string = String(opt?.surcharge ?? opt?.price ?? "");
  const isSerie = /serie/i.test(surcharge) || surcharge === "" || surcharge === "0" || surcharge === "0 €";
  const stars: number | undefined = typeof opt?.stars === "number" ? opt.stars : undefined;
  const info: string = String(opt?.info ?? opt?.description ?? "");
  const rec: string = String(opt?.recommendation ?? "");
  const hasDetail = !!(info || stars || rec);
  const sw = swatchFor(name);

  return (
    <li className={`border-t border-border ${!isSerie ? "bg-amber-500/[0.04]" : ""}`}>
      <button
        type="button"
        onClick={hasDetail ? () => setOpen((o) => !o) : undefined}
        className={`w-full flex items-center justify-between gap-3 px-3 md:px-4 py-2.5 text-left ${hasDetail ? "cursor-pointer hover:bg-muted/40" : "cursor-default"}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {sw && (
            <span
              className="w-4 h-4 rounded-sm border border-black/20 shrink-0"
              style={{ background: sw }}
            />
          )}
          <span className="text-sm text-foreground leading-snug">{name}</span>
          {hasDetail && (
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          )}
        </span>
        <span className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
              isSerie
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isSerie ? "Serie" : surcharge || "Aufpreis"}
          </span>
          {rec && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-signal/10 text-signal whitespace-nowrap">
              {rec}
            </span>
          )}
        </span>
      </button>
      {open && hasDetail && (
        <div className={`px-3 md:px-4 pb-3 ${sw ? "pl-10" : ""} text-xs text-muted-foreground leading-relaxed space-y-1.5`}>
          {typeof stars === "number" && stars > 0 && (
            <div className="text-signal tracking-widest">
              {"★".repeat(Math.max(0, Math.min(5, Math.round(stars))))}
              <span className="text-border">{"★".repeat(5 - Math.max(0, Math.min(5, Math.round(stars))))}</span>
            </div>
          )}
          {info && <p>{info}</p>}
        </div>
      )}
    </li>
  );
}

function ConfigGroupCard({
  groupKey,
  items,
  defaultOpen,
}: {
  groupKey: string;
  items: any[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items?.length) return null;
  return (
    <div className="border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <span className="font-display font-bold text-base text-foreground text-left">
          {CONFIG_GROUP_LABELS[groupKey] ?? humanizeKey(groupKey)}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "Option" : "Optionen"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-signal transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && (
        <ul className="list-none m-0 p-0">
          {items.map((opt, i) => (
            <ConfigOptionRow key={i} opt={opt} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfigurationSection({ b }: { b: Bike }) {
  const raw = (b.specs as any)?.configuration;
  if (!raw || typeof raw !== "object") return null;
  const cfg = categorizeEquipment(raw);
  const groups = CONFIG_GROUP_ORDER.filter((k) => Array.isArray(cfg[k]) && cfg[k].length);
  // Include any extra list-shaped groups that weren't in our known order
  Object.keys(cfg).forEach((k) => {
    if (!groups.includes(k) && Array.isArray(cfg[k]) && cfg[k].length && k !== "disclaimer" && k !== "note") {
      groups.push(k);
    }
  });
  if (!groups.length) return null;
  const note: string = cfg.note ?? "Tippe eine Option an für Details, Sternebewertung und unsere Empfehlung.";
  const disc: string =
    cfg.disclaimer ??
    "Aufpreise sind Richtwerte laut Hersteller-Konfigurator und können je nach Land, Händler und Verfügbarkeit abweichen. Angaben ohne Gewähr.";

  return (
    <Section id="configuration" title="Konfiguration & Optionen" icon={Wrench}>
      <p className="text-sm text-muted-foreground mb-4">{note}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((k, i) => (
          <ConfigGroupCard key={k} groupKey={k} items={cfg[k]} defaultOpen={i < 2} />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground italic">{disc}</p>
    </Section>
  );
}

function EbikeSystemSection({ b }: { b: Bike }) {
  const e = b.ebike ?? {};
  const d = b.ebike_detail ?? {};
  const hasDrive = hasDisplayValue(e.motor_brand) || hasDisplayValue(e.motor_model) || hasDisplayValue(e.motor_nm) || hasDisplayValue(e.motor_w) || hasDisplayValue(d.peak_power_w) || hasDisplayValue(e.assist_kmh) || hasDisplayValue(e.sensor) || hasDisplayValue(e.display) || hasDisplayValue(d.walk_assist);
  const hasEnergy = hasDisplayValue(e.battery_wh) || hasDisplayValue(d.voltage) || hasDisplayValue(d.ah) || hasDisplayValue(d.cell_type) || hasDisplayValue(e.battery_removable) || hasDisplayValue(d.fast_charging) || hasDisplayValue(e.charge_time_h) || hasDisplayValue(d.charge_cycles) || hasDisplayValue(d.dual_battery);
  const hasConnectivity = d.bluetooth != null || d.gps != null || d.app != null || d.ota != null || d.usb_charging != null;
  if (!hasDrive && !hasEnergy && !hasConnectivity) return null;
  return (
    <Section id="ebike-system" title="E-Bike System" icon={Battery}>
      <div className="grid md:grid-cols-2 gap-4">
        {hasDrive && (
          <div className="border border-border p-5 bg-card">
            <div className="eyebrow text-signal mb-2">Antrieb</div>
            {(e.motor_brand || e.motor_model) && <div className="font-display text-lg font-bold">{[e.motor_brand, e.motor_model].filter(Boolean).join(" ")}</div>}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {e.motor_nm != null && <Spec k="Drehmoment" v={`${e.motor_nm} Nm`} />}
              {e.motor_w != null && <Spec k="Nennleistung" v={`${e.motor_w} W`} />}
              {d.peak_power_w != null && <Spec k="Peak-Leistung" v={`${d.peak_power_w} W`} />}
              {e.assist_kmh != null && <Spec k="Unterstützung bis" v={`${e.assist_kmh} km/h`} />}
              {e.sensor && <Spec k="Sensor" v={String(e.sensor)} />}
              {e.display && <Spec k="Display" v={String(e.display)} />}
              {d.walk_assist != null && <Spec k="Schiebehilfe" v={d.walk_assist ? "Ja" : "Nein"} />}
            </dl>
          </div>
        )}
        {hasEnergy && (
          <div className="border border-border p-5 bg-card">
            <div className="eyebrow text-signal mb-2">Energie</div>
            {e.battery_wh && <div className="font-display text-lg font-bold">{e.battery_wh} Wh</div>}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {d.voltage != null && <Spec k="Spannung" v={`${d.voltage} V`} />}
              {d.ah != null && <Spec k="Kapazität" v={`${d.ah} Ah`} />}
              {d.cell_type && <Spec k="Zellen" v={String(d.cell_type)} />}
              {e.battery_removable != null && <Spec k="Abnehmbar" v={e.battery_removable ? "Ja" : "Nein"} />}
              {d.fast_charging != null && <Spec k="Schnellladen" v={d.fast_charging ? "Ja" : "Nein"} />}
              {e.charge_time_h != null && <Spec k="Ladezeit" v={`${e.charge_time_h} h`} />}
              {d.charge_cycles != null && <Spec k="Ladezyklen" v={`${d.charge_cycles}`} />}
              {d.dual_battery != null && <Spec k="Dual-Akku" v={d.dual_battery ? "Ja" : "Nein"} />}
            </dl>
          </div>
        )}
      </div>
      {hasConnectivity && (
        <div className="mt-4 border border-border p-5 bg-card">
          <div className="eyebrow text-signal mb-3">Konnektivität</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {d.bluetooth != null && <Capability label="Bluetooth" on={!!d.bluetooth} />}
            {d.gps != null && <Capability label="GPS" on={!!d.gps} />}
            {d.app != null && <Capability label="Mobile App" on={!!d.app} />}
            {d.ota != null && <Capability label="OTA-Updates" on={!!d.ota} />}
            {d.usb_charging != null && <Capability label="USB-Ladung" on={!!d.usb_charging} />}
          </div>
        </div>
      )}
    </Section>
  );
}

function Capability({ label, on }: { label: string; on: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${on ? "text-emerald-500" : "text-muted-foreground line-through"}`}>
      {on ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {label}
    </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground text-xs uppercase tracking-wider">{k}</dt>
      <dd className="font-medium text-right">{v}</dd>
    </div>
  );
}

function RangeSection({ b }: { b: Bike }) {
  // Build chart data from range_matrix if exists, otherwise from ebike values
  const matrix = b.range_matrix as Record<string, any>;
  const e = b.ebike ?? {};

  const [weight, setWeight] = useState(75);
  const [terrain, setTerrain] = useState<"flat" | "hills" | "mountains">("flat");

  const data = useMemo(() => {
    const modes = ["eco", "tour", "sport", "turbo"] as const;
    const key = `${weight}kg_${terrain}`;
    return modes.map((mode) => {
      let val: number | undefined;
      if (matrix?.[mode]?.[key] != null) val = Number(matrix[mode][key]);
      else if (mode === "eco" && e.range_eco_km) val = e.range_eco_km;
      else if (mode === "tour" && e.range_tour_km) val = e.range_tour_km;
      else if (mode === "turbo" && e.range_turbo_km) val = e.range_turbo_km;
      else if (mode === "sport" && e.range_tour_km && e.range_turbo_km) val = Math.round((e.range_tour_km + e.range_turbo_km) / 2);
      // adjust for weight/terrain if no matrix
      if (val != null && !matrix?.[mode]?.[key]) {
        const wFactor = 1 - (weight - 75) * 0.005;
        const tFactor = terrain === "flat" ? 1 : terrain === "hills" ? 0.82 : 0.65;
        val = Math.round(val * wFactor * tFactor);
      }
      return { mode: mode.charAt(0).toUpperCase() + mode.slice(1), km: val ?? 0 };
    });
  }, [matrix, e, weight, terrain]);

  if (b.category !== "ebike") return null;
  const hasAnyData = data.some((d) => d.km > 0);
  if (!hasAnyData) return null;

  return (
    <Section id="range" title="Realistische Reichweite" icon={Battery}>
      <p className="text-sm text-muted-foreground mb-4">
        Anpassbare Schätzung basierend auf Fahrergewicht, Gelände und Unterstützungsstufe. Werte sind Richtwerte — Wind, Temperatur und Fahrstil beeinflussen die tatsächliche Reichweite.
      </p>
      <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start">
        <div className="space-y-5 border border-border p-4">
          <div>
            <div className="flex justify-between text-xs mb-2"><span>Fahrergewicht</span><span className="tabular-nums font-bold">{weight} kg</span></div>
            <Slider value={[weight]} min={50} max={130} step={5} onValueChange={(v) => setWeight(v[0])} />
          </div>
          <div>
            <div className="text-xs mb-2">Gelände</div>
            <div className="grid grid-cols-3 gap-1">
              {(["flat", "hills", "mountains"] as const).map((t) => (
                <button key={t} onClick={() => setTerrain(t)}
                  className={`text-[11px] uppercase py-1.5 border ${terrain === t ? "bg-signal text-[#050505] border-signal" : "border-border text-muted-foreground"}`}>
                  {t === "flat" ? "Flach" : t === "hills" ? "Hügel" : "Berg"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border border-border bg-card p-3">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mode" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit=" km" />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="km" fill="hsl(var(--signal, 19 100% 55%))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Section>
  );
}

function PerformanceSection({ b }: { b: Bike }) {
  const entries = Object.entries(b.performance || {}).filter(([_, v]) => typeof v === "number");
  if (!entries.length && !Object.keys(b.ratings ?? {}).length) return null;
  const data = entries.map(([k, v]) => ({ subject: PERF_LABELS[k] ?? k, value: Number(v) }));
  return (
    <Section id="performance" title="Fahrgefühl & Komfort" icon={Activity}>
      <div className="grid md:grid-cols-2 gap-6">
        {data.length > 0 && (
          <div className="border border-border bg-card p-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Radar dataKey="value" stroke="hsl(var(--signal, 19 100% 55%))" fill="hsl(var(--signal, 19 100% 55%))" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
        {Object.keys(b.ratings ?? {}).length > 0 && (
          <div>
            <h3 className="eyebrow text-signal mb-3">Redaktions-Bewertung</h3>
            <BikeRatingRadar ratings={b.ratings} />
          </div>
        )}
      </div>
    </Section>
  );
}

function MaintenanceSection({ b }: { b: Bike }) {
  const m = b.maintenance ?? {};
  if (!Object.values(m).some(hasDisplayValue)) return null;
  return (
    <Section id="maintenance" title="Wartung & Pflege" icon={Wrench}>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(m).filter(([_, v]) => hasDisplayValue(v)).map(([k, v]) => (
          <div key={k} className="border border-border p-4 bg-card">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{humanizeKey(k)}</div>
            <div className="text-sm"><SmartValue value={v} /></div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CostsSection({ b }: { b: Bike }) {
  // Der Kosten-Rechner ist auf E-Bikes zugeschnitten (Strom, Ladezyklen).
  // Für Muskelräder blenden wir die Sektion komplett aus.
  if (b.category !== "ebike") return null;
  const c = b.costs ?? {};
  const [kwh, setKwh] = useState<number>(Number(c.electricity_kwh_price ?? 0.35));
  const [km, setKm] = useState<number>(2500);
  const battery = b.ebike?.battery_wh ?? 0;
  const cyclesPerYear = battery > 0 ? km / Math.max(1, (b.ebike?.range_tour_km ?? 60)) : 0;
  const energyPerYear = battery > 0 ? (battery / 1000) * cyclesPerYear : 0;
  const annual = energyPerYear * kwh + (Number(b.maintenance?.annual_cost_eur ?? 120));
  const fiveYear = annual * 5 + (b.price_eur ?? 0);
  const carCmp = km * 0.30 * 5;

  if (!hasDisplayValue(c) && !b.price_eur && !battery && !hasDisplayValue(b.maintenance?.annual_cost_eur)) return null;

  return (
    <Section id="costs" title="Laufende Kosten" icon={Activity}>
      <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start">
        <div className="space-y-5 border border-border p-4">
          <div>
            <div className="flex justify-between text-xs mb-2"><span>Strompreis</span><span className="tabular-nums font-bold">{kwh.toFixed(2)} €/kWh</span></div>
            <Slider value={[kwh]} min={0.15} max={0.60} step={0.01} onValueChange={(v) => setKwh(v[0])} />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2"><span>Kilometer / Jahr</span><span className="tabular-nums font-bold">{km.toLocaleString("de-DE")} km</span></div>
            <Slider value={[km]} min={500} max={15000} step={500} onValueChange={(v) => setKm(v[0])} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CostCard label="Energie / Jahr" value={`${energyPerYear.toFixed(0)} kWh`} sub={`${(energyPerYear * kwh).toFixed(0)} €`} />
          <CostCard label="Wartung / Jahr" value={`${Number(b.maintenance?.annual_cost_eur ?? 120).toFixed(0)} €`} sub="Richtwert" />
          <CostCard label="Jährliche Kosten" value={`${annual.toFixed(0)} €`} sub="Strom + Wartung" highlight />
          <CostCard label="5-Jahres-Kosten" value={`${fiveYear.toFixed(0)} €`} sub="inkl. Anschaffung" highlight />
          <CostCard label="Auto-Vergleich (5 J.)" value={`${carCmp.toFixed(0)} €`} sub={`~ 0,30 €/km`} />
          <CostCard label="Ersparnis vs. Auto" value={`${Math.max(0, carCmp - fiveYear).toFixed(0)} €`} sub="über 5 Jahre" />
        </div>
      </div>
    </Section>
  );
}

function CostCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`border p-4 ${highlight ? "border-signal bg-signal/5" : "border-border"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-black mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function EnvironmentSection({ b }: { b: Bike }) {
  const env = (b.environmental ?? {}) as Record<string, any>;
  const fmt = (n: any, unit: string) =>
    typeof n === "number" ? `${n.toLocaleString("de-DE")} ${unit}` : null;
  const cards: { label: string; value: string; sub?: string }[] = [];
  const co2 = env.co2_saved_display ?? fmt(env.co2_saved_kg_year, "kg CO₂");
  const fuel = env.fuel_saved_display ?? fmt(env.fuel_saved_l_year, "Liter");
  const money = env.money_saved_display ?? fmt(env.money_saved_eur_year, "€");
  const trees = env.trees_display ?? fmt(env.trees_equivalent, "Bäume");
  const score = env.sustainability_score;
  if (co2) cards.push({ label: "CO₂-Ersparnis", value: String(co2), sub: "pro Jahr" });
  if (fuel) cards.push({ label: "Benzin gespart", value: String(fuel), sub: "pro Jahr" });
  if (money) cards.push({ label: "Ersparnis", value: String(money), sub: "pro Jahr" });
  if (trees) cards.push({ label: "Entspricht", value: String(trees), sub: "CO₂-Bindung" });
  if (typeof score === "number") cards.push({ label: "Nachhaltigkeit", value: `${score}/10`, sub: "Score" });
  if (!cards.length) return null;
  const disc = env.disclaimer ?? "Berechnete Richtwerte — keine Herstellerangaben.";
  return (
    <Section id="environment" title="Umweltbilanz" icon={Leaf}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
              {c.label}
            </div>
            <div className="font-display text-xl md:text-2xl font-black text-foreground leading-tight tabular-nums">
              {c.value}
            </div>
            {c.sub && <div className="mt-1 text-[11px] text-muted-foreground">{c.sub}</div>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground italic">{disc}</p>
    </Section>
  );
}

function SafetySection({ b }: { b: Bike }) {
  const s = b.safety_features ?? {};
  if (!Object.values(s).some(hasDisplayValue)) return null;
  const bools: [string, string][] = [
    ["integrated_lights", "Integrierte Beleuchtung"],
    ["abs", "ABS"],
    ["gps", "GPS-Tracker"],
    ["alarm", "Alarm"],
    ["frame_lock", "Rahmenschloss"],
    ["airtag", "AirTag-kompatibel"],
    ["nfc", "NFC"],
  ];
  return (
    <Section id="safety" title="Sicherheit" icon={ShieldCheck}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-border p-4 bg-card grid grid-cols-2 gap-2 text-sm">
          {bools.filter(([k]) => s[k] != null).map(([k, label]) => (
            <Capability key={k} label={label} on={!!s[k]} />
          ))}
        </div>
        <div className="border border-border p-4 bg-card space-y-3">
          {s.visibility_score != null && (
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Sichtbarkeit</span><span className="font-bold">{Number(s.visibility_score).toFixed(1)}/10</span></div>
              <ScoreBar value={Number(s.visibility_score)} />
            </div>
          )}
          {s.night_score != null && (
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Nacht-Fahrt</span><span className="font-bold">{Number(s.night_score).toFixed(1)}/10</span></div>
              <ScoreBar value={Number(s.night_score)} />
            </div>
          )}
          {Array.isArray(s.recommended_locks) && s.recommended_locks.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Empfohlene Schlösser</div>
              <div className="flex flex-wrap gap-1">
                {s.recommended_locks.map((l: any, i: number) => (
                  <span key={i} className="text-[11px] border border-border px-2 py-0.5">
                    {typeof l === "object" && l !== null
                      ? String(l.name ?? l.item ?? l.title ?? l.label ?? formatPrimitiveList(l))
                      : String(l)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function AccessoriesSection({ b }: { b: Bike }) {
  if (!b.accessories.length) return null;
  return (
    <Section id="accessories" title="Kompatibles Zubehör" icon={Wrench}>
      <div className="flex flex-wrap gap-2">
        {b.accessories.map((a, i) => (
          <span key={i} className="border border-border bg-card px-3 py-1.5 text-sm">{a}</span>
        ))}
      </div>
    </Section>
  );
}

function AiAnalysisSection({ b }: { b: Bike }) {
  const a = b.ai_summary ?? {};
  const hasAny = (a.strengths?.length || a.weaknesses?.length || a.best_for || a.avoid_if || a.alternatives?.length);
  if (!hasAny) return null;
  return (
    <Section id="ai-analysis" title="KI-Analyse" icon={Activity}>
      <div className="grid md:grid-cols-2 gap-4">
        {a.strengths?.length ? (
          <div className="border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="eyebrow text-emerald-500 mb-2">Stärken</div>
            <ul className="space-y-1.5 text-sm">{a.strengths.map((s, i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{s}</li>)}</ul>
          </div>
        ) : null}
        {a.weaknesses?.length ? (
          <div className="border border-rose-500/30 bg-rose-500/5 p-4">
            <div className="eyebrow text-rose-500 mb-2">Schwächen</div>
            <ul className="space-y-1.5 text-sm">{a.weaknesses.map((s, i) => <li key={i} className="flex gap-2"><X className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />{s}</li>)}</ul>
          </div>
        ) : null}
        {a.best_for ? (
          <div className="border border-border p-4 bg-card md:col-span-1">
            <div className="eyebrow text-signal mb-2">Ideal für</div>
            <p className="text-sm">{a.best_for}</p>
          </div>
        ) : null}
        {a.avoid_if ? (
          <div className="border border-border p-4 bg-card md:col-span-1">
            <div className="eyebrow text-muted-foreground mb-2">Eher nicht geeignet</div>
            <p className="text-sm">{a.avoid_if}</p>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function ProsConsSection({ b }: { b: Bike }) {
  if (!b.highlights.pros.length && !b.highlights.cons.length) return null;
  return (
    <Section id="pros-cons" title="Stärken & Schwächen" icon={Star}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="eyebrow text-emerald-500 mb-4">Pro</h3>
          <ul className="space-y-2">
            {b.highlights.pros.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="eyebrow text-rose-500 mb-4">Contra</h3>
          <ul className="space-y-2">
            {b.highlights.cons.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><X className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function FaqSection({ b }: { b: Bike }) {
  if (!b.faq.length) return null;
  return (
    <Section id="faq" title="Häufige Fragen" icon={MessageSquare}>
      <Accordion type="single" collapsible className="border border-border">
        {b.faq.map((f, i) => (
          <AccordionItem key={i} value={`q${i}`} className="border-b border-border last:border-b-0">
            <AccordionTrigger className="px-4 hover:no-underline text-left">{f.q}</AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm leading-relaxed whitespace-pre-wrap">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}

function HistorySection({ b }: { b: Bike }) {
  const h = (b.model_history ?? {}) as any;
  const timeline: { year?: string | number; note: string }[] = Array.isArray(h.timeline) ? h.timeline : [];
  const hasAny =
    h.launch_year ||
    h.whats_new ||
    h.improvements ||
    h.known_issues ||
    h.common_upgrades ||
    timeline.length ||
    (Array.isArray(h.previous_generations) && h.previous_generations.length);
  if (!hasAny) return null;
  return (
    <Section id="history" title="Modell-Historie" icon={Calendar}>
      {timeline.length > 0 && (
        <ol className="relative border-l-2 border-signal/40 ml-2 space-y-5 mb-6">
          {timeline.map((t, i) => (
            <li key={i} className="pl-5 relative">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-signal ring-4 ring-background" />
              {t.year !== undefined && t.year !== "" && (
                <div className="font-display font-black text-signal tabular-nums text-sm">{t.year}</div>
              )}
              <p className="text-sm text-foreground leading-relaxed mt-0.5">{t.note}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="border-l-2 border-signal pl-5 space-y-4">
        {h.launch_year && !timeline.length && (
          <div>
            <div className="eyebrow text-signal">Markteinführung</div>
            <div className="text-base font-bold">{h.launch_year}</div>
          </div>
        )}
        {h.whats_new && <Timeline title="Neu in dieser Generation" body={h.whats_new} />}
        {h.improvements && <Timeline title="Verbesserungen" body={h.improvements} />}
        {Array.isArray(h.previous_generations) && h.previous_generations.length > 0 && (
          <div>
            <div className="eyebrow text-signal mb-1">Frühere Generationen</div>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {h.previous_generations.map((g: string, i: number) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        )}
        {h.known_issues && <Timeline title="Bekannte Probleme" body={h.known_issues} />}
        {h.common_upgrades && <Timeline title="Beliebte Upgrades" body={h.common_upgrades} />}
      </div>
    </Section>
  );
}

function Timeline({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="eyebrow text-signal mb-1">{title}</div>
      <p className="text-sm whitespace-pre-wrap">{body}</p>
    </div>
  );
}

function ComparableModelsSection({ b }: { b: Bike }) {
  const items: any[] = Array.isArray((b as any).comparable_models) ? (b as any).comparable_models : [];
  if (!items.length) return null;
  return (
    <Section id="comparable" title="Vergleichbare Modelle" icon={Activity}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m, i) => {
          const name = String(m?.name ?? "");
          const slug = String(m?.slug ?? "");
          const reason = String(m?.reason ?? "");
          const note = String(m?.note ?? "");
          const Card: any = slug ? Link : "div";
          const cardProps: any = slug ? { to: "/fahrraeder/$slug", params: { slug } } : {};
          return (
            <Card
              key={i}
              {...cardProps}
              className={`block border border-border bg-card p-4 transition-colors ${slug ? "hover:border-signal hover:bg-muted/40 cursor-pointer" : ""}`}
            >
              <div className="font-display font-black text-base text-foreground leading-tight">{name}</div>
              {reason && (
                <div className="mt-2 text-[11px] uppercase tracking-wider text-signal font-semibold">
                  {reason}
                </div>
              )}
              {note && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{note}</p>}
              {slug && (
                <div className="mt-3 text-xs font-semibold text-signal">Details ansehen →</div>
              )}
            </Card>
          );
        })}
      </div>
    </Section>
  );
}


// ---------- Reviews ----------

function ReviewsSection({ bikeId }: { bikeId: string }) {
  const fetchReviews = useServerFn(listBikeReviews);
  const submit = useServerFn(submitBikeReview);
  const { data, refetch } = useQuery({
    queryKey: ["bike-reviews", bikeId],
    queryFn: () => fetchReviews({ data: { bikeId } }),
    staleTime: 30_000,
  });
  const [user, setUser] = useState<{ id: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ? { id: s.user.id } : null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const [rating, setRating] = useState(8);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async () => {
    if (title.trim().length < 3) { toast.error("Titel zu kurz"); return; }
    if (body.trim().length < 10) { toast.error("Bewertung zu kurz"); return; }
    setSending(true);
    try {
      await submit({ data: { bikeId, rating, title: title.trim(), body: body.trim() } });
      toast.success("Bewertung gespeichert");
      setTitle(""); setBody(""); setRating(8);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSending(false);
    }
  };

  const reviews = data?.reviews ?? [];

  return (
    <Section id="reviews" title="Nutzer-Bewertungen" icon={MessageSquare}>
      {data && data.count > 0 && (
        <div className="mb-6 border border-border p-4 bg-card flex items-center gap-6">
          <div>
            <div className="font-display text-4xl font-black tabular-nums">{data.average.toFixed(1)}<span className="text-base text-muted-foreground font-normal">/10</span></div>
            <div className="text-xs text-muted-foreground">{data.count} Bewertung{data.count === 1 ? "" : "en"}</div>
          </div>
          <div className="flex-1">
            <ScoreBar value={data.average} />
          </div>
        </div>
      )}

      {user ? (
        <div className="border border-border p-4 mb-6 bg-card">
          <div className="eyebrow text-signal mb-3">Eigene Bewertung abgeben</div>
          <div className="grid md:grid-cols-[180px_1fr] gap-4">
            <div>
              <div className="flex justify-between text-xs mb-2"><span>Note</span><span className="tabular-nums font-bold">{rating}/10</span></div>
              <Slider value={[rating]} min={1} max={10} step={1} onValueChange={(v) => setRating(v[0])} />
            </div>
            <div className="space-y-2">
              <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
              <Textarea rows={4} placeholder="Deine Erfahrung mit diesem Rad…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
              <Button onClick={onSubmit} disabled={sending} className="bg-signal text-[#050505] hover:bg-signal/90">
                {sending ? "Senden…" : "Bewertung absenden"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-border p-4 mb-6 text-sm text-muted-foreground">
          <Link to="/auth" className="text-signal underline">Anmelden</Link> um eine Bewertung zu schreiben.
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Nutzer-Bewertungen. Sei der Erste!</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
        </ul>
      )}
    </Section>
  );
}

function ReviewCard({ r }: { r: BikeReview }) {
  return (
    <li className="border border-border p-4 bg-card">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h4 className="font-bold">{r.title}</h4>
        <span className="font-mono tabular-nums text-sm bg-signal/10 text-signal px-2 py-0.5">{r.rating}/10</span>
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">
        {r.display_name ?? "Nutzer"} · {new Date(r.created_at).toLocaleDateString("de-DE")}
        {r.verified_owner && <span className="ml-2 text-emerald-500">✓ Verifiziert</span>}
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.body}</p>
    </li>
  );
}
