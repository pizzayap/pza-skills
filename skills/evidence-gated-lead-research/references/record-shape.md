# Record shape

One record per business. Save it as soon as research starts and update it
after each gate, so a stopped run keeps its work.

```json
{
  "id": "business-slug",
  "name": "", "category": "", "area": "", "address": "",
  "listing": { "url": "", "rating": 0, "reviewCount": 0, "observedAt": "" },
  "website": { "listingHref": "", "landsOn": "", "checkedAt": "" },
  "reviews": [{ "text": "", "ownerReply": null, "label": "customer allegation" }],
  "opportunity": { "observation": "", "fix": "", "observedAt": "" },
  "counterevidence": [""],
  "limitations": [""],
  "qualification": "qualified|candidate|excluded",
  "notes": "Which gates passed, failed or remain open"
}
```

## Field notes

- `id`: lowercase slug. Deduplicate on `name`, website domain and phone
  before creating a new record.
- `listing`: copied from the map listing itself, never from a directory.
  `observedAt` is the date you looked.
- `website.listingHref` is the listing's own Website link;
  `website.landsOn` is where it actually ended up after redirects.
- `reviews`: complete bodies only. `ownerReply` stays `null` when no reply
  was visible; that does not prove there is none.
- `opportunity`: one observation, written so a stranger could find it on
  the page, plus the smallest fix.
- `counterevidence`: what already works (booking tool, contact routes,
  social alternatives).
- `limitations`: access failures and sample limits, each with a date.
- `notes`: gate by gate, for example `1 ✅ 2 ✅ 3 ✅ 4 ❓ sample of 6 only`.
