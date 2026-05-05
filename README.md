# Canvas Design Studio

**An MCP server that gives AI assistants the power to generate, validate, and maintain beautiful Canvas LMS assignment pages.**

Works in Claude Code, VS Code, ChatGPT Codex, and any MCP-compatible host. Zero mandatory cloud APIs — your Canvas API token is optional.

---

## What It Does

| Tool | What it does |
|---|---|
| `generate_canvas_page` | Turns a raw assignment brief into polished, Canvas-safe HTML with a hero banner, two-column layout, and brand colors |
| `validate_canvas_html` | Checks HTML against Canvas RCE sanitizer rules — catches `box-shadow`, `opacity`, `gap`, `<style>` blocks, and more before they silently break |
| `update_canvas_kb` | Fetches the current Canvas HTML allowlist directly from Canvas LMS source and reports any changes |
| `setup_institution` | Re-runs the setup wizard to update brand colors, Canvas URL, API token, professor email, or favorite course IDs |
| `list_canvas_courses` | Lists your Canvas courses with semester filtering, student counts, and favorite pinning to help choose the right one |
| `publish_to_canvas` | Validates and publishes generated HTML directly to a Canvas course page — with FERPA preflight and title collision protection |

---

## Quick Start

### Option A — npx (no dependencies required)

```json
{
  "mcpServers": {
    "canvas-design": {
      "command": "npx",
      "args": ["canvas-design-mcp"]
    }
  }
}
```

**Claude Code** — add to `~/.claude/settings.json` under `mcpServers`  
**VS Code** — add to `.vscode/mcp.json`  
**Any MCP host** — use the JSON above

### Option B — Docker (no Node.js required)

```bash
# Pull the image
docker pull ghcr.io/ryfter/canvas-design-studio:latest
```

```json
{
  "mcpServers": {
    "canvas-design": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "${HOME}/.canvas-design-mcp:/root/.canvas-design-mcp",
        "ghcr.io/ryfter/canvas-design-studio:latest"
      ]
    }
  }
}
```

The `-v` mount gives the container access to your institution config. Run the setup wizard once on the host before using Docker (see Step 2 below).

### 2. First run

On first use, a setup wizard runs in your terminal:

```
╔═══════════════════════════════════════════════════════════╗
║          Canvas Design Studio — First Run Setup           ║
╚═══════════════════════════════════════════════════════════╝

Institution name: (Boise State University)
Primary brand color (#hex): (#0033A0)
Secondary / accent color (#hex): (#D64309)
Canvas base URL: (https://boisestate.instructure.com)
Canvas API token (optional — leave blank to generate HTML and paste it manually):
Professor email for FERPA scan allowlist (optional):
Favorite Canvas course IDs, comma-separated (optional):
```

Config saves to `~/.canvas-design-mcp/institution.json` — survives `npx` reinstalls.

---

## Generating a Page

Ask your AI assistant:

> "Generate a Canvas assignment page for ITM 370, Assignment 16.06 — AI Augmented Projects, Fall 2026, Dr. Rank. Brief: Students record a 5-minute video demo of their passion project and upload to YouTube."

The tool returns:

- **Canvas-safe HTML** — inline styles only, no `<script>`, no disallowed properties
- **Hero image prompt** — copy/paste into ChatGPT or Midjourney (1200×400px)
- **Filename** — `itm-370-16.06-page.html`

---

## Canvas HTML Rules Enforced

The validator and generator both enforce Canvas RCE constraints:

| Disallowed | Reason |
|---|---|
| `<style>` blocks | Canvas strips them — use inline `style=""` |
| `<script>` | Not permitted in Canvas RCE |
| `box-shadow` | Stripped by sanitizer |
| `opacity` | Stripped — use `rgba()` instead |
| `gap` | Stripped in flex/grid — use `margin` on children |
| `filter`, `transform`, `transition`, `animation` | All stripped |
| `<h1>` | Reserved for Canvas page title |
| `<img>` without `alt` | Accessibility violation |

---

## Ingest Workflow (Professors)

Drop three files in an `ingest/` folder and ask your AI to build the page:

```
ingest/
├── course-config.md      ← course number, name, professor, semester
├── assignment-brief.md   ← raw assignment instructions (any format)
└── style-notes.md        ← optional layout/tone preferences
```

> "Read everything in `ingest/`, then generate a Canvas assignment page."

The AI reads all three files, rewrites the brief into student-friendly copy, applies your brand colors, and saves the result to `output/`.

---

## Publishing to Canvas

Publishing directly to Canvas requires a Canvas API token. Professors who prefer the manual workflow can skip this entirely — just paste the generated HTML into Canvas as normal.

### 1. List your courses

> "List my Canvas courses for this semester"

The tool returns each course with its ID, student count, teachers, and term — enough to confirm you have the right one before publishing.

### 2. Publish a page

> "Publish the generated HTML to course 12345 as 'ITM 310 — Assignment 16.06'"

Before writing to Canvas, the tool automatically:

- Scans for obvious FERPA/PII risks (student IDs, grade disclosures)
- Validates the HTML against Canvas RCE rules
- Checks for existing pages with similar titles

### 3. Handle a title collision

If a similar page already exists, the tool stops and asks how to proceed:

```
A page with a similar title already exists:
  Existing: "ITM 310 — Assignment 16.06 AI Projects"
  New:      "ITM 310 — Assignment 16.06"

Rerun publish_to_canvas with one of these options:
  collisionAction: "update"  to replace the existing page content
  collisionAction: "create"  to create a new page with this title
  collisionAction: "related" and relatedPageTitle to create a named variation
  collisionAction: "cancel"  to stop
```

Canvas keeps full page revision history, so an update is always reversible. Use `skipFerpaCheck: true` or `forcePublish: true` only after reviewing the warning they describe.

---

## Keeping the KB Current

Canvas occasionally updates its HTML allowlist. Run:

> "Update the Canvas knowledge base"

The tool fetches `canvas_sanitize.rb` directly from the Canvas LMS GitHub source and reports additions or removals. Results are cached for 24 hours; pass `force: true` to refresh immediately.

---

## Configuration

Config file: `~/.canvas-design-mcp/institution.json`

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
  "apiToken": "",
  "professorEmail": "you@university.edu",
  "favoriteCourses": [12345, 67890],
  "kbTipShown": false
}
```

`apiToken`, `professorEmail`, and `favoriteCourses` are optional. The generate and validate tools work without an API token. Run `setup_institution` to update any field interactively.

---

## Requirements

- Node.js 18 or later
- Any MCP-compatible AI host (Claude Code, VS Code Copilot, ChatGPT Codex, etc.)

---

## Roadmap

- **v0.1** — Core MCP server: generate, validate, KB refresh, institution setup ✓
- **v0.2** — Direct Canvas publishing: `list_canvas_courses` + `publish_to_canvas` ✓
- **v0.3** — Accessibility module (WCAG 2.1 AA checks in wizard, validator, and generator)
- **v0.4** — Design Intelligence Brain (critique + redesign suggestions via host AI)
- **v0.5** — Student Personas (statistically grounded audience review of generated content)

---

## License

MIT
