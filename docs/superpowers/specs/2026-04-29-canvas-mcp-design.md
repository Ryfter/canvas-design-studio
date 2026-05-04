# Canvas Design Studio MCP — Design Spec

**Date:** 2026-04-29  
**Status:** Approved  
**Repo:** New package — `canvas-design-mcp/` (sibling to canvas-design-studio/)

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

```
canvas-design-mcp/
├── src/
│   ├── index.ts            ← MCP server entry point, tool registration
│   ├── wizard.ts           ← first-run CLI setup wizard
│   ├── design-engine.ts    ← token injector (institution.json → HTML)
│   ├── tools/
│   │   ├── generate.ts     ← generate_canvas_page tool
│   │   ├── validate.ts     ← validate_canvas_html tool
│   │   └── publish.ts      ← publish_to_canvas tool (Sub-project 2)
│   └── kb/                 ← bundled Canvas KB files (copied at build)
│       ├── allowlist.md
│       ├── components.md
│       └── grid-classes.md
├── institution.json         ← written by wizard, gitignored
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

**Tech stack:**
- Node.js 18+ / TypeScript
- `@modelcontextprotocol/sdk` — MCP server
- `axios` — Canvas REST API calls
- `inquirer` — CLI wizard prompts
- `color` — derive primaryDark / primaryLight from primary hex
- Published to npm as `canvas-design-mcp`

---

## Setup Wizard

Runs automatically on first `npx canvas-design-mcp` when `institution.json` is missing. Also callable via the `setup_institution` tool.

**Five prompts:**
1. Institution name (e.g., `Boise State University`)
2. Primary brand color hex (e.g., `#0033A0`)
3. Secondary brand color hex (e.g., `#D64309`)
4. Canvas base URL (e.g., `https://boisestate.instructure.com`)
5. Canvas API token (hidden input)

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
- Ships: `dist/`, `src/kb/`, `package.json`, `README.md`
- Excluded: `institution.json`, `.env`, `src/` (TypeScript source), tests, spec docs

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
