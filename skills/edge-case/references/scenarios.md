# Scenario catalog

Keep only the axes the component varies on. Every fixture should read like real content.

## Text length

| Scenario | Fixture |
| --- | --- |
| Empty | `""` and, separately, the field missing entirely |
| Very short | `"Hi"` |
| Long sentence | `"Checkout fails when a returning customer applies a discount code after changing plans"` |
| Long single word | `"Rindfleischetikettierungsüberwachungsaufgaben"` or a pasted URL with no spaces |
| Paragraph | 3 to 4 sentences, about 60 words, for any description field |
| Max allowed | Exactly the API or database limit, if one exists |

## Language

| Scenario | Fixture |
| --- | --- |
| German | Long compounds run about 30% longer than English labels |
| Japanese or Chinese | `"ディスカウントコード適用後に決済が失敗する"` (no spaces, so word-based wrapping fails) |
| Right-to-left | `"فشل الدفع بعد تطبيق رمز الخصم"` with `dir="rtl"` on the page |
| Mixed | A name with accents and an emoji: `"Zoë Ångström 🌿"` |

## Numbers and dates

| Scenario | Fixture |
| --- | --- |
| Zero and one | `0` and `1` (check plural labels: "1 users") |
| Large | `999999` and `1234567` (check grouping and whether the layout grows) |
| Negative | `-42` |
| Precision | `0.1 + 0.2` style values and 6 decimals |
| Money | Currencies with no decimals (JPY) and with 3 (KWD) |
| Dates | Today, 3 years ago, a future date, a different time zone |

## Quantity

| Scenario | Fixture |
| --- | --- |
| None | Empty list (does an empty state exist?) |
| One | A single item (are there dangling separators?) |
| Overflow | One more than fits in the row (is there a "+3" summary?) |
| Max | The real cap from the API |

## Missing data

| Scenario | Fixture |
| --- | --- |
| Each optional field absent | One scenario per optional prop |
| Broken image | An image URL that 404s |
| No avatar | `null` avatar and a one-letter name for the initials fallback |

## Container

| Scenario | Fixture |
| --- | --- |
| Narrowest real slot | The smallest width the component is used at in the app |
| Mobile | 320px and 390px |
| Widest real slot | The largest width, to check for stretched lines over about 75 characters |

## Environment

| Scenario | Fixture |
| --- | --- |
| Dark mode | The app's dark theme, via its own toggle |
| Text zoom | Browser zoom at 200%, or root font size doubled |
| Reduced motion | `prefers-reduced-motion: reduce` |
| Keyboard only | Tab through the component and check focus order and rings |
