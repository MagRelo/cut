import {
  getNormalizedQuotes,
  QUOTES_SECTION_DISPLAY_TITLE,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";

interface TournamentQuoteBlocksProps {
  sections: TournamentSummarySections | null | undefined;
  className?: string;
}

export function TournamentQuoteBlocks({ sections, className = "" }: TournamentQuoteBlocksProps) {
  const quotes = getNormalizedQuotes(sections);
  if (quotes.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-900">
        {QUOTES_SECTION_DISPLAY_TITLE}
      </h2>
      <div className="mt-2 space-y-3">
        {quotes.map((quote) => (
          <blockquote
            key={`${quote.attribution}-${quote.body.slice(0, 24)}`}
            className="rounded-sm border-l-[3px] px-4 py-3"
            style={{
              borderColor: quote.colors.border,
              backgroundColor: quote.colors.bg,
              color: quote.colors.text,
            }}
          >
            <p className="font-serif text-sm font-medium italic leading-relaxed">
              &ldquo;{quote.body}&rdquo;
            </p>
            <footer className="mt-2 text-right font-serif text-sm font-semibold italic">
              &mdash; {quote.attribution}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
