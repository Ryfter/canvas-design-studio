# Handoff to Claude — Canvas Design Studio SP4

**Date:** 2026-05-05
**From:** Claude (claude-sonnet-4-6)
**To:** Claude / Codex
**Project:** Canvas Design Studio MCP Server
**Repo:** `D:\Dev\canvas-design-studio` (private: github.com/Ryfter/canvas-design-studio)

## SP3 Status: COMPLETE — All 7 Tasks Done

### What Was Built

**Task 1 — `src/tools/contrast.ts` + `tests/contrast.test.ts`**
- `wcagContrastRatio(hex1, hex2): number` using `Color.luminosity()` from the existing `color` package
- No new npm dependency
- 4 tests passing

**Task 2 — `src/tools/accessibility.ts` + `tests/accessibility.test.ts`**
- `auditAccessibility(html): AccessibilityWarning[]` — five advisory WCAG 2.1 AA checks
- Checks: color contrast (same-element inline pairs, catches `background:` hex shorthand AND `background-color:`), meaningful alt text, heading hierarchy, descriptive links, table headers
- Video captions check deliberately excluded (deferred to SP5 — Panopto not yet built)
- 19 tests passing

**Task 3 — `src/wizard.ts`**
- Primary and secondary color prompts wrapped in `while(true)` loops
- After each entry: computes `wcagContrastRatio(hex, '#ffffff')`. If ≥ 4.5, prints pass and breaks. If below, prints ratio with marginal/fail label, warns about white text, offers `confirm` to proceed or re-enter.
- No wizard tests (interactive TTY; contrast math covered by Task 1)

**Task 4 — `src/tools/generate.ts` + `tests/generate.test.ts`**
- Imports `auditAccessibility`; calls it after `validateCanvasHtml`
- Appends `a11y: check — message` strings to `warnings[]`
- New test: `secondary: '#cccccc'` triggers contrast warning via `background:#cccccc;color:#ffffff` badge in hero

**Task 5 — `src/tools/publish.ts` + `tests/publish.test.ts`**
- Added `accessibilityWarnings?: AccessibilityWarning[]` to `PublishSuccess`
- Calls `auditAccessibility(input.html)` before Canvas API; appended to both create and update success responses via conditional spread (non-blocking, never prevents publishing)
- New test: publishes low-contrast HTML, verifies `accessibilityWarnings` present in success response

**Task 6 — `src/index.ts`**
- Imports `auditAccessibility`
- `validate_canvas_html` handler now calls both `validateCanvasHtml()` and `auditAccessibility()`
- Returns two clearly labeled sections: "Canvas RCE" (blocking, drives `isError`) and "Accessibility WCAG 2.1 AA — advisory" (never blocks)

**Task 7 — Docs**
- `docs/handoff-to-Claude.md` updated (this file)
- `docs/technical-roadmap.md` updated — SP3 marked Done, SP4 marked Next
- `docs/feature-roadmap.md` updated — accessibility moved to Available Now

### Verification

- `npm test`: 107 passing (11 test files)
- `npm run build`: passing

### Git

Latest commits:
- `7e8f0b9` feat: extend validate_canvas_html with WCAG 2.1 AA audit
- `4c48778` feat: add accessibility audit to publish flow
- `63b223a` feat: add accessibility audit to page generator
- `3ea006f` feat: add WCAG contrast check to setup wizard
- `ecb1510` feat: add accessibility audit module (5 WCAG checks)
- `ac9c78c` feat: add WCAG contrast ratio helper

Branch: `master`
Remote: `origin`

---

## SP3 Design Decisions (preserved for SP4+)

| Decision | Choice | Reasoning |
|---|---|---|
| Blocking vs advisory | Advisory throughout | Accessibility is professor's responsibility; tool informs, never gates |
| Architecture | New module, not extending validator | Validator = "will Canvas accept this"; a11y = different domain. Same pattern as gotchas.ts |
| Separate field vs severity flag | `accessibilityWarnings: AccessibilityWarning[]` alongside RCE `violations[]` | RCE and a11y are categorically different — structural separation makes this unmissable |
| New dependency? | No — use existing `color` package | `.luminosity()` already available; four-line formula |
| Video captions | Deferred to SP5 | Panopto integration not built; half-built check creates false positives |
| Token efficiency | Short, actionable messages | Tool responses land in AI context window on every call — verbose messages waste tokens |
| `background:` shorthand | Caught by contrast check | Template uses shorthand throughout; missing it would make the check useless for generated HTML |
| `isError` in validate response | Only set by RCE violations | A11y issues are advisory — they must never mark the response as an error |

---

## Next Step: SP4 — Design Intelligence Brain

### What SP4 Builds

A critique and redesign capability. Given a Canvas page, the tool should:
1. Assess it against design principles (visual hierarchy, spacing, contrast, information architecture)
2. Return actionable recommendations ranked by impact
3. Optionally generate a revised version

This is the feature Kevin most wanted from the start — the AI that has opinions about design, not just rules.

### Files Likely Involved

| File | Action | Purpose |
|---|---|---|
| `src/tools/critique.ts` | Create | Design critique engine |
| `src/tools/redesign.ts` | Create | Generate improved HTML from critique findings |
| `src/index.ts` | Modify | Register `critique_canvas_page` and `redesign_canvas_page` tools |
| `docs/canvas-design-kb/` | Read | Source of design principles for critique checks |
| `tests/critique.test.ts` | Create | Unit tests for critique engine |
| `tests/redesign.test.ts` | Create | Unit tests for redesign output |

### Key Questions for Brainstorm

- Should `critique_canvas_page` use the existing KB content (`03-design-systems/`, `06-accessibility/`) as its rule set, or does it need a new curated critique KB?
- Should `redesign_canvas_page` accept the original HTML + critique findings and return revised HTML, or should critique implicitly offer redesign in a single tool?
- How opinionated should the tool be? "The hero section is visually strong" vs "H2 runs 38 words — split into a headline and subtitle"?
- Token budget: critique responses live in AI context on every call. How verbose is too verbose?

### Start With

Run `/brainstorm` on SP4 — Design Intelligence Brain. Review the existing design KB before proposing approaches:
- `docs/canvas-design-kb/02-design-md/DESIGN-MD-Canvas-Template.md`
- `docs/canvas-design-kb/03-design-systems/Component-Library.md`
- `docs/canvas-design-kb/06-accessibility/Accessibility-Overview.md`

---

## Implementation Plan Location

`docs/superpowers/plans/2026-05-05-sp3-accessibility.md`

## Spec Location

`docs/superpowers/specs/2026-05-05-sp3-accessibility-design.md`
