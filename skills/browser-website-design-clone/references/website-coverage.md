# Website Coverage

Use in website mode before detailed template inspection or implementation. Page
mode follows the explicit page boundary and records its visible controls without
automatically adding their destination pages. Document-only website work uses
discovery and contracts below; local route and interaction tests apply only to
requested implementations.

## Discover Routes And Controls

Start from the canonical website homepage plus the supplied URL. Confirm the
website boundary from the request and observed navigation; another origin or
subdomain is external unless included in the authorized scope. Observed canonical
redirects may identify aliases; a brand name alone does not expand the boundary.

1. Inventory the homepage at desktop and mobile, including its header, footer,
   expanded menus, cards, CTAs, and controls exposed by safe interactions. Collect
   actual destinations from rendered links and observable navigation, including
   JavaScript buttons; an anchor-only crawl misses menus and dialogs.
2. Classify each control as an internal route, same-page anchor, local state
   change, external URL, download, contact action, or protected/consequential flow.
   Record the label, owning page/state, destination or effect, and evidence.
   Inspect visible states without submitting forms or carrying out transactions.
3. Visit internal destinations and maintain a queue of unexplored route types.
   Follow listing cards, category navigation, and other internal paths that may
   reveal a new layout family. When listing-to-detail navigation exists, inspect
   an actual detail page; do not assume its layout from a listing thumbnail or
   a URL pattern.
4. Group repeated content only after browser evidence supports the grouping.
   Inspect variants with different section composition, navigation, media,
   interaction, or responsive behavior. Preserve a representative URL and evidence
   for every family and material variant.
5. Continue until the required navigation is accounted for and no unexplored
   candidate layout families remain in the discovered navigation. Record any
   sampled content collections, unvisited candidates, access/tool limits, and
   deliberate boundaries. Do not claim to have found hidden or unlinked pages.

Resolve relative URLs against the source page. Keep path case, trailing-slash
behavior, meaningful query parameters, and anchors/hash routes as observed.
Tracking-only variants can be deduplicated when their irrelevance is established;
do not collapse filters, pagination, locale switches, or client-side routes into
one URL. Downloads and `mailto:`/`tel:` actions are not page templates and need not
be activated to inventory them.

Avoid unbounded enumeration of search terms, filter combinations, calendars,
pagination, or historical content. Sample equivalent content for classification,
then freeze the finite routes and states the clone will implement under the rules
below. Sampling deeper repeated content is part of the default layout-focused
scope, not a reason to keep expanding the required set. A work limit cannot remove
a required route; report partial work if that limit blocks completion. Honor
explicit requests for broader content coverage; reduce that requested scope only
when the user accepts it.

## Define Layout Families And The Required Set

A template is a shared page structure with the same component composition and
interaction model. Different titles, images, products, or article bodies usually
use the same template. A listing and its detail page are different families.
Different behavior can require a variant even when the initial screenshots match.
Use shared shells and tokens; document local exceptions instead of duplicating
the entire design contract for each URL.

After discovery, record and freeze the required local route set in `ROUTES.md`:

- the homepage and supplied seed route;
- every internal destination exposed by the homepage, shared header, expanded
  menus, and footer, including mobile variants;
- every additional URL and broader content set explicitly requested, such as
  "all articles in the archive";
- at least one representative of every discovered distinct layout family and
  each material variant, including families found below the homepage, plus the
  finite route/state samples needed to demonstrate their distinct interactions
  such as a pagination or filter transition.

A link from one of these routes does not automatically make its target required.
Classify deeper targets as additional required representatives, explicitly chosen
local content, or source-site continuations for evidenced repeated content. Record
the evidence supporting equivalent templates and the selected sample; URL shape
alone cannot establish equivalence. There is no fixed universal page-count limit.
Once a family and its material behaviors are represented, equivalent archive
records and pagination steps can remain outside the local set. Do not enumerate
the rest of a collection just to list every excluded record.

Freeze means no automatic expansion for content-only links. If later evidence
reveals a new layout, material behavior, or previously missed mandatory destination,
the main agent revises the inventory and required set before dependent work. Such
candidates stay unresolved until classified; they cannot be dismissed as repeats.

Template reuse reduces implementation duplication; it does not excuse broken
destinations. For example, six homepage article links sharing a template still
need six working URLs with distinct content identities. Required destinations
cannot be removed or sent to the source site merely to pass verification.

## Source-Site Continuations

For deeper repeated-content destinations outside the frozen local set, keep the
control and link to its exact absolute source URL, preserving meaningful query
and fragment state. Label the departure visibly and accessibly before activation,
for example "Next page (original site)"; an unexplained external-link icon or a
note only in the report is insufficient. Record this intentional navigation
difference in the route/control inventory and design contract.

This exception applies only to classified repeated content outside the required
set. Never use it for homepage/shared-navigation targets, explicit user targets,
unrepresented families or behaviors, or blocked required routes. Do not use local
404 pages, dead buttons, or a redirect to an unrelated sample as boundary behavior.

For example, an archive can implement `/blog` and an observed `/blog?page=2` to
represent its listing and pagination behavior, plus required article routes. If
further pages use evidenced equivalent layouts and no broader archive migration
was requested, page 2's Next control can continue to the exact source
`/blog?page=3` with the departure label. Discovering that page 3 has a materially
different layout or behavior instead requires updating the local set.

## Record The Contract

Use `.design-reference/<site-page>/ROUTES.md` as the website inventory. Maintain
these compact tables; add columns only when they support a decision or check.

| Route ID | Source URL / discovery parent | Template / variant | Coverage decision / reason | Local path / content key or continuation URL | Status / evidence or limitation |
| --- | --- | --- | --- | --- | --- |
| `R1` | [observed URL and referring control] | [family ID] | [required: seed / homepage / shared navigation / explicit request / representative / chosen content; or continuation: evidenced repeat] | [local path and distinct data key, or exact absolute source URL; proposed for document-only] | [discovered / inspected / built / verified / blocked / source-continuation] |

| Template ID | Layout / behavior distinction | Representative routes | Shared shell / exceptions | Source evidence | Contract location |
| --- | --- | --- | --- | --- | --- |
| `T1` | [why this family or variant is distinct] | [route IDs] | [...] | [real captures or session-only evidence] | [`DESIGN.md` section or linked template document] |

| Page / state / control | Type | Observed destination or effect | Local behavior / route ID | Check / limitation |
| --- | --- | --- | --- | --- |
| [route, menu state, label] | [classification above] | [actual URL, anchor, or state change] | [expected local result] | [evidence; include external and blocked controls] |

Record the frozen scope revision, mandatory inclusion reasons, representative
samples, and deeper repeated-content boundaries. Count required local routes
inspected, built, and verified; families evidenced and verified; controls and
source-site continuations checked; unresolved candidates and blocked destinations.
Document-only work omits built/verified-local counts. A verified continuation is
a checked control, not a cloned local route, and does not count as a missing
required route. A blocked required route stays in the required set; exclusions
cannot be used to improve the local completion count.

## Implement Navigation And Content

Use the repository's router or static multipage structure. For required routes,
preserve the observed internal paths under the local origin, including meaningful
query/hash state. Keep external links, source-site continuations, and
contact/download actions correctly classified. Respect any existing deployment
base path and record its mapping. Do not introduce a
framework solely to increase file count; a single HTML entry may serve many routes.

Implement shared templates with distinct, evidence-backed data for each included
route. Do not map every product or article slug to the same sample content or use
a catch-all that disguises missing routes as the homepage. Keep copy/media reuse
within authorization and record content gaps; a full CMS or backend migration is
not implied by visual cloning.

Reproduce menus, dialogs, tabs, accordions, filters, and same-page scrolling as
observed. Match URL changes only where the source has them. Form appearance and
local validation may be recreated; sending messages, authenticating, charging, or
other backend effects require their own requested implementation. Keep any local
simulation explicit and never report a completed real transaction.

## Coverage Gate

For implementation, use [Fidelity verification](fidelity-verification.md). Verify
every required route's navigation, direct load, refresh, and history behavior,
every inventoried included control, and every distinct template at matched
desktop/mobile states. Existing access or action boundaries still apply to checks.
Test external/contact/download wiring without triggering consequential effects.

A missing required route, mismatched destination, dead control, unverified family,
or unexplored candidate family prevents a website-complete claim even if the
homepage looks excellent. Report counts and concrete gaps alongside any visual
scores. A fully verified finite scope may be complete without claiming an
exhaustive crawl or a migration of all content on the original website.
