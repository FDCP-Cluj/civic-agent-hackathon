type HomeWelcomeHeaderProps = {
  greeting: string;
  name: string;
};

export function HomeWelcomeHeader({ greeting, name }: HomeWelcomeHeaderProps) {
  return (
    <section className="-mt-3 border-b border-border pb-4 md:-mt-5">
      <div className="min-w-0">
        <div className="min-w-0">
          <h1 className="text-[1.9rem] font-semibold tracking-[-0.02em] sm:text-[2.25rem]">
            {greeting}, {name}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Tot ce ai nevoie pentru proceduri, intr-un singur loc.
          </p>
        </div>
      </div>
    </section>
  );
}
