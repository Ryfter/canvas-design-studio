# SP2 — Canvas API Publish Design Spec

**Date:** 2026-05-04  
**Status:** Design complete — ready for implementation plan  
**Sub-project:** SP2 of 8 (see `2026-04-29-mcp-future-additions.md` for build order)  
**Brainstorming session:** 2026-05-04, continued from SP1 completion  

---

## What We're Building

Two new MCP tools that complete the core professor workflow: prompt → generated HTML → live Canvas page URL.

- `list_canvas_courses` — shows the professor their courses with filtering and metadata
- `publish_to_canvas` — validates, then publishes generated HTML to a Canvas course page

This is the "last mile" of SP1. After SP2, a professor can go from a brief to a live URL in a single Claude conversation.

---

## Tools

### `list_canvas_courses`

Lists the professor's Canvas courses with enough context to select the right one.

**Parameters:**

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `semester` | `"current" \| "future" \| "past" \| "all"` | `"current"` | Filters by enrollment state |
| `includeFavorites` | `boolean` | `true` | Pins favorited courses to the top |

**Canvas API mapping:**

| semester value | Canvas enrollment_state filter |
|---|---|
| `"current"` | `active` |
| `"future"` | `invited_or_pending` |
| `"past"` | `completed` |
| `"all"` | (no filter — all enrollment states) |

**Output per course:**

```
Course ID: 12345
Name: ITM 310-002 Business Intelligence
Nickname: Sp26 | ITM 310-002 Business Intelligence (RANK)  ← if set
Students: 28 enrolled
Teachers: Dr. Kevin Rank
Term: Spring 2026
```

**Why metadata matters:** Professors who coordinate courses (but don't teach them) have those courses show up as "teacher" enrollment in the Canvas API. Showing student count + teacher count helps disambiguate: a course with 0 students and 3 teachers is a coordination shell, not a live section.

**Favorites system:**

Frequently used courses can be saved to `~/.canvas-design-mcp/institution.json` under `favoriteCourses: [id1, id2, ...]`. These pin to the top of the list with a `★` marker. Managed via `setup_institution` tool.

**Naming convention recommendation (shown once, stored in `kbTipShown`):**

> "Canvas lets you set a course nickname visible only to you. A format like `Sp26 | ITM 310-002 Business Intelligence (RANK)` makes it easy to filter courses at a glance — especially when you're teaching multiple sections or coordinating courses you don't teach."

The tip is shown once, then suppressed. `kbTipShown: true` written to `institution.json`.

---

### `publish_to_canvas`

Publishes HTML to a Canvas course page. Handles create vs. update, validates before publishing, and surfaces professor-friendly errors at every failure point.

**Parameters:**

| Parameter | Type | Required | Default | Purpose |
|---|---|---|---|---|
| `courseId` | `number` | Yes | — | Canvas course ID (from `list_canvas_courses`) |
| `html` | `string` | Yes | — | The Canvas-safe HTML to publish |
| `pageTitle` | `string` | Yes | — | Page title — used for collision detection and as Canvas page title |
| `forcePublish` | `boolean` | No | `false` | Skip validation gate |
| `skipFerpaCheck` | `boolean` | No | `false` | Skip FERPA/PII scan |

**Returns:**

```json
{
  "url": "https://boisestate.instructure.com/courses/12345/pages/itm-310-16-06-page",
  "action": "created" | "updated",
  "pageTitle": "ITM 310 — Assignment 16.06",
  "tip": "Save your HTML source to a Git repo before publishing. Canvas stores page revisions, but they're hard to diff and expire. Git is the right tool for tracking changes over time."
}
```

---

## Course Selection Flow

When a professor runs `publish_to_canvas` without a `courseId`, the tool calls `list_canvas_courses` internally and presents the filtered list. Professor selects by ID.

**Disambiguation when a course name is ambiguous:** If a professor teaches `ITM 310-001` and `ITM 310-002`, both show in the list. The metadata (section number, student count, term) is the disambiguation signal. The tool never guesses — it always presents the list and waits.

---

## Create vs. Update — Fuzzy Collision Detection

**Why explicit page URL was rejected:** Requiring professors to know their Canvas page URL before it exists is a UX failure. They don't think in slugs.

**Decision: fuzzy title match + confirmation dialog.**

Before publishing, the tool fetches the course's existing pages (`GET /api/v1/courses/:id/pages`) and scores each page title against the incoming `pageTitle` using normalized Levenshtein distance.

| Score | Treatment |
|---|---|
| Exact match | Present Update/Create New/Related dialog (see below) |
| High similarity (≥ 0.8) | Present dialog with match highlighted |
| Low similarity (< 0.8) | Proceed with create, no dialog |

**Confirmation dialog (high/exact match):**

```
A page with a similar title already exists:
  Existing: "ITM 310 — Assignment 16.06 AI Projects"
  New:      "ITM 310 — Assignment 16.06"

How would you like to proceed?
  A) Update the existing page (replaces content — Canvas keeps revision history)
  B) Create a new page with this title (creates alongside the existing page)
  C) Create a related page with a modified title (you'll be prompted for the title)
  D) Cancel
```

**Why three options instead of two:** "Create New" risks duplicates. "Create as Related" gives professors a clean escape when they're intentionally making a variation (e.g., a makeup assignment or alternate version). Option C prompts for a disambiguating title before publishing.

**Note for future revision:** Canvas's page revision history (`GET /api/v1/courses/:id/pages/:url/revisions`) could be surfaced here to show "this page was last updated 3 days ago" — helpful context for the Update decision. Not in SP2 scope, but the API endpoint exists when we want it.

---

## Gotcha Pattern

A dedicated module at `src/tools/gotchas.ts` surfaces contextual warnings at the right moment in the publish flow. Gotchas are not errors — they don't block. They are professor-readable messages that appear in the tool output when a condition is detected.

### Gotcha 1 — Course Coordinator Edge Case

**Trigger:** Course appears in professor's list with `teacher` enrollment but has 0 students or 3+ teachers.

**Message:**
> "Heads up: this course has [N] teachers and [M] students. If you're listed as a coordinator rather than the instructor of record, publishing here may affect a live course you don't manage. Double-check you have the right course."

**Why it exists:** Canvas grants coordinators "teacher" enrollment in courses they manage but don't teach. The API can't distinguish coordinator from instructor — only metadata signals can.

---

### Gotcha 2 — Title Collision

**Trigger:** Fuzzy title match ≥ 0.8 against an existing page.

**Action:** Confirmation dialog (see Create vs. Update section). Not just a warning — requires professor input before proceeding.

---

### Gotcha 3 — API Token Scope

**Trigger:** 403 returned from Canvas API on a write operation.

**Message:**
> "Your Canvas API token can read but not write. Generate a new token at [Canvas URL]/profile/settings with the 'Pages — Edit' scope enabled. Then run `setup_institution` to update it."

**Why it exists:** Read-only tokens are common (professors generate them for data exports). The error message from Canvas is not professor-friendly; this is.

---

### Gotcha 4 — FERPA/PII in Published HTML

**Trigger:** HTML contains patterns that suggest student data before the Canvas API call is made.

**Patterns scanned:**
- 9-digit numbers (bare student IDs)
- `B` + 8 digits (BSU student ID format)
- Grade disclosure patterns: letter grades adjacent to names, percentage scores in list items paired with identifiers
- Email addresses that don't match the professor's own (from `institution.json`)

**Message:**
> "This HTML may contain student data (possible student ID near line 34). Publishing student records to a Canvas page may violate FERPA. Review before continuing. Pass `skipFerpaCheck: true` to override."

**Why it exists:** FERPA (20 U.S.C. § 1232g) prohibits disclosure of student educational records without consent. A professor who accidentally pastes a grade report into a Canvas page visible to the entire course creates a FERPA violation. The scan is heuristic — it catches obvious mistakes, not every possible case. The `skipFerpaCheck: true` override exists for legitimate uses (e.g., a page that displays a score range without names).

---

### Gotcha 5 — Version Control for Page Content

**Trigger:** Every successful publish (shown in success output, not a warning).

**Message:**
> "Tip: Save your HTML source to a Git repo before publishing. Canvas stores page revisions, but they're hard to diff and expire. Git is the right tool for tracking changes over time."

**Why it exists:** Canvas page history (`/revisions` endpoint) exists but is not diffable in the UI. Professors who iterate on pages over a semester have no good way to roll back without version control. Google Docs history is an acknowledged alternative but is inferior: not diffable, not scriptable, not portable. The tip points toward the right tool without lecturing.

---

## Validation Gate

`validate_canvas_html` runs on the HTML before the Canvas API call. Always on. `forcePublish: true` bypasses.

**When validation fails, output is professor-readable:**

```
Validation failed — 3 issues found before publishing:
  • Line 47: `box-shadow` is stripped by Canvas — remove or replace with border
  • Line 89: `gap: 16px` in a flex container — use margin-right on children instead
  • Line 112: <h1> tag found — Canvas uses H1 for the page title; start at H2

Fix these issues and re-run, or pass forcePublish: true to publish anyway.
```

**Why `forcePublish` exists:** Some professors have legacy HTML they know will degrade gracefully in Canvas. Blocking them entirely is worse than letting them choose. The validation output tells them exactly what will be stripped.

---

## Error Handling

All errors return `{ error: string, code: string, details?: object }` — consistent with SP1 tool error shape.

| HTTP Status | Cause | Professor-facing message |
|---|---|---|
| 401 | Token invalid or expired | "Canvas rejected the API token. Run `setup_institution` to update it." |
| 403 | Token lacks write permission | "Your token can read Canvas but not write. Generate a new token with 'Pages — Edit' scope." |
| 404 | Course or page not found | "Course not found. It may have been deleted or your token doesn't have access to it." |
| 422 | Canvas rejected the HTML | Returns Canvas error body — indicates something the validator missed |
| 429 | Rate limited | Auto-retry with exponential backoff (3 attempts, ~2s/~4s/~8s), then surface if still failing |

**Network / timeout errors:**
> "Canvas API unreachable — check your Canvas URL in institution config and try again."

**Missing API token (no token in `institution.json`):**

If `apiToken` is empty, the tool surfaces a clear message before attempting any API call:
> "No Canvas API token configured. Run `setup_institution` to add one. Generate your token at [Canvas URL]/profile/settings."

No silent failure, no confusing 401 — the check happens before the HTTP request.

---

## Implementation Notes (for writing-plans)

- Canvas API base: `GET|POST|PUT /api/v1/...`, auth header `Authorization: Bearer <token>`
- Page create: `POST /api/v1/courses/:id/pages` with body `{ wiki_page: { title, body, published } }`
- Page update: `PUT /api/v1/courses/:id/pages/:url` with body `{ wiki_page: { body } }`
- Page list: `GET /api/v1/courses/:id/pages` — supports pagination via Link header
- Course list: `GET /api/v1/courses?enrollment_state=active&per_page=50` — paginate if needed
- Fuzzy matching: use `fastest-levenshtein` (already in ecosystem) or implement inline — small function, no dependency needed
- FERPA scan: regex pass over the HTML string before any API call; flag to user, not block
- All Canvas API calls go through a thin `src/canvas-api.ts` client that handles auth header and base URL from `institution.json`

---

## What This Spec Does NOT Cover

- Batch publishing (multiple pages at once) — not in SP2 scope
- Publishing to Canvas modules (not pages) — future consideration
- `setup_institution` updates for API token scope hints — minor addition, implementation team decides
- Canvas page revision history surfacing in the collision dialog — noted as future improvement

---

## Open Questions (resolved during brainstorming)

| Question | Decision | Reasoning |
|---|---|---|
| Course selection: list all vs. ask for ID? | List with filtering | Professors don't know their course IDs; list is the only humane UX |
| Create vs. update intent? | Fuzzy detect + confirm dialog | Explicit intent (separate parameters) was rejected as too technical; auto-detect alone risks silent overwrites |
| Validate before publish? | Always, with `forcePublish` override | Silent publish of invalid HTML wastes the professor's time; force override respects autonomy |
| Missing token handling? | Fail before HTTP call with clear message | 401 from Canvas is opaque; pre-check is professor-friendly |
| Rate limit handling? | Auto-retry 3x with backoff | Canvas rate limits are transient; retry is transparent and correct |

