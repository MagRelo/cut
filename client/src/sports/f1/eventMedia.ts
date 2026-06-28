/** Default hero when no circuit image is mapped. */
export const DEFAULT_F1_HERO_IMAGE =
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80";

const CIRCUIT_HERO_IMAGES: Record<string, string> = {
  silverstone:
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
  monaco:
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
  monza:
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=1200&q=80",
  spa: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=1200&q=80",
};

export function resolveF1CircuitHeroImage(circuitId: string | null | undefined): string {
  const key = circuitId?.trim().toLowerCase();
  if (key && CIRCUIT_HERO_IMAGES[key]) {
    return CIRCUIT_HERO_IMAGES[key];
  }
  return DEFAULT_F1_HERO_IMAGE;
}
