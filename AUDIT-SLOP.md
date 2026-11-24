# Slop audit — before edits

Audited 24 November 2026 against the generated `dist/` of commit `826264b`, all 43 routes at 360 and 1280 px, plus `src/data.json` and the templates in `scripts/build.mjs`. Nothing has been changed in the site yet. The checklist comes from `REFERENCES.md`.

## Global patterns

| Where | Quote / element | Why it reads as slop | Plan |
|---|---|---|---|
| All pages, header/footer | Repeated disclaimer: long `site.disclaimer` plus `shortDisclaimer` in footer, About, Sources, Fan notes | Same legal sentence four times; negation-led identity ("not affiliated…") instead of one plain statement | Keep one short disclaimer in the footer; remove repeated versions from page bodies where a creator/source statement already does the work |
| All pages, `main.js` + CSS | `reveal` fade on nearly every section/card/list item (`.js .reveal`, `animation: reveal-in`) | Asymmetric effort: one animation applied everywhere to simulate care | Delete the generic reveal system. Keep click feedback (ripple, pressed state, underline), lightbox feedback, and one page transition |
| All pages, hero/eyebrow | Small uppercase eyebrow + large serif title + three-card grid + numbered list, in roughly the same order everywhere | Mass producible template; content is forced into a repeated shape | Let each page type lead with its own material: photo records on Gallery, table/typography on Discography, a short index on Sources, plain prose on About |
| All pages, CSS | `01 / 09`, `EST. 2026`, section numbers, tiny uppercase labels | Decorative numbers with no navigational or factual job; "EST. 2026" invents an institutional history | Remove badge block and non-functional numbering; keep real dates (release dates, photo dates, checked-on dates) in tabular figures |
| All pages, metadata | `site.description`: "An independent, source-led fan archive… nine eras, sixteen releases, and a small, carefully credited photo collection." | Inventory plus self-praise; "source-led" and "carefully credited" are adjectives about the site, not facts for the reader | Rewrite to one concrete sentence: what the archive covers and where its information comes from |
| All pages, alt text | "Lana Del Rey singing under a stage light at Primavera Sound in 2024." repeated across home/gallery/era pages | Generic and duplicated; does not help a screen-reader user distinguish images | Give each alt text a distinct, visible detail: venue, year, and what is actually in frame. Keep credits in the visible caption, not in alt |

## Home `/`

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Hero tagline: "Nine eras, sixteen releases, and a small collection of photographs — a public record of Lana Del Rey's work, told in order." | Inventory + em dash + "told in order" says nothing specific | Start with a date or a fact: the 2008 *Kill Kill* EP through the unreleased *Stove*, with credits on every photograph |
| Stats: `09 chapters`, `16 releases`, `18 credited photographs`, `01 source of truth` | Decorative dashboard; "source of truth" is internal jargon | Delete the whole strip |
| Hero aside: `EST. 2026 · CHAPTER 01 / 09` | Invented founding date and meaningless chapter counter | Delete |
| Section title: "A public record, not a personal feed" | "not X, but Y" framing | Replace with a factual heading tied to the section content |
| Intro: "This is not a diary and it is not a news site…" | Opens with negation, then explains the site to itself | Replace with one sentence about what the archive contains and what the sources are |
| Aside: "What you will not find here" | Negation-led list; repeats the policy text | Remove the aside or replace with a short dated "How facts are checked" note |
| "Three ways in" / "A starting point for each kind of reader: the beginning, the record that changed the scale, and the chapter that is still open." | Rule of three + vague evaluation ("changed the scale") | Rename to the actual chapters and say why each is linked |
| Closing: "Start anywhere", "The archive is a map, not a monument." | Grand, portable closing line; could sit on any site | Delete kicker and slogan; end with the last real item in the archive |
| Closing body: "Every route is a real page, and every page can be read without JavaScript." | Technical self-congratulation aimed at developers, not readers | Delete |
| Footer note: "Built to be read, not to harvest attention." | "not X" slogan | Replace with a plain, dated provenance line or nothing |

## Journey `/journey` and `/journey/[era]`

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Lede: "…the archive follows the work, not the noise around it." | "not X" framing | State the actual range: first EP, debut album, and the unreleased country project, with dates |
| Page title "Nine chapters, in order" + note on release dates | Okay factually, but the phrase "in order" is generic | Keep the dates; retitle to the first and last chapter with years |
| Era card summaries: "the bright dark", "the long exhale", "the quiet house", "the open door", "and the guitar" | Poetic labels that replace information | Use the release name and date as the summary; put one specific production or chart fact underneath |
| NFR summary: "the record that many critics treat as her best" | Vague evaluation with no named critic or publication | Remove the claim, or replace with the documented Grammy nomination and named source |
| NFR lede: "traded some of the earlier maximalism for soft rock, piano, and a slower, more conversational kind of songwriting" | Generic music-writing cliché without a source | Keep the verifiable facts (release date, Antonoff, 14 tracks, nomination) and remove the mood paragraph |
| Born to Die summary: "a cinematic frame that became the template for the next decade" | Unattributed evaluative claim | Delete or attribute to a named publication and year |
| Stove lede repeats "announced under three titles" / summary "delayed, expanded, and still not out" | Same fact three times in one page | Compress into dated sentences; keep the 15 July 2026 companion announcement and the as-of date |

## Gallery `/gallery` and `/gallery/[era]`

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Title "A small, credited collection" | Generic label | Use a concrete count and range: "Eighteen photographs, 2011–2025" |
| Lede: "No hotlinks, no search-engine grabs, no image without a creator and a source." | Policy stated as a slogan; three-part negation | State what a visitor gets: date, place, photographer, licence, original file page |
| Note: "Two periods currently use a clearly marked placeholder…" | Administrative detail in the introduction; also outdated if placeholders are hidden | Move to the individual placeholder tile only |
| Tile tools row: `ARCHIVE PHOTOGRAPH` + `COPY CREDIT` on every tile | Repeated micro-label that does not help navigation | Remove `ARCHIVE PHOTOGRAPH`; keep a single compact credit/copy action |
| Captions: "Primavera Sound, Barcelona, 31 May 2024." with credit line separate | Close to archive style but missing the maker in the caption line | Caption becomes "31 May 2024 · Primavera Sound, Barcelona · Raph_PH"; licence and source stay in the tile/lightbox |
| Alt text repeated across era and gallery pages | Duplicate descriptions | One distinct alt per photograph, written from what is visible |

## Discography `/discography` and `/discography/[album]`

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Lede lists six categories in one sentence | Inventory rhythm; useful but overloaded | Split into two sentences: what is listed, and which editions the tracklists follow |
| Album summary: "The major-label debut: 12 tracks in its standard edition, a deluxe edition with three more, and a cinematic frame that became the template for the next decade." | Colon + rule-of-three + unattributed claim | Lead with date/label/track count; remove the claim |
| Album narratives with "a different kind of attention", "records easier to follow" | Empty intensifiers | Replace with producer, studio/date, chart position, or remove |
| Tracklist and facts tables use the same card chrome as every other page | Template applied to tabular material | Give discography its own typographic layout: ruled rows, tabular figures, no card shadows or badges |
| "This page will be updated when both are confirmed." / "placeholder for that release" | Process talk aimed at the site owner | Replace with the dated status line and a link to the source; no promise about future updates |

## Sources `/sources`

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Title "Receipts, not rumours" | "not X" framing, trendy noun | Retitle: "Source list" or "Where the dates come from" |
| Lede: "Every factual claim in the archive has a reference behind it." | Absolute claim that cannot be true for every line of navigation/UI copy | Say what is referenced: release dates, chart positions, photo licences |
| Note: "Wikipedia is used as a finding aid, not as a final authority…" | Fine in substance but wrapped in self-justification | Keep the useful rule, drop the defence |
| Credit cards repeat the same "copy credit" affordance 18 times with the same label | Mass-producible UI, high visual noise | Keep copy action but make it a quiet icon/button with an accessible label and one shared explanation above the list |

## About `/about`

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Title "A fan archive, with receipts" | Slogan | Retitle to the site name plus its actual scope |
| Lede: "built and maintained by a fan, for other fans" | Self-description instead of information | State what is in the archive and last checked date |
| "The site is deliberately quiet. There is no autoplay, no tracking script, no comment section, and no infinite feed." | Four-part negation; also **factually wrong now** because the hero video autoplays | Delete; if a technical note is needed, keep the short colophon only |
| Section "What this is not": "Not an official site. Not a news site. Not a diary…" | Negation list, repeated elsewhere | Replace with one sentence: the site is unofficial and not affiliated with the artist or labels |
| Takedown text: "contact the address below… No contact email has been invented; the placeholder will be replaced before the site is promoted publicly." | Live placeholder text and process note | Point directly to the GitHub Issues URL |
| Colophon mentions "private VPS… gzip, long-lived caching… security headers" | Infrastructure bragging aimed at developers | Keep fonts/build/search; drop hosting internals |
| Short disclaimer repeated in footer and About | Redundant | One disclaimer in the footer only |

## Fan notes `/fan-notes`

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Lede: "about why this archive exists, how it is made, and what it refuses to do… written for readers, not kept as a private diary" | "not X" framing and meta commentary | Rewrite as a short editorial note about checking facts and sending corrections |
| Note 1 body: "[Archive keeper: add a short note about why you started this archive…]" | **Public placeholder** | Remove the note entirely; replace the page with two factual notes: how facts are checked and how to send a correction |
| Note 2: "That is a deliberate limit, not an oversight." | Defensive "not X" sentence | State the rule plainly |
| Note 3: "This is a fan archive, not a newsroom." | "not X" opener | Start with the action: dates are checked against cited sources |
| Rules list: four "No…" bullets | Negation list | Convert to three positive rules with concrete checks |
| Submit text: "No email address has been invented." | Internal process note on a public page | Delete; keep the Issues link |

## Search `/search` and 404

| Quote / element | Why it reads as slop | Plan |
|---|---|---|
| Search lede: "The index is generated at build time with Pagefind and runs entirely in your browser." | Technical bragging; the reader only needs to know what can be searched | "Search era names, release titles, dates, and photograph captions." |
| Search note: "Photographs are indexed through their captions and credits on the gallery and era pages." | Fine in substance but says nothing on landing | Keep one short line if needed |
| 404 title: "This page has left the party" | Cutesy personification | Plain title: "Page not found" |
| 404 note: "The archive is small enough to browse." | Unnecessary reassurance | Give two useful links and the site name |

## Motion and decoration

| Element | Why it reads as slop | Plan |
|---|---|---|
| One `reveal-in` animation on sections, cards, list items, notes, credits, facts | Uniform motion applied regardless of meaning | Remove auto-reveal. Keep directional feedback: hover lift on a photo, underline on a link, lightbox open/close, ripple on solid controls |
| Grain/vignette-like photo filter applied to every hero and tile (`filter: saturate/contrast/brightness/sepia`) | Generic "moody archive" treatment | Keep a single restrained grade on the hero video/image only; remove from ordinary gallery tiles so licence photographs read clearly |
| Repeated hero video + Lottie monogram on home and 404 | Same decorative device on unrelated pages | Keep Lottie only if it marks the home masthead; 404 becomes typographic |

## Decisions taken from the audit

- Factual data, release dates, chart positions, photo credits, licences, URLs, canonical tags, OG tags, sitemap, and redirects are out of scope for rewriting.
- One owner decision overrides the brief: `prefers-reduced-motion` stays removed and the hero video keeps autoplaying, per the explicit answer given before this audit. This will be noted in the final report, not silently changed.
- Any human anecdote, keeper story, testimonial, or new quote is a TODO for the owner. Nothing of that kind will be invented.
