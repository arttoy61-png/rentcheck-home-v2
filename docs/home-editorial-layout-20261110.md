# Reversible editorial homepage

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
