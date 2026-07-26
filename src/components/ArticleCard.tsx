import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import type { Article } from "@/lib/articles";

interface Props {
  article: Article;
  featured?: boolean;
  index?: number;
  size?: "sm" | "md" | "lg";
}

export function ArticleCard({ article, featured, index = 0, size = "md" }: Props) {
  const titleSize =
    size === "lg"
      ? "text-3xl md:text-5xl"
      : size === "sm"
      ? "text-lg md:text-xl"
      : "text-xl md:text-2xl";

  if (featured) {
    return (
      <Link
        to="/artikel/$slug"
        params={{ slug: article.slug }}
        className="group relative block overflow-hidden rounded-3xl bg-card border border-border/60 shadow-elevated animate-fade-up hover-lift glow-signal"
        data-reveal
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="relative aspect-[16/10] md:aspect-[16/9] overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="absolute inset-0 h-full w-full object-cover grayscale-[40%] transition-all duration-[1400ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:grayscale-0 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        </div>

        <div className="relative -mt-24 md:-mt-32 p-6 md:p-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-signal" />
            <span className="eyebrow text-signal">{article.category}</span>
          </div>

          <h3 className="mt-5 font-display font-black tracking-tight text-foreground text-3xl md:text-5xl lg:text-6xl leading-[0.95] max-w-3xl">
            {article.title}
          </h3>

          <p className="mt-5 max-w-2xl text-base md:text-lg text-muted-foreground font-light leading-relaxed line-clamp-2">
            {article.excerpt}
          </p>

          <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{article.date}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readTime}
            </span>
            {article.source && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                <span>Quelle: {article.source}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/artikel/$slug"
      params={{ slug: article.slug }}
      className="group flex flex-col animate-fade-up hover-lift"
      data-reveal
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-card shadow-glass">
        <img
          src={article.image}
          alt={article.title}
          loading={index != null && index < 2 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
          width={800}
          height={600}
          className="h-full w-full object-cover grayscale-[35%] transition-all duration-[1100ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:grayscale-0 group-hover:scale-[1.05]"
        />

        <div className="absolute top-3 left-3">
          <span className="eyebrow rounded-full bg-background/85 backdrop-blur-md text-signal px-2.5 py-1.5">
            {article.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <h3
          className={`font-display font-bold tracking-tight text-foreground ${titleSize} leading-tight line-clamp-3 transition-colors group-hover:text-signal`}
        >
          {article.title}
        </h3>

        {size !== "sm" && (
          <p className="mt-3 text-sm text-muted-foreground font-light leading-relaxed line-clamp-2">
            {article.excerpt}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          <span>{article.date}</span>
          <span className="h-px w-3 bg-muted-foreground/40" />
          <span>{article.readTime}</span>
        </div>
      </div>
    </Link>
  );
}
