# SP9 — Assignment Improvement Loop: Design Spec

**Date:** 2026-05-09
**Status:** Approved

---

## What We're Building

Two new MCP tools — `load_canvas_page` and `save_canvas_page` — that give Claude file I/O access to the `output/` directory.

**The gap they fill:** After `critique_canvas_page` or `get_student_personas` builds up improvement context in Claude's reasoning, there's currently no way to read the existing HTML back into context (if not already there) or write an improved version back to disk. `redesign_canvas_page` only auto-fixes 2 mechanical issues (font floor, hero URL); everything else is left to Claude verbally. SP9 closes the loop so Claude can actually apply its suggestions.

**End-to-end professor workflow:**
1. Professor already has a generated page in `output/` (from SP1/SP6)
2. Professor calls `critique_canvas_page` and/or loads `get_student_personas` context
3. Claude calls `load_canvas_page` to get the current HTML
4. Claude edits the HTML in reasoning, applying critique/persona findings
5. Claude calls `save_canvas_page` to write the improved version back (auto-backup included)

---

## Architecture

**New file:** `src/tools/page-io.ts`
- Exports `loadCanvasPage` and `saveCanvasPage`
- No external dependencies beyond Node's built-in `fs` and `path`
- `output/` resolves relative to `process.cwd()` — same convention as `ingest/`

**Modified:** `src/index.ts`
- Two new tool descriptors (`load_canvas_page`, `save_canvas_page`)
- Two new handlers
- Follows existing registration pattern (import → descriptor → handler)

**New test file:** `tests/page-io.test.ts`
- Fixture-based, uses `os.tmpdir()` as the output directory (same pattern as `personas.test.ts`)
- ~10 new tests → total moves from 199 to ~209

---

## Tool Contracts

### `load_canvas_page`

**Input:**
```ts
{
  filename?: string   // optional: specific file name within output/
}
```

**Behavior:**
- If `filename` is provided: reads `output/<filename>`
- If `filename` is omitted: scans `output/` for all `.html` files, picks the one with the highest `mtime` (most recently modified)
- Always returns `filename` in the result so Claude can pass it directly to `save_canvas_page` without guessing

**Output:**
```ts
{
  html: string       // full HTML content of the file
  filename: string   // the file that was loaded (useful when auto-selected)
}
```

**Errors (all return `isError: true`):**
- `output/` directory doesn't exist → `"output/ directory not found. Generate a page first with generate_canvas_page."`
- `output/` exists but contains no `.html` files → `"No HTML files found in output/. Generate a page first with generate_canvas_page."`
- Named `filename` not found → `"File not found: output/<filename>"`
- File read fails → `"Cannot read file: <OS message>"`

---

### `save_canvas_page`

**Input:**
```ts
{
  html: string       // the improved HTML to write
  filename: string   // must match a file in output/ or a new filename
}
```

**Behavior:**
- Auto-creates `output/` directory if it doesn't exist (using `mkdirSync` with `recursive: true` — same pattern as `ensureDir` in `personas.ts`)
- If `output/<filename>` already exists: copies it to `output/<filename>.bak` first, then writes new HTML
- If `output/<filename>` does not yet exist (first write): writes directly, `backup` is `null`
- `.bak` is best-effort and safe: if the backup write fails, the original is left untouched and the tool returns `isError: true` — the original is never clobbered until the backup succeeds
- If `output/<filename>.bak` already exists from a prior save: it is overwritten with the latest pre-save version (only one backup kept per file)

**Output:**
```ts
{
  saved: string          // full path of the written file
  backup: string | null  // full path of the .bak file, or null if no prior file existed
}
```

**Errors (all return `isError: true`):**
- `html` is empty or blank → `"html must not be empty"`
- `filename` is empty or blank → `"filename must not be empty"`
- Backup write fails → `"Failed to write backup: <OS message>"` (original untouched)
- File write fails → propagate OS error

---

## File Structure

```
src/tools/page-io.ts          ← new: loadCanvasPage, saveCanvasPage, types
tests/page-io.test.ts         ← new: ~10 tests
src/index.ts                  ← modified: 2 new tool descriptors + handlers
```

Types defined in `page-io.ts` (not in `src/types.ts` — kept co-located since they're only used here):
```ts
export interface LoadCanvasPageInput { filename?: string }
export interface LoadCanvasPageResult { html: string; filename: string }
export interface SaveCanvasPageInput { html: string; filename: string }
export interface SaveCanvasPageResult { saved: string; backup: string | null }
```

---

## Test Plan (~10 tests)

| Test | What it covers |
|---|---|
| load: named file | reads correct HTML content |
| load: most-recent auto-select | picks highest mtime when 2 files exist |
| load: output/ dir missing | returns isError |
| load: output/ dir empty (no .html) | returns isError |
| load: named file not found | returns isError |
| save: new file (no prior) | writes HTML, backup is null |
| save: existing file | writes .bak then overwrites original |
| save: .bak already exists | overwrites .bak with latest pre-save version |
| save: empty html | returns isError |
| save: empty filename | returns isError |

---

## Path Resolution

`output/` resolves as `join(process.cwd(), 'output')`. This matches the `ingest/` convention used by `ingest_assignment_folder` — wherever the professor runs the MCP server from becomes the root. No new config entries in `~/.canvas-design-mcp/`.

---

## Post-SP9: Publishing

After SP9 merges, Kevin makes the GitHub repo public and tests the server live:

```bash
gh repo edit --visibility public
```

Install for live testing:
```bash
# Option A: local npm link
cd canvas-design-studio && npm link
# then add to Claude Desktop config as: "canvas-design-mcp": "canvas-design-mcp"

# Option B: npm package
npm install -g canvas-design-mcp
```

This is a manual post-merge step — no new MCP tools needed.

---

## What's Out of Scope

- Listing all files in `output/` (not needed — load auto-selects most recent)
- Deleting files from `output/` (not needed)
- Multiple backup versions (one `.bak` per file is sufficient)
- Diff/patch-based editing (Claude edits the full HTML in reasoning — cleaner than patch format)
- Any changes to `critique_canvas_page`, `redesign_canvas_page`, or `generate_canvas_page`
