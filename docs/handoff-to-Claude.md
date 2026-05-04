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

## Latest Implementation Step

Codex implemented SP2 Task 1: shared types and config shape.

- Added optional SP2 config fields: `professorEmail`, `favoriteCourses`, and `kbTipShown`.
- Made `apiToken` optional in `InstitutionConfig` to preserve the manual HTML workflow.
- Added Canvas API domain types: `CanvasEnrollment`, `CanvasCourse`, `CanvasPage`, `ToolError`, `SemesterFilter`, and `CollisionAction`.
- Added config tests proving optional SP2 fields persist and config can exist without a Canvas API token.

Verification:

- `npm test -- tests/config.test.ts`: 6 passing
- `npm test`: 35 passing
- `npm run build`: passing

Next implementation step: SP2 Task 2, Canvas API client.

I did not modify runtime behavior in this step beyond shared TypeScript types and config tests. The project artifacts changed were `src/types.ts`, `tests/config.test.ts`, the SP2 plan, this handoff file, and `docs/technical-roadmap.md`.

## Git / Worktree Notes

- Branch observed: `master`
- Remote observed: `origin/master`
- Pre-existing untracked files were left alone:
  - `AGENTS.md`
  - `.claude/`
- Files intended for this step:
  - `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`
  - `docs/handoff-to-Claude.md`
  - `docs/feature-roadmap.md`
  - `AGENTS.md`
  - `.claude/settings.local.json`

## Verification

- No runtime tests were required because this step only adds planning documentation.
- `git status --short --branch` should show only the two new docs files before commit, plus the pre-existing untracked local files listed above.

## Next Step

Implement Task 1 from `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`: extend SP2 config/types and commit that task before moving to the Canvas API client.
