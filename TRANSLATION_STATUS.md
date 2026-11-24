# Translation status

Checked on 24 November 2026. Build-time validation runs in `npm run check`; this file records the human review that a build cannot perform.

| Locale | Published | Native reviewer | Notes |
|---|---|---|---|
| English (`en`) | Yes | Source language | Editorial copy de-slopped in the previous pass. |
| Bahasa Indonesia (`id`) | Yes | Recommended before promotion | Full translation generated from the English source. A native editor should check rhythm and idioms in `home`, `about`, `fanNotes`, and all photo captions. |
| Español (`es`) | Yes | **Required** | Full translation generated from the English source. Needs review by a native Spanish editor, especially UI labels, meta descriptions, and long-form era/album prose. |
| Português (Brasil) (`pt-br`) | Yes | **Required** | Full translation generated from the English source. Needs review by a native Brazilian Portuguese editor, especially UI labels, meta descriptions, and long-form era/album prose. |

## Pages most likely to need review

- `/about` — editorial policy, status, and the translation-error note added per locale.
- `/fan-notes` — factual notes about fact checking and photo licensing.
- `/sources` — source categories and reference notes.
- Every `/journey/[era]` and `/discography/[album]` — long-form translated prose; facts and tracklists come from `src/data.json` and are not translated.
- Search page and 404 — short UI strings, easy to review.

## Rules for reviewers

- Do not translate album or song titles, artist names, place names, photographer credits, licence names, or URLs.
- Keep all placeholders (`{count}`, `{chapter}`, `[SEARCH_TERM]`, etc.) intact.
- Flag any sentence that sounds like a literal rendering of English rather than natural editorial prose.
- Corrections go into the locale JSON file and are rebuilt; never edit generated HTML.
