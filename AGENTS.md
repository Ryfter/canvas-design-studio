# Canvas Design Studio — Agent Handoff Document

> **For ChatGPT Codex, Claude Code, and other AI agents.** This document is the single source of truth for the project state, conventions, and the next sprint to implement.

---

## Project Overview

**Canvas Design Studio** is an MCP (Model Context Protocol) server that professors use via Claude or ChatGPT to generate, validate, and publish rich HTML pages to Canvas LMS. The server runs over stdio and is used as a tool provider — it has no UI of its own. The AI host (Claude, Codex, etc.) is the intelligence; this server provides Canvas-specific domain tools.

**Repository:** `github.com/Ryfter/canvas-design-studio` (private)
**Config stored at:** `~/.canvas-design-mcp/institution.json`
**Current version:** 0.1.0 (package.json has not been bumped since initial release)

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
│       └── panopto.ts                 ← (SP5 — TO CREATE)
├── tests/
│   ├── generate.test.ts               ← 18 tests
│   ├── validate.test.ts               ← 27 tests
│   ├── accessibility.test.ts          ← 22 tests  ← SP5 adds 2 more
│   ├── update-kb.test.ts              ← 8 tests
│   ├── list-courses.test.ts           ← 15 tests
│   ├── publish.test.ts                ← 9 tests
│   ├── critique.test.ts               ← 22 tests
│   ├── redesign.test.ts               ← 6 tests
│   └── panopto.test.ts                ← (SP5 — TO CREATE, 12 tests)
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

## Current MCP Tools (SP1–SP4 Complete)

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

---

## Accessibility Audit — `auditAccessibility` in `src/tools/accessibility.ts`

Called by both `validate_canvas_html` and `redesign_canvas_page`. Purely static HTML analysis — no network calls. Advisory only (never blocks operations).

**Current checks (5):**

| Check key | What it catches |
|---|---|
| `contrast-ratio` | fg/bg hex pair failing WCAG AA (4.5:1 body, 3:1 large text) |
| `empty-alt` | Content `<img>` with `alt=""` |
| `heading-skip` | H2 → H4 without H3 (skipped level) |
| `vague-link` | Links with text: "click here", "here", "read more", etc. |
| `table-no-headers` | `<table>` without any `<th>` element |

**SP5 adds:** `video-no-captions` — Panopto iframe without `captions=true` in the URL.

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
- Current passing test count: **136**

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

---

## SP5 — Panopto Integration (NEXT — TO IMPLEMENT)

**Design spec:** `docs/superpowers/specs/2026-05-06-sp5-panopto-design.md`
**Target test count after SP5:** 150 (136 existing + 12 new + 2 new accessibility tests)

### What SP5 Builds

Two new MCP tools and one new accessibility check:

1. **`search_panopto_videos`** — search/browse Panopto video library (requires API credentials)
2. **`embed_panopto_video`** — generate Canvas-safe embed HTML for a Panopto video
3. **`video-no-captions`** — new check in `auditAccessibility` (static HTML, no API)

### Files to Create/Modify

| File | Action | What changes |
|---|---|---|
| `src/types.ts` | Modify | Add `PanoptoConfig` interface; add `panopto?: PanoptoConfig` to `InstitutionConfig` |
| `src/wizard.ts` | Modify | Add optional Panopto setup section after Canvas API section |
| `src/tools/panopto.ts` | Create | All Panopto logic: OAuth2 token fetch, search, embed HTML generation |
| `src/tools/accessibility.ts` | Modify | Add `video-no-captions` check to `auditAccessibility` |
| `src/index.ts` | Modify | Import panopto tools; register 2 new tools; add 2 new handlers |
| `tests/panopto.test.ts` | Create | 12 tests for panopto tool |
| `tests/accessibility.test.ts` | Modify | Add 2 tests for `video-no-captions` check |

### `PanoptoConfig` Type (goes in `src/types.ts`)

```ts
interface PanoptoConfig {
  domain: string;                    // e.g. "bsu.hosted.panopto.com"
  iframeWhitelisted: boolean | null; // true=whitelisted; false=not; null=unsure
  clientId?: string;                 // OAuth2 client credentials — enables search + caption check
  clientSecret?: string;
}
```

Add `panopto?: PanoptoConfig` as an optional field to `InstitutionConfig`.

### Wizard Addition (in `src/wizard.ts`)

After the existing Canvas API section, add an optional Panopto section. Always skippable.

Prompts (in order):
1. `"Panopto domain (e.g. bsu.hosted.panopto.com, or leave blank to skip):"` — blank → skip entire section
2. `"Is Panopto whitelisted for iframes in Canvas? (yes / no / unsure):"` → stored as `true / false / null`
3. `"Panopto API client ID (leave blank to skip — enables video search and caption checking):"` → if provided, prompt for client secret

### `search_panopto_videos` Tool

**Input:**
```ts
interface SearchPanoptoInput {
  query?: string;   // omit or blank = list full library
  limit?: number;   // hard ceiling: 500
}
```

**Behavior:**
1. Check `config.panopto.clientId` + `clientSecret` — return `API_NOT_CONFIGURED` text if absent
2. Fetch OAuth2 token: `POST https://{domain}/Panopto/oauth2/connect/token` with body `grant_type=client_credentials&client_id=...&client_secret=...&scope=api`
3. Paginate: `GET https://{domain}/Panopto/api/v1/sessions/search?searchQuery={query}&maxResults=100&pageNumber={n}` with `Authorization: Bearer {token}`. Increment `pageNumber` until results exhausted or limit (or 500) reached.
4. Format and return text:

```
Found 3 videos matching "data visualization":

1. Introduction to Tableau  [32:14]  ✓ captions
   ID: a1b2c3d4-0000-0000-0000-000000000001

2. Excel Charts Deep Dive  [18:45]  ⚠ no captions
   ID: e5f6g7h8-0000-0000-0000-000000000002

Use embed_panopto_video with the ID of the video you want to embed.
```

**Panopto API fields used:** `HasCaptions` (boolean), `Duration` (seconds → format as `mm:ss`), `Id` (GUID), `Name` (title)

**MCP tool description:**
> Search or browse your Panopto video library. Omit the query to list all videos. Returns video IDs, titles, durations, and captions status. Paginates automatically — a full semester of videos comes back in one call. Requires Panopto API credentials configured during setup.

### `embed_panopto_video` Tool

**Input:**
```ts
interface EmbedPanoptoInput {
  videoId: string;
  placement: 'inline' | 'full-page';
  title?: string;   // auto-fetched from API if omitted and API configured
}
```

**Output:**
```ts
interface EmbedPanoptoResult {
  html: string;
  videoTitle: string;
  hasCaptions: boolean | null;  // null when API not configured
  captionWarning?: string;       // present when hasCaptions is false
  iframeUsed: boolean;           // true = iframe; false = fallback link
}
```

**Behavior:**
1. If API configured: `GET https://{domain}/Panopto/api/v1/sessions/{videoId}` — get title and `HasCaptions`
2. If `hasCaptions === false`: set `captionWarning` — do NOT block embed generation
3. Build embed URL: `https://{domain}/Panopto/Pages/Embed.aspx?id={videoId}&autoplay=false&captions=true`
4. Build viewer URL: `https://{domain}/Panopto/Pages/Viewer.aspx?id={videoId}`
5. Generate HTML based on `iframeWhitelisted`:

**When `iframeWhitelisted === true` → iframe embed:**
```html
<iframe
  src="https://{domain}/Panopto/Pages/Embed.aspx?id={videoId}&autoplay=false&captions=true"
  width="720"
  height="405"
  allowfullscreen
  aria-label="{title}"
  style="max-width:100%;border:0;display:block;">
</iframe>
```
(Canvas strips the `title` attribute from iframes — use `aria-label` for accessibility.)

**When `iframeWhitelisted === false` or `null` → accessible fallback link:**
```html
<a href="https://{domain}/Panopto/Pages/Viewer.aspx?id={videoId}"
   target="_blank"
   style="display:inline-block;padding:12px 20px;background:#0033A0;color:#ffffff;
          border-radius:8px;font-family:Lato,sans-serif;font-size:15px;text-decoration:none;">
  ▶ Watch: {title}
</a>
```

**Placement wrapper:**
- `inline` → embed returned as-is
- `full-page` → embed wrapped: `<div style="max-width:720px;margin:0 auto;">{embed}</div>`

**MCP tool description:**
> Generate Canvas-safe HTML to embed a Panopto video. Works without API credentials (provide the video ID manually). When API is configured, fetches the video title and verifies captions. Generates an iframe embed if Panopto is whitelisted in Canvas, or an accessible fallback link if not.

### `video-no-captions` Accessibility Check (add to `src/tools/accessibility.ts`)

Add a new private function `checkVideoNoCaptions` and call it in `auditAccessibility`.

**Detection:** Find any `<iframe` whose `src` contains `panopto` (case-insensitive). If found and `src` does not include `captions=true`, flag it.

**Warning format:**
```ts
{
  check: 'video-no-captions',
  message: 'Panopto embed found without captions enabled — add &captions=true to the embed URL.',
  context: '<iframe src="...">',  // first 60 chars of the tag (use existing ctx() helper)
}
```

`embed_panopto_video` always inserts `captions=true`, so its own output passes this check. The check catches manually-pasted Panopto iframes.

### Tests — `tests/panopto.test.ts` (12 tests)

Write these tests using TDD (write test → verify fail → implement → verify pass):

| Test name | What it verifies |
|---|---|
| `buildEmbedUrl` produces correct URL | `Embed.aspx?id=...&autoplay=false&captions=true` |
| `buildViewerUrl` produces correct URL | `Viewer.aspx?id=...` |
| iframe HTML when `iframeWhitelisted: true` | output contains `<iframe`, `aria-label`, `allowfullscreen` |
| iframe HTML when `iframeWhitelisted: false` | output contains `<a href`, no `<iframe` |
| iframe HTML when `iframeWhitelisted: null` | same fallback as false |
| `inline` placement — no wrapper div | bare embed returned |
| `full-page` placement — centered wrapper | `max-width:720px;margin:0 auto` present |
| `formatSearchResults` with captions | `✓ captions` in output text |
| `formatSearchResults` without captions | `⚠ no captions` in output text |
| `formatDuration` — seconds to mm:ss | 1934 → `"32:14"` |
| search with mocked fetch — returns formatted list | video titles and IDs present in text |
| search without API configured — returns error | output text contains `API_NOT_CONFIGURED` |

### Tests — `tests/accessibility.test.ts` (2 new tests)

Add to the existing accessibility test file:

| Test name | What it verifies |
|---|---|
| Panopto iframe without `captions=true` → `video-no-captions` warning | check present in result |
| Panopto iframe with `captions=true` → no warning | check absent from result |

---

## SP6–SP8 Roadmap (future — do not implement now)

| Sprint | Feature |
|---|---|
| SP6 | Persona-based content adaptation (student personas inform critique/generate) |
| SP7 | Canvas quiz generation (multiple choice, T/F, short answer → QTI or Canvas native) |
| SP8 | Multi-course batch publishing (template propagation across course sections) |

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
