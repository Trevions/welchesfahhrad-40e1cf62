interface Props {
  eyebrow: string;
  title: string;
  description: string;
}

export function CategoryHero({ eyebrow, title, description }: Props) {
  return (
    <section className="relative aurora-bg overflow-hidden">
      <div className="relative z-[1] mx-auto max-w-[1400px] px-6 md:px-8 pt-12 md:pt-20 pb-10 md:pb-16">
        <span className="inline-flex items-center gap-1.5 rounded-full glass-card !shadow-none px-3 py-1.5 eyebrow text-signal animate-fade-in">
          {eyebrow}
        </span>
        <h1 className="mt-6 font-display font-black tracking-tight text-foreground text-5xl md:text-7xl lg:text-8xl leading-[0.9] max-w-5xl animate-fade-up">
          {title.split(" ").length > 2 ? (
            <>
              {title.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="italic text-muted-foreground">
                {title.split(" ").slice(-1)}
              </span>
            </>
          ) : (
            title
          )}
        </h1>
        <p
          className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground font-light leading-relaxed animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          {description}
        </p>
      </div>
    </section>
  );
}
