# V2 tool pages

The currently available tools are local V2 pages:

| Tool | V2 path | Read-only source |
| --- | --- | --- |
| Redevelopment contribution | `../calc/index.html` | `rent-check/calc.html` |
| Youth housing score | `youth-score/index.html` | `rent-check/youth_score.html` |
| Rent/jeonse check | `rent-check/index.html` | `rent-check/index.html` |
| Apartment transaction map | `apartment/index.html` | `rent-check/hwagok_map_widget.html` |

`tool-shell.css` owns the shared Noto Sans KR 400/700 type rules and responsive V2 toolbar. `tool-design.css` owns the shared page width, hero, card, form, button, result, spacing, and mobile presentation. `tool-common.js` injects the same navigation into every tool without touching each tool's calculation or data logic.

When adding a future tool:

1. Create `tools/<tool-id>/index.html`.
2. Add `class="v2-tool-page"`, `data-v2-root="../../"`, and `data-tool-id="<tool-id>"` to `<body>`.
3. Load `../tool-shell.css` and `../tool-common.js`, then load `../tool-design.css` after any tool-specific legacy styles so the V2 visual layer wins the cascade.
4. Use `.v2-tool-main`, `.v2-tool-hero`, and `.v2-tool-card` for new tools. Migrated tools use scoped compatibility selectors in `tool-design.css`.
5. Register the tool once in `data/tools.json`; keep unavailable tools non-clickable with a null URL.
6. Keep business rules and data files inside that tool directory. Do not put formulas in the shared header or design files.

The source repository is a reference only. All V2 changes belong in this repository.
