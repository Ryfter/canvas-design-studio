# SP8 — Student Persona Review: Design Spec

**Date:** 2026-05-09
**Author:** Claude (claude-sonnet-4-6) via brainstorming skill
**Project:** Canvas Design Studio MCP Server
**Status:** Approved — ready for implementation planning

---

## Goal

Add a statistically grounded student persona review step that lets a professor get feedback on Canvas assignment instructions from realistic student perspectives before publishing. The step is entirely optional. Personas are generated once and saved for reuse across multiple assignment reviews; the professor is prompted to reuse or regenerate on each use.

---

## Scope

Two new MCP tools: `generate_student_personas` and `get_student_personas`

Description updates to two existing tools: `ingest_assignment_folder`, `critique_canvas_page`

No new npm dependencies.

---

## Persona Dimensions

23 dimensions sourced from `docs/Student-Personas.md` and `docs/AI-Personas-ideas_Student-Personas.csv`. Two dimensions use real statistical distributions; the other 21 draw from the CSV example pool.

### Statistically Weighted Dimensions

**Race/Ethnic Background** — cumulative probability table from `Student-Personas.md`:

| Cumulative | Race/Ethnic Background | Prevalence |
|---|---|---|
| 0.578 | White | 57.8% |
| 0.765 | Hispanic/Latino | 18.7% |
| 0.886 | Black | 12.1% |
| 0.945 | Asian | 5.9% |
| 0.956 | Native American | 1.1% |
| 0.958 | Native Pacific Islander | 0.2% |
| 0.969 | Mixed Race (White and Black) | 1.1% |
| 0.977 | Mixed Race (Asian and White) | 0.8% |
| 0.982 | Mixed Race (Native American and Hispanic/Latino) | 0.5% |
| 0.990 | Mixed Race (Black and Hispanic/Latino) | 0.8% |
| 0.996 | Mixed Race (Asian and Black) | 0.6% |
| 1.000 | Adopted (Choose race of student and family) | 0.4% |

**Learning Disabilities/Challenges** — cumulative probability table from `Student-Personas.md`:

| Cumulative | Disability/Challenge | Prevalence |
|---|---|---|
| 0.61 | None | 61% |
| 0.70 | ADHD | 9% |
| 0.76 | Dyslexia | 6% |
| 0.81 | Speech Impediment | 5% |
| 0.85 | Anxiety | 4% |
| 0.89 | Dysgraphia | 4% |
| 0.93 | Mild Dyslexia | 4% |
| 0.96 | Mild Anxiety | 3% |
| 0.98 | Visual Processing Disorder | 2% |
| 0.998 | Hearing Impairment | 1.8% |
| 1.000 | Memory Retention Challenges | 0.2% |

### Pool-Sampled Dimensions (21 remaining)

Random uniform selection from the CSV example values per dimension. The pools are embedded as TypeScript constants in `src/tools/personas.ts` — no runtime CSV parsing. Dimensions covered:

1. Age
2. Family Situation
3. Work and Study Balance
4. Previous Education
5. Academic Subject Strengths
6. Academic Subject Weaknesses
7. Academic Confidence
8. Short-Term Academic Goals
9. Long-Term Career Goals
10. Confidence Levels
11. Learning Motivation
12. Engagement Style
13. Preferred Learning Methods
14. Technology Comfort Level
15. Academic Support
16. Emotional Support
17. Cultural Background
18. Financial Situation
19. Responsiveness to Feedback
20. Growth Mindset
21. Time Management Skills

---

## Saved Personas File Format

Stored at `~/.canvas-design-mcp/student-personas.md` alongside `institution.json` and `professor-philosophy.md`.

```markdown
# Student Personas

Generated: 2026-05-09 | Count: 3

## Persona 1

- **Age:** 22-year-old senior
- **Family Situation:** Lives off-campus with roommates, close-knit family
- **Work and Study Balance:** Full-time student (15 credits), part-time internship (15–20 hrs/week)
- **Previous Education:** Graduated high school with honors, strong STEM background
- **Subject Strengths:** Mathematics, physics, computer programming
- **Subject Weaknesses:** Essay writing, public speaking, humanities
- **Academic Confidence:** High in STEM, moderate in humanities
- **Short-Term Goals:** Complete capstone project, secure full-time offer
- **Long-Term Goals:** Software engineer, data scientist
- **Confidence Levels:** High, particularly in technical skills
- **Learning Motivation:** Intrinsic; driven by passion for technology
- **Engagement Style:** Engages most during technical explanations and labs
- **Preferred Learning Methods:** Hands-on coding, lab work, online documentation
- **Technology Comfort Level:** Extremely high, proficient in coding and various software
- **Academic Support:** Access to specialized software/hardware, career services
- **Emotional Support:** Friends with shared interests, occasional mental health resources
- **Cultural Background:** Strong family ties, bilingual environment
- **Financial Situation:** Moderate, relies on internship income and parental support
- **Responsiveness to Feedback:** Highly responsive, uses feedback to debug and optimize
- **Growth Mindset:** Strong, enjoys learning new technologies
- **Time Management:** Good, uses digital tools; can get hyper-focused on one task
- **Race/Ethnic Background:** Hispanic/Latino
- **Learning Disabilities/Challenges:** None

## Persona 2

[...]
```

---

## MCP Tools

### `generate_student_personas(count?)`

**Input:**
```typescript
interface GenerateStudentPersonasInput {
  count?: number;  // default 3, min 1, max 20
}
```

**Behavior:**
1. Sample `count` personas using the weighted sampler (race, disability) and uniform pool sampler (21 other dimensions)
2. Format each persona as a Markdown `## Persona N` section with all 23 dimensions as a bullet list
3. Write to `~/.canvas-design-mcp/student-personas.md` (always overwrites — generation is a fresh start)
4. Return the full Markdown + confirmation string

**Output:** Confirmation string + full Markdown content of generated personas

**Note:** Generation is pure computation — `Math.random()` compared against cumulative thresholds for weighted dimensions, `Math.floor(Math.random() * pool.length)` for pool dimensions. No API calls.

---

### `get_student_personas()`

**Input:** None

**Output:**
```typescript
interface GetStudentPersonasResult {
  content: string;    // full student-personas.md text, or empty template if none
  exists: boolean;    // false = no file, template returned
}
```

**Behavior:**
- If `~/.canvas-design-mcp/student-personas.md` exists: read and return it with `exists: true`
- If no file: return an empty template with `exists: false`

**Handler hint (in index.ts response):** When `exists: true`, prepend: *"Saved personas found. Ask the professor whether to reuse these or generate a new set before reviewing."* When `exists: false`, prepend: *"No personas saved yet. Ask the professor how many to generate, then call generate_student_personas."*

---

## Session Flow

### First use (no saved personas)

1. Professor: *"Review this assignment with student personas"*
2. Claude calls `get_student_personas()` → `exists: false`
3. Claude: *"No personas saved yet. How many should I generate? (3 is a good starting point)"*
4. Professor responds; Claude calls `generate_student_personas({ count: N })`
5. Claude receives generated personas, reviews assignment through each lens
6. Claude returns per-persona report + aggregate summary

### Subsequent use (personas already saved)

1. Professor: *"Review this assignment with student personas"*
2. Claude calls `get_student_personas()` → `exists: true`
3. Claude: *"I have saved personas from your last session. Reuse these or generate a fresh set?"*
4. If reuse: Claude reviews immediately using returned content
5. If fresh: Claude calls `generate_student_personas({ count: N })`

### Philosophy KB integration

If `get_philosophy_kb` has already been called this session, Claude uses the professor's stated teaching priorities and student expectations when interpreting persona feedback — no additional tool call required.

### Standalone use (no Canvas HTML)

The review works on any text — raw assignment instructions, a rubric, a syllabus section. Nothing in the tool schema restricts input to Canvas HTML.

---

## Review Output Format

Claude produces a two-part report. The MCP server does not generate the review — Claude does.

### Per-persona block (one per persona)

```
## Persona 1 — 22-year-old senior, Hispanic/Latino, part-time internship, no disability

**Confusion points:** [specific unclear elements for this student]

**Missing information:** [what this student would need but can't find]

**Tone flags:** [phrasing that may feel alienating or discouraging given this background]

**Accessibility / background flags:** [barriers relevant to this student's disability, 
language background, technology comfort, or financial situation]
```

### Aggregate summary (after all personas)

```
## Summary — 3 Personas Reviewed

[Issue]: flagged by N of 3 personas
[Issue]: flagged by N of 3 personas
No issues flagged: [list of areas that looked clean across all personas]
```

High-agreement flags (2+ of 3, or 4+ of 5 for larger sets) are the priority. Claude does not make changes — it reports. Professor decides what to act on.

---

## Architecture

### New Files

| File | Responsibility |
|---|---|
| `src/tools/personas.ts` | Dimension pools (embedded constants), probability tables, `weightedSample()`, `generateStudentPersonas()`, `getStudentPersonas()`, file I/O, path constants |
| `tests/personas.test.ts` | Unit tests: weighted sampler distribution, pool sampler coverage, file round-trip, missing-file behavior, count clamping |

### Modified Files

| File | What changes |
|---|---|
| `src/index.ts` | Import and register `generateStudentPersonas`, `getStudentPersonas`; add handlers; update 2 existing tool descriptions |

### Internal Design of `src/tools/personas.ts`

```
PERSONAS_PATH = join(homedir(), '.canvas-design-mcp', 'student-personas.md')

RACE_TABLE = [{ cumulative: 0.578, value: 'White' }, ...]   // 12 entries
DISABILITY_TABLE = [{ cumulative: 0.61, value: 'None' }, ...] // 11 entries

DIMENSION_POOLS: Record<string, string[]> = {
  age: ['18-year-old freshman', '21-year-old sophomore', ...],
  familySituation: [...],
  // ... 21 dimensions, values extracted from CSV
}

weightedSample(table: Array<{ cumulative: number; value: string }>): string
  └── Math.random() compared against cumulative thresholds

poolSample(pool: string[]): string
  └── Math.floor(Math.random() * pool.length)

buildPersona(index: number): string
  ├── weightedSample(RACE_TABLE)
  ├── weightedSample(DISABILITY_TABLE)
  ├── poolSample(pool) for each of 21 other dimensions
  └── format as ## Persona N Markdown block

generateStudentPersonas(input: GenerateStudentPersonasInput, personasPath?): string
  ├── clamp count to [1, 20], default 3
  ├── build N personas via buildPersona
  ├── prepend header (generated date, count)
  ├── write to personasPath
  └── return confirmation + full Markdown

getStudentPersonas(personasPath?): GetStudentPersonasResult
  ├── if file exists: read and return { content, exists: true }
  └── if not: return { content: PERSONAS_TEMPLATE, exists: false }
```

Both functions accept optional `personasPath` parameter (defaults to `PERSONAS_PATH`) for testability via `os.tmpdir()` — same pattern as `philosophy.ts`.

---

## Wiring Into Existing Tools

Description updates only — no logic changes.

| Tool | Description addition |
|---|---|
| `ingest_assignment_folder` | "If student personas are in context, consider their backgrounds when noting alignment gaps between the assignment materials and student needs." |
| `critique_canvas_page` | "If student personas are in context, factor their backgrounds into the design critique findings where relevant." |

---

## Error Handling

| Condition | Behavior |
|---|---|
| `count` outside [1, 20] | Silently clamped to range — no error |
| No personas file | `get_student_personas` returns template, `exists: false` — not an error |
| File unreadable | `isError: true`, message instructs professor to call `generate_student_personas` to rebuild |
| `generate_student_personas` write failure | `isError: true` with OS error message |

---

## Test Scenarios (~10 new tests)

| Test | What it covers |
|---|---|
| `weightedSample` — race distribution | Over 1000 samples, White appears ~57% of the time (±5%) |
| `weightedSample` — disability distribution | Over 1000 samples, None appears ~61% of the time (±5%) |
| `poolSample` — coverage | Over 100 samples from a small pool, all values appear at least once |
| `generateStudentPersonas` — default count | Returns 3 personas when count omitted |
| `generateStudentPersonas` — count clamping | count: 0 generates 1; count: 99 generates 20 |
| `generateStudentPersonas` — file written | File exists at `personasPath` after generation |
| `generateStudentPersonas` — all 23 dimensions | Each persona block contains all 23 dimension labels |
| `generateStudentPersonas` — overwrites existing | Calling twice produces a file with only the second run's personas |
| `getStudentPersonas` — file exists | Returns content and `exists: true` |
| `getStudentPersonas` — no file | Returns template and `exists: false` |

---

## Design Decisions

### Per-Assignment Storage (deferred)

Personas are saved globally, not per course or per assignment. A professor might want different persona sets for different courses (e.g., an intro course vs. a senior capstone). This is deferred — the single global file covers the initial use case, and a `courseKey` parameter could be added to both tools later without breaking anything.

### Why Not Embed the Review in a Tool

The review is judgment work — reading persona backgrounds against assignment text, flagging ambiguity, tone issues, accessibility barriers. This is exactly what Claude is for. A `review_with_personas` tool would be a thin wrapper around a Claude prompt, which is the wrong place for that logic.

### Why Overwrite on Generate

Professors don't need a history of past persona sets. Overwrite keeps the file clean and avoids stale personas accumulating. The "use existing or regenerate" prompt handles the case where personas are still useful.
