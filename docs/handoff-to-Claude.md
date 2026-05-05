# Handoff to Claude - Canvas Design Studio SP2

**Date:** 2026-05-04  
**From:** Codex  
**To:** Claude  
**Project:** Canvas Design Studio MCP Server  
**Repo:** `D:\Dev\canvas-design-studio`

## Completed This Step

- Read `docs/handoff-to-codex.md`.
- Read `docs/superpowers/specs/2026-05-04-sp2-publish-canvas-design.md`.
- Found Claude's local Superpowers `writing-plans` skill at `C:\Users\krank\.claude\plugins\cache\claude-plugins-official\superpowers\5.0.7\skills\writing-plans\SKILL.md`.
- Applied that workflow to generate the SP2 implementation plan:
  - `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`

## Reasoning

The handoff from Claude said not to skip `writing-plans`, and the SP2 spec is broad enough that direct implementation would risk mixing API client concerns, MCP routing, FERPA checks, collision handling, and course-list formatting in one pass. I used the writing-plans format from the local Superpowers skill and matched the existing SP1 plan style: file map first, then task-sized TDD steps with commands and commits.

One spec detail needed an implementation adjustment. The spec describes a confirmation dialog for similar page titles, but MCP tool calls are request/response and cannot pause mid-call for a selection. The plan preserves the safety requirement by returning a structured `TITLE_COLLISION` result and requiring the professor to rerun `publish_to_canvas` with `collisionAction: "update"`, `"create"`, `"related"`, or `"cancel"`. That keeps overwrite intent explicit and makes the flow testable.

## User Clarification - Canvas API Must Stay Optional

Kevin clarified that Canvas API usage should be a legitimate advanced workflow, not a barrier to entry. The original version of this project generated Canvas-safe HTML without using the Canvas API at all, and that remains an important beginner workflow.

Implementation implication: do not require a Canvas API token during setup or server startup. A professor should be able to configure institution basics, generate HTML with `generate_canvas_page`, and paste that HTML into Canvas manually. `list_canvas_courses` and `publish_to_canvas` may require an API token and should return friendly missing-token guidance when called without one, but the rest of the tool should work without API credentials.

I updated the SP2 plan to capture this as a first-class implementation decision and added a Task 7 note to make the wizard's API token prompt optional.

## Additional Review Feedback Added

I also added the rest of the Codex review feedback to the SP2 plan so it is not lost before implementation:

- Keep `courseId` required for `publish_to_canvas`; if missing, return `COURSE_ID_REQUIRED` and tell the professor to run `list_canvas_courses`.
- Request Canvas course metadata with `include[]=term`, `include[]=total_students`, and `include[]=teachers`.
- Verify the correct Canvas enrollment-state query before implementation; current docs point to `enrollment_workflow_state[]`, not the draft spec's `invited_or_pending` value.
- Display Canvas nicknames using `nickname ?? friendly_name ?? name`.
- Add token-containment or token-set similarity to fuzzy title matching so suffixes do not bypass collisions.
- Treat non-professor email addresses as warning-only or domain-allowlisted in FERPA scanning; keep student IDs and grade/name patterns blocking.
- Make 403 guidance role-aware, not only token-scope-specific.
- Fix the planned Canvas API error test so it does not consume a single mocked fetch twice.

## Roadmap Update

Kevin asked for a regularly updated, professor-shareable roadmap. I rewrote `docs/feature-roadmap.md` so it lists each feature by implementation step, shows what is done, in progress, next, later, and idea-stage, and includes explicit feedback questions for other professors.

Kevin then clarified that two roadmap artifacts are needed: a technical roadmap with full context and a professor-facing roadmap for sharing. I split the roadmap into:

- `docs/technical-roadmap.md` for implementation context, technical decisions, risks, and source links.
- `docs/feature-roadmap.md` for a concise customer-facing summary.
- `docs/roadmap-image-prompt.md` for static infographic and animated roadmap prompt variants.

I also updated the Roadmap Update Policy in `AGENTS.md`: future agents should update both roadmap files whenever feature status, implementation steps, priorities, professor feedback, or completed sub-projects change.

## Latest Implementation Steps

Codex implemented SP2 Task 1: shared types and config shape.

- Added optional SP2 config fields: `professorEmail`, `favoriteCourses`, and `kbTipShown`.
- Made `apiToken` optional in `InstitutionConfig` to preserve the manual HTML workflow.
- Added Canvas API domain types: `CanvasEnrollment`, `CanvasCourse`, `CanvasPage`, `ToolError`, `SemesterFilter`, and `CollisionAction`.
- Added config tests proving optional SP2 fields persist and config can exist without a Canvas API token.

Codex then implemented SP2 Task 2: Canvas API client.

- Added `src/canvas-api.ts`.
- Added `tests/canvas-api.test.ts`.
- Confirmed Canvas API course docs through Context7 before implementation.
- Implemented bearer auth, JSON POST/PUT bodies, pagination through `Link` headers, 429 retry/backoff, and professor-readable `CanvasApiError` mapping.
- Applied the review corrections: course listing uses `include[]=term`, `include[]=total_students`, `include[]=teachers`, and `enrollment_workflow_state[]`; 403 messaging is role-aware; the API error test stores one promise instead of consuming one mocked fetch twice.

Codex then implemented SP2 Task 3: gotcha message module.

- Added `src/tools/gotchas.ts`.
- Added `tests/gotchas.test.ts`.
- Implemented coordinator-shell warnings, title collision rerun instructions, role-aware Canvas permission guidance, FERPA warning text, and the version-control tip.
- Covered singular/plural course counts and enrollment-derived counts.

Codex then implemented SP2 Task 4: list_canvas_courses tool logic.

- Added `src/tools/list-courses.ts`.
- Added `tests/list-courses.test.ts`.
- Implemented semester-to-enrollment-workflow mapping with reviewed Canvas states.
- Added no-token handling that preserves the manual HTML workflow and avoids API calls.
- Added favorite-course pinning, `nickname ?? friendly_name` display, one-time naming convention tip persistence, and coordinator-shell warnings.

Codex then implemented SP2 Task 5: publish_to_canvas tool logic.

- Added `src/tools/publish.ts`.
- Added `tests/publish.test.ts`.
- Implemented API-token and `courseId` preflight checks before any Canvas API calls.
- Implemented FERPA blocking for obvious BSU student IDs, 9-digit student IDs, and grade-disclosure patterns.
- Preserved the manual/no-API workflow in the missing-token response and kept ordinary email addresses non-blocking to avoid false positives in assignment content.
- Reused `validateCanvasHtml` as a publish gate, with `forcePublish: true` available for reviewed exceptions.
- Implemented fuzzy page-title collision detection using normalized Levenshtein plus token containment so suffix variations still collide.
- Implemented explicit collision actions: `update`, `create`, `related`, and `cancel`.
- Mapped Canvas 403 errors through the role-aware token/permission guidance.

Reasoning for Task 5: `publish_to_canvas` should fail early when publishing is unsafe or underspecified, but it should not make the beginner workflow harder. The API token check returns a friendly direct-publishing-only error, FERPA and validation checks run before HTTP, and similar-title collisions force an explicit rerun choice rather than silently overwriting or duplicating Canvas pages.

Verification:

- `npm test -- tests/config.test.ts`: 6 passing
- `npm test -- tests/canvas-api.test.ts`: 9 passing
- `npm test -- tests/gotchas.test.ts`: 8 passing
- `npm test -- tests/list-courses.test.ts`: 12 passing
- `npm test -- tests/publish.test.ts`: 18 passing
- `npm test`: 82 passing
- `npm run build`: passing

Next implementation step: SP2 Task 6, register `list_canvas_courses` and `publish_to_canvas` in `src/index.ts`.

The project artifacts changed across these implementation steps include `src/types.ts`, `src/canvas-api.ts`, `src/tools/gotchas.ts`, `src/tools/list-courses.ts`, `src/tools/publish.ts`, `tests/config.test.ts`, `tests/canvas-api.test.ts`, `tests/gotchas.test.ts`, `tests/list-courses.test.ts`, `tests/publish.test.ts`, the SP2 plan, this handoff file, and roadmap docs.

## Git / Worktree Notes

- Branch observed: `master`
- Remote observed: `origin/master`
- No unrelated untracked files were observed during Task 5.
- Files intended for this step:
  - `src/tools/publish.ts`
  - `tests/publish.test.ts`
  - `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`
  - `docs/technical-roadmap.md`
  - `docs/feature-roadmap.md`
  - `docs/handoff-to-Claude.md`

## Verification

- `npm test -- tests/publish.test.ts`: 18 passing
- `npm test`: 82 passing
- `npm run build`: passing

## Next Step

Implement Task 6 from `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`: register the Canvas course listing and publishing tools in `src/index.ts`.
