import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Zap } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryHero } from "@/components/CategoryHero";
import { InlineSearch } from "@/components/InlineSearch";
import type { Suggestion } from "@/components/InlineSearch";
import {
  categoryMeta,
  type Article,
} from "@/lib/articles";

export type PillFilter = {
  id: string;
  label: string;
  categories: Article["category"][];
  icon?: "ebike";
};

type Props = {
  category: Article["category"];
  articles: Article[];
  pillFilters?: PillFilter[];
};

export function CategoryPage({ category, articles, pillFilters }: Props) {
  const navigate = useNavigate();
  const meta = categoryMeta[category];

  const [activeFilter, setActiveFilter] = useState<string>(
    pillFilters?.[0]?.id ?? "__default",
  );

  const activePill = pillFilters?.find((p) => p.id === activeFilter);
  const includedCategories = activePill?.categories ?? [category];

  const items = articles.filter((a) => includedCategories.includes(a.category));

  const [q, setQ] = useState("");
  const norm = q.trim().toLowerCase();

  const searched = useMemo(() => {
    if (!norm) return null;
    return items.filter(
      (a) =>
        a.title.toLowerCase().includes(norm) ||
        a.excerpt.toLowerCase().includes(norm) ||
        a.body?.some((p) => p.toLowerCase().includes(norm)),
    );
  }, [items, norm]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!searched) return [];
    return searched.slice(0, 5).map((a) => ({
      id: a.slug,
      label: a.title,
      subtitle: a.excerpt,
      href: `/artikel/${a.slug}`,
      category: meta.eyebrow,
    }));
  }, [searched, meta.eyebrow]);

  const handleSelect = (s: Suggestion) => {
    if (s.href) {
      navigate({ to: s.href });
    }
  };

  const [lead, ...rest] = items;
  const featured = rest.slice(0, 2);
  const grid = rest.slice(2);

  const otherCats = (Object.keys(categoryMeta) as Article["category"][]).filter(
    (c) => !includedCategories.includes(c),
  );

  const moreReads = articles
    .filter((a) => !includedCategories.includes(a.category))
    .slice(0, 4);

  const pillCounts = useMemo(() => {
    if (!pillFilters) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const p of pillFilters) {
      out[p.id] = articles.filter((a) => p.categories.includes(a.category)).length;
    }
    return out;
  }, [pillFilters, articles]);

  return (
    <>
      <nav
        aria-label="Brotkrumen-Navigation"
        className="border-b border-border bg-background/50"
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 py-3 border-x border-border flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Start
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{meta.eyebrow}</span>
          <span className="ml-auto hidden md:inline">
            {items.length} {items.length === 1 ? "Artikel" : "Artikel"}
          </span>
        </div>
      </nav>

      <CategoryHero
        eyebrow={meta.eyebrow}
        title={meta.tagline}
        description={meta.description}
      />

      {pillFilters && pillFilters.length > 1 && (
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[1400px] px-6 md:px-8 py-4 md:py-5 border-x border-border">
            <div className="flex items-center gap-3 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="eyebrow-sm text-muted-foreground shrink-0 mr-1 hidden sm:inline">
                Filter
              </span>
              {pillFilters.map((p) => {
                const active = p.id === activeFilter;
                const count = pillCounts[p.id] ?? 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveFilter(p.id)}
                    aria-pressed={active}
                    className={[
                      "group inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] font-bold transition-all shrink-0",
                      active
                        ? "bg-signal text-signal-foreground border-signal shadow-glow"
                        : "border-border bg-card text-foreground/80 hover:border-signal hover:text-signal",
                    ].join(" ")}
                  >
                    {p.icon === "ebike" && <Zap className="h-3.5 w-3.5" />}
                    <span>{p.label}</span>
                    <span
                      className={[
                        "ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[10px] font-mono rounded-sm",
                        active
                          ? "bg-signal-foreground/15 text-signal-foreground"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-border bg-background/60">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 py-6 md:py-8 border-x border-border">
          <div className="max-w-2xl">
            <InlineSearch
              value={q}
              onChange={setQ}
              onSelect={handleSelect}
              suggestions={suggestions}
              eyebrow={`${meta.eyebrow} durchsuchen`}
              placeholder={`In ${items.length} ${meta.eyebrow}-Beiträgen suchen…`}
              hint="Titel, Teaser und Artikeltext"
              resultsCount={searched?.length}
            />
          </div>
        </div>
      </section>

      {searched ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1400px] px-6 md:px-8 py-12 md:py-16 border-x border-border">
            {searched.length === 0 ? (
              <div className="rounded-2xl glass-card p-10 text-center">
                <p className="font-display text-xl font-black tracking-tight">
                  Keine Beiträge gefunden für „{q}"
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Probiere einen anderen Suchbegriff.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-8 flex items-baseline justify-between">
                  <h2 className="font-display text-2xl md:text-3xl font-black">
                    Such-<span className="italic text-muted-foreground">ergebnisse</span>
                  </h2>
                  <span className="eyebrow-sm text-signal">
                    {searched.length} {searched.length === 1 ? "Treffer" : "Treffer"}
                  </span>
                </div>
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                  {searched.map((a, i) => (
                    <ArticleCard key={a.slug} article={a} index={i} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      ) : lead && (
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1400px] px-6 md:px-8 py-10 md:py-14 border-x border-border">
            <ArticleCard article={lead} featured size="lg" index={0} />
          </div>
        </section>
      )}

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 py-12 md:py-20 border-x border-border">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {searched && (
                <p className="mb-8 text-sm text-muted-foreground">
                  Weitere Beiträge aus <span className="text-foreground font-medium">{meta.eyebrow}</span> — unabhängig von deiner Suche.
                </p>
              )}
              {featured.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between mb-8">
                    <h2 className="font-display text-2xl md:text-3xl font-black">
                      Aktuell <span className="italic text-muted-foreground">empfohlen</span>
                    </h2>
                    <span className="eyebrow-sm text-muted-foreground">
                      {meta.eyebrow}
                    </span>
                  </div>
                  <div className="grid gap-10 md:grid-cols-2 mb-16">
                    {featured.map((a, i) => (
                      <ArticleCard key={a.slug} article={a} index={i} />
                    ))}
                  </div>
                </>
              )}

              {grid.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between mb-8">
                    <h2 className="font-display text-2xl md:text-3xl font-black">
                      Alle <span className="italic text-muted-foreground">Beiträge</span>
                    </h2>
                  </div>
                  <div className="grid gap-10 sm:grid-cols-2">
                    {grid.map((a, i) => (
                      <ArticleCard key={a.slug} article={a} index={i} />
                    ))}
                  </div>
                </>
              )}

              {items.length === 0 && (
                <p className="text-muted-foreground">
                  Noch keine Artikel in dieser Kategorie.
                </p>
              )}
            </div>

            <aside className="lg:col-span-4 space-y-10 lg:sticky lg:top-24 self-start">
              <div className="rounded-2xl glass-card p-6">
                <div className="eyebrow-sm text-signal mb-3">Themenbereiche</div>
                <h3 className="font-display text-xl font-black mb-5">
                  Weitere Rubriken
                </h3>
                <ul className="space-y-3">
                  {otherCats.map((c) => {
                    const m = categoryMeta[c];
                    return (
                      <li key={c}>
                        <Link
                          to={m.slug}
                          className="group flex items-center justify-between border-b border-border pb-3 hover:text-signal transition-colors"
                        >
                          <span className="font-display text-lg font-bold">
                            {c}
                          </span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl glass-card p-6">
                <div className="eyebrow-sm text-signal mb-3">Meistgelesen</div>
                <h3 className="font-display text-xl font-black mb-5">
                  Auch interessant
                </h3>
                <ul className="space-y-5">
                  {moreReads.map((a, i) => (
                    <li key={a.slug} className="flex gap-3">
                      <span className="font-display text-2xl font-black text-signal leading-none w-6 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Link
                        to="/artikel/$slug"
                        params={{ slug: a.slug }}
                        className="text-sm font-medium leading-snug hover:text-signal transition-colors"
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl glass-card !border-signal/30 bg-signal/5 p-6">
                <div className="eyebrow-sm text-signal mb-2">Newsletter</div>
                <h3 className="font-display text-xl font-black mb-3 leading-tight">
                  Die {meta.eyebrow}-Woche direkt ins Postfach
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Jeden Sonntag: die wichtigsten Meldungen, Tests und Tipps der Woche.
                </p>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="email"
                    required
                    placeholder="E-Mail"
                    className="flex-1 rounded-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-signal"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-signal text-signal-foreground px-4 py-2 eyebrow-sm hover:bg-signal/90 shadow-glow"
                  >
                    Los
                  </button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

export function buildCategoryJsonLd(category: Article["category"], items: Article[] = []) {
  const meta = categoryMeta[category];
  return [
    {
      type: "application/ld+json" as const,
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: meta.title,
        description: meta.description,
        url: meta.slug,
        isPartOf: { "@type": "WebSite", name: "welchesfahrrad.de" },
      }),
    },
    {
      type: "application/ld+json" as const,
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: "/" },
          { "@type": "ListItem", position: 2, name: meta.eyebrow, item: meta.slug },
        ],
      }),
    },
    {
      type: "application/ld+json" as const,
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: items.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `/artikel/${a.slug}`,
          name: a.title,
        })),
      }),
    },
  ];
}
