# Canvas Design Studio Feature Roadmap

**Last updated:** 2026-05-04  
**Purpose:** Concise status view of what exists, what is planned, and where each feature sits in the roadmap.

## Product Workflow Levels

| Level | Workflow | Status | Notes |
|---|---|---|---|
| Beginner | Generate Canvas-safe HTML, then paste it manually into Canvas | Implemented in SP1 | Must remain first-class. No Canvas API token required. |
| Intermediate | Validate pasted or generated HTML before using it in Canvas | Implemented in SP1 | `validate_canvas_html` catches Canvas RCE sanitizer issues. |
| Advanced | List Canvas courses and publish directly through Canvas API | Planned in SP2 | Optional convenience workflow. Requires API token only when API tools are used. |
| Power user | Batch, accessibility, design critique, personas, philosophy KB | Pending SP3+ | Build after the core page workflow is stable. |

## Implemented

| Roadmap item | Feature | Status | Current location |
|---|---|---|---|
| SP1 | MCP server core | Done | `src/index.ts` |
| SP1 | First-run institution setup | Done | `src/wizard.ts`, `src/config.ts` |
| SP1 | Canvas-safe assignment page generation | Done | `src/tools/generate.ts` |
| SP1 | Canvas RCE validation | Done | `src/tools/validate.ts` |
| SP1 | Canvas KB allowlist refresh | Done | `src/tools/update-kb.ts` |
| SP1 | Base templates and design engine | Done | `src/design-engine.ts`, `src/templates/` |
| SP1 | CI and publish scaffolding | Done | `.github/workflows/`, `Dockerfile` |

## In Planning / Next

| Roadmap item | Feature | Status | Next artifact |
|---|---|---|---|
| SP2 | Optional Canvas API course listing | Plan written | `src/canvas-api.ts`, `src/tools/list-courses.ts` |
| SP2 | Optional direct Canvas page publishing | Plan written | `src/tools/publish.ts` |
| SP2 | FERPA/PII preflight for publishing | Plan written | `src/tools/publish.ts` |
| SP2 | Fuzzy title collision protection | Plan written; needs review corrections | Add token-set matching and structured `TITLE_COLLISION` rerun flow |
| SP2 | Professor-readable gotchas | Plan written | `src/tools/gotchas.ts` |
| SP2 | Optional API token setup | Plan updated | `src/wizard.ts` |

## Pending Roadmap

| Roadmap item | Feature | Status | Why it matters |
|---|---|---|---|
| SP3 | Accessibility module | Not started | Adds WCAG-oriented checks and better default output. |
| SP4 | Design Intelligence Brain | Not started | Critiques and improves page design quality beyond sanitizer compliance. |
| SP5 | Panopto integration | Not started | Generates accessible video embeds when institutional auth/whitelisting is confirmed. |
| SP6 | Assignment folder ingest | Not started | Lets professors drop briefs, rubrics, shells, and style notes into a folder. |
| SP7 | Student personas | Not started | Uses statistically grounded personas to review clarity, tone, and accessibility. |
| SP8 | Professor philosophy KB | Not started | Captures teaching philosophy and steers tone, rubrics, design, and persona priorities. |
| Future | Community assignment standard | Not started | Long-term open standard for AI-readable course design systems. |

## Current Implementation Priorities

1. Finish SP2 with Canvas API as optional, not required.
2. Keep the manual paste workflow smooth and documented.
3. Validate the Canvas API query parameters against live or official docs before coding.
4. Build SP2 in small commits following the plan in `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`.
5. After SP2, run a fresh brainstorm/spec cycle for SP3 Accessibility.

## Known Roadmap Note

`docs/superpowers/specs/2026-04-29-mcp-future-additions.md` contains a numbering collision around SP5/SP6 in the body text. This roadmap follows the build-order table: SP5 is Panopto Integration, SP6 is Assignment Folder Ingest.
