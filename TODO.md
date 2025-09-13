# Project TODOs — Prioritized Recommendations

This file tracks the prioritized actionable improvements to the project (based on the SOLID/code-quality review).

Each item includes: a short description, target files, and acceptance criteria.

---

1. Introduce Dependency Injection (DI)
   - Description: Refactor modules to accept injected dependencies instead of importing concrete services. Add init signatures (e.g., `UIRenderer.init({ teamService, utils, config, stateAccessor })`).
   - Target files: `js/uiRenderer.js`, `js/uiManager.js`, `js/matchManager.js`
   - Acceptance: Modules can be initialized with mocks in tests; concrete imports replaced by injected values where practical.
   - Priority: High

2. Wrap global `state` behind a small API
   - Description: Encapsulate `state` in `dataManager` with `get(key)`, `set(key, val)`, `subscribe(key, cb)`, `persist(key)` and optional `localStorage` persistence.
   - Target files: `js/dataManager.js` and callers across `js/`.
   - Acceptance: No direct `state.*` writes outside `dataManager`; callers use the accessor API.
   - Priority: High

3. Split `UIRenderer.renderStandings()` into focused units
   - Description: Factor the large renderer into smaller functions: `computeVisibleChanges(sorted, previous)`, `capturePrevPositions(container)`, `createRowElements(team, change)`, `appendRows(...)`, `runAnimations(changedIds, prevPositions)`.
   - Target files: `js/uiRenderer.js`, `js/utils.js`.
   - Acceptance: Units are small and testable; overall behavior remains unchanged.
   - Priority: High

4. Define small service interfaces (JSDoc or types)
   - Description: Document and enforce minimal interfaces like `ITeamService`, `IStandingsCalculator`, `IMatchService` and update implementations to conform.
   - Target files: `js/teamService.js`, `js/standingsCalculator.js`, `js/matchService.js`.
   - Acceptance: Mocks implementing these interfaces can be used in renderer/tests.
   - Priority: Medium

5. Add tests and types (incremental)
   - Description: Add a test runner (Jest or Vitest), write unit tests for `StandingsCalculator` and visible-change logic. Add JSDoc types or incrementally migrate core modules to TypeScript.
   - Target files: test setup in repo root, `js/standingsCalculator.js` tests.
   - Acceptance: Tests run locally and in CI; critical logic covered.
   - Priority: High

6. Replace `JSON.parse(JSON.stringify(...))` clones
   - Description: Use `Utils.deepClone()` or structured clone for snapshots instead of `JSON.parse(JSON.stringify(...))`.
   - Target files: `js/uiRenderer.js` and any other usage sites.
   - Acceptance: No remaining `JSON.parse(JSON.stringify(` usages in the codebase.
   - Priority: Medium

7. Expose a UI-state API & persist preferences
   - Description: Add `dataManager.isEffectiveCompact()` that evaluates viewport + stored preference. Persist `compactTable` with optional `localStorage` via `dataManager`.
   - Target files: `js/dataManager.js`, `js/uiManager.js`, `js/uiRenderer.js`.
   - Acceptance: Preference survives reload and is applied only when intended.
   - Priority: Medium

8. Add lint/format + CI
   - Description: Add `eslint` + `prettier` configs and a GitHub Actions workflow to run lint and tests. Provide npm scripts: `lint`, `format`, `test`.
   - Target files: `.eslintrc`, `.prettierrc`, `.github/workflows/ci.yml`, `package.json`.
   - Acceptance: CI runs lint and tests on PRs/commits.
   - Priority: Medium

9. Improve accessibility & UX
   - Description: Add `aria-pressed` to compact/full toggles, `aria-live` for loading overlay, ensure legend and controls have accessible labels and non-color indicators.
   - Target files: `index.html`, `js/uiManager.js`, `js/uiRenderer.js`.
   - Acceptance: Basic a11y checks (manual or axe) pass for updated controls.
   - Priority: Medium

10. Performance improvements
    - Description: Debounce resize handling (use `Utils.debounce`), batch DOM reads/writes during FLIP, and optimize animation timings.
    - Target files: `js/uiManager.js`, `js/utils.js`, `js/uiRenderer.js`.
    - Acceptance: Reduced layout thrash and smoother animations under repeated simulate/resize.
    - Priority: Low

---

Notes
- Implement these incrementally. I recommend starting with item 2 (wrap global state) because it unlocks DI (#1) and persistence (#7).
