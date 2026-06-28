/** Maps externalId circuit slug → Jolpica circuitId */
export const CIRCUIT_SLUG_TO_ID: Record<string, string> = {
  british: "silverstone",
  monaco: "monaco",
  italian: "monza",
  belgian: "spa",
  hungarian: "hungaroring",
  dutch: "zandvoort",
  japanese: "suzuka",
  qatar: "losail",
  "united-states": "americas",
  brazilian: "interlagos",
  "las-vegas": "vegas",
  "abu-dhabi": "yas_marina",
  australian: "albert_park",
  chinese: "shanghai",
  bahrain: "bahrain",
  saudi: "jeddah",
  miami: "miami",
  emilia: "imola",
  canadian: "villeneuve",
  spanish: "catalunya",
  austrian: "red_bull_ring",
  azerbaijan: "baku",
  singapore: "marina_bay",
};

export function parseF1ExternalId(externalId: string): { year: number; circuitSlug: string } {
  const match = /^(\d{4})-(.+)-gp$/.exec(externalId.trim());
  if (!match) {
    throw new Error(`Invalid externalId "${externalId}" — expected {year}-{circuit-slug}-gp`);
  }
  return { year: Number(match[1]), circuitSlug: match[2]! };
}
