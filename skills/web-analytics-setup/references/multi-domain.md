# Multi-domain extras

Use these when one site spans more than one domain or subdomain, for example `example.com` for marketing and `app.example.com` for the product. Such a site needs all four: consent, CSP entries, cross-domain linking and a privacy policy that names both tools. Facts are as of Oct 2026; check the linked docs before applying.

## Consent

A consent banner asks the visitor before analytics cookies are set. GA must not load until the visitor agrees.

1. Store the choice in a cookie on the parent domain in production (`Domain=.example.com`) so every subdomain reads the same answer. On localhost, keep it host-only (no `Domain` attribute), because browsers reject `Domain=localhost`.
2. Render `GoogleAnalytics` only when consent is granted and the measurement ID is set.
3. Vercel Web Analytics does not use cookies; confirm against the current Vercel privacy docs before leaving it ungated.

## Content Security Policy

A CSP header lists the hosts a page may load scripts from and send data to. If the site sets one, GA needs these entries (from Google's CSP guide, developers.google.com/tag-platform/security/guides/csp):

| Directive | Add |
| --- | --- |
| `script-src` | `https://*.googletagmanager.com` |
| `img-src` | `https://*.google-analytics.com https://*.googletagmanager.com` |
| `connect-src` | `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` |

Check: load the live site with DevTools open; the Console shows no CSP violation for these hosts.

## Cross-domain linking

Without linking, a visitor moving from `example.com` to `app.example.com` can count as two users with the second visit credited to a "referral" from your own site.

1. In GA, for every web stream: Admin, Data streams, the stream, Configure tag settings, Configure your domains. List every domain the journey crosses.
2. If code also sets `linker.domains`, use the identical list on every stream.
3. Check: click from one domain to the other; the destination URL carries a `_gl=` parameter.

## Where the code lives

Keep the GA React wrapper in each app, not in a shared UI package that is meant to stay framework-free.

## Privacy policy

The privacy page must name every analytics tool in use (here, GA4 and Vercel Web Analytics), what each collects, and how to opt out. Draft the wording if asked, and flag it for the human to approve.
