# SP7 — Professor Philosophy KB: Design Spec

**Date:** 2026-05-07  
**Author:** Claude (claude-sonnet-4-6) via brainstorming skill  
**Project:** Canvas Design Studio MCP Server  
**Status:** Approved — ready for implementation planning

---

## Goal

Add a persistent, living teaching philosophy KB (`~/.canvas-design-mcp/professor-philosophy.md`) that steers every Canvas page Claude generates, critiques, or redesigns. The KB is built through a structured wizard interview, deepened over time through free-form additions (quotes, notes, Panopto-sourced statements), and loaded into Claude's context at the start of each session with a default-yes opt-in.

---

## Scope

Two new MCP tools: `get_philosophy_kb` and `update_philosophy_kb`

One modified file: `src/wizard.ts` — new philosophy phase at the end of the wizard

Description updates to four existing tools: `generate_canvas_page`, `critique_canvas_page`, `redesign_canvas_page`, `ingest_assignment_folder`

No new npm dependencies.

---

## KB File Format

Stored at `~/.canvas-design-mcp/professor-philosophy.md` alongside `institution.json`.

```markdown
# Professor Philosophy KB

## Core Teaching Philosophy

Narrative responses from the wizard interview. Professor-editable at any time.
This section applies to all courses and all content Claude generates.

[Interview answers stored here as free-form prose or bullet points]

## Course-Specific Focus

### [Course Number] — [Course Name]

Added when the wizard runs for a new course or when the professor tells Claude
to add course-specific context. Layered on top of Core — Claude applies both
when working on this course's content.

## Quotes & Aphorisms

Short statements the professor uses or believes in. These give Claude a direct
voice and vocabulary to draw from.

- "AI is an expertise multiplier. Without expertise, you produce zero quality."
- [More added via update_philosophy_kb or surfaced from Panopto captures]

## From Lecture Captures

Statements Claude surfaced from Panopto captions and the professor approved.
Stored with source video for traceability.

- "..." — [Video title, date]
```

### Section Rules

| Section | Built by | Inherited |
|---|---|---|
| Core Teaching Philosophy | Wizard interview | All courses |
| Course-Specific Focus | Wizard re-run or Claude conversation | Per course only |
| Quotes & Aphorisms | Free-form addition via `update_philosophy_kb` | All courses |
| From Lecture Captures | Panopto scan → professor approval | All courses |

---

## Wizard Integration

The philosophy phase is added at the **end of `runWizard()`** in `src/wizard.ts`, after the Panopto section. It follows the same `@inquirer/prompts` pattern (`input`, `confirm`).

### First Run (no KB exists)

```
Would you like to build your teaching philosophy KB now?
Claude uses it to tailor every Canvas page to your style.
You can skip and build it in Claude later. [Y/n]
```

If **yes**, Claude asks the 6 structured interview questions (one at a time via `input()` prompts). Answers are synthesized into the Core Teaching Philosophy section and saved to `professor-philosophy.md`.

If **no** (or skip), an empty template is saved — the file exists so future sessions know to offer the KB opt-in.

### Subsequent Runs (KB exists)

```
You already have a philosophy KB. Would you like to review it
or add course-specific focus for [Course Name]? [y/N]
```

If **yes**, the wizard shows a summary of the global section and asks if anything needs updating, then offers to add a course-specific section. If **no**, the phase is skipped.

### Interview Questions

Concrete, quotable prompts — designed to produce usable statements, not vague feelings:

1. What's one thing you always tell students about this subject that you wish they'd really internalize?
2. What does a student who truly gets it do differently from one who just completes the work?
3. What's the biggest mistake students make on your assignments?
4. What separates an A from a B in concrete terms?
5. Are there teaching frameworks you consciously draw from? (Bloom's, UDL, constructivism, andragogy, etc.)
6. Any quotes or sayings you use regularly in class?

---

## MCP Tools

### `get_philosophy_kb()`

**Input:** None

**Output:**
```typescript
interface GetPhilosophyKbResult {
  content: string;        // full professor-philosophy.md text
  exists: boolean;        // false = returned the empty template
  sections: {
    hasCore: boolean;
    hasCourseSpecific: boolean;
    hasQuotes: boolean;
    hasLectureCaptures: boolean;
  };
}
```

If no KB file exists, returns the empty template with interview questions embedded — so Claude knows what to ask on a first-time build even outside the wizard. Includes a hint at the top of the response:

> "Apply this philosophy when generating, critiquing, or redesigning Canvas pages for this professor."

**Session opt-in behavior:** At the start of any session where this tool has not yet been called, Claude asks: *"Want me to load your teaching philosophy KB? It helps me tailor pages to your style. [Y/n]"* Default is yes. Claude calls `get_philosophy_kb()` once per session and keeps the content in context.

---

### `update_philosophy_kb(entry, section, courseKey?)`

**Input:**
```typescript
interface UpdatePhilosophyKbInput {
  entry: string;                                            // content to add
  section: 'core' | 'course' | 'quotes' | 'lectures';     // which section
  courseKey?: string;                                       // required when section = 'course'
                                                            // e.g. "ITM 370 — AI Augmented Projects"
}
```

**Output:** Confirmation string with section and preview of what was added.

**Behavior:** Appends `entry` to the specified section. For `section: 'course'`, creates the course subsection if it doesn't exist yet. For `section: 'quotes'`, prepends a `- ` list item. Never overwrites existing content — always appends.

**Panopto scan flow:** This tool does NOT internally call Panopto. The Panopto scan is a multi-step Claude conversation:
1. Professor says "scan my lectures for philosophy material"
2. Claude calls `search_panopto_videos` and `fetch_panopto_captions` for relevant videos
3. Claude analyzes transcripts, surfaces candidate quotes and philosophy statements
4. Professor reviews candidates in conversation and approves specific ones
5. Claude calls `update_philosophy_kb(approved_statement, 'lectures')` for each approved entry

This keeps the tool simple (save only) and the judgment work in Claude.

---

## Wiring Into Existing Tools

Description updates only — no logic changes to existing tool handlers. Claude applies the philosophy naturally once it's in context.

| Tool | Description addition |
|---|---|
| `generate_canvas_page` | "If professor philosophy KB is in context, apply the professor's tone, framing, and pedagogical emphasis preferences when generating content." |
| `critique_canvas_page` | "If professor philosophy KB is in context, evaluate the page against the professor's stated standards and teaching philosophy." |
| `redesign_canvas_page` | "If professor philosophy KB is in context, redesign toward the professor's aesthetic and pedagogical preferences." |
| `ingest_assignment_folder` | "If professor philosophy KB is in context, apply it when generating the page and note any alignment between the assignment materials and the professor's philosophy." |

---

## Architecture

### New Files

| File | Responsibility |
|---|---|
| `src/tools/philosophy.ts` | `getPhilosophyKb()`, `updatePhilosophyKb()`, file I/O, path constants, empty template string |
| `tests/philosophy.test.ts` | Unit + integration tests |
| `tests/fixtures/philosophy/` | Fixture files: empty KB, partial KB, full KB with all four sections |

### Modified Files

| File | What changes |
|---|---|
| `src/wizard.ts` | Add philosophy phase after Panopto section — interview questions, skip logic, KB file write |
| `src/index.ts` | Import `getPhilosophyKb`, `updatePhilosophyKb`; register tools; add handlers; update 4 existing tool descriptions |

### Internal Design of `src/tools/philosophy.ts`

```
PHILOSOPHY_KB_PATH = path.join(os.homedir(), '.canvas-design-mcp', 'professor-philosophy.md')

getPhilosophyKb()
  ├── check if PHILOSOPHY_KB_PATH exists
  ├── if exists: read and return content + section presence flags
  └── if not exists: return PHILOSOPHY_TEMPLATE + exists: false

updatePhilosophyKb(input)
  ├── validate: section = 'course' requires courseKey
  ├── read existing KB (or create from template if missing)
  ├── locate the target section heading
  ├── append entry after the last item in that section
  └── write back to PHILOSOPHY_KB_PATH

PHILOSOPHY_TEMPLATE = (the empty four-section markdown structure with interview questions embedded in Core)
```

`src/wizard.ts` calls `updatePhilosophyKb` (or a simpler `savePhilosophyKb(content: string)` write helper) directly — it assembles the Core section from interview answers and writes it in one call rather than one call per answer.

---

## Error Handling

| Condition | Behavior |
|---|---|
| No KB file | `get_philosophy_kb` returns template silently — `exists: false`, not an error |
| `section: 'course'` with no `courseKey` | `isError: true`, message: "courseKey is required when section is 'course' — provide the course name, e.g. 'ITM 370 — AI Augmented Projects'" |
| KB file unreadable/corrupted | `isError: true`, message instructs professor to run wizard again to rebuild |
| Panopto not configured when professor requests a lecture scan | Claude is informed in the `get_philosophy_kb` response (no lectures section yet); professor can add quotes manually instead |
| Professor skips wizard philosophy phase | Empty template saved — future sessions still offer KB opt-in, template shows interview questions |

---

## Test Scenarios (~12 new tests)

| Test | What it covers |
|---|---|
| `getPhilosophyKb` — no file | Returns template, `exists: false` |
| `getPhilosophyKb` — full file | Returns content, correct section flags |
| `getPhilosophyKb` — partial file (core only) | Returns content, `hasCourseSpecific: false` |
| `updatePhilosophyKb` — append to core | Content appears in correct section |
| `updatePhilosophyKb` — append to quotes | Formatted as list item with `- ` prefix |
| `updatePhilosophyKb` — append to course (new course) | Course subsection created |
| `updatePhilosophyKb` — append to course (existing course) | Appended to existing subsection, not duplicated |
| `updatePhilosophyKb` — append to lectures | Content appears in lectures section |
| `updatePhilosophyKb` — missing courseKey for course section | Returns error |
| `updatePhilosophyKb` — no existing file | Creates from template, then appends |
| Wizard philosophy phase — first run | KB file created with Core section populated |
| Wizard philosophy phase — existing KB | Offers review/update, does not overwrite |

---

## Design Alternatives

### Per-Assignment Reasoning (deferred)

Kevin mentioned a per-assignment reasoning file during brainstorming — something that explains the specific intent behind a particular assignment (beyond the brief and rubric). This was explicitly deferred: *"Let's just stick with global. I don't think this is the place to get more info on the per-assignment level."*

When revisiting: this would be an additional file in the `assignments/{id}/` ingest folder (e.g., `professor-notes.md`), picked up by `ingest_assignment_folder` and returned in `sources`. The ingest tool already has the right structure for this; it would be a small addition.

### Single Combined Tool

A single `philosophy_kb(action: 'get' | 'update', ...)` tool instead of two separate tools. Rejected in favor of two tools for discoverability — the professor and Claude should be able to find `get_philosophy_kb` and `update_philosophy_kb` independently without needing to know the action parameter convention.
