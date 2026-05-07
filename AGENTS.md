# Canvas Design Studio — Agent Handoff Document

> **For ChatGPT Codex, Claude Code, and other AI agents.** This document is the single source of truth for the project state, conventions, and the next sprint to implement.

---

## Project Overview

**Canvas Design Studio** is an MCP (Model Context Protocol) server that professors use via Claude or ChatGPT to generate, validate, and publish rich HTML pages to Canvas LMS. The server runs over stdio and is used as a tool provider — it has no UI of its own. The AI host (Claude, Codex, etc.) is the intelligence; this server provides Canvas-specific domain tools.

**Repository:** `github.com/Ryfter/canvas-design-studio` (private)
**Config stored at:** `~/.canvas-design-mcp/institution.json`
**Current version:** 0.1.0 (package.json has not been bumped since initial release)
**Status:** SP1–SP5 complete | 155 tests passing | SP6 (Assignment Folder Ingest) is next

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 18 |
| Language | TypeScript 5, strict mode |
| Module system | ESM (`"type": "module"` in package.json) |
| Import extensions | All imports use `.js` extensions (required for ESM) |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.10.0 |
| Test framework | Vitest ^2.0.0 |
| Test command | `npm test` (runs `vitest run`) |
| Build command | `npm run build` (runs `tsc`) |
| Build output | `dist/` directory |
| Interactive prompts | `@inquirer/prompts` (wizard only) |
| HTTP | Native `fetch` (Node 18 built-in) — no axios/node-fetch |
| New dependencies | Never add without explicit approval |

---

## Repository Layout

```
canvas-design-studio/
├── AGENTS.md                          ← This file
├── CLAUDE.md                          ← Claude-specific context (loaded every session)
├── DESIGN.md                          ← Canvas design system spec
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                       ← MCP server entry point, tool registration
│   ├── types.ts                       ← InstitutionConfig, CanvasCourse, etc.
│   ├── config.ts                      ← Config read/write at ~/.canvas-design-mcp/
│   ├── wizard.ts                      ← Interactive setup wizard (@inquirer/prompts)
│   ├── canvas-api.ts                  ← CanvasApiClient — wraps Canvas REST API
│   ├── kb/
│   │   └── design-principles.md      ← KB injected in comprehensive mode
│   └── tools/
│       ├── generate.ts                ← generate_canvas_page
│       ├── validate.ts                ← validate_canvas_html (RCE rules)
│       ├── accessibility.ts           ← auditAccessibility (WCAG 2.1 AA)
│       ├── update-kb.ts               ← update_canvas_kb
│       ├── list-courses.ts            ← list_canvas_courses
│       ├── publish.ts                 ← publish_to_canvas
│       ├── critique.ts                ← critique_canvas_page
│       ├── redesign.ts                ← redesign_canvas_page
│       ├── contrast.ts                ← WCAG contrast ratio math
│       └── panopto.ts                 ← Panopto API client, search, embed HTML, transcript download
├── tests/
│   ├── generate.test.ts               ← 18 tests
│   ├── validate.test.ts               ← 27 tests
│   ├── accessibility.test.ts          ← 21 tests
│   ├── update-kb.test.ts              ← 8 tests
│   ├── list-courses.test.ts           ← 15 tests
│   ├── publish.test.ts                ← 9 tests
│   ├── critique.test.ts               ← 22 tests
│   ├── redesign.test.ts               ← 6 tests
│   └── panopto.test.ts                ← 17 tests
└── docs/
    ├── canvas-design-kb/              ← Reference KB (Canvas HTML rules, components)
    ├── handoff-to-Claude.md           ← Sprint completion notes
    ├── technical-roadmap.md           ← SP-by-SP technical decisions
    ├── feature-roadmap.md             ← Professor-facing feature list
    └── superpowers/
        ├── specs/                     ← Design specs (approved before implementation)
        └── plans/                     ← Implementation plans (task-by-task)
```

---

## Config Types

### `InstitutionConfig` — `src/types.ts`

```ts
interface InstitutionColors {
  primary: string;       // hex, e.g. "#0033A0"
  primaryDark: string;
  primaryLight: string;
  secondary: string;
}

interface InstitutionConfig {
  institution: string;   // e.g. "Ball State University"
  colors: InstitutionColors;
  canvasUrl: string;     // e.g. "https://bsu.instructure.com"
  apiToken?: string;     // Canvas API token
  professorEmail?: string;
  favoriteCourses?: number[];
  kbTipShown?: boolean;
  panopto?: PanoptoConfig;  // SP5 addition — see below
}
```

### `PanoptoConfig` — add to `src/types.ts` in SP5

```ts
interface PanoptoConfig {
  domain: string;                    // e.g. "bsu.hosted.panopto.com"
  iframeWhitelisted: boolean | null; // true=whitelisted; false=not; null=unsure
  clientId?: string;                 // OAuth2 client credentials
  clientSecret?: string;
}
```

**Note:** `src/config.ts` handles reading/writing `InstitutionConfig` from `~/.canvas-design-mcp/institution.json`. All config type changes go in `src/types.ts`, not `src/config.ts`.

---

## Current MCP Tools (SP1–SP5 Complete)

### 1. `setup_institution`
Re-runs the interactive wizard to update institution config. No input parameters.

### 2. `generate_canvas_page`
Generates Canvas-safe HTML from an assignment brief. Returns `{ html, filename, heroImagePrompt, warnings }`.

**Input:** `assignmentBrief`, `courseName`, `courseNumber`, `assignmentNumber`, `professorName`, `semester`, `styleNotes?`

### 3. `validate_canvas_html`
Checks HTML against Canvas RCE rules AND WCAG 2.1 AA accessibility checks. Returns combined text summary. Sets `isError: true` if RCE violations found (accessibility warnings are advisory).

**Input:** `html`

### 4. `update_canvas_kb`
Refreshes the Canvas knowledge base from Instructure documentation via Context7/GitHub fetch.

**Input:** `force?` (boolean)

### 5. `list_canvas_courses`
Lists Canvas courses for the configured professor with semester filtering and favorite pinning.

**Input:** `semester?` (`'current' | 'future' | 'past' | 'all'`), `includeFavorites?` (boolean)

### 6. `publish_to_canvas`
Validates HTML then publishes to a Canvas course page. Handles FERPA scan, collision detection, and collision resolution actions.

**Input:** `courseId`, `html`, `pageTitle`, `forcePublish?`, `skipFerpaCheck?`, `collisionAction?` (`'update' | 'create' | 'related' | 'cancel'`), `relatedPageTitle?`

### 7. `critique_canvas_page`
Design quality evaluation. Returns score (0–100), strengths, and prioritized findings. Comprehensive mode injects `src/kb/design-principles.md` as `kbContext` in the response for the AI host to reason about.

**Input:** `html`, `pageType` (`'assignment' | 'week-overview' | 'course-home' | 'syllabus' | 'other'`), `primaryGoal`, `audience?`, `mode?` (`'quick' | 'comprehensive'`)

**Output:** `{ score, mode, pageType, strengths, findings, kbContext? }`

**Critique checks (8 total):**

| Check | Priority | Trigger |
|---|---|---|
| `unreplaced-hero` | high | `HERO_IMAGE_URL` still in HTML |
| `wall-of-text` | high | Any `<p>` > 80 words |
| `no-headings` | high | No H2 or H3 present |
| `too-sparse` | medium | Total word count < 100 |
| `color-chaos` | medium | > 7 distinct hex colors |
| `font-floor` | medium | Any `font-size` < 13px |
| `missing-submission` | medium | Assignment page with no submit/upload/due/deadline |
| `column-imbalance` | low | col-md-8 has > 3x words vs col-md-4 |

**Score deductions:** high = −15, medium = −8, low = −3. Score floors at 0.

### 8. `redesign_canvas_page`
Applies mechanical fixes from critique findings. Returns fixed HTML, list of applied fixes, skipped findings (requiring manual edits), and accessibility warnings.

**Input:** `html`, `findings` (array from critique output), `mode?` (`'quick' | 'comprehensive'`), `pageType?`, `primaryGoal?`

**Output:** `{ html, appliedFixes, skippedFindings, accessibilityWarnings?, kbContext? }`

**Mechanical fixes:** `fixFontFloor` (regex replaces sub-13px sizes), `fixHeroUrl` (inserts comment placeholder note). All other findings go to `skippedFindings` for the AI host to address.

### 9. `search_panopto_videos`
Search or browse the Panopto video library. Returns video IDs, titles, durations, and captions status. Paginates automatically. Hard ceiling: 500 results. Returns `API_NOT_CONFIGURED` text if credentials absent.

**Input:** `query?` (omit to list all), `limit?` (default: all, max 500)

### 10. `embed_panopto_video`
Generate Canvas-safe embed HTML. Works without API credentials (provide `videoId` + `title`). With API: auto-fetches title and checks captions. Sets `captionWarning` if `hasCaptions === false`.

**Input:** `videoId`, `placement` (`'inline' | 'full-page'`), `title?`
**Output:** `{ html, videoTitle, hasCaptions, captionWarning?, iframeUsed }`

### 11. `fetch_panopto_captions`
Download Panopto VTT captions, strip timestamps, save plain-text transcript to `~/.canvas-design-mcp/transcripts/<title>-<videoId>.md`. Returns path and word count.

**Input:** `videoId`, `title?`

---

## Accessibility Audit — `auditAccessibility` in `src/tools/accessibility.ts`

Called by both `validate_canvas_html` and `redesign_canvas_page`. Purely static HTML analysis — no network calls. Advisory only (never blocks operations).

**Current checks (6):**

| Check key | What it catches |
|---|---|
| `contrast-ratio` | fg/bg hex pair failing WCAG AA (4.5:1 body, 3:1 large text) |
| `empty-alt` | Content `<img>` with `alt=""` |
| `heading-skip` | H2 → H4 without H3 (skipped level) |
| `vague-link` | Links with text: "click here", "here", "read more", etc. |
| `table-no-headers` | `<table>` without any `<th>` element |
| `video-no-captions` | Panopto iframe without `captions=true` in the embed URL |

---

## Canvas HTML Hard Rules

These constraints come from the Canvas RCE sanitizer. Violating them produces broken output in Canvas. They are checked by `validate_canvas_html`.

| Rule | Reason |
|---|---|
| No `<style>` blocks | Stripped by Canvas |
| No `<script>` tags | Stripped |
| No `box-shadow` | Stripped |
| No `filter`, `transform`, `transition`, `animation`, `opacity` | All stripped |
| No `gap` in flex/grid | Stripped — use `margin` on children |
| No `<h1>` | Canvas reserves it for page title; start at H2 |
| No `@font-face` or `@import` | Use `Lato, sans-serif` |
| No event attributes (`onclick`, etc.) | Stripped |
| `border-radius` IS allowed | Use freely |
| `display:flex` and `display:grid` ARE allowed | As inline shorthand |
| All CSS must be inline `style=""` attributes | No external CSS |
| Canvas strips `title` attribute from iframes | Use `aria-label` instead |

---

## BSU Design Tokens

```
Primary:        #0033A0  (hero banners, active nav, primary buttons)
Primary-dark:   #002277  (footer bars, hover states)
Primary-light:  #E6ECF9  (callout backgrounds)
Secondary:      #D64309  (accent arrows, pill badges — decorative only)
Neutral:        #F4F3EF  (page background)
Neutral-dark:   #e0e0d8  (card borders)
Text-primary:   #1A1A1A  (body text)
Text-secondary: #555550  (muted text)
White:          #ffffff  (card backgrounds)

Semantic:
  Info:    bg #E6F1FB  / text+border #185FA5
  Success: bg #EAF3DE  / text+border #3B6D11
  Warning: bg #FAEEDA  / text+border #854F0B
  Danger:  bg #FCEBEB  / text+border #A32D2D

Border-radius: sm=4px  md=8px  lg=10px  xl=14px  pill=20px
Spacing:       xs=4px  sm=8px  md=16px  lg=24px  xl=48px
Font:          Lato, sans-serif (no @font-face)
Max content width: 860px
```

---

## Testing Conventions

- Framework: **Vitest** — imports from `vitest`, not `jest`
- Tests in `tests/` directory, named `*.test.ts`
- Import source files with `.js` extension: `import { foo } from '../src/tools/foo.js'`
- Mock external calls (`fetch`) using `vi.fn()` / `vi.spyOn(globalThis, 'fetch')`
- Each test file has a `describe` block per function/feature, with `it()` tests
- Test names describe the behavior: `'flags paragraph over 80 words'` not `'test1'`
- No snapshot tests — all assertions use explicit `expect(x).toBe(y)` or `.toContain()`
- Current passing test count: **155**

### How to Add a New Tool

1. Create `src/tools/newtool.ts` — export the function and its input/output types
2. Create `tests/newtool.test.ts` — write tests first (TDD)
3. In `src/index.ts`:
   - Add import at top: `import { newTool } from './tools/newtool.js'`
   - Add tool descriptor to `ListToolsRequestSchema` handler
   - Add `if (name === 'new_tool')` handler in `CallToolRequestSchema`
4. Run `npm test` to verify all tests pass

---

## ESM Path Resolution Pattern

The KB file is loaded at runtime from a path relative to the compiled output. Use this pattern consistently:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// After build: __dirname = dist/tools/
// KB is at src/kb/ — resolve with ../../src/kb/
const kb = readFileSync(join(__dirname, '../../src/kb/design-principles.md'), 'utf-8');
```

The `src/kb/` directory is included in `package.json` `"files"` array so it ships with the package.

---

## Completed Sprints

### SP1 — Core Tools (complete, v0.1.0, 2026-05-04)
`generate_canvas_page`, `validate_canvas_html`, `update_canvas_kb`, `setup_institution`. 33 tests. Git initialized.

### SP2 — Canvas API Integration (complete)
`list_canvas_courses`, `publish_to_canvas`. FERPA scan, collision detection, collision resolution flow. 15+9 new tests.

### SP3 — Accessibility (complete)
`auditAccessibility` — 5 WCAG 2.1 AA checks. Wired into `validate_canvas_html` and `redesign_canvas_page`. 22 tests. (Video captions check deliberately deferred to SP5.)

### SP4 — Design Intelligence (complete, 2026-05-06)
`critique_canvas_page` (8 checks, 0–100 score), `redesign_canvas_page` (mechanical fixes, KB injection). `src/kb/design-principles.md` created. 22+6 tests. Total: **136 passing**.

Key implementation detail: `extractDivText` in `src/tools/critique.ts` uses a depth-counting algorithm (not a lazy regex) to correctly extract text from nested `<div>` structures in Canvas column layouts.

### SP5 — Panopto Integration (complete, 2026-05-06)
`search_panopto_videos`, `embed_panopto_video`, `fetch_panopto_captions`. OAuth2 client credentials flow via native `fetch`. VTT → plain-text transcript. `video-no-captions` accessibility check. Wizard Panopto section. 19 new tests. Total: **155 passing**.

Key implementation detail: `parseVttToText` strips numeric cue IDs (e.g., `1`, `2` lines before timestamps) and NOTE blocks — real Panopto VTT files include these. `formatDuration` rounds input seconds before conversion to avoid float artifacts.

## SP6–SP8 Roadmap (future — do not implement now)

| Sprint | Feature |
|---|---|
| SP6 | Assignment Folder Ingest — professor drops brief/rubric/shell into a folder, tool builds a full page |
| SP7 | Professor Philosophy KB — optional interview-built steering context that shapes all generation |
| SP8 | Student Persona Review — get feedback from statistically grounded student personas before publishing |

---

## Key Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| No Anthropic API calls from server | Claude/Codex is the host AI | Server is tools only — calling Anthropic from inside an Anthropic session creates unnecessary cost and latency |
| MCP transport | stdio | Claude Desktop and Codex both require stdio; stdio is simplest |
| Config location | `~/.canvas-design-mcp/institution.json` | Platform-agnostic home dir; survives npm reinstalls |
| OAuth2 token caching | Not cached (fresh per request) | Acceptable for MVP; tokens are short-lived and request rate is low |
| No npm packages for Panopto | Use native `fetch` | Project has zero-dep policy for new features |
| `auditAccessibility` advisory-only | Never blocks operations | Professors need to decide; server should not block publishing on a11y warnings |
| `aria-label` instead of `title` on iframes | Canvas strips `title` | Documented Canvas sanitizer behavior — discovered during SP5 spec research |
| Pagination ceiling: 500 results | Hard cap in `search_panopto_videos` | Prevents runaway API usage for large libraries; a full semester (64 videos max) is well under this |

---

## Library and Framework Documentation

Use Context7 MCP to fetch current documentation whenever working with a library, framework, SDK, or API — including `@modelcontextprotocol/sdk`, `@inquirer/prompts`, `vitest`, or any Node.js built-in. Do not rely on training data for API shapes; fetch current docs.

Steps:
1. `resolve-library-id` — search by library name and your question
2. Pick the best match (exact name, source reputation, benchmark score)
3. `query-docs` with the library ID and full question
4. Use the fetched docs to answer

---

## Ingest Workflow (professor page-generation tasks only)

When a professor asks you to build a Canvas page, check `ingest/` first:
- `ingest/course-config.md` — REQUIRED: course number, name, professor, semester
- `ingest/assignment-brief.md` — REQUIRED: raw assignment instructions
- `ingest/style-notes.md` — OPTIONAL: layout/tone preferences

**Do NOT check ingest/ for:** code work, MCP tool implementation, docs updates, roadmap reviews, or any task that is not professor page generation.

---

## After Completing Work

Before ending a session:
1. Update `docs/handoff-to-Claude.md` — add completed tasks, commits (with SHAs), and any non-obvious decisions
2. Update `docs/technical-roadmap.md` if SP status changed
3. Update `docs/feature-roadmap.md` if user-facing features changed
4. Push to GitHub

The handoff doc is the orientation file for the next agent. Keep it current.
