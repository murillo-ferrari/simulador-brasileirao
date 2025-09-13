# Simulador do Campeonato Brasileiro

A small client-side football league simulator built with vanilla JavaScript and Tailwind CSS.

This repository contains a compact simulator that renders standings and match fixtures, allows simulating/clearing match results, and animates standings changes using a FLIP animation helper.

---

## Quick Overview

- Static site (ES modules) — no build required.
- UI split between `UIManager` (DOM wiring & events) and `UIRenderer` (DOM creation / rendering).
- Application state lives in `dataManager` as a single source of truth (`state`).
- Animation helpers centralized in `js/utils.js` and timing in `CONFIG.ANIM`.

---

## Features

- Render standings and match cards from JSON fixtures.
- Simulate matches and update standings live.
- FLIP-based animations for row movements in the table.
- Compact / Full table toggle for small viewports with persisted preference.
- Small accessible legend below the standings explaining badge colors.

---

## Files & Structure

Top-level:

- `index.html` — application shell, includes `js/main.js` as the ES module entrypoint.
- `TODO.md` — prioritized engineering tasks and roadmap.
- `README.md` — this file.

`data/`:
- `initial_standings.json` — initial table data.
- `round_fixtures.json` — fixtures for each round.
- `teams.json` — canonical team metadata (id, name, acronym, logo).

`js/`:
- `config.js` — application constants and `CONFIG.ANIM` timings.
- `dataManager.js` — loads JSON data and exposes the app `state`.
- `main.js` — app bootstrap and initialization.
- `matchManager.js` / `matchService.js` — simulate and clear match logic.
- `standingsCalculator.js` — sorting and position-change calculation logic.
- `teamService.js` — canonical team metadata accessors.
- `uiManager.js` — DOM wiring, events, compact toggle and high-level render orchestration.
- `uiRenderer.js` — building DOM nodes for matches and standings and calling animation helpers.
- `utils.js` — animation helpers (`animateFLIP`, `collapseElement`, `expandElement`) and general utilities.

---

## How to run (local)

The project is static — you can serve it with a simple local web server. From the project root run:

```bash
# Using Python 3 (recommended)
python -m http.server 8000

# or using Node.js with http-server (if installed)
# npx http-server -c-1 . -p 8000
```

Then open `http://localhost:8000` in your browser.

Notes:
- The loading overlay is intentionally shown before the main content to avoid flicker; the app hides it after data loads.
- The compact table toggle is stored in `state.compactTable` and reapplies only on mobile view. See `TODO.md` for planned persistence to localStorage.

---

## Development notes & debugging

- To temporarily show/hide the loading overlay from console:

```js
// Show
UIManager.showLoading();
// Hide
UIManager.hideLoading();
```

- To test compact preference behavior:
  - Toggle the `Tabela reduzida` / `Tabela Completa` buttons on mobile view.
  - Resize the window to desktop — compact view is not applied on desktop by design.

---

## Design & Architecture notes (why things are organized)

- UI responsibilities are separated:
  - `UIManager` manages DOM references and event handlers.
  - `UIRenderer` creates DOM structures and calls animation helpers.
- `state` is a centralized mutable object (in `dataManager.js`) to keep the app straightforward; the project TODOs propose wrapping state behind a small API to improve testability and inversion of control.
- Animation timing and easing are centralized in `CONFIG.ANIM` so tuning is easy in one place.

---

## TODO / Roadmap

See `TODO.md` at the repository root — it contains the prioritized recommendations from a brief SOLID/code-quality audit and concrete next steps (DI, wrapping global state, unit tests, linting/CI, accessibility improvements, etc.).

Recommended immediate work: implement the `dataManager` state accessor API (see `TODO.md` item 2) — this unlocks safer persistence and DI changes.

---

## Contribution and Development Workflow

This is a small project; recommended workflow:

1. Fork & create a branch per task (e.g., `feat/state-api`).
2. Add small, focused changes and follow the TODOs.
3. If adding tests, include them under a `tests/` folder and add a `test` npm script.


---

## License

No license file is included. Add a `LICENSE` if you want to publish this publicly.

---