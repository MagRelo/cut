/** Default hero when no circuit image is mapped. */
export const DEFAULT_F1_HERO_IMAGE =
  "https://images.unsplash.com/photo-1614949194403-9602bdc14a3a?auto=format&fit=crop&w=1200&q=80";

/** Verified F1-themed Unsplash photos (Unsplash License). */
const F1_ON_TRACK =
  "https://images.unsplash.com/photo-1614949194403-9602bdc14a3a?auto=format&fit=crop&w=1200&q=80";
const F1_PACK =
  "https://images.unsplash.com/photo-1773142181818-5842662aea51?auto=format&fit=crop&w=1200&q=80";
const F1_CLOSEUP =
  "https://images.unsplash.com/photo-1721490645563-8e87725bbfa4?auto=format&fit=crop&w=1200&q=80";
const F1_SPEED =
  "https://images.unsplash.com/photo-1774487672107-f7111d659a02?auto=format&fit=crop&w=1200&q=80";

const CIRCUIT_HERO_IMAGES: Record<string, string> = {
  albert_park: F1_ON_TRACK,
  americas: F1_PACK,
  baku: F1_CLOSEUP,
  bahrain: F1_SPEED,
  catalunya: F1_ON_TRACK,
  imola: F1_PACK,
  interlagos: F1_ON_TRACK,
  jeddah: F1_SPEED,
  losail: F1_CLOSEUP,
  marina_bay: F1_PACK,
  miami: F1_SPEED,
  monaco: F1_ON_TRACK,
  monza: F1_PACK,
  red_bull_ring: F1_SPEED,
  shanghai: F1_CLOSEUP,
  silverstone: F1_ON_TRACK,
  spa: F1_PACK,
  suzuka: F1_CLOSEUP,
  vegas: F1_SPEED,
  villeneuve: F1_ON_TRACK,
  yas_marina: F1_SPEED,
  hungaroring: F1_CLOSEUP,
  zandvoort: F1_PACK,
};

export function resolveF1CircuitHeroImage(circuitId: string | null | undefined): string {
  const key = circuitId?.trim().toLowerCase();
  if (key && CIRCUIT_HERO_IMAGES[key]) {
    return CIRCUIT_HERO_IMAGES[key];
  }
  return DEFAULT_F1_HERO_IMAGE;
}
