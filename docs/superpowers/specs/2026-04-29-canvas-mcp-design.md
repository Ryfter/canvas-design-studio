# Canvas Design Studio MCP — Design Spec

**Date:** 2026-04-29  
**Status:** Implemented — v0.1.0 shipped 2026-05-04  
**Repo:** `D:\Dev\canvas-design-studio\` (single repo — see Architecture deviation below)

> **As-Built Notes (2026-05-04):** Several decisions changed during implementation. Deviations from this spec are marked with `⚠ AS BUILT:` inline. A summary section at the bottom captures all deviations and the reasoning behind them.

---

## What We're Building

An MCP server that gives Claude four tools for generating, validating, and publishing Canvas LMS assignment pages. Professors install it once with a single `npx` command. A CLI wizard handles institution configuration on first run. The end goal is a single Claude prompt that produces a live Canvas page URL.

---

## Decomposition

This is a two sub-project build. Each ships working software independently.

**Sub-project 1 — MCP Server + Generation + Wizard**
- MCP server infrastructure
- Setup wizard (`institution.json`)
- `generate_canvas_page` tool
- `validate_canvas_html` tool
- Design engine (token injection)
- KB bundling

**Sub-project 2 — Canvas API Integration**
- `publish_to_canvas` tool (list courses + publish page)
- `setup_institution` tool update (re-run wizard)
- End-to-end professor workflow

Each sub-project gets its own implementation plan.

---

## Architecture

Node.js + TypeScript MCP server published to npm. Runs locally on each professor's machine. Communicates with Claude via stdio (standard MCP transport).

⚠ AS BUILT: One repo, not two. The MCP server lives inside `canvas-design-studio/` — there is no separate `canvas-design-mcp/` repo. Decision made via Six Hats review (KISS principle): one KB, no sync drift, simpler contribution model.

⚠ AS BUILT: `src/kb/` directory was not created. The KB files remain in `docs/canvas-design-kb/` and are excluded from the npm package via `.npmignore`. The validator and generator use hardcoded rules and inline HTML generation respectively — they don't read from KB files at runtime. The `update_canvas_kb` tool (not in original spec) fetches the canonical source live from GitHub instead.

```
canvas-design-studio/          ← single repo, IS the npm package
├── src/
│   ├── index.ts               ← MCP server entry point, tool registration
│   ├── wizard.ts              ← first-run CLI setup wizard
│   ├── design-engine.ts       ← token injector ({{token}} → value)
│   ├── config.ts              ← load/save/check institution.json
│   ├── types.ts               ← InstitutionConfig interface
│   └── tools/
│       ├── generate.ts        ← generate_canvas_page tool
│       ├── validate.ts        ← validate_canvas_html tool
│       └── update-kb.ts       ← update_canvas_kb tool (added in SP1)
├── docs/canvas-design-kb/     ← KB stays here, excluded from npm package
├── tests/                     ← vitest test suites (33 tests)
├── .gitignore
├── .npmignore
├── package.json               ← name: "canvas-design-mcp"
├── tsconfig.json
└── README.md
```

**Tech stack (as built):**
- Node.js 18+ / TypeScript (module: Node16)
- `@modelcontextprotocol/sdk` — MCP server
- `@inquirer/prompts` — CLI wizard prompts (not `inquirer` — different package)
- `color` — derive primaryDark / primaryLight from primary hex
- `@anthropic-ai/sdk` — in dependencies, reserved for SP4 Design Brain
- No `axios` — Canvas API calls deferred to SP2; `fetch` (Node 18 built-in) used for KB updates
- Published to npm as `canvas-design-mcp`

---

## Setup Wizard

Runs automatically on first `npx canvas-design-mcp` when `institution.json` is missing. Also callable via the `setup_institution` tool.

**Five prompts:**
1. Institution name (e.g., `Boise State University`)
2. Primary brand color hex (e.g., `#0033A0`)
3. Secondary brand color hex (e.g., `#D64309`)
4. Canvas base URL (e.g., `https://boisestate.instructure.com`)
5. Canvas API token (hidden input — ⚠ AS BUILT: made optional; press Enter to skip)

**Derived values (not asked):**
- `primaryDark` — primary color darkened 20% via `color` library
- `primaryLight` — primary color lightened to 90% lightness

**Output — `institution.json`:**
```json
{
  "institution": "Boise State University",
  "colors": {
    "primary": "#0033A0",
    "primaryDark": "#002277",
    "primaryLight": "#E6ECF9",
    "secondary": "#D64309"
  },
  "canvasUrl": "https://boisestate.instructure.com",
  "apiToken": "1234~abcdef..."
}
```

**Post-wizard output:**
- Prints success confirmation
- Prints exact JSON block to add to `claude_desktop_config.json` for Claude Code MCP registration
- MCP server starts immediately after wizard completes

---

## The Four Tools

⚠ AS BUILT: A fourth tool, `update_canvas_kb`, was added during SP1. The spec originally had three tools in SP1 and deferred Canvas API publish to SP2. The KB update tool was added instead of a static KB copy step — it actively fetches from the Canvas LMS source on GitHub.

### `setup_institution`
Re-runs the wizard. Overwrites `institution.json`.

**Input:** none  
**Output:** confirmation message + updated `institution.json`

---

### `generate_canvas_page`
Generates a Canvas-safe HTML page from assignment content.

**Input:**
```ts
{
  assignmentBrief: string,   // raw assignment instructions
  courseName: string,        // e.g. "AI Augmented Projects"
  courseNumber: string,      // e.g. "ITM 370"
  assignmentNumber: string,  // e.g. "16.06"
  professorName: string,
  semester: string,          // e.g. "Fall 2026"
  styleNotes?: string        // optional layout/tone preferences
}
```

**Process:**
1. Load `institution.json` → extract color tokens + institution name
2. Load KB files from `src/kb/` → apply Canvas constraints
3. Build two-column dashboard HTML with token injection via design engine
4. Run `validate_canvas_html` internally — fix any violations before returning

**Output:**
```ts
{
  html: string,              // Canvas-ready HTML fragment
  heroImagePrompt: string,   // ChatGPT prompt for 1200x400px banner image
  filename: string           // suggested output filename
}
```

---

### `validate_canvas_html`
Validates any HTML string against Canvas RCE constraints.

**Input:** `{ html: string }`

**Checks (sourced from `src/kb/allowlist.md`):**
- No `<style>` blocks
- No `<script>` tags
- No `box-shadow` in any `style=""` attribute
- No `gap` property in any `style=""` attribute
- No `opacity:` property (rgba color values are allowed)
- No `filter:`, `transform:`, `transition:`, `animation:` properties
- No `<h1>` tags
- All `<img>` tags have `alt=""` attributes
- Font is `Lato, sans-serif`

**Output:**
```ts
{
  valid: boolean,
  violations: Array<{
    rule: string,     // e.g. "No gap property"
    line: number,
    context: string   // the offending snippet
  }>
}
```

---

### `publish_to_canvas`
Lists professor's courses and publishes an HTML page to the selected course.

**Input:**
```ts
{
  html: string,
  pageTitle: string,
  courseId?: string   // if omitted, fetches course list first
}
```

**Process:**
1. If `courseId` is omitted: `GET /api/v1/courses?enrollment_type=teacher&per_page=50` → return list to Claude for confirmation
2. `POST /api/v1/courses/:courseId/pages` with body:
   ```json
   {
     "wiki_page": {
       "title": "pageTitle",
       "body": "html",
       "published": true
     }
   }
   ```
3. Return the live page URL from the API response

**Output:**
```ts
{
  success: boolean,
  pageUrl: string,    // e.g. https://boisestate.instructure.com/courses/123/pages/assignment-16-06
  courseId: string
}
```

**Auth:** `Authorization: Bearer <apiToken>` header on all Canvas API calls, token read from `institution.json`.

---

### `update_canvas_kb` *(added during SP1 — not in original spec)*

Fetches the current Canvas HTML sanitizer source from GitHub and diffs it against the cached local allowlist. Replaces the original Task 4 "copy KB files" step with a live, self-updating mechanism.

**Input:** `{ force?: boolean }` — if `force: true`, bypasses 24h cache

**Process:**
1. Fetches `gems/canvas_sanitize/lib/canvas_sanitize/canvas_sanitize.rb` from the Canvas LMS repo on GitHub
2. Parses `ALLOWED_ELEMENTS` and `ALLOWED_CSS_PROPERTIES` Ruby `%w[...]` arrays via regex
3. Diffs against cached allowlist at `~/.canvas-design-mcp/kb/allowlist.json`
4. Writes updated allowlist and cache timestamp
5. Returns diff summary (added/removed CSS properties and HTML tags)

**Graceful fallback:** If the Ruby source format changes (regex fails to parse), returns a `parseWarning` and leaves the KB unchanged rather than crashing.

**Cache:** 24 hours. Bypassed with `force: true`.

**Why GitHub fetch instead of Context7:** Context7 was queried during SP1 build but returned LTI integration docs and React component examples — not the raw RCE sanitizer allowlist. Direct GitHub raw URL fetch is more reliable for this specific use case.

**Output:**
```ts
{
  updated: boolean,
  changes: string[],     // e.g. ["+ CSS: grid-template-columns", "- tag: <blink>"]
  lastChecked: string,   // ISO timestamp
  cssPropsCount: number,
  htmlTagsCount: number,
  parseWarning?: string  // set if regex failed to parse source
}
```

---

## Design Engine

Simple string token injector. No templating library.

**Token map** (resolved from `institution.json` at runtime):
```
{{institution.name}}    → "Boise State University"
{{colors.primary}}      → "#0033A0"
{{colors.primaryDark}}  → "#002277"
{{colors.primaryLight}} → "#E6ECF9"
{{colors.secondary}}    → "#D64309"
```

Base HTML templates live in `src/templates/`. The engine reads the appropriate template, replaces all `{{token}}` occurrences, and returns the resolved HTML string.

---

## KB Bundling

Three files from `docs/canvas-design-kb/` are copied into `src/kb/` at build time and shipped in the npm package:

| Source | Destination | Used by |
|---|---|---|
| `01-canvas-rce/HTML-Allowlist.md` | `src/kb/allowlist.md` | `validate_canvas_html` |
| `03-design-systems/Component-Library.md` | `src/kb/components.md` | `generate_canvas_page` |
| `01-canvas-rce/Canvas-Built-In-CSS-Classes.md` | `src/kb/grid-classes.md` | `generate_canvas_page` |

A `prebuild` npm script handles the copy so the KB stays in sync with the source project.

---

## End-to-End Professor Workflow (Sub-project 2 complete)

1. Professor runs `npx canvas-design-mcp` once → wizard → configured
2. Opens Claude Code, which has the MCP registered
3. Types: *"Build a Canvas page for this assignment and publish it to my ITM 370 course."* + pastes brief
4. Claude calls `generate_canvas_page` → gets HTML + hero image prompt
5. Claude calls `validate_canvas_html` → confirms valid
6. Claude calls `publish_to_canvas` without courseId → gets course list → confirms ITM 370
7. Claude calls `publish_to_canvas` with courseId → page published
8. Claude returns: *"Done. Your page is live at [URL]. Here's your hero image prompt: ..."*

Total time from prompt to live Canvas page: under 60 seconds.

---

## Distribution — GitHub + npm

**Source of truth:** Public GitHub repo (`github.com/<owner>/canvas-design-mcp`)
**Distribution:** npm package (`canvas-design-mcp`) published automatically on tagged releases

### Workflow
```
write code → push to GitHub (main) → npm version patch → git push --tags → npm publishes automatically
```

- Cloning the repo gives the latest code (for developers / professors who want to run from source)
- `npx canvas-design-mcp` gives the latest published release (for professors who just want to use it)
- Both paths work simultaneously — no conflict

### GitHub Actions Workflow

File: `.github/workflows/publish.yml`

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### One-time setup required
1. Create npm account at npmjs.com
2. Generate npm access token (Automation type)
3. Add as `NPM_TOKEN` secret in GitHub repo Settings → Secrets → Actions

### Release process (ongoing)
```bash
npm version patch    # or minor / major
git push origin --tags
# GitHub Actions handles the rest
```

### What ships in the package (`.npmignore`)
⚠ AS BUILT: `src/kb/` does not exist. KB files stay in `docs/` and are excluded from the npm package.
- Ships: `dist/`, `package.json`, `README.md`
- Excluded: `institution.json`, `src/` (TypeScript source), `tests/`, `docs/`, `ingest/`, `output/`, `.github/`, `CLAUDE.md`, `DESIGN.md`

---

## Security Notes

- `institution.json` is gitignored — API tokens never committed
- API token stored in plaintext locally (acceptable for personal dev token use case)
- Canvas API token has the same permissions as the professor's account — scoped to their own courses only
- No tokens sent to any third party — MCP runs entirely locally

---

## Installation Flow for Professors

```bash
npx canvas-design-mcp
```

First run output:
```
Canvas Design Studio MCP — First Run Setup
──────────────────────────────────────────
? Institution name: Boise State University
? Primary brand color (#hex): #0033A0
? Secondary brand color (#hex): #D64309
? Canvas URL: https://boisestate.instructure.com
? Canvas API token: **********************

✓ institution.json saved
✓ MCP server ready

Add this to your claude_desktop_config.json:

{
  "mcpServers": {
    "canvas-design": {
      "command": "npx",
      "args": ["canvas-design-mcp"]
    }
  }
}

Restart Claude Code to activate.
```

---

## As-Built Deviation Summary (2026-05-04)

A complete record of decisions that diverged from this spec during SP1 implementation, and the reasoning for each.

| Area | Spec | As Built | Why |
|---|---|---|---|
| Repo structure | Two repos (`canvas-design-studio` + `canvas-design-mcp`) | One repo — `canvas-design-studio` IS the npm package | Six Hats review: KISS wins. One KB, no drift, simpler contribution. |
| CLI prompts package | `inquirer` | `@inquirer/prompts` | `inquirer` v9+ was restructured; `@inquirer/prompts` is the modern successor with better TypeScript support |
| Canvas API package | `axios` | No HTTP library for Canvas API; uses Node 18 built-in `fetch` for KB updates | Canvas API (SP2) not yet implemented; `fetch` is sufficient for GitHub raw URL fetches |
| KB files | Copied to `src/kb/` and bundled in npm package | Not copied; KB stays in `docs/`; excluded from npm package | The `update_canvas_kb` tool fetches the authoritative source live — static copies would create drift |
| KB update mechanism | Manual copy task (Task 4) | `update_canvas_kb` tool — fetches `canvas_sanitize.rb` from GitHub, diffs, caches | Live fetching eliminates manual maintenance; diff reporting gives visibility into Canvas changes |
| Tool count in SP1 | 3 tools: setup_institution, generate_canvas_page, validate_canvas_html | 4 tools: + `update_canvas_kb` | Added during SP1 as the Task 4 replacement once we decided against static KB copies |
| API token | Required in wizard | Optional (press Enter to skip) | Professors don't need the Canvas API until SP2 (`publish_to_canvas`); requiring it upfront creates friction |
| Test count | 28 across 4 suites | 33 across 5 suites | `update_canvas_kb` added a 5th test suite (5 tests) |
| Wizard MCP config reference | `claude_desktop_config.json` | Generic — "Add to your MCP host settings" | The tool must be platform-agnostic; hardcoding Claude Code config path would exclude VS Code, ChatGPT Codex, etc. |

### Two Bugs Found and Fixed During Implementation

**1. `opacity:` regex false negative**
- Spec assumed pattern `(?:^|;|\s)opacity\s*:` would catch all occurrences
- Bug: `style="opacity:0.5;"` — `opacity` is preceded by `"`, not space/semicolon/start
- Fix: Added `"` to character class → `(?:^|[;"\s])opacity\s*:`
- Why it matters: Canvas strips `opacity` silently; if the validator misses it, the professor sees a broken page

**2. HTML comments triggered `<style` rule**
- The generated HTML included a comment explaining Canvas constraints: `<!-- Canvas-safe: inline CSS only, no <style>, no <script>... -->`
- Bug: The comment itself contained `<style>` which matched the no-style-block regex
- Fix (two-part): (1) Validator now strips all HTML comments before checking rules; (2) Generator comment rewritten to not use literal tag names
- Why it matters: The generator's own safety comment was causing the validator to flag its own output as non-compliant
