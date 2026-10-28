# Coverage ledger template

One row per teaching point. Several inventory items can share a row when they
teach the same thing; keep every source location in the row.

## Header

```text
Transcript: <archived path> | <date of session> | <length> | <timestamps or line refs>
Starts/ends: <where it begins and ends; anything missing>
Known errors: <caption or transcription problems>
Current requirements: <document and date> (wins on conflict)
Deck: <path> | <slide count> | <session totals>
```

## Columns

| Column | What goes in it |
|---|---|
| Teaching point | What was taught, in your words |
| Source | Timestamps or line ranges, every one |
| Current slides | Exact slide IDs that already touch it, or `none` |
| Status | `covered`, `partial`, `notes-only`, `missing`, `out of scope`, `unresolved` |
| Destination | `slide`, `demo`, `note`, `resource`, `out of scope` |
| Disposition | The change, or the reason for exclusion |
| Priority | P1 changes what the room learns; P2 strengthens it |

## Example rows (synthetic)

| Teaching point | Source | Current slides | Status | Destination | Disposition | Priority |
|---|---|---|---|---|---|---|
| Show the finished result first, then unpack how it was built | 285-479 | `welcome` | missing | demo | 45-second reveal inside the existing opening minutes | P1 |
| Name the actual gap before correcting it | 2267-2693 | `first-pass` | partial | slide | Add "What is the actual gap?" with three controlled examples | P1 |
| One prompt can hide many agent actions and costs | 431-479 | `agent-loop` | notes-only | note | Speaker note on stopping criteria and a time budget | P2 |
| Speaker's guess about which model a tool picks ("probably the newest one") | 3120-3135 | none | missing | note | Keep the hedge in the note; add a delivery check | P2 |
| Audience-building and revenue advice | 85-101 | none | out of scope | out of scope | Different audience; listed in the appendix with reason | n/a |
| Passage inaudible | 5110-5140 | none | unresolved | none | Cannot establish a method; flagged | n/a |

## Checks before you propose

- [ ] Every inventory item appears in a row or in the unresolved list.
- [ ] Every `out of scope` row has a reason.
- [ ] `note` and `slide` are not conflated in the summary counts.
- [ ] Newer requirements the transcript lacks are listed as kept.
- [ ] Hedged claims keep their hedge; product claims are marked for a check.
- [ ] Guest contributions name the guest.
