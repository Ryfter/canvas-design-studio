# SP4 — Design Intelligence Brain: Design Spec

**Date:** 2026-05-05
**Author:** Claude (claude-sonnet-4-6) via brainstorming skill
**Project:** Canvas Design Studio MCP Server
**Status:** Approved — ready for implementation planning

---

## Goal

Add visual design critique and redesign to the Canvas Design Studio MCP server. Professors submit Canvas HTML and get a scored, prioritized diagnosis of visual design problems. They then decide whether to apply fixes. If yes, a second tool produces improved HTML with mechanical fixes applied and hands the rest to Claude.

Accessibility is handled by SP3 and runs automatically after redesign — it is not part of this module.

---

## Scope

Two new MCP tools:

- `critique_canvas_page` — intake questionnaire + visual design analysis
- `redesign_canvas_page` — apply fixes to HTML based on critique findings

No new npm dependencies. No Anthropic API calls from within the server — Claude (the MCP host) is the AI. The tools give Claude structured data and, in comprehensive mode, inject KB context so Claude can reason holistically.

---

## Architecture

### Pipeline

```
professor submits HTML + page context
        ↓
critique_canvas_page
  quick:         8 code-based checks → CritiqueResult
  comprehensive: 8 code-based checks + KB design principles injected → CritiqueResult
        ↓
Claude presents findings to professor
professor decides: fix or not
        ↓  (if yes)
redesign_canvas_page
  quick:         mechanical fixes only → RedesignResult
  comprehensive: mechanical fixes + KB context injected → RedesignResult + Claude finishes the rest
        ↓
auditAccessibility (SP3) runs on output HTML automatically
        ↓
professor receives design-improved, a11y-checked HTML
```

### New Files

| File | Action | Responsibility |
|---|---|---|
| `src/tools/critique.ts` | Create | 8 quick checks, score calculation, KB loading for comprehensive mode |
| `src/tools/redesign.ts` | Create | Mechanical HTML fixes, accessibility wiring, KB bundling for comprehensive mode |
| `src/kb/design-principles.md` | Create | Condensed visual design principles (~500 tokens) injected in comprehensive mode |
| `src/index.ts` | Modify | Register and route two new MCP tools |
| `tests/critique.test.ts` | Create | One test per quick check + score + comprehensive mode structure |
| `tests/redesign.test.ts` | Create | Mechanical fix tests + accessibility wiring + comprehensive mode structure |

---

## Input / Output Types

### `critique_canvas_page`

```ts
interface CritiqueInput {
  html: string;
  pageType: 'assignment' | 'week-overview' | 'course-home' | 'syllabus' | 'other';
  primaryGoal: string;
  audience?: string;
  mode?: 'quick' | 'comprehensive'; // default: 'quick'
}

interface CritiqueFinding {
  area: 'hierarchy' | 'content' | 'color' | 'typography' | 'layout' | 'completeness';
  issue: string;       // one sentence — what is wrong
  suggestion: string;  // one sentence — how to fix it
  priority: 'high' | 'medium' | 'low';
}

interface CritiqueResult {
  score: number;              // 0–100
  mode: 'quick' | 'comprehensive';
  pageType: string;
  strengths: string[];
  findings: CritiqueFinding[];
  kbContext?: string;         // populated in comprehensive mode — KB principles for Claude to reason about
}
```

### `redesign_canvas_page`

```ts
interface RedesignInput {
  html: string;
  findings: CritiqueFinding[];
  mode?: 'quick' | 'comprehensive'; // default: 'quick'
  pageType?: string;
  primaryGoal?: string;
}

interface RedesignResult {
  html: string;
  appliedFixes: string[];
  skippedFindings: string[];
  accessibilityWarnings?: AccessibilityWarning[]; // from SP3 auditAccessibility
  kbContext?: string; // populated in comprehensive mode
}
```

---

## Critique Engine

### Score Calculation

Start at 100. Deduct per finding by priority:
- high: −15
- medium: −8
- low: −3

Floor at 0. Score is calculated after all checks run.

### Strengths

Strengths are derived from checks that pass, not from findings that are absent. If the page has clear headings, populate strengths with "Clear heading structure." If color count is within range, add "Consistent color palette." Strengths array should have 1–3 items for a typical page.

### Quick Mode — 8 Checks

All checks are code-based (regex / string analysis). Each returns a `CritiqueFinding | undefined`.

| # | Check | Area | Detection | Priority |
|---|---|---|---|---|
| 1 | Unreplaced hero | completeness | `HERO_IMAGE_URL` substring present in HTML | high |
| 2 | Wall of text | content | Any `<p>` inner text > 80 words | high |
| 3 | No headings | hierarchy | Zero `<h2>` or `<h3>` elements | high |
| 4 | Too sparse | content | Total word count across all text < 100 | medium |
| 5 | Color chaos | color | More than 7 distinct hex colors (both `#rrggbb` and `#rgb` forms counted; `#rgb` expanded to 6-digit before deduplication) | medium |
| 6 | Font below floor | typography | Any `font-size:\s*(\d+)px` where value < 13 | medium |
| 7 | Missing submission language | completeness | `pageType === 'assignment'` and no "submit" / "upload" / "due" / "deadline" in HTML (case-insensitive) | medium |
| 8 | Column imbalance | layout | Both `col-md-8` and `col-md-4` class attributes present in the HTML, and the text content of the `col-md-8` div has > 3× the word count of the `col-md-4` div (or vice versa). Detection uses first match of each class. | low |

### Comprehensive Mode

Runs all 8 quick checks, then loads `src/kb/design-principles.md` and attaches it as `kbContext` in the result. Claude (the host) reads the KB alongside the findings and provides holistic design judgment — content prominence, visual flow, whether the structure fits the stated goal — as part of its natural response to the professor. No API call is made from the server.

---

## Redesign Tool

### Quick Mode — Mechanical Fixes

Applies only fixes that require no content judgment:

| Finding area | Fix applied |
|---|---|
| `completeness` (unreplaced hero) | Inserts HTML comment `<!-- Replace HERO_IMAGE_URL with your hosted image URL (1200×400px) -->` immediately before the first `<img` element whose `src` attribute contains the literal string `HERO_IMAGE_URL` |
| `typography` (font below floor) | Replaces all `font-size:\s*(\d+)px` values where the number < 13 with `font-size:13px` |
| Everything else | Added to `skippedFindings` with the original `suggestion` string from the finding |

After mechanical fixes are applied, `auditAccessibility(html)` runs on the result. Non-empty output populates `accessibilityWarnings`.

### Comprehensive Mode

Applies the same mechanical fixes as quick mode, then loads `src/kb/design-principles.md` and attaches it as `kbContext`. The `skippedFindings` list and KB context together give Claude everything it needs to complete the redesign — rebalancing columns, breaking up walls of text, adding missing sections — using its own intelligence after the tool returns.

### Accessibility Wiring

`auditAccessibility` from `src/tools/accessibility.ts` runs unconditionally on the final HTML in both modes. Result is non-blocking — it never prevents redesign from returning. Populated in `accessibilityWarnings` only when non-empty.

---

## KB Design Principles File

`src/kb/design-principles.md` is a condensed reference (~500 tokens) covering:

- **Visual hierarchy** — size, weight, color, and spacing as signals; hero anchors the page; H2 > H3 > H4 weight progression
- **Whitespace** — 24px between major sections, 16px internal card padding, 8px compact contexts
- **Color usage** — primary for hero/nav/CTAs; secondary for accents only; neutrals for backgrounds; max 6–7 distinct colors per page
- **Typography** — body 14–15px / 1.65 line-height; labels 11px uppercase + letter-spacing; minimum 13px for any text
- **Component selection** — cards for structured content; callouts for tips/warnings; tables for comparative data; avoid free-floating paragraphs
- **Canvas constraints** — 860px max-width; inline styles only; no box-shadow/gap/opacity/transform; start at H2
- **Content prominence** — assignment brief belongs in the first or second card; submission instructions must be visible without scrolling on a 768px viewport

This file is read at runtime from disk when comprehensive mode is invoked. It is not compiled into the TypeScript build.

---

## MCP Tool Registration

### `critique_canvas_page` description
> Evaluate a Canvas HTML page for visual design quality. Returns a score, strengths, and prioritized findings. Use quick mode for a fast structural check; comprehensive mode for a full design review with KB context for Claude to reason about.

### `redesign_canvas_page` description
> Apply design fixes to Canvas HTML based on critique findings. Applies mechanical fixes automatically; returns remaining findings and KB context for Claude to address. Runs WCAG 2.1 AA accessibility check on output.

### Input schema additions to `src/index.ts`

Both tools follow existing schema patterns (`type: 'object' as const`, `required: [...]`, typed `properties`).

---

## Testing

### `tests/critique.test.ts` — 11 tests

| Test | Verifies |
|---|---|
| Flags unreplaced hero | `completeness` finding present |
| Flags wall of text | `content` finding for >80-word paragraph |
| Flags no headings | `hierarchy` finding |
| Flags too sparse | `content` finding for <100-word page |
| Flags color chaos | `color` finding for 8+ distinct hex colors |
| Flags font below floor | `typography` finding for `font-size:11px` |
| Flags missing submission language | `completeness` finding on `pageType: 'assignment'` |
| Flags column imbalance | `layout` finding when one column has 3× word count |
| Score deductions correct | 1 high + 1 medium = score 77 |
| Clean HTML scores high | No findings → score ≥ 85 |
| Comprehensive mode returns kbContext | `result.kbContext` is a non-empty string |

### `tests/redesign.test.ts` — 5 tests

| Test | Verifies |
|---|---|
| Fixes font below floor | `font-size:11px` → `font-size:13px` in output |
| Adds hero URL comment | `<!-- Replace HERO_IMAGE_URL` present in output |
| Non-mechanical findings go to skippedFindings | Wall-of-text finding in `skippedFindings`, HTML unchanged |
| Runs accessibility check on output | Low-contrast HTML → `accessibilityWarnings` populated |
| Comprehensive mode returns kbContext | `result.kbContext` is a non-empty string |

Total new tests: 16. Running total: ~123.

---

## Design Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| No internal Anthropic API call | Claude IS the host AI | MCP server runs inside Claude Code; calling API internally is redundant and costly |
| Comprehensive mode = KB injection | Load `design-principles.md` into response | Gives Claude the context it needs without a separate API round-trip |
| Separate tools for critique and redesign | Two tools | Professor needs a real decision point between diagnosis and fix; combined tool removes that |
| Quick checks are code-only | 8 regex/string checks | Deterministic, testable, zero latency — same pattern as SP3 |
| Accessibility runs after redesign | Wire `auditAccessibility` into redesign output | Natural pipeline: fix design first, then verify accessibility on the result |
| KB file on disk, not compiled | `src/kb/design-principles.md` read at runtime | KB content may be updated without a rebuild; follows same pattern as `docs/canvas-design-kb/` |
| Score deduction model | −15 high, −8 medium, −3 low | Simple, predictable, professor-legible — "you have two high-priority issues" maps to the score |
| Strengths derived from passing checks | Not just absence of findings | Positive feedback is more actionable than silence |

---

## What SP4 Does Not Include

- Video/media critique (deferred — Panopto not yet built)
- Automated content rewriting (redesign suggests, Claude writes)
- Cross-page consistency checks (future — needs multi-page input)
- Mobile rendering simulation (future — would require headless browser)
