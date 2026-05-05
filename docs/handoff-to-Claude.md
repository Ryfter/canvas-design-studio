# Handoff to Claude — Canvas Design Studio SP3

**Date:** 2026-05-05
**From:** Claude (claude-sonnet-4-6)
**To:** Claude / Codex
**Project:** Canvas Design Studio MCP Server
**Repo:** `D:\Dev\canvas-design-studio` (private: github.com/Ryfter/canvas-design-studio)

## SP3 Status: In Progress — Tasks 1–2 of 7 Complete

### Completed This Step

**Task 1 — `src/tools/contrast.ts` + `tests/contrast.test.ts`**
- `wcagContrastRatio(hex1, hex2): number` using `Color.luminosity()` from the existing `color` package
- No new npm dependency
- 4 tests passing

**Task 2 — `src/tools/accessibility.ts` + `tests/accessibility.test.ts`**
- `auditAccessibility(html): AccessibilityWarning[]` — five advisory WCAG 2.1 AA checks
- Checks: color contrast (same-element inline pairs, catches `background:` hex shorthand AND `background-color:`), meaningful alt text, heading hierarchy, descriptive links, table headers
- Video captions check deliberately excluded (deferred to SP5 — Panopto not yet built)
- 19 tests passing (all scenarios per check)

**Why `background:` shorthand:** The generated Canvas HTML template uses `background:#hex` shorthand throughout (not `background-color:`). If the contrast check only matched `background-color:`, the generator integration test would never fire. Catching the shorthand also makes the auditor more useful for arbitrary Canvas HTML from professors.

**Token efficiency decision:** Warning messages are short and actionable (`"#fff on #ccc: 1.6:1 — fails WCAG AA for body text"`), not educational. All check names use kebab-case codes (`contrast-ratio`, `empty-alt`, `heading-skip`, `vague-link`, `table-no-headers`) for machine-readable output.

### Verification

- `npm test`: 105 passing (11 test files)
- `npm run build`: passing

### Git

- Latest commits:
  - `ecb1510` feat: add accessibility audit module (5 WCAG checks)
  - `ac9c78c` feat: add WCAG contrast ratio helper
- Branch: `master`
- Remote: `origin`

---

## Next Step: Task 3 — Wizard Integration

**File:** `src/wizard.ts`

**What to do:**
1. Add `confirm` to the `@inquirer/prompts` import
2. Add `import { wcagContrastRatio } from './tools/contrast.js';`
3. Wrap the primary color prompt in a `while (true)` loop: after entry, compute `wcagContrastRatio(primaryHex, '#ffffff')`. If ≥ 4.5, print pass and break. If below, print the ratio, warn about white text, and `await confirm({ message: 'Proceed with this color?', default: true })`. If user declines, loop back.
4. Same loop for secondary color.
5. No new wizard tests — wizard is interactive TTY; contrast math is covered by Task 1 tests.

**After Task 3:** `npm run build && npm test` → commit → push → start Task 4.

---

## Tasks 4–7 Summary (what remains)

| Task | File(s) | What changes |
|---|---|---|
| 4 | `src/tools/generate.ts`, `tests/generate.test.ts` | Import + call `auditAccessibility`, append `a11y: check — message` strings to `warnings[]`. One new test: low-contrast secondary (`#cccccc`) triggers a11y warning. |
| 5 | `src/tools/publish.ts`, `tests/publish.test.ts` | Add `accessibilityWarnings?: AccessibilityWarning[]` to `PublishSuccess`. Call `auditAccessibility` before Canvas API calls. Append to success response. Non-blocking. One new test. |
| 6 | `src/index.ts` | Import `auditAccessibility`. Update `validate_canvas_html` handler to call both `validateCanvasHtml()` and `auditAccessibility()`, return both in response with clear section labels. |
| 7 | `docs/handoff-to-Claude.md`, `docs/technical-roadmap.md`, `docs/feature-roadmap.md` | Mark SP3 done. Update roadmaps. Write final handoff for SP4. |

---

## SP3 Design Decisions (for future reference)

| Decision | Choice | Reasoning |
|---|---|---|
| Blocking vs advisory | Advisory throughout | Accessibility is professor's responsibility; tool informs, never gates |
| Architecture | New module, not extending validator | Validator = "will Canvas accept this"; a11y = different domain. Same pattern as gotchas.ts |
| Separate field vs severity flag | `accessibilityWarnings: AccessibilityWarning[]` alongside RCE `violations[]` | RCE and a11y are categorically different — structural separation makes this unmissable |
| New dependency? | No — use existing `color` package | `.luminosity()` already available; four-line formula |
| Video captions | Deferred to SP5 | Panopto integration not built; half-built check creates false positives |
| Token efficiency | Short, actionable messages | Tool responses land in AI context window on every call — verbose messages waste tokens |
| `background:` shorthand | Caught by contrast check | Template uses shorthand throughout; missing it would make the check useless for generated HTML |

## Implementation Plan Location

`docs/superpowers/plans/2026-05-05-sp3-accessibility.md`

## Spec Location

`docs/superpowers/specs/2026-05-05-sp3-accessibility-design.md`
