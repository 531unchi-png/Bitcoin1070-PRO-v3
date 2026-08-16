# Bitcoin1070 PRO — Codex / AI Development Instructions

## Project baseline
- Repository: `531unchi-png/Bitcoin1070-PRO-v3`
- `main` is the production/stable branch.
- Bitcoin1070 PRO v12.2 is the first protected stable baseline for these instructions.
- Always fetch and inspect the latest `main` before starting development. Never assume an old local checkout is current.
- The primary user works mainly from an iPhone, so do not require manual patching, copy/paste code replacement, or desktop-only steps when the repository workflow can perform the work directly.

## Branch and Git safety
1. Never develop directly on `main`.
2. Create a dedicated branch from the latest `main` for every feature, fix, or refactor.
3. Keep changes scoped to the requested task. Avoid unrelated rewrites, cleanup, renaming, or dependency changes.
4. Do not force-push, rewrite history, delete branches, or remove working features unless explicitly requested.
5. Do not merge into `main` without explicit user approval after review.
6. Before proposing a merge, compare the complete working branch against the current `main`, not against an outdated local base.
7. If `main` changes while work is in progress, re-check compatibility before merge.

## Highest-priority compatibility rule
Preserve the complete existing application. A requested change must not silently replace the application with a reduced implementation or remove unrelated functionality.

Before editing a subsystem, inspect its current implementation and its callers. Prefer minimal, compatible changes over broad rewrites.

## Critical regression areas
Every change must consider these areas even when they are not the direct target of the task:

### 1. Portfolio and asset calculations
- Preserve total-asset calculation across Japanese stocks, US stocks, crypto assets, funds/other supported assets, and JPY cash.
- Assets with unknown acquisition cost may contribute to market value but must not create false profit/loss or distort the profit-rate denominator.
- For US stocks, do not reconstruct historical acquisition cost using the current USD/JPY rate. Preserve stored JPY cost or acquisition-time FX logic.
- Never silently reset, overwrite, duplicate, or discard user holdings.

### 2. Market-price retrieval
- Do not introduce hard-coded current stock/crypto prices as a fallback for valuation.
- Prefer live API data and clearly bounded valid cache fallback.
- API failure must fail safely: no fabricated prices, `NaN`, accidental zero valuation, or endless `取得中` state.
- Partial API success must not invalidate successfully retrieved symbols.
- Preserve request timeout/error handling and per-symbol cache semantics where applicable.

### 3. Storage and backup compatibility
- Preserve existing localStorage keys and existing user data unless a migration is deliberately designed and tested.
- Any schema change requires backward compatibility or an explicit migration path.
- Backup/restore must preserve supported holdings, history, and JPY cash balance.
- Validate restored data and do not blindly trust arbitrary object properties.

### 4. PWA / iPhone behavior
- Bitcoin1070 PRO is primarily used as an iPhone PWA.
- When runtime assets change, update the Service Worker cache version so old files do not remain active.
- Verify manifest paths, icons, local asset paths, navigation, and standalone/PWA behavior.
- Avoid solutions that work only on desktop browsers.
- Do not leave mixed-version HTML/JS/CSS in the PWA cache.

### 5. Bitcoin 1070-day cycle
- The project's 1070-day theory is based on the Bitcoin cycle **bottom / lowest-price region as the starting point**, not the previous peak.
- Preserve the real BTC historical chart and `mode=btc-cycle` data path unless the task explicitly replaces it with a verified better implementation.
- Preserve bearish / neutral / bullish scenario behavior and halving-cycle context.
- Forecasts must remain visibly distinguishable from historical/actual data.
- Do not present forecast values as guaranteed future prices.

### 6. Future simulator
- Preserve support for evaluating the broader supported asset catalog, not only assets currently held by the user.
- Do not silently reduce symbol coverage when modifying market-data or portfolio code.

## Security and rendering
- Escape or safely render user-controlled names, symbols, labels, and imported backup data.
- Avoid introducing inline event-handler HTML when normal event listeners are available.
- Do not expose secrets, tokens, credentials, or private API keys in frontend files or commits.

## Required validation before completion
Run the strongest checks available in the repository/environment. At minimum:
1. JavaScript syntax validation for every changed runtime `.js` file and preferably all runtime JS files.
2. Validate JSON files such as `manifest.json` after modification.
3. Check local HTML `src` / `href` references when pages/assets change.
4. Check for missing files referenced by the Service Worker precache.
5. Check for duplicate/obsolete cache entries and update the cache identifier when runtime files changed.
6. Review browser-visible version strings when preparing a new release.
7. Review the full diff against `main` for accidental deletions or large unrelated rewrites.
8. Specifically regression-check portfolio calculations, market-price retrieval, storage/backup, PWA cache, and 1070-day functionality whenever shared code touches them.

If external APIs or iPhone/PWA behavior cannot actually be executed in the environment, state that limitation explicitly. Never report those checks as passed when they were only inspected statically.

## Versioning
- Do not bump the product version for an internal experiment unless requested or the change is being prepared as a release.
- For a release, keep visible version labels, manifest metadata, relevant changelog/validation notes, and PWA cache version consistent.
- Never downgrade or accidentally reintroduce an older visible version.

## Completion report
At the end of a coding task, report:
- branch used;
- base `main` commit SHA;
- files changed;
- concise description of changes;
- tests/checks executed and their results;
- checks that could not be executed;
- known risks or follow-up items;
- whether any commit/push/PR was created.

Do not claim success if tests failed or were not run. Distinguish static review from real runtime verification.

## Merge gate
A task being coded successfully does **not** authorize a production merge. Leave the work on its branch / PR for review. Merge to `main` only after the user explicitly approves the reviewed result.