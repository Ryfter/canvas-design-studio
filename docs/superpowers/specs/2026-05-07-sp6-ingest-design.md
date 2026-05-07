# SP6 — Assignment Folder Ingest: Design Spec

**Date:** 2026-05-07  
**Author:** Claude (claude-sonnet-4-6) via brainstorming skill  
**Project:** Canvas Design Studio MCP Server  
**Status:** Approved — ready for implementation planning

---

## Goal

Add a single MCP tool — `ingest_assignment_folder` — that reads a professor's assignment materials from a folder, generates Canvas-safe HTML, and returns the raw source content so Claude can surface structured feedback on brief clarity, rubric alignment, and shell completeness.

---

## Scope

One new MCP tool: `ingest_assignment_folder`

No new accessibility checks. No new wizard prompts. No new config fields. No new npm dependencies.

---

## Folder Conventions

The tool supports two folder layouts. The same tool, same input schema, same inheritance logic handles both.

### Simple Mode — `ingest/` (default)

Professor uses the existing `ingest/` folder at the project root. No path needed.

```
ingest/
├── course-config.md       ← REQUIRED: institution, professor, course info
├── assignment-brief.md    ← REQUIRED: raw assignment instructions
├── rubric.md              ← optional: grading rubric
├── shell.md               ← optional: rough page outline or structure notes
└── style-notes.md         ← optional: layout, tone, hero image preferences
```

### Advanced Mode — `assignments/{id}/`

Professor creates subfolders per assignment or assignment group. Rubric and shell can be shared at the group level and inherited by individual assignments.

```
assignments/
├── course-config.md                    ← shared; per-folder override wins field-by-field
├── ai-challenge/                       ← assignment group
│   ├── rubric.md                       ← inherited by all weeks
│   ├── shell.md                        ← inherited by all weeks
│   ├── week-01/
│   │   ├── assignment-brief.md         ← required; not inherited
│   │   └── style-notes.md              ← optional; not inherited
│   └── week-02/
│       ├── assignment-brief.md
│       └── style-notes.md
└── ignite-talk/                        ← standalone assignment
    ├── course-config.md                ← overrides shared values for this assignment
    ├── rubric.md
    ├── shell.md
    ├── assignment-brief.md
    └── style-notes.md
```

---

## Inheritance Rules

| File | Search behavior |
|---|---|
| `assignment-brief.md` | Target folder only — never inherited (content is per-assignment) |
| `style-notes.md` | Target folder only — never inherited (layout preferences are per-assignment) |
| `rubric.md` | Target folder first; walk up to `assignments/` root if not found; absent = no rubric |
| `shell.md` | Target folder first; walk up to `assignments/` root if not found; absent = generate from scratch |
| `course-config.md` | Walk up to root; per-folder values override shared values field-by-field |

Walk stops when the current directory is a direct child of the project root — i.e., when the directory being checked is named `assignments` or `ingest`. The tool never walks above that boundary. In practice: for `assignments/ai-challenge/week-01/`, the walk visits `week-01/` → `ai-challenge/` → `assignments/` and stops. It does not look in the project root or above.

---

## Input Schema

```typescript
interface IngestAssignmentFolderInput {
  folderPath?: string;   // relative to CWD; defaults to "ingest/"
}
```

The professor's typical prompt is: *"Build the Canvas page for assignments/ai-challenge/week-01."* Claude calls the tool with `{ folderPath: "assignments/ai-challenge/week-01" }`.

---

## Output Schema

```typescript
interface IngestAssignmentFolderResult {
  html: string;                  // Canvas-safe HTML, ready to paste or publish
  filename: string;              // derived from courseNumber + assignmentNumber, e.g. "itm370-16.06-ignite-talk-page.html"
  heroImagePrompt?: string;      // ChatGPT image prompt when a hero image is needed
  courseInfo: {
    institution: string;
    professor: string;
    courseNumber: string;
    courseName: string;
    assignmentNumber: string;
    semester: string;
  };
  sources: {
    brief: string;               // raw text of assignment-brief.md
    rubric?: string;             // raw text of rubric.md (may be inherited)
    shell?: string;              // raw text of shell.md (may be inherited)
    styleNotes?: string;         // raw text of style-notes.md
    sourceMap: {                 // resolved path of each file (for transparency)
      courseConfig: string;      // e.g. "assignments/course-config.md"
      brief: string;             // e.g. "assignments/ai-challenge/week-01/assignment-brief.md"
      rubric?: string;           // e.g. "assignments/ai-challenge/rubric.md"
      shell?: string;
      styleNotes?: string;
    };
  };
  warnings: string[];            // unfilled placeholders, missing optional files, a11y issues
}
```

---

## What Claude Does With `sources`

No Anthropic API call is made from the server. Claude is already the MCP host — it reads the full tool response including `sources`. After the tool returns, Claude naturally surfaces:

- **Brief review:** Is the brief student-friendly? Is submission format, due date context, or audience framing missing?
- **Rubric alignment:** Do the rubric criteria match what the brief actually asks students to produce? Are any criteria ambiguous or absent?
- **Shell fidelity:** If a shell was used, were any sections dropped or significantly changed during generation?

The `sources` object gives Claude the raw material to do this analysis without any additional tool calls.

---

## Shell Handling

When `shell.md` is present, its raw text is passed to the generation engine as a structural guide — equivalent to a detailed `styleNotes` entry. The engine uses the shell's section structure as a starting point rather than generating page structure from scratch. The shell text is also returned in `sources.shell` so Claude can compare the intended structure against the generated HTML.

Shell files may contain:
- Rough Markdown outlines ("## Overview, ## Requirements, ## Rubric")
- Partial Canvas HTML (will be used as structural reference, not pasted verbatim)
- Free-form notes ("start with a hero, then three columns: overview, deliverables, resources")

---

## Course Config Resolution

`course-config.md` uses a field-level merge: the tool reads all `course-config.md` files it finds while walking up the tree, then merges them. The closest (most specific) file wins on any field that it defines. Fields absent from the per-assignment file fall back to the shared file. A field set to blank in a per-assignment file does NOT override the shared value — blank is treated as "not set."

Required fields: `institution`, `professor`, `courseNumber`, `courseName`, `assignmentNumber`, `semester`.

If any required field is missing or still contains `[placeholder]` text after merging, the tool returns `isError: true` with a list of the missing/unfilled fields. Generation does not proceed.

---

## Error Handling

| Condition | Behavior |
|---|---|
| `assignment-brief.md` not found in target folder | `isError: true`, message names the folder searched |
| `course-config.md` not found anywhere in tree | `isError: true` |
| Required config field missing or contains `[placeholder]` | `isError: true`, lists each bad field |
| Target folder does not exist | `isError: true` |
| Unfilled placeholder in brief text (e.g. `[Your Name]`) | Added to `warnings[]`; generation continues |
| Missing optional files (rubric, shell, style-notes) | Noted in `warnings[]` only if absence is worth flagging; generation continues |

---

## Architecture

### New Files

| File | Responsibility |
|---|---|
| `src/tools/ingest.ts` | File discovery, tree-walk, course config merge, HTML assembly, `ingestAssignmentFolder()` |
| `tests/ingest.test.ts` | Fixture-based unit tests |
| `tests/fixtures/ingest/` | Pre-built folder trees for each test scenario |

### Modified Files

| File | What changes |
|---|---|
| `src/index.ts` | Import `ingestAssignmentFolder`; register `ingest_assignment_folder` tool and handler |

### Internal Design of `src/tools/ingest.ts`

```
ingestAssignmentFolder(input)
  ├── resolveFolderPath(input.folderPath)        // resolve relative to CWD, validate exists
  ├── discoverFiles(folderPath)                  // tree-walk with inheritance rules above
  │     ├── findBrief(folderPath)                // target folder only; error if missing
  │     ├── findFileWithInheritance('rubric.md') // walk up; null if not found
  │     ├── findFileWithInheritance('shell.md')
  │     ├── findStyleNotes(folderPath)           // target folder only; null if missing
  │     └── findCourseConfig(folderPath)         // walk up + merge
  ├── validateCourseConfig(config)               // required fields + placeholder check
  ├── assembleSources(files)                     // read file contents, build sourceMap
  ├── generateHtml(courseInfo, sources)          // calls generateCanvasPage() internals
  └── return IngestAssignmentFolderResult
```

`generateHtml` reuses the same design engine functions that `generateCanvasPage` calls — it does not call the `generate_canvas_page` MCP tool (tool-to-tool calling is not how MCP works). The shell content, if present, is passed as part of the `styleNotes` context to the generation step.

---

## Test Scenarios

Fixture folders live in `tests/fixtures/ingest/`. Each is a real directory tree — no mocking needed for file reads.

| Scenario | Fixture folder | What it tests |
|---|---|---|
| Simple mode — brief only | `fixtures/ingest/simple-brief-only/` | Minimal valid ingest folder |
| Simple mode — all files | `fixtures/ingest/simple-full/` | Brief + rubric + shell + style-notes |
| Advanced — flat assignment | `fixtures/ingest/advanced-flat/` | Single assignment folder, own rubric + shell |
| Advanced — group inheritance | `fixtures/ingest/advanced-group/` | Week folder inherits rubric + shell from parent |
| Advanced — per-folder config override | `fixtures/ingest/advanced-config-override/` | Per-assignment course-config.md wins over shared |
| Error — missing brief | `fixtures/ingest/error-no-brief/` | Returns isError: true |
| Error — placeholder in config | `fixtures/ingest/error-placeholder-config/` | Returns isError: true, lists bad fields |
| Error — missing required config field | `fixtures/ingest/error-missing-config-field/` | Returns isError: true |
| Warning — placeholder in brief | `fixtures/ingest/warn-placeholder-brief/` | Generates HTML, adds to warnings[] |

---

## MCP Tool Registration

**Tool name:** `ingest_assignment_folder`

**Description:**
> Read assignment materials from a folder and generate a Canvas-safe HTML page. Supports simple mode (ingest/ folder) and advanced mode (assignments/{id}/ subfolders with shared rubric and shell inheritance). Returns the generated HTML alongside the raw source content so Claude can review brief clarity, rubric alignment, and shell completeness.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "folderPath": {
      "type": "string",
      "description": "Path to the assignment folder, relative to the project root. Defaults to 'ingest/' if omitted. For advanced mode, point at a specific assignment subfolder (e.g., 'assignments/ai-challenge/week-01')."
    }
  }
}
```

---

## Design Alternatives

See `docs/design-alternatives.md` for full notes on:
- **Approach B** (read tool + reuse existing generate tool) — extensive notes on when/why to revisit
- **Simple mode rubric/shell parity** — whether to explicitly suppress rubric analysis in simple mode
