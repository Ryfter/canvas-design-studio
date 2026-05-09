# SP9 — Assignment Improvement Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `load_canvas_page` and `save_canvas_page` MCP tools so Claude can read HTML from `output/` and write improved versions back with automatic `.bak` backup.

**Architecture:** Two new functions in `src/tools/page-io.ts` following the same optional-path-for-testability pattern as `personas.ts`. Both throw on error so the outer try/catch in `src/index.ts` returns `isError: true` automatically. All file I/O uses Node built-ins — no new dependencies.

**Tech Stack:** TypeScript 5 strict ESM, Node.js `fs`/`path` built-ins, Vitest for tests. All imports use `.js` extensions (ESM requirement).

---

## Why These Tools Exist (Cold-Start Context)

This is an MCP server that gives Claude tools to generate, critique, and publish Canvas LMS assignment pages. By SP8, Claude can generate a page (`generate_canvas_page`), critique it (`critique_canvas_page`), apply 2 mechanical fixes (`redesign_canvas_page`), and review it through student persona lenses (`get_student_personas`). But Claude had no way to read the HTML file back from `output/` or write an improved version to disk — it could only generate fresh pages. These two tools close that loop.

The pattern used throughout this codebase: functions throw `Error` with descriptive messages; the `CallToolRequestSchema` handler in `src/index.ts` has a top-level `try/catch` that catches all errors and returns `{ isError: true }`. So tool functions never return error objects — they throw.

---

## File Map

```
src/tools/page-io.ts          ← CREATE: loadCanvasPage, saveCanvasPage, 4 exported types
tests/page-io.test.ts         ← CREATE: 10 tests (5 load + 5 save)
src/index.ts                  ← MODIFY: 2 imports, 2 tool descriptors, 2 handlers
AGENTS.md                     ← MODIFY: status, layout, tool list, SP9 sprint entry
docs/handoff-to-Claude.md     ← MODIFY: SP9 handoff section
docs/technical-roadmap.md     ← MODIFY: SP9 row
docs/feature-roadmap.md       ← MODIFY: v0.9 section
```

---

## Task 1: `page-io.ts` foundation + `loadCanvasPage` + 5 load tests

**Why this task first:** TDD — write the failing tests, then implement. `saveCanvasPage` is kept in a separate task so each task stays focused on one function.

**Files:**
- Create: `src/tools/page-io.ts`
- Create: `tests/page-io.test.ts`

---

- [ ] **Step 1: Write the failing load tests**

Create `tests/page-io.test.ts` with this content:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCanvasPage } from '../src/tools/page-io.js';

// Use tmpdir() so tests never touch the real output/ directory.
// Same pattern as personas.test.ts which uses tmpdir() for the personas file path.
const TEST_OUTPUT = join(tmpdir(), 'canvas-design-test-output');

function cleanup() {
  if (existsSync(TEST_OUTPUT)) {
    rmSync(TEST_OUTPUT, { recursive: true, force: true });
  }
}

beforeEach(cleanup);
afterEach(cleanup);

describe('loadCanvasPage', () => {
  it('reads a named file and returns html + filename', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    writeFileSync(join(TEST_OUTPUT, 'test.html'), '<p>Hello</p>', 'utf-8');
    const result = loadCanvasPage({ filename: 'test.html' }, TEST_OUTPUT);
    expect(result.html).toBe('<p>Hello</p>');
    expect(result.filename).toBe('test.html');
  });

  it('auto-selects the most recently modified file when no filename given', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    const olderPath = join(TEST_OUTPUT, 'old.html');
    const newerPath = join(TEST_OUTPUT, 'new.html');
    writeFileSync(olderPath, '<p>old</p>', 'utf-8');
    writeFileSync(newerPath, '<p>new</p>', 'utf-8');
    // utimesSync forces an explicit mtime difference regardless of filesystem resolution.
    // Without this, both files can get the same mtime on fast machines.
    const now = new Date();
    const past = new Date(Date.now() - 5000);
    utimesSync(olderPath, past, past);
    utimesSync(newerPath, now, now);
    const result = loadCanvasPage({}, TEST_OUTPUT);
    expect(result.html).toBe('<p>new</p>');
    expect(result.filename).toBe('new.html');
  });

  it('throws when output/ directory does not exist', () => {
    expect(() => loadCanvasPage({}, TEST_OUTPUT)).toThrow('output/ directory not found');
  });

  it('throws when output/ exists but contains no .html files', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    writeFileSync(join(TEST_OUTPUT, 'readme.txt'), 'not html', 'utf-8');
    expect(() => loadCanvasPage({}, TEST_OUTPUT)).toThrow('No HTML files found');
  });

  it('throws when named file does not exist', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    expect(() => loadCanvasPage({ filename: 'missing.html' }, TEST_OUTPUT)).toThrow('File not found');
  });
});
```

- [ ] **Step 2: Run tests to verify they all fail**

```
npm test -- page-io
```

Expected: 5 FAIL, reason: `loadCanvasPage` is not defined.

- [ ] **Step 3: Write `loadCanvasPage` in `src/tools/page-io.ts`**

Create `src/tools/page-io.ts` with this content:

```typescript
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

// All four types are exported because src/index.ts needs them for type-casting args.
// Co-located here (not in src/types.ts) because they're only used by this file + index.ts.
export interface LoadCanvasPageInput { filename?: string }
export interface LoadCanvasPageResult { html: string; filename: string }
export interface SaveCanvasPageInput { html: string; filename: string }
export interface SaveCanvasPageResult { saved: string; backup: string | null }

// Resolves relative to wherever the professor runs the server — same convention as ingest/.
export const OUTPUT_DIR = join(process.cwd(), 'output');

// outputDir is a parameter (not hardcoded) so tests can pass tmpdir() instead of polluting
// the real output/ directory. Same testability pattern as personas.ts (personasPath param).
export function loadCanvasPage(input: LoadCanvasPageInput, outputDir = OUTPUT_DIR): LoadCanvasPageResult {
  if (!existsSync(outputDir)) {
    throw new Error('output/ directory not found. Generate a page first with generate_canvas_page.');
  }

  if (input.filename) {
    const filePath = join(outputDir, input.filename);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: output/${input.filename}`);
    }
    try {
      const html = readFileSync(filePath, 'utf-8');
      return { html, filename: input.filename };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Cannot read file: ${message}`);
    }
  }

  // Auto-select: scan for .html files, sort by mtime descending, pick first.
  const htmlFiles = readdirSync(outputDir).filter(f => f.endsWith('.html'));
  if (htmlFiles.length === 0) {
    throw new Error('No HTML files found in output/. Generate a page first with generate_canvas_page.');
  }

  const sorted = htmlFiles
    .map(f => ({ name: f, mtime: statSync(join(outputDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const filename = sorted[0].name;
  try {
    const html = readFileSync(join(outputDir, filename), 'utf-8');
    return { html, filename };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read file: ${message}`);
  }
}
```

Note: `saveCanvasPage` will be added in Task 2. The `SaveCanvasPageInput/Result` types are defined here now so the file doesn't need to be touched again for types in Task 2.

- [ ] **Step 4: Run tests to verify load tests pass**

```
npm test -- page-io
```

Expected: 5 PASS.

- [ ] **Step 5: Commit**

```
git add src/tools/page-io.ts tests/page-io.test.ts
git commit -m "feat(sp9): add loadCanvasPage + 5 load tests"
```

---

## Task 2: `saveCanvasPage` + 5 save tests

**Why separate from Task 1:** Keeps each task focused on one function, and the save implementation is meaningfully different (needs backup logic, directory creation, copyFileSync) from load.

**Files:**
- Modify: `src/tools/page-io.ts` (add `saveCanvasPage`)
- Modify: `tests/page-io.test.ts` (add save import + 5 save tests)

---

- [ ] **Step 1: Add failing save tests to `tests/page-io.test.ts`**

The existing import line:
```typescript
import { loadCanvasPage } from '../src/tools/page-io.js';
```

Replace with:
```typescript
import { loadCanvasPage, saveCanvasPage } from '../src/tools/page-io.js';
```

Add this import to the existing imports at the top (add `readFileSync` to the `node:fs` import):
```typescript
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, utimesSync } from 'node:fs';
```

Append to the end of `tests/page-io.test.ts` (after the `loadCanvasPage` describe block):

```typescript
describe('saveCanvasPage', () => {
  it('writes a new file and returns null backup when no prior file exists', () => {
    // TEST_OUTPUT is wiped in beforeEach — saveCanvasPage must create the directory itself.
    // This tests the mkdirSync({ recursive: true }) path.
    const result = saveCanvasPage({ html: '<p>Hello</p>', filename: 'new.html' }, TEST_OUTPUT);
    expect(existsSync(join(TEST_OUTPUT, 'new.html'))).toBe(true);
    expect(readFileSync(join(TEST_OUTPUT, 'new.html'), 'utf-8')).toBe('<p>Hello</p>');
    expect(result.backup).toBeNull();
    expect(result.saved).toContain('new.html');
  });

  it('backs up existing file then writes improved version', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    writeFileSync(join(TEST_OUTPUT, 'page.html'), '<p>original</p>', 'utf-8');
    const result = saveCanvasPage({ html: '<p>improved</p>', filename: 'page.html' }, TEST_OUTPUT);
    expect(readFileSync(join(TEST_OUTPUT, 'page.html'), 'utf-8')).toBe('<p>improved</p>');
    expect(readFileSync(join(TEST_OUTPUT, 'page.html.bak'), 'utf-8')).toBe('<p>original</p>');
    expect(result.backup).not.toBeNull();
    expect(result.saved).toContain('page.html');
  });

  it('overwrites existing .bak with the latest pre-save version', () => {
    // Simulates: page was saved once (creating .bak=v1), now being saved again.
    // After the second save, .bak should hold v2 (the version just before this save),
    // not the original v1.
    mkdirSync(TEST_OUTPUT, { recursive: true });
    writeFileSync(join(TEST_OUTPUT, 'page.html'), '<p>v2</p>', 'utf-8');
    writeFileSync(join(TEST_OUTPUT, 'page.html.bak'), '<p>v1</p>', 'utf-8');
    saveCanvasPage({ html: '<p>v3</p>', filename: 'page.html' }, TEST_OUTPUT);
    expect(readFileSync(join(TEST_OUTPUT, 'page.html.bak'), 'utf-8')).toBe('<p>v2</p>');
    expect(readFileSync(join(TEST_OUTPUT, 'page.html'), 'utf-8')).toBe('<p>v3</p>');
  });

  it('throws when html is empty', () => {
    expect(() => saveCanvasPage({ html: '', filename: 'page.html' }, TEST_OUTPUT)).toThrow('html must not be empty');
  });

  it('throws when filename is empty', () => {
    expect(() => saveCanvasPage({ html: '<p>hi</p>', filename: '' }, TEST_OUTPUT)).toThrow('filename must not be empty');
  });
});
```

- [ ] **Step 2: Run tests to verify the 5 save tests fail**

```
npm test -- page-io
```

Expected: 5 PASS (load tests) + 5 FAIL (save tests). Fail reason: `saveCanvasPage` is not defined.

- [ ] **Step 3: Add `saveCanvasPage` to `src/tools/page-io.ts`**

Append to the end of `src/tools/page-io.ts` (after the closing brace of `loadCanvasPage`):

```typescript
// outputDir parameter follows the same testability pattern as loadCanvasPage.
// mkdirSync({ recursive: true }) is used so the professor doesn't need to pre-create output/.
// Backup is written before the original is touched — the original is never clobbered
// unless copyFileSync succeeds. This protects against partial writes during errors.
export function saveCanvasPage(input: SaveCanvasPageInput, outputDir = OUTPUT_DIR): SaveCanvasPageResult {
  if (!input.html || !input.html.trim()) {
    throw new Error('html must not be empty');
  }
  if (!input.filename || !input.filename.trim()) {
    throw new Error('filename must not be empty');
  }

  mkdirSync(outputDir, { recursive: true });

  const filePath = join(outputDir, input.filename);
  const bakPath = join(outputDir, `${input.filename}.bak`);
  let backup: string | null = null;

  if (existsSync(filePath)) {
    try {
      copyFileSync(filePath, bakPath);
      backup = bakPath;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to write backup: ${message}`);
    }
  }

  writeFileSync(filePath, input.html, 'utf-8');
  return { saved: filePath, backup };
}
```

- [ ] **Step 4: Run all 10 tests to verify they pass**

```
npm test -- page-io
```

Expected: 10 PASS.

- [ ] **Step 5: Run the full test suite to verify no regressions**

```
npm test
```

Expected: 209 PASS (199 existing + 10 new). Zero failures.

- [ ] **Step 6: Commit**

```
git add src/tools/page-io.ts tests/page-io.test.ts
git commit -m "feat(sp9): add saveCanvasPage + 5 save tests — 209 total"
```

---

## Task 3: Register `load_canvas_page` and `save_canvas_page` in `src/index.ts`

**Why this is its own task:** Registration in `index.ts` is always a separate commit in this project. It touches a different file from the tool implementation and is the wiring step that makes tools visible to Claude.

**Files:**
- Modify: `src/index.ts`

---

- [ ] **Step 1: Add imports to `src/index.ts`**

Locate the existing last import block (currently ends with the personas import at line ~34):
```typescript
import { generateStudentPersonas, getStudentPersonas } from './tools/personas.js';
import type { GenerateStudentPersonasInput } from './tools/personas.js';
```

Add immediately after these two lines:
```typescript
import { loadCanvasPage, saveCanvasPage } from './tools/page-io.js';
import type { LoadCanvasPageInput, SaveCanvasPageInput } from './tools/page-io.js';
```

- [ ] **Step 2: Add tool descriptors to the `ListToolsRequestSchema` handler**

Find the `generate_student_personas` descriptor block (it is the last tool descriptor before the closing `]` of the tools array). It ends with a closing `},`. Add these two descriptors immediately after it, before the closing `]`:

```typescript
      {
        name: 'load_canvas_page',
        description: 'Load the most recently generated Canvas HTML page from output/ back into context. Use after critique_canvas_page or get_student_personas to retrieve the HTML you want to improve. Returns the HTML content and filename — pass the filename unchanged to save_canvas_page when done editing.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            filename: { type: 'string', description: 'Specific file to load from output/. If omitted, loads the most recently modified .html file.' },
          },
        },
      },
      {
        name: 'save_canvas_page',
        description: 'Save improved Canvas HTML back to output/, automatically creating a .bak backup of the previous version. Call this after editing the HTML loaded with load_canvas_page. The filename returned by load_canvas_page should be passed here unchanged.',
        inputSchema: {
          type: 'object' as const,
          required: ['html', 'filename'],
          properties: {
            html: { type: 'string', description: 'The full improved HTML to write to disk.' },
            filename: { type: 'string', description: 'Filename within output/ — use the filename returned by load_canvas_page.' },
          },
        },
      },
```

- [ ] **Step 3: Add handlers to the `CallToolRequestSchema` handler**

Find the `generate_student_personas` handler block. It ends with:
```typescript
      if (name === 'generate_student_personas') {
        const input = (args ?? {}) as GenerateStudentPersonasInput;
        const result = generateStudentPersonas(input);
        return { content: [{ type: 'text', text: result }] };
      }
```

Add the two new handlers immediately after it (before the `return { content: [{ type: 'text', text: \`Unknown tool: ${name}\` }], isError: true }` fallback):

```typescript
      if (name === 'load_canvas_page') {
        const { filename } = (args ?? {}) as LoadCanvasPageInput;
        const result = loadCanvasPage({ filename });
        return {
          content: [{
            type: 'text',
            text: `Loaded: ${result.filename}\n\n\`\`\`html\n${result.html}\n\`\`\``,
          }],
        };
      }

      if (name === 'save_canvas_page') {
        const { html, filename } = args as SaveCanvasPageInput;
        const result = saveCanvasPage({ html, filename });
        const lines = [`✓ Saved to ${result.saved}`];
        if (result.backup) lines.push(`  Backup created: ${result.backup}`);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
```

- [ ] **Step 4: Run the full test suite**

```
npm test
```

Expected: 209 PASS. Zero failures.

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```
npm run build
```

Expected: no errors. `dist/` updated.

- [ ] **Step 6: Commit**

```
git add src/index.ts
git commit -m "feat(sp9): register load_canvas_page and save_canvas_page in MCP server"
```

---

## Task 4: Docs update and push to GitHub

**Why docs are updated last:** Docs reflect the completed state. Updating them before the implementation risks inconsistency if anything changes. This task also includes the push to GitHub — post-push, Kevin can make the repo public and install live.

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/handoff-to-Claude.md`
- Modify: `docs/technical-roadmap.md`
- Modify: `docs/feature-roadmap.md`

**Note on memory:** `C:\Users\krank\.claude\projects\D--Dev-canvas-design-studio\memory\project-canvas-mcp-plan.md` must also be updated, but this file lives outside the repo. The controller agent (not a subagent) must update it. If you are a subagent, skip the memory file — flag it as a note in your completion message.

---

- [ ] **Step 1: Update `AGENTS.md`**

Make the following changes:

**Change the status line** (around line 15):
```
**Status:** SP1–SP8 complete | 199 tests passing | SP9 (TBD)
```
→
```
**Status:** SP1–SP9 complete | 209 tests passing
```

**Add `page-io.ts` to the repository layout** (in the `tools/` section, after `personas.ts`):
```
│       └── personas.ts                ← generate_student_personas, get_student_personas, dimension pools, weighted sampler
```
→
```
│       ├── personas.ts                ← generate_student_personas, get_student_personas, dimension pools, weighted sampler
│       └── page-io.ts                 ← load_canvas_page, save_canvas_page, output/ directory I/O with .bak backup
```

**Add `page-io.test.ts` to the tests layout** (after `personas.test.ts`):
```
│   └── personas.test.ts               ← 11 tests
```
→
```
│   ├── personas.test.ts               ← 11 tests
│   └── page-io.test.ts                ← 10 tests
```

**Update the testing conventions** passing test count:
```
- Current passing test count: **199**
```
→
```
- Current passing test count: **209**
```

**Add tools 17 and 18** to the "Current MCP Tools" section (after tool 16 `generate_student_personas`):

```markdown
### 17. `load_canvas_page`
Load the most recently generated Canvas HTML page from `output/` back into context. If `filename` is omitted, picks the most recently modified `.html` file by mtime. Returns `{ html, filename }` — the filename should be passed unchanged to `save_canvas_page`.

**Input:** `filename?` (string)

### 18. `save_canvas_page`
Save improved Canvas HTML back to `output/`, automatically creating a `.bak` backup of the previous version. If no prior file exists, writes directly with `backup: null`. The original is never clobbered until the backup write succeeds.

**Input:** `html` (string), `filename` (string — use filename from `load_canvas_page`)

**Output:** `{ saved: string, backup: string | null }`
```

**Add SP9 entry** to the "Completed Sprints" section (after the SP8 entry):

```markdown
### SP9 — Assignment Improvement Loop (complete, 2026-05-09)
`load_canvas_page`, `save_canvas_page`. File I/O tools that close the editing loop after critique and persona review. `load_canvas_page` reads from `output/` (auto-selects most recent by mtime if no filename given). `save_canvas_page` auto-creates `output/`, writes `.bak` backup before overwriting. 10 new tests. Total: **209 passing**.

Key implementation details:
- Both functions accept `outputDir = OUTPUT_DIR` parameter for testability — tests pass `tmpdir()` to avoid touching `output/`
- `.bak` is written before the original is touched: if `copyFileSync` fails, the original is unchanged and an error is thrown
- `utimesSync` used in the mtime auto-select test to force an explicit time difference — filesystem resolution can be <1ms on fast machines
- `mkdirSync(outputDir, { recursive: true })` in `saveCanvasPage` — professors may not have an `output/` directory yet
```

- [ ] **Step 2: Append SP9 section to `docs/handoff-to-Claude.md`**

Read the file first. Append to the end:

```markdown
---

## SP9 — Assignment Improvement Loop (2026-05-09)

### What Was Built

Two new MCP tools: `load_canvas_page` (reads from `output/`, auto-selects most recent `.html` by mtime) and `save_canvas_page` (writes `.bak` before overwriting). Closes the editing loop so Claude can apply critique and persona findings directly to output files rather than only generating fresh pages.

### New Files
- `src/tools/page-io.ts` — `loadCanvasPage`, `saveCanvasPage`, 4 exported types
- `tests/page-io.test.ts` — 10 tests

### Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| `outputDir` as optional parameter | Yes (default `OUTPUT_DIR = join(cwd(), 'output')`) | Same testability pattern as `personas.ts` — tests pass `tmpdir()`, no mocking needed |
| `.bak` written before original clobber | Yes — `copyFileSync` before `writeFileSync` | Original is never lost if backup fails |
| One `.bak` per file (overwrites) | Yes | Sufficient for MVP; professor can restore one version back |
| Auto-create `output/` on save | Yes — `mkdirSync({ recursive: true })` | Professor may not have pre-created the directory |
| `utimesSync` in mtime test | Yes | Filesystem resolution <1ms on fast machines; explicit `utimesSync` guarantees ordering |

### Post-SP9: Publishing

Kevin makes the repo public and installs live:
```bash
gh repo edit --visibility public
cd canvas-design-studio && npm link
```
Then add to Claude Desktop config: `"canvas-design-mcp": "canvas-design-mcp"`.
```

- [ ] **Step 3: Update `docs/technical-roadmap.md` and `docs/feature-roadmap.md`**

**In `docs/technical-roadmap.md`:**
- Update the date at the top to `2026-05-09`
- Find the SP8 row in the status table and add SP9 after it:
  ```
  | SP9 | load_canvas_page, save_canvas_page | Done ✅ | 10 new tests. 209 total. |
  ```
- Append a **SP9 Technical Context** section (model it after the SP8 section):
  ```markdown
  ### SP9 Technical Context
  
  `src/tools/page-io.ts` uses the same optional-path-for-testability pattern as `philosophy.ts` and `personas.ts` — all file I/O functions accept `outputDir = OUTPUT_DIR` as a second argument so tests can pass `os.tmpdir()` without mocking `node:fs`.
  
  `saveCanvasPage` writes the `.bak` via `copyFileSync` before calling `writeFileSync`. This sequencing means the original file is never modified if the backup write fails.
  
  `loadCanvasPage` auto-selection sorts by `statSync().mtimeMs` descending. Tests use `utimesSync` to force mtime ordering — without it, files written milliseconds apart can have identical mtimes on some filesystems.
  ```

**In `docs/feature-roadmap.md`:**
- Update the date at the top to `2026-05-09`
- Find the v0.8 section and add v0.9 after it:
  ```markdown
  ### v0.9 — Assignment Improvement Loop
  
  | Feature | Description |
  |---|---|
  | `load_canvas_page` | Reads the most recently generated page from `output/` back into context (or a named file). Returns HTML + filename for passing to save. |
  | `save_canvas_page` | Writes improved HTML back to `output/` with automatic `.bak` backup of the previous version. Original is never clobbered until backup succeeds. |
  ```
- Update the "Coming Next" section to reflect post-SP9 state:
  ```
  No additional sprints are currently specified. After SP9, the package will be published via `gh repo edit --visibility public`.
  ```

- [ ] **Step 4: Run tests one final time to confirm everything is green**

```
npm test
```

Expected: 209 PASS.

- [ ] **Step 5: Commit docs**

```
git add AGENTS.md docs/handoff-to-Claude.md docs/technical-roadmap.md docs/feature-roadmap.md
git commit -m "docs: SP9 complete — 209 tests, load/save canvas page tools documented"
```

- [ ] **Step 6: Push to GitHub**

```
git push
```

Expected: push succeeds. Confirm with `git log --oneline -5`.

- [ ] **Step 7: Report completion to controller agent**

Report back with:
- Final commit SHAs for all SP9 commits (3 implementation commits + 1 docs commit)
- Confirmation that 209 tests pass
- Reminder: memory file `C:\Users\krank\.claude\projects\D--Dev-canvas-design-studio\memory\project-canvas-mcp-plan.md` needs to be updated by the controller (not a subagent — it's outside the repo)
