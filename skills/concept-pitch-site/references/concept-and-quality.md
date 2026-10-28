# Concept and quality reference

Load the sections as the skill's sequence reaches them: Concept at step 2,
Gaps at step 4, Quality bar, Motion and Traps at step 5.

## Concept

The concept is the one idea the page is built from. It sets background,
colours, type, every animation and the copy. A weak concept cannot be
polished into a strong site.

Where it comes from:

1. **What the business physically does:** its machines, materials, tools,
   rituals, paperwork, signage and sounds.
2. **What customers praise** in reviews. Staff who check every file before
   printing can become a red-pen "human check".
3. **What the customer comes to do**, usually send a message. Build that
   action into the concept instead of bolting on a button: a copier's control
   panel can be the order form.

Finish the sentence "The page is the ___." Openings, not answers:

- A tailor: the alteration ticket, chalk marks and tape measure included.
- A bakery: the order chit, with the bake schedule as its board.
- A bike repair shop: the repair tag tied to the handlebar.

Test each candidate:

- **Specific?** Could a competitor use it unchanged? Then it is not yet.
- **Works on a phone?** Portrait, no hover, no cursor.
- **One moment on load** that tells the story in under 3 seconds and never
  blocks the contact button.
- **The interaction does real work:** it writes a useful contact message.
- **Survives as a still** with reduced motion.
- **Stays usable:** the metaphor must not fight reading.
- **Images can be made honestly:** if it needs a photo of the shop, it waits.

Moves that have worked:

- Start from the customers, not the trade. Two businesses in one trade need
  different ideas if their customers want different things.
- When customers cannot name what they need, let them point at a labelled
  drawing.
- When the customer's words are the job, let them type onto the object.
- The business's own documents (a guarantee, shop rules, a dated notice)
  are content and read as real.
- A count from the reviews ("N reviews mention it") beats "customers say".
- An owner's calm reply to a bad review can become the page's promise, once
  the owner confirms it.
- Colour by role: each accent has one job (the machine, the person).

## Gaps that look finished

| Missing | Show instead |
|---|---|
| Messaging number | A prefilled message link (for example `https://wa.me/?text=...`) that opens the contact picker |
| Opening hours | "Call for today's hours", or "By appointment" if they do not take calls |
| Photos | Type, graphic panels or generic-object images; add the shot to the list |
| Review quotes | Paraphrased themes credited to the review platform |
| Prices | "Ask" buttons that open the message with the question filled in |

## Quality bar

Score out of 10 with screenshots open, using award-site weights: Design 40%,
Usability 30%, Creativity 20%, Content 10%. Under 7.5 anywhere is not ready.

- **Design:** a nameable system (grid, type scale, two or three colours with
  jobs, one spacing rhythm) used in every section including the footer.
  Confident type, balanced headlines, no orphans. A composition in every
  section; the hero, three cards, testimonials, CTA band rhythm is the thing
  to avoid. Hover, press and focus states.
- **Usability:** a stranger on a phone knows what and where in 5 seconds and
  sees the contact button. A contact bar stays in thumb reach after the hero.
  Native scrolling, fast on a mid-range phone. Body 16px+, AA contrast,
  44px tap targets, skip link, landmarks.
- **Creativity:** one moment people would screen-record. No repeat of an
  earlier concept site without a reason from these customers.
- **Content:** short, concrete copy in the business's voice; the facts
  customers need most, given room; every claim traces to the brief.

Remove on sight: purple-blue gradients, glassmorphism, soft shadows on
everything, three rounded cards in a row, emoji as decoration, a centred hero
over a stock-looking image, one default sans as the only face, the same
fade-up on every block, a loader, "Elevate", "Unlock", "Seamless",
"one-stop solution", invented numbers or testimonials, stock photos.

## Motion and fallbacks

- Buttons never wait. Scrolling stays native.
- Every move is something the business does.
- Animate transform, opacity, mask and stroke offsets.
- `html:not(.js)` and `prefers-reduced-motion: reduce` both show end states.
- Put scroll-driven CSS inside `@supports`; Safari may not run it.
- Hide JS-only controls without JS, so nothing is a dead button.
- Bake computed markup into the HTML so first paint and no-JS show the real
  thing. A canvas needs a still image fallback.

## Traps worth checking

- `overflow-x: clip` on `body` does not stop sideways scroll; clip each
  section instead. Clipping hides too-wide text; it does not fix it.
- `grid-template-columns: 1fr` grows to its widest nowrap child; use
  `minmax(0, 1fr)`.
- IntersectionObserver never fires for an element clipped to nothing.
  Observe an unclipped wrapper.
- Wrap hover styles in `@media (hover: hover)`, or taps stick.
- A tap's result can land off screen on a phone. Check every tap's result is
  visible without scrolling.
- Check every glyph exists in the web font; missing arrows or stars fall back
  silently to a system font.
- Short laptops (1280x800) break heroes sized from width. Give them their
  own sizes and keep the contact button on the first screen.
