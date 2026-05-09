# Canvas Design Studio — Full Codex Handoff

**Last updated:** 2026-05-09  
**Status:** SP1–SP9 complete | 18 tools | 209 tests passing  
**Working directory:** `D:\Dev\canvas-design-studio\`

This document is the cold-start orientation for ChatGPT Codex (or any agent starting fresh). It covers the full project state, repository workflow, architecture, all tools, and what to do next. Read this before touching anything.

---

## What This Project Is

An **MCP (Model Context Protocol) server** published as `canvas-design-mcp`. Professors install it once and use it from any MCP-capable AI client to generate, validate, and publish rich HTML pages to Canvas LMS — without touching HTML directly.

**The AI host (Claude, Codex, etc.) is the intelligence.** The server provides Canvas-domain tools: HTML generation, design critique, accessibility checks, Panopto video embeds, assignment folder ingest, philosophy/persona context, and file I/O for the improvement loop.

**The end-to-end professor workflow:**
1. Drop raw assignment materials into `ingest/`
2. Tell the AI: *"Build a Canvas page from ingest/"*
3. AI calls tools, gets back Canvas-safe HTML
4. Review → critique → improve → save → publish to Canvas

---

## Repository Setup — Two Remotes

**This is the most important thing to understand before making any git commits.**

The project uses two GitHub repos:

| Remote name | GitHub repo | Visibility | Contains |
|---|---|---|---|
| `backup` | `Ryfter/canvas-design-studio-private` | **Private** | Everything — full source + all internal docs |
| `origin` | `Ryfter/canvas-design-studio` | **Public** | Source code + public docs only (no AGENTS.md, no handoff docs, no superpowers) |

**`backup` is the default upstream.** `git push` goes to the private repo. The public repo is only updated by running the deploy script.

### Why Two Repos

Internal docs (AGENTS.md, handoff notes, superpowers plans, technical roadmap) should not be visible to professors or contributors installing the package. The deploy script strips them automatically. The public repo is what professors clone/install from; the private repo is where all development work lives.

### Daily Workflow

```powershell
# Normal development — commit and push to private backup
git add <files>
git commit -m "feat: ..."
git push                     # → backup (Ryfter/canvas-design-studio-private)

# When ready to update the public repo
.\scripts\deploy-public.ps1  # strips private files, force-pushes to origin
```

**Never run `git push origin master` directly.** The public repo's history diverges from private master because the deploy script rewrites it with private files removed. Use the deploy script every time.

### What the Deploy Script Does

`scripts/deploy-public.ps1`:
1. Creates a temporary branch from master
2. Runs `git rm --cached` on all private files (removes from git tracking for that branch)
3. Commits the stripped state
4. Force-pushes to `origin/master` (public GitHub)
5. Returns to master and deletes the temp branch

The script uses `git checkout -f master` in the cleanup to handle the untracked-file state that results from step 2.

### Private Files (Stripped Before Public Push)

```
AGENTS.md
docs/AI-Personas-ideas_Student-Personas.csv
docs/Student-Personas.md
docs/design-alternatives.md
docs/handoff-to-Claude.md
docs/handoff-to-codex.md          ← this file
docs/roadmap-image-prompt.md
docs/technical-roadmap.md
docs/superpowers/                  ← all plans, specs, skills
```

### Public Files (Visible on GitHub, in npm Package)

```
src/                               ← all source code
tests/                             ← all tests
dist/                              ← compiled output
scripts/deploy-public.ps1          ← deploy tooling
README.md
CLAUDE.md
DESIGN.md
PROFESSOR-INSTRUCTIONS.txt
docs/canvas-design-kb/             ← all 26 KB files (public resource for professors)
docs/feature-roadmap.md
docs/installation.md
package.json / tsconfig.json
```

---

## Tech Stack

| Component | Choice |
|---|---|
| Runtime | Node.js ≥ 18 |
| Language | TypeScript 5 strict, ESM |
| Imports | Always `.js` extension (required for ESM) |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.10.0 (stdio transport) |
| Tests | Vitest ^2.0.0 — `npm test` |
| Build | `tsc` — `npm run build` → `dist/` |
| HTTP | Native `fetch` (Node 18 built-in) — no axios |
| Interactive prompts | `@inquirer/prompts` (wizard only) |
| New deps | Never add without explicit Kevin approval |

---

## Project Structure

```
canvas-design-studio/
├── AGENTS.md                          ← Agent orientation (PRIVATE — not in public repo)
├── CLAUDE.md                          ← Claude-specific context (PUBLIC)
├── DESIGN.md                          ← Canvas design system spec (PUBLIC)
├── scripts/
│   └── deploy-public.ps1              ← Strips private files, updates public GitHub
├── src/
│   ├── index.ts                       ← MCP server entry point, all tool registration
│   ├── types.ts                       ← InstitutionConfig, PanoptoConfig, CanvasCourse
│   ├── config.ts                      ← Config read/write at ~/.canvas-design-mcp/
│   ├── wizard.ts                      ← Interactive first-run setup wizard
│   ├── canvas-api.ts                  ← CanvasApiClient (Canvas REST API wrapper)
│   ├── kb/
│   │   └── design-principles.md      ← Injected in comprehensive critique/redesign mode
│   └── tools/
│       ├── generate.ts                ← generate_canvas_page
│       ├── validate.ts                ← validate_canvas_html + accessibility audit wiring
│       ├── accessibility.ts           ← auditAccessibility (6 WCAG 2.1 AA checks)
│       ├── contrast.ts                ← WCAG contrast ratio math (used by accessibility.ts)
│       ├── update-kb.ts               ← update_canvas_kb (GitHub raw fetch)
│       ├── list-courses.ts            ← list_canvas_courses
│       ├── publish.ts                 ← publish_to_canvas (FERPA scan, collision detect)
│       ├── critique.ts                ← critique_canvas_page (8 checks, scoring)
│       ├── redesign.ts                ← redesign_canvas_page (mechanical fixes only)
│       ├── panopto.ts                 ← search/embed/captions (OAuth2, HTML gen)
│       ├── ingest.ts                  ← ingest_assignment_folder (tree-walk, config merge)
│       ├── philosophy.ts              ← get/update_philosophy_kb (section-aware KB file I/O)
│       ├── personas.ts                ← generate/get_student_personas (weighted sampler)
│       └── page-io.ts                 ← load/save_canvas_page (output/ I/O, .bak backup)
├── tests/
│   ├── generate.test.ts               (10)
│   ├── validate.test.ts               (11)
│   ├── accessibility.test.ts          (21)
│   ├── canvas-api.test.ts             (9)
│   ├── config.test.ts                 (6)
│   ├── contrast.test.ts               (4)
│   ├── update-kb.test.ts              (5)
│   ├── gotchas.test.ts                (8)
│   ├── list-courses.test.ts           (12)
│   ├── publish.test.ts                (19)
│   ├── critique.test.ts               (23)
│   ├── design-engine.test.ts          (4)
│   ├── redesign.test.ts               (6)
│   ├── panopto.test.ts                (18)
│   ├── ingest.test.ts                 (19)
│   ├── philosophy.test.ts             (12)
│   ├── personas.test.ts               (11)
│   └── page-io.test.ts                (10)
└── tests/fixtures/ingest/             ← Real folder trees for ingest tests (no mocking)
```

---

## Config Files (Runtime — Not in Repo)

Stored in the professor's home directory. Never committed to git.

| File | What it stores |
|---|---|
| `~/.canvas-design-mcp/institution.json` | Canvas URL, API token, colors, Panopto creds |
| `~/.canvas-design-mcp/professor-philosophy.md` | KB built by `update_philosophy_kb` |
| `~/.canvas-design-mcp/student-personas.md` | Personas generated by `generate_student_personas` |
| `~/.canvas-design-mcp/transcripts/` | VTT captions saved by `fetch_panopto_captions` |

The wizard creates `institution.json` on first run. Config survives `npm install` updates because it lives in home dir, not the package.

---

## All 18 MCP Tools

All tools are registered in `src/index.ts`. Handlers follow the pattern: catch errors → return `{ content: [{ type: 'text', text: '...' }], isError: true }`.

---

### 1. `setup_institution`
Runs the interactive wizard to update institution config. No input. Wizard collects: institution name, colors (primary/dark/light/secondary), Canvas URL, API token, professor email, favorite course IDs, Panopto domain/credentials, and 6-question philosophy interview (optional/skippable).

---

### 2. `generate_canvas_page`
Generates Canvas-safe HTML from an assignment brief. Injects design tokens from `institution.json` and checks the knowledge base for Canvas RCE constraints.

**Input:** `assignmentBrief`, `courseName`, `courseNumber`, `assignmentNumber`, `professorName`, `semester`, `styleNotes?`  
**Output:** `{ html, filename, heroImagePrompt, warnings }`

---

### 3. `validate_canvas_html`
Checks HTML against Canvas RCE sanitizer rules AND runs `auditAccessibility`. Returns a combined text summary. Sets `isError: true` if RCE violations are found (accessibility warnings are advisory — never block).

**Input:** `html`

---

### 4. `update_canvas_kb`
Refreshes the Canvas knowledge base by fetching from GitHub raw URLs (not Context7 — see Architecture section). Canvas allowlist and built-in CSS classes are the primary targets.

**Input:** `force?` (boolean)

---

### 5. `list_canvas_courses`
Lists Canvas courses for the configured professor. Pins `favoriteCourses` from `institution.json` with ★. Shows naming convention tip once (tracked via `kbTipShown` in config).

**Input:** `semester?` (`'current' | 'future' | 'past' | 'all'`), `includeFavorites?`

---

### 6. `publish_to_canvas`
Full publish pipeline: FERPA/PII scan → HTML validation → fuzzy title collision detection (Levenshtein ≥ 0.8 threshold) → POST or PUT to Canvas API → success URL.

**Input:** `courseId`, `html`, `pageTitle`, `forcePublish?`, `skipFerpaCheck?`, `collisionAction?` (`'update' | 'create' | 'related' | 'cancel'`), `relatedPageTitle?`  
**Canvas endpoints:** `GET /api/v1/courses`, `GET /api/v1/courses/:id/pages`, `POST /api/v1/courses/:id/pages`, `PUT /api/v1/courses/:id/pages/:url`

---

### 7. `critique_canvas_page`
Design quality audit. Runs 8 checks, returns score (0–100), strengths, and findings by priority tier. Comprehensive mode attaches `src/kb/design-principles.md` as `kbContext` for the AI host to reason from.

**Input:** `html`, `pageType` (`'assignment' | 'week-overview' | 'course-home' | 'syllabus' | 'other'`), `primaryGoal`, `audience?`, `mode?` (`'quick' | 'comprehensive'`)  
**Output:** `{ score, mode, pageType, strengths, findings, kbContext? }`

**Checks (priority → deduction):**

| Check | Priority | −Score | Trigger |
|---|---|---|---|
| `unreplaced-hero` | high | −15 | `HERO_IMAGE_URL` still in HTML |
| `wall-of-text` | high | −15 | Any `<p>` over 80 words |
| `no-headings` | high | −15 | No H2 or H3 present |
| `too-sparse` | medium | −8 | Total word count under 100 |
| `color-chaos` | medium | −8 | More than 7 distinct hex colors |
| `font-floor` | medium | −8 | Any `font-size` under 13px |
| `missing-submission` | medium | −8 | Assignment page with no submit/upload/due/deadline keyword |
| `column-imbalance` | low | −3 | col-md-8 column has 3× words of col-md-4 column |

---

### 8. `redesign_canvas_page`
Applies only the mechanical fixes from critique findings. Non-mechanical findings go to `skippedFindings` for the AI host to apply. Auto-runs `auditAccessibility` and populates `accessibilityWarnings` if non-empty.

**Input:** `html`, `findings`, `mode?`, `pageType?`, `primaryGoal?`  
**Output:** `{ html, appliedFixes, skippedFindings, accessibilityWarnings?, kbContext? }`  
**Mechanical fixes:** `fixFontFloor` (regex sub-13px → 13px), `fixHeroUrl` (inserts replacement comment)

---

### 9. `search_panopto_videos`
Search or list-all the Panopto library. Uses OAuth2 client credentials (client_id + client_secret from `institution.json`). Fresh token per request (no caching). Hard ceiling: 500 results. Returns `API_NOT_CONFIGURED` (isError) if credentials are absent.

**Input:** `query?` (omit to list all), `limit?` (default: all up to 500)

---

### 10. `embed_panopto_video`
Generate Canvas-safe embed HTML. Works without API credentials when `videoId` + `title` are supplied. With credentials, auto-fetches title and caption status. Sets `captionWarning` when `hasCaptions === false`. `iframeWhitelisted: null` is treated same as `false` — generates an accessible fallback link instead of iframe.

**Input:** `videoId`, `placement` (`'inline' | 'full-page'`), `title?`  
**Output:** `{ html, videoTitle, hasCaptions, captionWarning?, iframeUsed }`

---

### 11. `fetch_panopto_captions`
Download Panopto VTT captions, strip timestamps and cue IDs, save plain-text transcript to `~/.canvas-design-mcp/transcripts/<title>-<videoId>.md`. Useful for feeding lecture content to `update_philosophy_kb`.

**Input:** `videoId`, `title?`  
**Output:** Path to saved transcript + word count

---

### 12. `ingest_assignment_folder`
Read structured assignment materials from a folder and generate Canvas-safe HTML. Returns HTML plus `sources` (brief, rubric, shell, styleNotes) so the AI host can check alignment without additional reads.

**Input:** `folderPath?` (defaults to `"ingest/"`)  
**Output:** `{ html, filename, heroImagePrompt?, courseInfo, sources, warnings }`

**Folder conventions:**
- `course-config.md` — field-key: value pairs; merges field-by-field up the folder tree (closest wins)
- `assignment-brief.md` — raw assignment instructions (per-assignment only, no inheritance)
- `style-notes.md` — layout preferences (per-assignment only)
- `rubric.md` — inherits up to walk root (`assignments/` or `ingest/`)
- `shell.md` — inherits up to walk root

**Placeholder detection:** `ALL-CAPS` bracket regex `/\[[A-Z ]{3,}\]/` — catches `[PASTE YOUR ASSIGNMENT...]` but not `[Canvas LMS]`.

---

### 13. `get_philosophy_kb`
Returns the professor's teaching philosophy from `~/.canvas-design-mcp/professor-philosophy.md`. If no file exists, returns the empty 4-section template plus 6 interview questions as hints — so the AI host can build the KB through conversation without additional tool calls.

**Input:** none  
**Sections:** Core Teaching Philosophy / Course-Specific Focus / Quotes & Aphorisms / From Lecture Captures

---

### 14. `update_philosophy_kb`
Appends a single entry to one section of the philosophy KB. Always appends, never overwrites. Creates the file (and course subsections) if they don't exist yet.

**Input:** `entry` (string), `section` (`'core' | 'course' | 'quotes' | 'lectures'`), `courseKey?` (required when `section = 'course'`, e.g. `"ITM 370 — AI Augmented Projects"`)

---

### 15. `get_student_personas`
Load saved student personas from `~/.canvas-design-mcp/student-personas.md`. Returns the file content and prompts the AI to ask whether to reuse or regenerate. Returns an empty template with instructions if no file exists.

**Input:** none

---

### 16. `generate_student_personas`
Generate N statistically grounded student personas and save to `~/.canvas-design-mcp/student-personas.md`. Always overwrites. Race/ethnicity and learning disabilities use probability tables sourced from Kevin's persona generation research; 21 other dimensions draw from example pools.

**Input:** `count?` (default 3, clamped to [1, 20])

---

### 17. `load_canvas_page`
Load a Canvas HTML page from `output/` into context. If `filename` is omitted, picks the most recently modified `.html` file by mtime. The returned `filename` should be passed unchanged to `save_canvas_page`.

**Input:** `filename?`  
**Output:** `{ html, filename }`  
**Errors:** output/ missing → clear message; no .html files → clear message; named file not found → clear message

---

### 18. `save_canvas_page`
Save improved Canvas HTML back to `output/`, creating a `.bak` of the previous version before overwriting. If no prior file exists, writes directly (`backup: null`). Auto-creates `output/` if needed. The original is never clobbered until the backup write succeeds.

**Input:** `html`, `filename` (use filename from `load_canvas_page`)  
**Output:** `{ saved, backup }` (full paths)

---

## Accessibility Audit — `auditAccessibility` in `src/tools/accessibility.ts`

Called by `validate_canvas_html` and `redesign_canvas_page`. Purely static HTML analysis. Advisory only — accessibility findings never block tool operations.

| Check | What it catches |
|---|---|
| `contrast-ratio` | fg/bg hex pair below WCAG AA (4.5:1 body, 3:1 large text) |
| `empty-alt` | Content `<img>` with `alt=""` |
| `heading-skip` | H2 → H4 without H3 (skipped level) |
| `vague-link` | Link text: "click here", "here", "read more", "link" |
| `table-no-headers` | `<table>` without any `<th>` |
| `video-no-captions` | Panopto iframe without `captions=true` in embed URL |

---

## Architecture — Key Decisions

These were made deliberately. Don't revisit without a good reason.

### No Anthropic API Calls from the Server
The MCP server runs inside Claude or Codex. Calling the Anthropic API from inside the server would be calling the same model that's already running it — redundant and expensive. Claude IS the intelligence. Tools are domain-specific helpers. KB injection pattern (returning KB content in tool output) gives Claude what it needs without an internal API round-trip.

### Config in `~/.canvas-design-mcp/` (Home Dir)
Not in the project directory. Config survives `npm install -g` upgrades. Works regardless of where professors run the server from. Consistent for all clients (Claude Desktop, VS Code, Cursor, etc.).

### `update_canvas_kb` Fetches from GitHub Raw URLs (Not Context7)
Context7 is a documentation service with rate limits and caching. For Canvas allowlist updates, fetching directly from GitHub raw ensures we get exactly what Instructure publishes. Context7 IDs are documented in earlier handoff docs if needed for other integrations.

### Accessibility Violations Are Advisory (Warn, Don't Block)
Blocking publish on accessibility findings would prevent professors from saving drafts or making incremental improvements. Warnings are surfaced prominently in tool output; the decision to publish is the professor's.

### Tool Handler Pattern (`src/index.ts`)
Every handler returns `{ content: [{ type: 'text', text: ... }], isError: true/false }`. Required-arg handlers use `args as unknown as InputType` (double-cast) because `args` arrives as `Record<string, unknown> | undefined`. Optional-arg handlers use `const input = (args ?? {}) as InputType`.

### `iframeWhitelisted: null` → Fallback Link
When iframe whitelist status is unknown, generate a safe accessible link rather than risk a broken embed. Professors can update their config once they confirm whitelist status.

### Path Traversal Guard (`page-io.ts`)
`resolve(join(outputDir, filename)).startsWith(resolve(outputDir) + sep)` — uses `resolve()` to normalize and `sep` for Windows `\` vs Unix `/`. Consistent with `sanitizeFilename()` in `panopto.ts`.

---

## Testing Conventions

- `npm test` runs all tests (`vitest run`). Must pass before any commit.
- Filesystem-dependent tools use an optional second parameter (`outputDir`, `personasPath`, `kbPath`) that defaults to the production path. Tests pass `os.tmpdir()` — no `vi.mock('node:fs')` anywhere in the codebase.
- `tests/fixtures/ingest/` contains real folder trees. Ingest tests use real filesystem operations, no mocking.
- `utimesSync` is used in the mtime-ordering test (`page-io.test.ts`) because filesystem clock resolution can be under 1ms on fast machines.
- ESM path resolution: imports in `src/` always use `.js` extensions even for `.ts` source files. TypeScript resolves them correctly; Node requires them at runtime.

---

## Sprint History Summary

| Sprint | Feature | Tools Added | Tests |
|---|---|---|---|
| SP1 | MCP core (generate, validate, update-kb, setup) | 4 | 33 |
| SP2 | Canvas API publish (list-courses, publish-to-canvas) | 2 | 82 |
| SP3 | Accessibility module (5 WCAG 2.1 AA checks) | 0 new tools | 107 |
| SP4 | Design intelligence (critique, redesign) | 2 | 136 |
| SP5 | Panopto integration (search, embed, captions, video-no-captions check) | 3 | 156 |
| SP6 | Assignment folder ingest | 1 | 175 |
| SP7 | Professor philosophy KB | 2 | 187 |
| SP8 | Student persona review | 2 | 199 |
| SP9 | Assignment improvement loop (load/save canvas page) | 2 | 209 |

---

## Installation for Local Testing (Kevin's Setup)

The MCP server is installed at `D:\Dev\canvas-design-studio` (dev copy) and run directly:

**Claude Desktop config** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "canvas-design-mcp": {
      "command": "node",
      "args": ["D:\\Dev\\canvas-design-studio\\dist\\index.js"]
    }
  }
}
```

After any source change:
```powershell
cd D:\Dev\canvas-design-studio
npm run build          # recompile TypeScript
# then restart Claude Desktop
```

See `docs/installation.md` for all other MCP clients (VS Code, Cursor, Kiro, Codex CLI, LM Studio, AnythingLLM, Antigravity, Open WebUI, Ollama).

---

## What's Next

SP1–SP9 is feature-complete for the initial release. The project is published at `github.com/Ryfter/canvas-design-studio`.

Potential next work, in rough priority order:

1. **npm publish** — Kevin needs an npm account and `NPM_TOKEN` secret in GitHub repo settings, then push a release tag to trigger `.github/workflows/publish.yml`
2. **Live testing** — test the full professor workflow end-to-end with a real Canvas course
3. **Dockerfile testing** — a Dockerfile exists and is committed but has not been tested in production
4. **SP10 (TBD)** — possible future sprints in `docs/superpowers/specs/2026-04-29-mcp-future-additions.md`

---

## Contacts

- **Kevin Rank** — professor at Boise State University, ITM department, `kevinrank@boisestate.edu`
- GitHub: `Ryfter/canvas-design-studio` (public), `Ryfter/canvas-design-studio-private` (private backup)
