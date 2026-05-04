# Canvas Design Studio Technical Roadmap

**Last updated:** 2026-05-04  
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
| SP2 | Optional Canvas API publish | In progress | `src/canvas-api.ts`, `src/tools/list-courses.ts`, `src/tools/publish.ts`, `src/tools/gotchas.ts`, `src/index.ts`, `src/wizard.ts` | `docs/superpowers/specs/2026-05-04-sp2-publish-canvas-design.md`, `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md` | Plan is written. Apply review corrections before implementation. |
| SP3 | Accessibility module | Next | likely `src/tools/validate.ts`, `src/tools/generate.ts`, `src/wizard.ts`, new tests | `docs/superpowers/specs/2026-04-29-mcp-future-additions.md` | Needs brainstorm/spec before implementation. |
| SP4 | Design Intelligence Brain | Later | likely `src/tools/critique.ts`, `src/tools/redesign.ts`, design KB files | Future additions doc | Uses host AI/design KB to critique and improve Canvas page design. |
| SP5 | Panopto integration | Later | likely `src/tools/panopto.ts`, config additions | Future additions doc | Depends on API auth details and BSU iframe whitelist confirmation. |
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

Expected scope from future additions:

| Check | Type | Notes |
|---|---|---|
| Color contrast | Advisory | Validate body text and large text ratios. |
| Meaningful alt text | Advisory | Content images need useful alt text. |
| Heading hierarchy | Advisory | Start at H2 and do not skip levels. |
| Descriptive links | Advisory | Flag "click here", "here", "read more". |
| Table headers | Advisory | Data tables need `<th>`. |
| Video captions | Advisory | Useful for Panopto later. |

Likely dependency to evaluate: `wcag-contrast`.

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
