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
| `setup_institution` | Re-runs the setup wizard to update brand colors, Canvas URL, or rotate an API token |

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
Canvas API token (optional — press Enter to skip):
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
  "apiToken": ""
}
```

Run `setup_institution` to update any field interactively.

---

## Requirements

- Node.js 18 or later
- Any MCP-compatible AI host (Claude Code, VS Code Copilot, ChatGPT Codex, etc.)

---

## Roadmap

- **v0.2** — `publish_to_canvas` tool (push HTML directly to a Canvas page via API)
- **v0.3** — Accessibility module (WCAG 2.1 AA checks in wizard, validator, and generator)
- **v0.4** — Design Intelligence Brain (critique + redesign suggestions via host AI)
- **v0.5** — Student Personas (statistically grounded audience review of generated content)

---

## License

MIT
