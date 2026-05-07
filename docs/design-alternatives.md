# Design Alternatives — Decisions to Revisit

This file tracks major design decisions where multiple good options existed and Kevin chose one direction but may want to revisit after getting professor feedback. It is a living document — add to it whenever a real alternative is set aside.

**How to use it:** After shipping and getting professor feedback, come back here. Each entry has the context, the choice made, and full notes on the alternative so it can be picked up without having to reconstruct the reasoning.

---

## SP4 — Two Tools vs. One Combined Tool

**Date:** 2026-05-05  
**Decision made:** Two separate tools — `critique_canvas_page` + `redesign_canvas_page`  
**Alternative considered:** One combined `analyze_and_fix_canvas_page` tool

### Why two tools were chosen
The professor needs a real decision point between diagnosis and fix. A combined tool removes that deliberate pause — the professor sees the critique findings and decides whether to apply fixes, tweak the design differently, or scrap and regenerate. Splitting also keeps each tool's output cleaner and testable.

### Alternative: Single combined tool
**What it would look like:**  
One tool: `analyze_and_fix_canvas_page` takes `html`, `pageType`, `primaryGoal`, and an optional `applyFixes: boolean` flag (default `true`). Returns critique findings AND fixed HTML in one call. The professor can inspect `findings` and `fixedHtml` together without a second tool call.

**Why it might be better:**  
- One command to go from raw HTML to improved HTML
- Less back-and-forth for professors who trust the fixes
- Simpler mental model: "analyze and improve this page"

**Why it might be worse:**  
- Professor never sees the intermediate state (what was wrong before fixing)
- Harder to test — two responsibilities in one function
- Locks in the fix even when the professor might want to make different choices

**When to revisit:**  
If professors consistently run critique → redesign in sequence without reviewing findings, the two-step flow is unnecessary friction. A combined tool with `applyFixes` option would be worth building.

---

## SP5 — Two Panopto Tools vs. Three

**Date:** 2026-05-06  
**Decision made:** Three tools — `search_panopto_videos`, `embed_panopto_video`, `fetch_panopto_captions`  
**Alternative considered:** Two tools (search + embed only; no captions-to-KB tool)

### Why three tools were chosen
Kevin explicitly requested `fetch_panopto_captions` during planning — the value of building a searchable lecture transcript KB outweighed the added complexity. The transcript tool also sets up SP8 (Professor Philosophy KB) by giving Claude access to what Kevin actually teaches.

### Alternative: Two tools only
**What it would look like:**  
`search_panopto_videos` and `embed_panopto_video` only. No `fetch_panopto_captions`. Caption status is still surfaced in search results and the `captionWarning` on embeds — professors know which videos lack captions. The transcript KB feature is deferred.

**Why it might be better:**  
- Smaller surface area — fewer credentials needed for useful functionality
- Professors who just want to embed videos don't need the transcript feature
- Fewer moving parts in the wizard setup

**When to revisit:**  
If professors don't use `fetch_panopto_captions` (it requires API credentials and adds a setup step), the tool adds wizard complexity for low uptake. Worth pruning if usage data supports it.

---

## SP5 — OAuth2 Token Caching

**Date:** 2026-05-06  
**Decision made:** Fetch fresh OAuth2 token per request (no caching)  
**Alternative considered:** Cache token in memory for the server's lifetime

### Why fresh-per-request was chosen
Simpler implementation. Panopto tokens are short-lived; caching adds state to a stateless server and requires cache invalidation logic. Acceptable for MVP with low request rate.

### Alternative: In-memory token cache
**What it would look like:**  
A module-level `let cachedToken: { token: string; expiresAt: number } | null = null` in `panopto.ts`. `getPanoptoToken` checks the cache before fetching. Token is stored with its expiry (from `expires_in` field in OAuth2 response); refresh 60 seconds before expiry.

**Why it might be better:**  
- Halves the number of network calls for any Panopto operation
- Meaningfully faster for professors running multiple Panopto tools in sequence
- More professional: matches how OAuth2 is meant to be used

**When to revisit:**  
If professors report noticeable latency on Panopto tool calls, or if server metrics show OAuth2 calls as a bottleneck. Straightforward to add — the `getPanoptoToken` interface is already isolated.

---

## SP6 — Single Unified Tool vs. Read Tool + Reuse Generate

**Date:** 2026-05-07  
**Decision made:** Approach A — single `ingest_assignment_folder` tool that reads files, assembles content, generates HTML, and returns everything in one call  
**Alternative considered:** Approach B — `read_assignment_folder` reads and validates the folder; professor then asks Claude to call the existing `generate_canvas_page` with the content

### Why single tool was chosen
One command, one result. Better professor experience — no two-step workflow. The tool handles all the mechanical work (file discovery, inheritance, HTML generation) and Claude handles the judgment work (recommendations, improvements). Clean boundary.

### Alternative: Read tool + existing generate tool (Approach B)

This alternative is worth preserving in detail because it has real architectural appeal and may be the right answer after professor feedback.

#### What it would look like

**New tool:** `read_assignment_folder`

Input:
```typescript
interface ReadAssignmentFolderInput {
  folderPath?: string;   // defaults to "ingest/" relative to CWD
}
```

Output:
```typescript
interface ReadAssignmentFolderResult {
  courseInfo: {
    institution: string;
    professor: string;
    courseNumber: string;
    courseName: string;
    assignmentNumber: string;
    semester: string;
  };
  brief: string;               // raw text of brief.md
  rubric?: string;             // raw text of rubric.md (inherited or local)
  shell?: string;              // raw text of shell.md (inherited or local)
  styleNotes?: string;         // raw text of style-notes.md
  sourceMap: {                 // where each file was found (for debugging)
    courseConfig: string;
    brief: string;
    rubric?: string;
    shell?: string;
    styleNotes?: string;
  };
  warnings: string[];          // missing required fields, placeholder values still present, etc.
}
```

The professor runs `read_assignment_folder`, gets the structured content back, then asks Claude to generate the page. Claude calls `generate_canvas_page` with the assembled content, then provides rubric alignment feedback and brief recommendations based on the source texts it can now see.

#### The two-step professor workflow

```
Professor: "Read the week-01 AI Challenge folder and generate the page."

Claude:
1. Calls read_assignment_folder({ folderPath: "assignments/ai-challenge/week-01" })
   → Gets brief, rubric (inherited from ai-challenge/), shell (inherited), courseInfo
2. Reviews the raw sources for obvious issues
3. Calls generate_canvas_page with the assembled fields
   → Gets HTML, warnings, heroImagePrompt
4. Reports: here's the generated page, here's the rubric alignment check, here's what I noticed about the brief
```

#### Why this is architecturally appealing

1. **Reuse over duplication** — `generate_canvas_page` already works. Approach A duplicates its generation logic inside a new tool. Approach B composes the two tools rather than rebuilding.

2. **Inspectable intermediate state** — the professor (or Claude) can read the assembled source content before generating. Useful when something in the folder looks wrong — you catch it before the HTML is generated.

3. **Testability** — `read_assignment_folder` is purely mechanical: find files, walk tree, validate fields, return text. Easy to test with fixture folders. The generation logic is already tested in `generate_canvas_page` tests.

4. **Easier to extend** — if a future SP adds a new file type (e.g., `personas.md` for SP8 integration), Approach B's read tool just adds a field to its output. Approach A has to also wire that field through its generation step.

5. **Claude does more of the work it's good at** — reading raw brief + rubric + shell and synthesizing recommendations is exactly Claude's strength. Approach A offloads file discovery to the tool but still relies on Claude for recommendations. Approach B is more honest about the division.

#### Why it adds friction

- Professors have to understand they need to say "read the folder and generate the page" — two implied steps, not one
- If Claude forgets to call `generate_canvas_page` after reading, the professor is left with raw content and no HTML
- The workflow is less discoverable: with Approach A, one tool name says exactly what it does

#### When to revisit

Revisit Approach B if:
- Professors want to review assembled source content before generating (inspection use case)
- The generation logic in Approach A diverges from `generate_canvas_page` and needs to be maintained separately
- A future sprint adds enough new file types that Approach A's single tool becomes too large
- Professors want to run `read_assignment_folder` without generating HTML (e.g., just to check what the tool found in the folder)

If Approach B is chosen later, the migration path is clean: split `ingest_assignment_folder` into `read_assignment_folder` + relying on the existing `generate_canvas_page`. The tree-walking file discovery logic moves to `read_assignment_folder`; the generation call moves to Claude.

---

## SP6 — Simple Mode Rubric/Shell Support

**Date:** 2026-05-07  
**Status:** Unresolved — Kevin said "I want to think on this"  
**Question:** Does the simple `ingest/` folder workflow support `rubric.md` and `shell.md`, or does rubric/shell only apply in the advanced `assignments/{id}/` folder structure?

### Current design position
The inheritance model effectively resolves this: since `ingest/` is just another folder the tool points at, if `rubric.md` and `shell.md` are present in `ingest/`, they'll be picked up automatically. Simple mode has full feature parity by default — no extra work required.

### If parity is undesirable
Some professors may not want rubric/shell complexity surfaced in the simple mode. A `mode: 'simple' | 'advanced'` parameter could suppress rubric analysis when in simple mode, even if `rubric.md` is present. This would keep the simple mode experience clean for first-time users.

### When to revisit
After seeing how professors actually use the simple mode. If they start adding `rubric.md` to `ingest/` naturally, parity is right. If the simple mode overwhelms beginners, a simplified output that omits rubric analysis is worth adding.

---

## SP7/SP8 — Ordering: Student Persona vs. Professor Philosophy KB

**Date:** 2026-05-07  
**Decision made:** SP7 = Professor Philosophy KB first, SP8 = Student Persona Review  
**Previous order:** SP7 = Student Persona, SP8 = Professor Philosophy KB  
**Rationale for change:** Kevin decided the philosophy KB should inform the persona review, not the other way around. The KB gives Claude context about the professor's teaching priorities before it simulates student reactions.

### If original order is restored
Student Persona Review (old SP7) could run on generated pages without any philosophy context — just using statistically grounded personas against the raw assignment page. This is arguably more objective (no philosophy bias), but less personalized. Revisit if professors want persona feedback before they've built out their philosophy KB.
