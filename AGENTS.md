# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + TypeScript Phaser game. Runtime source lives in `src/`: `combat.ts` contains the deterministic fight simulation, `animation.ts` selects poses, `arena-renderer.ts` handles Phaser rendering, `input.ts` manages keyboard/gamepad input, and `main.ts` wires menus to the game. Styles are split between `src/game.css`, `src/style.css`, and visual preview CSS.

Tests are in `tests/`. Root `*.test.ts` files are Vitest unit and simulation tests; `tests/browser/*.spec.ts` are Playwright browser flows. Project documentation and art prompts live under `docs/`. Built output goes to `dist/` and should not be edited directly.

## Build, Test, and Development Commands

- `npm install`: install dependencies. Node.js 22 is expected.
- `npm run dev`: start Vite on `0.0.0.0`; open the local URL it prints.
- `npm run build`: run `tsc --noEmit` and create the production build in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm test`: run Vitest tests in `tests/*.test.ts`.
- `npm run test:e2e`: run Playwright specs from `tests/browser`.
- `npm run format`: format source, tests, root TS/JSON files, `index.html`, and `README.md` with Prettier.

## Coding Style & Naming Conventions

Use TypeScript ES modules with two-space indentation, double quotes, and semicolons as produced by Prettier. Keep gameplay rules in pure simulation modules where possible; rendering and UI concerns belong in renderer or entrypoint files. Prefer descriptive camelCase names for values and functions, PascalCase for classes/types, and kebab-case for generated assets or documentation folders.

## Testing Guidelines

Add Vitest coverage for combat rules, input mapping, and animation state decisions. Use Playwright for browser behavior that needs Phaser, canvas rendering, menus, or full game flow. Name unit tests `feature.test.ts` in `tests/` and browser tests `feature.spec.ts` in `tests/browser/`. Before merging gameplay changes, run `npm test`; for UI, rendering, or input changes also run `npm run test:e2e`.

## Commit & Pull Request Guidelines

Recent history uses short imperative commits in Spanish and occasional Conventional Commit prefixes, for example `feat: add visual preview feature` or `mejora en sistema de bloqueo`. Keep commits focused and descriptive. Pull requests should summarize player-visible behavior, list test commands run, link relevant issues, and include screenshots or short clips for visual changes.

## Security & Configuration Tips

The game should run without external runtime services. Do not commit local browser state, generated reports, or machine-specific configuration. Keep new assets deterministic and documented in `docs/` when prompts or art decisions matter.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
