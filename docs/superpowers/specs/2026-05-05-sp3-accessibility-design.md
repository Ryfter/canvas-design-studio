# SP3 — Accessibility Module Design Spec

**Date:** 2026-05-05
**Status:** Design complete — ready for implementation plan
**Sub-project:** SP3 of 8 (see `2026-04-29-mcp-future-additions.md` for build order)
**Brainstorming session:** 2026-05-05

---

## What We're Building

A WCAG 2.1 AA accessibility audit layer that runs alongside the existing Canvas RCE validator — never replacing it, never blocking it. Five checks, all advisory. Professors see accessibility warnings the same way they see generation output: as actionable, concise notices that inform without interrupting.

The core design principle separating SP3 from SP1/SP2: **a physical Canvas problem (RCE violation) and an accessibility problem are categorically different.** RCE violations break Canvas silently. Accessibility failures exclude students silently. Both matter — but they must be structurally distinct so neither gets confused for the other.

---

## Architecture

### New Files

| File | Purpose |
|---|---|
| `src/tools/contrast.ts` | WCAG contrast ratio computation using existing `color` package |
| `src/tools/accessibility.ts` | Five a11y checks — `auditAccessibility(html)` |
| `tests/contrast.test.ts` | Pure math tests for contrast helper |
| `tests/accessibility.test.ts` | One focused test per check scenario |

### Modified Files

| File | Change |
|---|---|
| `src/wizard.ts` | Inline contrast check after primary/secondary color entry |
| `src/tools/generate.ts` | Call `auditAccessibility()`, append warnings to `GenerateOutput.warnings[]` |
| `src/tools/publish.ts` | Append a11y warnings to success response (non-blocking) |
| `src/index.ts` | `validate_canvas_html` handler calls both `validateCanvasHtml()` and `auditAccessibility()` |
| `tests/generate.test.ts` | One new test: a11y warnings appear when triggered |
| `tests/publish.test.ts` | One new test: a11y warnings in success response, non-blocking |

### Unchanged

`src/tools/validate.ts` and `ValidationResult` are untouched. `valid` still means "no RCE violations." No existing types break. No existing tests change.

---

## New Types

```ts
// src/tools/accessibility.ts
export interface AccessibilityWarning {
  check: string;    // machine-readable check name (e.g. 'heading-skip')
  message: string;  // professor-readable, concise
  context?: string; // offending snippet, truncated to ~60 chars
}
```

---

## `src/tools/contrast.ts`

Single exported function. No new npm dependency — uses the `color` package already installed.

```ts
import Color from 'color';

export function wcagContrastRatio(hex1: string, hex2: string): number {
  const l1 = Color(hex1).luminosity();
  const l2 = Color(hex2).luminosity();
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
```

**WCAG thresholds:**
- Normal text: 4.5:1 minimum (AA)
- Large text: 3.0:1 minimum (AA) — heuristic: `font-size` ≥ 24px, or bold (`font-weight: 700`) with `font-size` ≥ 18px

---

## `src/tools/accessibility.ts` — The Five Checks

### Check 1 — Color Contrast

**Scope:** Same-element inline style pairs only. No DOM tree traversal — background and text color must appear in the same `style=""` attribute to be checked. Parent/child pairs are out of scope (too much false-positive risk without a DOM).

**Detection:** Regex-extract `color:` and `background-color:` (or `background:` shorthand when the value is a bare hex — not a gradient or URL) from the same `style` attribute. Parse hex values only (`#rrggbb` / `#rgb`). Compute ratio via `wcagContrastRatio()`. Apply normal-text (4.5:1) or large-text (3.0:1) threshold based on parsed `font-size` and `font-weight` in the same style block.

**Graceful degradation:** If either color value is not a parseable hex (e.g. `rgb()`, `rgba()`, named color, CSS variable), skip the contrast check for that element silently. Better to miss a check than to crash or false-positive on unparseable input.

**Large-text heuristic:** Only `px` units are detected. `em`/`rem` cannot be resolved to pixels without a DOM — elements using those units are checked against the stricter 4.5:1 threshold by default (conservative, not lenient).

**Warning format:**
```
check: 'contrast-ratio'
message: 'White on #D64309: 4.50:1 — marginal for body text (AA requires 4.5:1)'
context: 'color:#ffffff;background-color:#D64309'
```

**Non-goals:** Cross-element background inference, CSS variables, computed styles, non-px font size resolution. These require a DOM and are out of scope for a string-based auditor.

---

### Check 2 — Meaningful Alt Text

**Scope:** Images with non-empty `src` and empty `alt=""`.

The existing RCE check already catches missing `alt` entirely — that's a blocking violation. This check catches the next failure mode: a professor who adds `alt=""` on a content image (either by habit or copy-paste). Empty alt is correct for decorative images only.

**Detection:** Find `<img>` tags with `alt=""` and `src` that does not match decorative patterns: `spacer`, `pixel`, `blank`, `transparent`, `1x1`.

**Warning format:**
```
check: 'empty-alt'
message: 'Content image has alt="" — add descriptive alt text or confirm it is decorative'
context: '<img src="chart.png" alt=""...'
```

---

### Check 3 — Heading Hierarchy

**Scope:** All heading tags (H2–H6) in document order. H1 is already banned by RCE.

**Detection:** Extract heading levels in sequence. Flag the first instance where a level increases by more than 1 (e.g. H2 → H4). Level resets (H4 → H2) are valid — a new section can start at any level.

**Warning format:**
```
check: 'heading-skip'
message: 'Heading jumps from H2 to H4 — skipped levels break screen reader navigation'
context: '<h4>Submission Requirements</h4>'
```

---

### Check 4 — Descriptive Links

**Scope:** Full text content of `<a>` tags.

**Detection:** Extract text between `<a ...>` and `</a>`. Exact-match (case-insensitive, trimmed) against: `click here`, `here`, `read more`, `more`, `link`, `this link`, `learn more`. Only exact matches — partial matches produce too many false positives (e.g. "learn more about the rubric" is fine).

**Warning format:**
```
check: 'vague-link'
message: '"click here" is not descriptive — use text that explains where the link goes'
context: '<a href="...">click here</a>'
```

---

### Check 5 — Table Headers

**Scope:** Any `<table>` element in the HTML.

**Detection:** Flag `<table>` blocks that contain no `<th>` element. A table with only `<td>` is almost always a data table missing column or row headers.

**Warning format:**
```
check: 'table-no-headers'
message: 'Table has no <th> elements — add headers so screen readers can identify columns and rows'
context: '<table ...'
```

---

### Explicitly Deferred

**Video captions check** (was in original SP3 spec): deferred to SP5 (Panopto integration). Checking Panopto embeds without a Panopto API integration produces false positives and half-built logic. Removed from SP3 scope.

---

## Token Efficiency

Warning messages are **short and actionable, not educational.** The AI reading tool output doesn't need WCAG background — it needs enough information to surface the right message to the professor.

- Good: `"White on #D64309: 4.50:1 — marginal for body text (AA requires 4.5:1)"`
- Avoid: `"According to WCAG 2.1 Success Criterion 1.4.3, text must have a contrast ratio of at least 4.5:1 against its background..."`

Test HTML fixtures stay minimal — five-line snippets that trigger each check. No full-page test fixtures.

This principle applies to all future SP work: tool response verbosity is a token budget. Prefer concise, actionable output.

---

## Wizard Integration

After `deriveColors()` in `runWizard()`, check both institution colors against white using `wcagContrastRatio()`. Print result inline before saving config.

**Pass (silent for good contrast):**
```
✓ Primary brand color: #0033A0
  Contrast on white: 10.60:1 — passes WCAG AA
```

**Marginal/fail (prints warning, asks to proceed):**
```
✓ Secondary / accent color: #D64309
  Contrast on white: 4.50:1 — marginal for body text (AA requires 4.5:1)
  White text on this color may fail at small sizes. Consider darkening slightly.
  Proceed with this color? (Y/n)
```

If `n`: re-prompt for that color. If `y` or Enter: continue — advisory, not blocking.

Both primary and secondary are checked independently. Colors that pass AA print a single confirmation line with no extra noise. `setup_institution` (re-run wizard) gets this behavior automatically.

---

## Generator Integration

`generateCanvasPage()` calls `auditAccessibility()` on the generated HTML and appends any warnings to `GenerateOutput.warnings[]`, prefixed with `a11y:`:

```ts
warnings: [
  // RCE violations (existing)
  'No box-shadow — stripped by Canvas sanitizer',
  // A11y warnings (new)
  'a11y: contrast-ratio — White on #D64309: 4.50:1 — marginal for body text',
]
```

`GenerateOutput` type is unchanged — same `warnings: string[]` field, same consumers.

The current template already produces accessible HTML in practice (alt text on hero, no skipped headings, no vague links, no tables). The audit is a safety net for future template changes and `styleNotes` content.

---

## Publisher Integration

`publishToCanvas()` calls `auditAccessibility()` on the HTML and appends results to the success response. Non-blocking — a11y warnings never prevent a publish.

```ts
export interface PublishSuccess {
  url: string;
  action: 'created' | 'updated';
  pageTitle: string;
  accessibilityWarnings?: AccessibilityWarning[]; // new, optional
  tip: string;
}
```

The field is omitted (not `[]`) when there are no warnings, keeping the response compact.

---

## `validate_canvas_html` MCP Handler

The handler calls both functions and returns both result sets:

```ts
const rceResult = validateCanvasHtml(html);
const a11yWarnings = auditAccessibility(html);

return {
  content: [{
    type: 'text',
    text: JSON.stringify({
      valid: rceResult.valid,
      violations: rceResult.violations,         // RCE — may block Canvas
      accessibilityWarnings: a11yWarnings,       // WCAG — advisory only
    }, null, 2),
  }],
};
```

When both arrays are empty, the response is clean and minimal. When warnings are present, they're structurally distinct — a professor or AI reading the output cannot confuse a Canvas violation with an accessibility advisory.

---

## Testing Strategy

**`tests/contrast.test.ts`** — pure math, no mocks:
- BSU blue on white: 10.60:1, passes AA
- BSU orange on white: 4.50:1, flagged as marginal
- Clearly failing pair (e.g. `#cccccc` on white: ~1.6:1)
- Large text threshold: pair that fails 4.5:1 but passes 3.0:1 with large-text heuristic

**`tests/accessibility.test.ts`** — one focused test per scenario:
- Contrast: same-element pair below threshold flagged; pair on separate elements not flagged
- Alt text: `alt=""` on content image flagged; decorative pattern (`src="spacer.gif"`) not flagged; missing `alt` not double-flagged
- Heading hierarchy: H2→H4 skip flagged; H2→H3→H4 clean; H4→H2 level reset clean
- Descriptive links: `"click here"` flagged; `"View the assignment rubric"` clean; partial match `"learn more about this"` clean
- Table headers: `<table>` with only `<td>` flagged; `<table>` with `<th>` clean

**`tests/generate.test.ts`** — one new test: HTML with a heading skip triggers an `a11y:` prefixed warning in `GenerateOutput.warnings`

**`tests/publish.test.ts`** — one new test: HTML with a vague link publishes successfully and returns `accessibilityWarnings` in the success response

---

## Open Questions (resolved in brainstorming)

| Question | Decision | Reasoning |
|---|---|---|
| Separate field or severity flag on violations? | Separate `accessibilityWarnings` field | RCE and a11y are categorically different — structural separation preserves that |
| Standalone module or extend validator? | New `accessibility.ts` module | Validator's job is "will Canvas accept this" — a11y is a different domain; matches `gotchas.ts` pattern |
| Contrast check depth in validator? | Same-element inline pairs only | Cross-element requires DOM; heuristic inference produces false positives |
| New npm dependency for contrast? | No — use existing `color` package | `.luminosity()` is already available; four lines of math |
| Video captions check? | Deferred to SP5 | Requires Panopto integration to be useful; out of scope for SP3 |
| Advisory or blocking? | Advisory throughout | Accessibility is the professor's responsibility to fix; the tool informs, never gates |
