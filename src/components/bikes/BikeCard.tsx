import { Link } from "@tanstack/react-router";
import type { Bike } from "@/lib/bike-types";
import { articleImageUrl } from "@/lib/article-image-url";
import { Zap, Sparkles } from "lucide-react";
import { BikeFavoriteButton } from "@/components/bikes/BikeFavoriteButton";
import { BikeCompareButton } from "@/components/bikes/BikeCompareButton";

export function BikeCard({
  bike,
  matchPercent = null,
}: {
  bike: Bike;
  matchPercent?: number | null;
}) {
  const img = articleImageUrl(bike.image_url ?? "") || bike.image_url || "/og.jpg";
  const matchTone =
    matchPercent == null
      ? ""
      : matchPercent >= 80
        ? "bg-emerald-500 text-white"
        : matchPercent >= 60
          ? "bg-signal text-signal-foreground"
          : "bg-amber-500 text-white";
  return (
    <div className="group relative bg-card rounded-2xl border border-border/60 shadow-glass overflow-hidden hover-lift glow-signal">
      <BikeFavoriteButton
        variant="card"
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
      <BikeCompareButton slug={bike.slug} variant="card" />

      <Link
        to="/fahrraeder/$slug"
        params={{ slug: bike.slug }}
        className="block"
      >
        <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img
              src={img}
              alt={`${bike.brand} ${bike.model}`}
              loading="lazy"
              decoding="async"
              width={600}
              height={450}
              className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.04] drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
            />
          </div>
          {matchPercent != null && (
            <span
              className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full ${matchTone} text-[10px] uppercase tracking-wider font-black px-2 py-1 shadow-glow tabular-nums`}
              title="Match zu deinem RadProfil"
            >
              <Sparkles className="h-2.5 w-2.5" /> {matchPercent}%
            </span>
          )}
          {bike.category === "ebike" && (
            <span className={`absolute ${matchPercent != null ? "top-9" : "top-2.5"} left-2.5 inline-flex items-center gap-1 rounded-full bg-signal text-[#050505] text-[10px] uppercase tracking-wider font-bold px-2 py-1 shadow-sm`}>
              <Zap className="h-2.5 w-2.5" /> E-Bike
            </span>
          )}
          {bike.price_eur != null && (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-background/90 backdrop-blur text-foreground text-[11px] font-mono tabular-nums px-2.5 py-1 border border-border shadow-sm">
              ab {bike.price_eur.toLocaleString("de-DE")} €
            </span>
          )}
        </div>
        <div className="p-3">
          <div className="eyebrow-sm text-muted-foreground truncate">{bike.brand}</div>
          <div className="font-display font-bold text-base md:text-lg leading-tight mt-0.5 line-clamp-2 group-hover:text-signal transition-colors">
            {bike.model}
          </div>
          {bike.bike_type && (
            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {bike.bike_type}
              {bike.year ? ` · ${bike.year}` : ""}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
