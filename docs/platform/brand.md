# Brand — Play The Cut

Canonical product naming for user-facing copy, marketing, and documentation.

## Formats

| Context | Format | Example |
| --- | --- | --- |
| Wordmark | `PLAYTHECUT` — one word, all caps | Nav header, loading screen, email header |
| Mark | `/logo-transparent.png` (678×787) | In-app lockup, email header. |
| Favicon | Square icons cut from the mark | Tab icon, Apple home screen, web app manifest |
| Prose | `Play The Cut` — capital T in The | FAQ, emails, page titles, share text |
| URL | `https://playthecut.com` | Share links, OG URLs, email CTAs |

## Where each format applies

**Wordmark (`PLAYTHECUT`)**

- Logo-adjacent text in nav, mobile menu, and hero headers
- Loading and error overlays
- Email header strip (next to logo)

**Mark (`/logo-transparent.png`)**

- In-app lockup (`BrandLogo`) and email header image
- Source artwork for the favicon set. The full PNG is not linked as a tab icon.

**Favicon**

Square icons cut from the mark. Tab and Apple icons keep a small margin. Maskable icons sit inside the center safe zone on a white field so circular home-screen masks do not crop the flames.

| File | Size | Use |
| --- | --- | --- |
| `/favicon.ico` | 16, 32, 48 | Browser default. Transparent. |
| `/favicon-16.png`, `/favicon-32.png`, `/favicon-48.png`, `/favicon-64.png` | square | Tab icon. Transparent. |
| `/favicon-180.png`, `/favicon-192.png`, `/favicon-256.png`, `/favicon-512.png` | square | Larger transparent sizes. 192 and 512 are the manifest `any` icons. |
| `/apple-touch-icon.png` | 180 | Apple home screen. Opaque white. |
| `/favicon-maskable-192.png`, `/favicon-maskable-512.png` | square | Manifest `maskable` icons. Opaque white. |

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

## Payment token

Contest entry fees, prizes, and transfers use **USDC** on **the Base network**. Do not use CUT as a payment-token name in user-facing copy.

## Exclusions

Do not rename these — they are not the product wordmark:

- Golf **CUT** position label (missed cut)
- API headers (`X-Cut-*`), npm scope (`@cut/*`), repo folder name (`cut`)
- Internal spec shorthand (e.g. "Cut user") in engineering docs
