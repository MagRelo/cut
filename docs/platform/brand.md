# Brand — Play The Cut

Canonical product naming for user-facing copy, marketing, and documentation.

## Formats

| Context | Format | Example |
| --- | --- | --- |
| Wordmark | `PLAYTHECUT` — one word, all caps | Nav header, loading screen, email header |
| Prose | `Play The Cut` — capital T in The | FAQ, emails, page titles, share text |
| URL | `https://playthecut.com` | Share links, OG URLs, email CTAs |

## Where each format applies

**Wordmark (`PLAYTHECUT`)**

- Logo-adjacent text in nav, mobile menu, and hero headers
- Loading and error overlays
- Email header strip (next to logo)

**Prose (`Play The Cut`)**

- Body copy when referring to the product by name
- Browser tab titles and default OG/twitter titles
- PWA `name` and `short_name`
- Share sheet title and subtitle (use tagline below when a descriptor is needed)
- Logo `alt` text: `Play The Cut logo`
- Documentation titles and opening descriptions

**URL (`https://playthecut.com`)**

- Canonical public site URL in share links, OG `url`, and email asset base URL

**Tagline**

- `Play The Cut Fantasy Golf` — default for share sheets and `og:image:alt` when a subtitle is appropriate

## Code constants

Import from shared modules; do not hardcode brand strings in UI or server meta:

- Client: [`client/src/lib/brand.ts`](../client/src/lib/brand.ts)
- Server: [`server/src/lib/brand.ts`](../server/src/lib/brand.ts)

## Exclusions

Do not rename these — they are not the product wordmark:

- Golf **CUT** position label (missed cut)
- On-chain **CUT** payment token symbol
- API headers (`X-Cut-*`), npm scope (`@cut/*`), repo folder name (`cut`)
- Internal spec shorthand (e.g. "Cut user") in engineering docs
