# Canvas Design Studio Technical Roadmap

**Last updated:** 2026-05-06 (SP4 complete)  
**Audience:** Kevin, Codex, Claude, and implementation collaborators  
**Purpose:** Preserve implementation context, sequencing, technical decisions, risks, and handoff notes that are too detailed for the professor-facing roadmap.

## Roadmap Pairing

This technical roadmap has a companion file:

- Customer-facing roadmap: `docs/feature-roadmap.md`
- Technical roadmap: `docs/technical-roadmap.md`

Update both when feature status changes. The customer-facing roadmap should explain value in plain language. This file should preserve implementation details, constraints, risks, and source-document links.

## Core Product Principle

Canvas API publishing is optional. The beginner workflow must remain:

1. Configure institution basics.
2. Generate Canvas-safe HTML.
3. Paste HTML manually into Canvas.

No Canvas API token should be required for setup, server startup, `generate_canvas_page`, or `validate_canvas_html`. API credentials are required only for API-dependent tools such as `list_canvas_courses` and `publish_to_canvas`.

## Status Legend

| Status | Meaning |
|---|---|
| Done | Implemented, tested, committed |
| In progress | Planned or being built now |
| Next | Expected after current work |
| Later | Accepted roadmap item, not yet specified |
| Idea | Possible future work, not scheduled |

## Implementation Steps

| Step | Feature group | Status | Primary files | Source docs | Current notes |
|---|---|---|---|---|---|
| SP1 | MCP server core | Done | `src/index.ts`, `src/config.ts`, `src/wizard.ts` | `docs/superpowers/plans/2026-05-03-canvas-mcp-subproject-1.md` | v0.1.0 core server exists with setup, generate, validate, and update KB tools. |
| SP1 | HTML generation and validation | Done | `src/tools/generate.ts`, `src/tools/validate.ts`, `src/design-engine.ts`, `src/templates/` | Canvas KB under `docs/canvas-design-kb/` | Manual paste workflow is implemented and must remain first-class. |
| SP1 | Release scaffold | Done | `.github/workflows/`, `Dockerfile`, `package.json` | SP1 plan | CI and publish scaffolding exist; npm token/release setup remains external. |
| SP2 | Optional Canvas API publish | Done | `src/canvas-api.ts`, `src/tools/list-courses.ts`, `src/tools/publish.ts`, `src/tools/gotchas.ts`, `src/index.ts`, `src/wizard.ts` | `docs/superpowers/specs/2026-05-04-sp2-publish-canvas-design.md`, `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md` | All 9 tasks complete: shared types/config, Canvas API client, gotcha messages, course listing, publishing logic, MCP tool registration, setup wizard enhancements, README documentation, and final handoff. 82 tests passing. |
| SP3 | Accessibility module | Done | `src/tools/contrast.ts`, `src/tools/accessibility.ts`, `src/wizard.ts`, `src/tools/generate.ts`, `src/tools/publish.ts`, `src/index.ts` | `docs/superpowers/specs/2026-05-05-sp3-accessibility-design.md`, `docs/superpowers/plans/2026-05-05-sp3-accessibility.md` | 5 WCAG 2.1 AA checks (advisory). Contrast integrated into wizard, generator, publisher, and validator. 107 tests passing. |
| SP4 | Design Intelligence Brain | Done | `src/tools/critique.ts`, `src/tools/redesign.ts`, `src/kb/design-principles.md`, `src/index.ts` | `docs/superpowers/specs/2026-05-05-sp4-design-intelligence-design.md`, `docs/superpowers/plans/2026-05-05-sp4-design-intelligence.md` | 2 new MCP tools: `critique_canvas_page` (8 checks, score, KB injection) and `redesign_canvas_page` (font floor fix, hero URL comment, a11y wiring). 136 tests passing. |
| SP5 | Panopto integration | Next | likely `src/tools/panopto.ts`, config additions | Future additions doc | Depends on API auth details and BSU iframe whitelist confirmation. |
| SP6 | Assignment folder ingest | Later | likely `src/tools/ingest-folder.ts`, `assignments/` convention | Future additions doc | Self-contained workflow for brief/rubric/shell/style notes. |
| SP7 | Student persona review | Later | likely persona generator integration and report output | Future additions doc plus Kevin's persona generator materials | Must use statistically grounded personas, not generic archetypes. |
| SP8 | Professor philosophy KB | Later | likely `~/.canvas-design-mcp/professor-philosophy.md`, setup/interview tool | Future additions doc | Optional, interview-built steering context. |
| Future | Community assignment standard | Idea | TBD | Future additions doc | Long-term open standard for reusable course design systems. |

## SP2 Technical Context

SP2 adds two tools:

| Tool | Purpose | API requirement |
|---|---|---|
| `list_canvas_courses` | List available Canvas courses with metadata to help professors choose the correct course | Requires API token |
| `publish_to_canvas` | Validate and publish generated HTML to a Canvas page | Requires API token |

### SP2 Files to Create or Modify

| File | Action | Responsibility |
|---|---|---|
| `src/types.ts` | Modify | Canvas course/page/config/publish types |
| `src/config.ts` | Modify only if needed | Preserve optional config fields |
| `src/wizard.ts` | Modify | Make API token optional; collect professor email and favorite course IDs |
| `src/canvas-api.ts` | Create | Canvas API client with auth, JSON body handling, pagination, retries |
| `src/tools/gotchas.ts` | Create | Professor-readable warnings and tips |
| `src/tools/list-courses.ts` | Create | Course listing, favorite pinning, metadata formatting |
| `src/tools/publish.ts` | Create | FERPA scan, validation gate, collision handling, create/update |
| `src/index.ts` | Modify | Register and route new MCP tools |
| `tests/canvas-api.test.ts` | Create | Mocked fetch tests for client behavior |
| `tests/list-courses.test.ts` | Create | Course filtering, sorting, tips, gotchas |
| `tests/publish.test.ts` | Create | FERPA, validation, collision, create/update, error shape |
| `README.md` | Modify | Document optional API workflow and publishing |

### SP2 Review Corrections

Apply these before or during implementation:

1. Keep Canvas API setup optional. Blank API token is valid for the manual workflow.
2. Keep `courseId` required for `publish_to_canvas`; if missing, return `COURSE_ID_REQUIRED` and tell the professor to run `list_canvas_courses`.
3. Request Canvas course metadata with `include[]=term`, `include[]=total_students`, and `include[]=teachers`.
4. Verify enrollment-state query behavior before hard-coding values. Current Canvas docs indicate `enrollment_workflow_state[]` values like `active`, `completed`, `invited`, `pending`, and `creation_pending`.
5. Support Canvas `friendly_name`; display `nickname ?? friendly_name ?? name`.
6. Improve fuzzy title matching with token containment or token-set similarity, not only normalized Levenshtein.
7. FERPA scan should block student IDs and grade/name patterns. Non-professor email addresses should be warning-only or configurable by allowlist/domain to avoid false positives.
8. A 403 can mean token scope, role permission, or course policy. Message it as "your token or Canvas role does not allow editing pages in this course" and then offer token-scope guidance as one possible fix.
9. Fix the planned Canvas API error test so one mocked fetch is not consumed by two assertions.

### SP2 API Endpoints

| Action | Endpoint | Notes |
|---|---|---|
| List courses | `GET /api/v1/courses` | Include pagination; include course metadata params. |
| List pages | `GET /api/v1/courses/:course_id/pages` | Used for title collision detection. |
| Create page | `POST /api/v1/courses/:course_id/pages` | Body: `{ wiki_page: { title, body, published: true } }` |
| Update page | `PUT /api/v1/courses/:course_id/pages/:url` | Body: `{ wiki_page: { body } }` |

Auth header: `Authorization: Bearer <token>`.

### SP2 Safety and UX Decisions

| Concern | Decision |
|---|---|
| Missing API token | Fail only inside API-dependent tools with friendly guidance. |
| Invalid Canvas HTML | Block before publish unless `forcePublish: true`. |
| FERPA/PII | Block obvious student IDs and grade disclosures; reduce false positives for ordinary emails. |
| Title collision | Return structured `TITLE_COLLISION`; require rerun with `collisionAction`. |
| Version history | Show Git/version-control tip after every successful publish. |
| Rate limits | Retry 429s with backoff before surfacing error. |

## SP3 Accessibility Context

SP3 added advisory WCAG 2.1 AA checks across the full tool surface.

### New Files

| File | Responsibility |
|---|---|
| `src/tools/contrast.ts` | `wcagContrastRatio(hex1, hex2)` — four-line WCAG formula using existing `color` package |
| `src/tools/accessibility.ts` | `auditAccessibility(html): AccessibilityWarning[]` — five advisory checks |

### Checks Implemented

| Check | Code | Notes |
|---|---|---|
| Color contrast | `contrast-ratio` | Same-element inline pairs only. Catches `background:` shorthand and `background-color:`. Large text threshold 3:1, body text 4.5:1. |
| Meaningful alt text | `empty-alt` | Flags content images with `alt=""`. Skips decorative patterns (spacer/pixel/blank/transparent/1x1). Missing alt is RCE's domain. |
| Heading hierarchy | `heading-skip` | Flags level jumps (H2→H4). Level resets (H4→H2) are valid. One warning per document, first skip only. |
| Descriptive links | `vague-link` | Exact match against a set: click here, here, read more, more, link, this link, learn more. |
| Table headers | `table-no-headers` | Flags `<table>` blocks with no `<th>`. |
| Video captions | Deferred to SP5 | Panopto integration not yet built; half-built check creates false positives. |

### Integration Points

| File | What changed |
|---|---|
| `src/wizard.ts` | Primary and secondary color prompts check contrast against white; re-prompt loop with `confirm` if below 4.5:1 |
| `src/tools/generate.ts` | Calls `auditAccessibility` after `validateCanvasHtml`; appends `a11y: check — message` strings to `warnings[]` |
| `src/tools/publish.ts` | Calls `auditAccessibility`; appends `accessibilityWarnings?: AccessibilityWarning[]` to `PublishSuccess` (non-blocking) |
| `src/index.ts` | `validate_canvas_html` handler calls both validators; returns two labeled sections ("Canvas RCE" / "Accessibility WCAG 2.1 AA — advisory") |

### Key Design Decision

`isError` in the `validate_canvas_html` response is driven by RCE violations only. Accessibility issues are advisory and must never mark the response as an error, even when present.

## SP4 Technical Context

SP4 added two MCP tools for visual design critique and mechanical redesign.

### New Files

| File | Responsibility |
|---|---|
| `src/kb/design-principles.md` | Condensed design principles (~450 words) read at runtime; not compiled |
| `src/tools/critique.ts` | 8 check functions, score calculation, strengths derivation, `critiqueCanvasPage()` |
| `src/tools/redesign.ts` | Font floor fix, hero URL comment fix, accessibility wiring, `redesignCanvasPage()` |

### Checks Implemented

| # | Check | Area | Detection | Priority |
|---|---|---|---|---|
| 1 | Unreplaced hero | completeness | `HERO_IMAGE_URL` substring | high |
| 2 | Wall of text | content | Any `<p>` inner text > 80 words | high |
| 3 | No headings | hierarchy | Zero `<h2>` or `<h3>` elements | high |
| 4 | Too sparse | content | Total word count < 100 | medium |
| 5 | Color chaos | color | > 7 distinct hex colors (3-digit expanded before dedup) | medium |
| 6 | Font below floor | typography | Any `font-size: Npx` where N < 13 | medium |
| 7 | Missing submission language | completeness | assignment page with no submit/upload/due/deadline | medium |
| 8 | Column imbalance | layout | col-md-8 text > 3× col-md-4 text (depth-counted, not lazy regex) | low |

### KB Injection Pattern (Comprehensive Mode)

No Anthropic API call is made from the server. Claude IS the MCP host. Comprehensive mode loads `src/kb/design-principles.md` via `readFileSync` and attaches it as `kbContext` in the response. Claude reads the KB alongside the structured findings and provides holistic design judgment.

The `loadKb()` path uses `import.meta.url` with `../../src/kb/design-principles.md` relative to the compiled `dist/tools/` location. In tests (Vitest, TypeScript-native), `import.meta.url` resolves from `src/tools/`, making the same relative path resolve correctly in both contexts.

### Integration Points

| File | What changed |
|---|---|
| `src/index.ts` | Added imports + registered `critique_canvas_page` and `redesign_canvas_page` |
| `src/tools/redesign.ts` | Calls `auditAccessibility` from SP3 unconditionally on output HTML |

---

## Known Documentation Notes

- `docs/superpowers/specs/2026-04-29-mcp-future-additions.md` has a numbering collision in body headings around Panopto and Assignment Folder Ingest. Follow the build-order table and this roadmap: SP5 is Panopto, SP6 is Assignment Folder Ingest.
- `docs/handoff-to-Claude.md` should be updated at each handoff with reasoning and next action.
- `docs/feature-roadmap.md` should stay professor-facing and should not accumulate deep implementation detail.

## Update Checklist

When work changes roadmap status:

1. Update this file with technical status and context.
2. Update `docs/feature-roadmap.md` with professor-facing status.
3. Update `docs/handoff-to-Claude.md` if handing work to Claude.
4. Commit the docs update with the implementation or immediately after the handoff.
