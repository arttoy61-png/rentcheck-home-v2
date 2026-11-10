# Homepage summary-card revision (2026-11-10)

Read `AGENTS.md` and `docs/home-content-guidelines.md` at base commit `ae49ccc6a1ba8a6aceaf18ae34ee6b248213852c`. Kept the existing publication workflow, four canonical article URLs, factual dates, tables, historical limitations, source links, analytics and AdSense markup, all tools, and HOME/Naver inventory definitions. No new articles or duplicate public pages were created.

The four full article embeds have been replaced with a static, responsive summary-card grid using the supplied design: category, natural-language title, brief summary, and a full-card link to the original. The original articles remain complete. Their copy and the home introduction have been edited to remove technical publication labels and repetitive answer/checklist labels while retaining the underlying explanations. This is a wording and layout change, not a fresh verification of the original legal or transaction data.

`data/home-editorial-config.json` provides the four card descriptions. The existing `scripts/render-core-content.mjs` calls the card renderer for both normal and `--posts-only` runs. Setting `enabled` to `false` and running the existing renderer removes the editorial block and its scoped stylesheet. Re-enabling restores the four cards.

## Verification for this revision

- `node scripts/render-core-content.mjs --content-only`: passed.
- `node scripts/render-core-content.mjs --posts-only`: passed.
- `node scripts/test-home-editorial.mjs`: passed after both commands. Covers four cards and original canonical URLs, preserved original article bodies, natural visible copy, unique IDs and existing anchors, one H1, escaped fields, invalid/duplicate path rejection, idempotence, and exact removal/restoration.
- `python scripts/audit_internal_links.py`: passed, no broken local links/assets or guarded-home regressions; existing Naver-link warnings remain.
- Individual `audit_seo_publication.py --article` runs for all four originals: passed, no errors or warnings.
- Full `python scripts/audit_seo_publication.py`: 194 HTML pages and 73 articles checked, 0 errors; 17 existing source-link review warnings outside the edited articles.
- Browser checks and final production verification are recorded separately after publication. The local browser could not start because the execution sandbox did not permit its socket operation, and the cloud browser could not reach the local preview server. Do not treat static tests as a mobile browser pass.

## Previous full-body layout history

# Original reversible editorial homepage

Read `AGENTS.md` and `docs/home-content-guidelines.md` at repository commit `5be60a184076740ef654322c55f0a80e7976fdcf` before implementation. Applied: retain existing article URLs and source HTML, preserve calculation tools, separate historical data and hypothetical examples, keep source links, and test local publication and link integrity. This layout does not constitute a fresh verification of every source claim or guarantee AdSense approval.

## Scope

The existing `scripts/render-core-content.mjs` calls `render-home-editorial.mjs`, including its `--posts-only` branch. The enabled config is `data/home-editorial-config.json`. Four complete main-body originals are inserted before the existing tool hero for all visitors without JavaScript, user-agent rules, hidden text or crawler-specific output:

- `/blog/apartment-floor-price-comparison/`: pinned 29-trade example, methodology and historical limitations.
- `/blog/apartment-direct-deal-reading/`: comparison checklist, official disclosure guidance and FAQ links.
- `/blog/redevelopment-management-plan-inspection/`: legal-source references, dated scope and hypothetical cost comparison.
- `/blog/redevelopment-contribution/`: calculation examples, assumptions and official-source references.

Original canonical pages remain intact. Each embedded article links to its original body, retains original sources, and includes a factual operator profile linking to `/about/`. The separate common `rc-author-profile` block is excluded from embeds to avoid duplicate profiles. Heading levels are adjusted for homepage embedding; IDs and their references are prefixed; relative links resolve against the original URL. No article source is rewritten by this renderer.

CSS is scoped under `.home-editorial` and loaded only while enabled. Tables scroll inside their wrappers on mobile. Existing homepage sections and IDs remain below the columns; the opening navigation links directly to the four articles, calculators and full article listing.

## Restore original layout

Set `enabled` to `false` in `data/home-editorial-config.json`, then run the existing command:

`node scripts/render-core-content.mjs --content-only`

Publish through the existing workflow. This removes only the editorial block and stylesheet link, leaving current hero/tools, publisher markup and other homepage updates intact. Re-enable and rerun to return to columns. No duplicate public backup page or separate publication pipeline is created.

## Local verification

- `node scripts/render-core-content.mjs --content-only`: passed.
- `node scripts/render-core-content.mjs --posts-only`: passed; static columns retained.
- `node scripts/test-home-editorial.mjs`: passed after both commands. Covers four full bodies, original link targets, namespaced IDs, fragment references, single existing H1, four author profiles, static placement, idempotence, relative-link fixtures and exact removal/restoration.
- `python scripts/audit_internal_links.py`: no broken links; existing Naver-link review warnings remain.
- Individual `audit_seo_publication.py --article` runs for all four selected originals: no errors or warnings.
- Existing inventory synchronization picked up the newly registered 82nd article; Naver count remains 276.

Browser/mobile viewport inspection and production checks are separate parent tasks. No push or deploy performed by this implementation worker.
