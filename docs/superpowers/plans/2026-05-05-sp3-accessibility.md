# SP3 Accessibility Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five advisory WCAG 2.1 AA checks to the validator, generator, publisher, and wizard without touching any existing types or blocking any existing flows.

**Architecture:** New `src/tools/contrast.ts` (pure math helper) and `src/tools/accessibility.ts` (five checks, returns `AccessibilityWarning[]`) are the only new source files. Everything else is additive: the wizard gains an inline contrast prompt, the generator appends `a11y:`-prefixed strings to its existing `warnings[]`, the publisher adds an optional `accessibilityWarnings` field to its success response, and the `validate_canvas_html` MCP handler calls both the RCE validator and the new auditor. No existing types, tests, or call sites break.

**Tech Stack:** Node.js 18+, TypeScript 5, Vitest. No new npm dependencies — contrast ratio computed from the `color` package already installed.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/tools/contrast.ts` | Create | `wcagContrastRatio(hex1, hex2): number` using `color` package |
| `src/tools/accessibility.ts` | Create | `auditAccessibility(html): AccessibilityWarning[]` — five checks |
| `src/wizard.ts` | Modify | Inline contrast check + optional re-prompt after each color entry |
| `src/tools/generate.ts` | Modify | Call `auditAccessibility`, append `a11y:` prefixed warnings |
| `src/tools/publish.ts` | Modify | Add `accessibilityWarnings?` to `PublishSuccess`, call auditor |
| `src/index.ts` | Modify | `validate_canvas_html` handler calls both RCE + a11y |
| `tests/contrast.test.ts` | Create | Pure math tests — no mocks |
| `tests/accessibility.test.ts` | Create | One focused test per check scenario |
| `tests/generate.test.ts` | Modify | One new test: a11y warning in output when triggered |
| `tests/publish.test.ts` | Modify | One new test: a11y warnings in success response, non-blocking |

---

## Task 1: Contrast Helper

**Files:**
- Create: `src/tools/contrast.ts`
- Create: `tests/contrast.test.ts`

- [ ] **Step 1: Write the failing contrast tests**

Create `tests/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { wcagContrastRatio } from '../src/tools/contrast.js';

describe('wcagContrastRatio', () => {
  it('BSU blue on white passes AA (10.6:1)', () => {
    const ratio = wcagContrastRatio('#0033A0', '#ffffff');
    expect(ratio).toBeGreaterThan(4.5);
  });

  it('BSU orange on white is marginal (≈4.5:1)', () => {
    const ratio = wcagContrastRatio('#D64309', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.4);
    expect(ratio).toBeLessThanOrEqual(4.6);
  });

  it('light gray on white fails AA (≈1.6:1)', () => {
    const ratio = wcagContrastRatio('#cccccc', '#ffffff');
    expect(ratio).toBeLessThan(3.0);
  });

  it('is symmetric — order of arguments does not matter', () => {
    const a = wcagContrastRatio('#0033A0', '#ffffff');
    const b = wcagContrastRatio('#ffffff', '#0033A0');
    expect(a).toBeCloseTo(b, 5);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/contrast.test.ts
```

Expected: fail — `src/tools/contrast.ts` does not exist.

- [ ] **Step 3: Implement the contrast helper**

Create `src/tools/contrast.ts`:

```ts
import Color from 'color';

export function wcagContrastRatio(hex1: string, hex2: string): number {
  const l1 = Color(hex1).luminosity();
  const l2 = Color(hex2).luminosity();
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/contrast.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/tools/contrast.ts tests/contrast.test.ts
git commit -m "feat: add WCAG contrast ratio helper"
```

---

## Task 2: Accessibility Audit Module

**Files:**
- Create: `src/tools/accessibility.ts`
- Create: `tests/accessibility.test.ts`

- [ ] **Step 1: Write the failing accessibility tests**

Create `tests/accessibility.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { auditAccessibility } from '../src/tools/accessibility.js';

describe('auditAccessibility', () => {
  describe('contrast-ratio', () => {
    it('flags same-element inline pair below 4.5:1 (background-color shorthand)', () => {
      const html = '<p style="color:#cccccc;background-color:#ffffff;">text</p>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'contrast-ratio')).toBe(true);
    });

    it('flags same-element inline pair below 4.5:1 (background: hex shorthand)', () => {
      // Many Canvas templates use background: not background-color: — must catch both
      const html = '<div style="background:#cccccc;color:#ffffff;">text</div>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'contrast-ratio')).toBe(true);
    });

    it('does not flag when colors are on separate elements', () => {
      const html = '<div style="background-color:#cccccc;"><p style="color:#000000;">text</p></div>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'contrast-ratio')).toBe(false);
    });

    it('does not flag non-hex color values (graceful skip)', () => {
      const html = '<p style="color:rgb(0,0,0);background-color:rgb(255,255,255);">text</p>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'contrast-ratio')).toBe(false);
    });

    it('applies 3.0:1 threshold for large text (font-size >= 24px)', () => {
      // #888 on white = ~3.9:1 — passes large-text (3:1) but fails body-text (4.5:1)
      const html = '<p style="color:#888888;background-color:#ffffff;font-size:24px;">text</p>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'contrast-ratio')).toBe(false);
    });

    it('applies 3.0:1 threshold for bold text >= 18px', () => {
      const html = '<p style="color:#888888;background-color:#ffffff;font-size:18px;font-weight:700;">text</p>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'contrast-ratio')).toBe(false);
    });
  });

  describe('empty-alt', () => {
    it('flags content image with alt=""', () => {
      const html = '<img src="chart.png" alt="">';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'empty-alt')).toBe(true);
    });

    it('does not flag decorative image patterns', () => {
      const html = '<img src="spacer.gif" alt="">';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'empty-alt')).toBe(false);
    });

    it('does not flag images with descriptive alt', () => {
      const html = '<img src="chart.png" alt="Bar chart showing enrollment trends">';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'empty-alt')).toBe(false);
    });

    it('does not double-flag missing alt (RCE owns that check)', () => {
      const html = '<img src="chart.png">';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'empty-alt')).toBe(false);
    });
  });

  describe('heading-skip', () => {
    it('flags H2 to H4 skip', () => {
      const html = '<h2>Section</h2><h4>Subsection</h4>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'heading-skip')).toBe(true);
      expect(warnings.find(w => w.check === 'heading-skip')?.message).toContain('H2 to H4');
    });

    it('does not flag sequential levels', () => {
      const html = '<h2>Section</h2><h3>Sub</h3><h4>Subsub</h4>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'heading-skip')).toBe(false);
    });

    it('does not flag level reset (H4 to H2 is valid)', () => {
      const html = '<h2>A</h2><h3>B</h3><h4>C</h4><h2>D</h2>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'heading-skip')).toBe(false);
    });
  });

  describe('vague-link', () => {
    it('flags "click here"', () => {
      const html = '<a href="/page">click here</a>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'vague-link')).toBe(true);
    });

    it('does not flag descriptive link text', () => {
      const html = '<a href="/rubric">View the assignment rubric</a>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'vague-link')).toBe(false);
    });

    it('does not flag partial matches ("learn more about this topic")', () => {
      const html = '<a href="/page">learn more about this topic</a>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'vague-link')).toBe(false);
    });
  });

  describe('table-no-headers', () => {
    it('flags table with only <td>', () => {
      const html = '<table><tr><td>Cell</td></tr></table>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'table-no-headers')).toBe(true);
    });

    it('does not flag table with <th>', () => {
      const html = '<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>';
      const warnings = auditAccessibility(html);
      expect(warnings.some(w => w.check === 'table-no-headers')).toBe(false);
    });
  });

  it('returns empty array for clean HTML', () => {
    const html = '<h2>Title</h2><p>Body text</p><a href="/rubric">View rubric</a>';
    expect(auditAccessibility(html)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/accessibility.test.ts
```

Expected: fail — `src/tools/accessibility.ts` does not exist.

- [ ] **Step 3: Implement the accessibility auditor**

Create `src/tools/accessibility.ts`:

```ts
import { wcagContrastRatio } from './contrast.js';

export interface AccessibilityWarning {
  check: string;
  message: string;
  context?: string;
}

const VAGUE_LINK_TEXT = new Set([
  'click here', 'here', 'read more', 'more', 'link', 'this link', 'learn more',
]);

const DECORATIVE_SRC = /spacer|pixel|blank|transparent|1x1/i;

function ctx(s: string): string {
  return s.length > 60 ? s.slice(0, 60) + '...' : s;
}

function checkContrast(html: string): AccessibilityWarning[] {
  const warnings: AccessibilityWarning[] = [];
  const styleAttr = /style="([^"]*)"/gi;
  let m: RegExpExecArray | null;

  while ((m = styleAttr.exec(html)) !== null) {
    const style = m[1];
    // Match both background-color:#hex and background:#hex (shorthand, hex only — not gradients/URLs)
    const bgM = /(?:background-color|background):\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/i.exec(style);
    const fgM = /(?<![a-z-])color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/i.exec(style);
    if (!bgM || !fgM) continue;

    let ratio: number;
    try { ratio = wcagContrastRatio(fgM[1], bgM[1]); } catch { continue; }

    const sizeM = /font-size:\s*(\d+(?:\.\d+)?)px/i.exec(style);
    const boldM = /font-weight:\s*(700|bold)\b/i.exec(style);
    const size = sizeM ? parseFloat(sizeM[1]) : 0;
    const isLarge = size >= 24 || (!!boldM && size >= 18);
    const threshold = isLarge ? 3.0 : 4.5;

    if (ratio < threshold) {
      const label = isLarge ? 'large text' : 'body text';
      warnings.push({
        check: 'contrast-ratio',
        message: `${fgM[1]} on ${bgM[1]}: ${ratio.toFixed(2)}:1 — fails WCAG AA for ${label} (requires ${threshold}:1)`,
        context: ctx(style),
      });
    }
  }
  return warnings;
}

function checkMeaningfulAlt(html: string): AccessibilityWarning[] {
  const warnings: AccessibilityWarning[] = [];
  const imgTag = /<img[^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = imgTag.exec(html)) !== null) {
    const img = m[0];
    const altM = /\balt=(["'])(.*?)\1/i.exec(img);
    const srcM = /\bsrc=(["'])(.*?)\1/i.exec(img);
    if (!altM || !srcM) continue;
    if (altM[2] === '' && srcM[2] && !DECORATIVE_SRC.test(srcM[2])) {
      warnings.push({
        check: 'empty-alt',
        message: 'Content image has alt="" — add descriptive alt text or confirm it is decorative',
        context: ctx(img),
      });
    }
  }
  return warnings;
}

function checkHeadingHierarchy(html: string): AccessibilityWarning[] {
  const warnings: AccessibilityWarning[] = [];
  const headingTag = /<(h[2-6])[\s>]/gi;
  const seq: Array<{ level: number; tag: string }> = [];
  let m: RegExpExecArray | null;

  while ((m = headingTag.exec(html)) !== null) {
    seq.push({ level: parseInt(m[1][1], 10), tag: m[0] });
  }

  for (let i = 1; i < seq.length; i++) {
    const prev = seq[i - 1].level;
    const curr = seq[i].level;
    if (curr > prev + 1) {
      warnings.push({
        check: 'heading-skip',
        message: `Heading jumps from H${prev} to H${curr} — skipped levels break screen reader navigation`,
        context: ctx(seq[i].tag),
      });
      break;
    }
  }
  return warnings;
}

function checkDescriptiveLinks(html: string): AccessibilityWarning[] {
  const warnings: AccessibilityWarning[] = [];
  const linkTag = /<a[\s][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = linkTag.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
    if (VAGUE_LINK_TEXT.has(text)) {
      warnings.push({
        check: 'vague-link',
        message: `"${text}" is not descriptive — use text that explains where the link goes`,
        context: ctx(m[0]),
      });
    }
  }
  return warnings;
}

function checkTableHeaders(html: string): AccessibilityWarning[] {
  const warnings: AccessibilityWarning[] = [];
  const tableTag = /<table[\s\S]*?<\/table>/gi;
  let m: RegExpExecArray | null;

  while ((m = tableTag.exec(html)) !== null) {
    if (!/<th[\s>]/i.test(m[0])) {
      warnings.push({
        check: 'table-no-headers',
        message: 'Table has no <th> elements — add headers so screen readers can identify columns and rows',
        context: ctx(m[0]),
      });
    }
  }
  return warnings;
}

export function auditAccessibility(html: string): AccessibilityWarning[] {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '');
  return [
    ...checkContrast(stripped),
    ...checkMeaningfulAlt(stripped),
    ...checkHeadingHierarchy(stripped),
    ...checkDescriptiveLinks(stripped),
    ...checkTableHeaders(stripped),
  ];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/accessibility.test.ts
```

Expected: all passing.

- [ ] **Step 5: Run full suite to confirm nothing regressed**

```bash
npm test
```

Expected: all previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/tools/contrast.ts src/tools/accessibility.ts tests/contrast.test.ts tests/accessibility.test.ts
git commit -m "feat: add accessibility audit module and contrast helper"
```

---

## Task 3: Wizard Integration

**Files:**
- Modify: `src/wizard.ts`

No new test file — wizard is interactive TTY; the contrast math is covered by `tests/contrast.test.ts`.

- [ ] **Step 1: Add `confirm` to the `@inquirer/prompts` import**

In `src/wizard.ts`, change line 1 from:

```ts
import { input, password } from '@inquirer/prompts';
```

to:

```ts
import { confirm, input, password } from '@inquirer/prompts';
```

- [ ] **Step 2: Add the contrast import**

After the existing imports, add:

```ts
import { wcagContrastRatio } from './tools/contrast.js';
```

- [ ] **Step 3: Replace the primary color prompt with a contrast-checking loop**

Replace:

```ts
  const primaryHex = await input({
    message: 'Primary brand color (#hex):',
    default: '#0033A0',
    validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #0033A0)',
  });
```

with:

```ts
  let primaryHex: string;
  while (true) {
    primaryHex = await input({
      message: 'Primary brand color (#hex):',
      default: '#0033A0',
      validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #0033A0)',
    });
    const primaryRatio = wcagContrastRatio(primaryHex, '#ffffff');
    if (primaryRatio >= 4.5) {
      console.log(`  Contrast on white: ${primaryRatio.toFixed(2)}:1 — passes WCAG AA`);
      break;
    }
    console.log(`  Contrast on white: ${primaryRatio.toFixed(2)}:1 — ${primaryRatio >= 3.0 ? 'marginal' : 'fails'} for body text (AA requires 4.5:1)`);
    console.log('  White text on this color may not be readable at small sizes. Consider darkening slightly.');
    const go = await confirm({ message: 'Proceed with this color?', default: true });
    if (go) break;
  }
```

- [ ] **Step 4: Replace the secondary color prompt with a contrast-checking loop**

Replace:

```ts
  const secondaryHex = await input({
    message: 'Secondary / accent color (#hex):',
    default: '#D64309',
    validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #D64309)',
  });
```

with:

```ts
  let secondaryHex: string;
  while (true) {
    secondaryHex = await input({
      message: 'Secondary / accent color (#hex):',
      default: '#D64309',
      validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #D64309)',
    });
    const secondaryRatio = wcagContrastRatio(secondaryHex, '#ffffff');
    if (secondaryRatio >= 4.5) {
      console.log(`  Contrast on white: ${secondaryRatio.toFixed(2)}:1 — passes WCAG AA`);
      break;
    }
    console.log(`  Contrast on white: ${secondaryRatio.toFixed(2)}:1 — ${secondaryRatio >= 3.0 ? 'marginal' : 'fails'} for body text (AA requires 4.5:1)`);
    console.log('  White text on this color may not be readable at small sizes. Consider darkening slightly.');
    const go = await confirm({ message: 'Proceed with this color?', default: true });
    if (go) break;
  }
```

- [ ] **Step 5: Build to confirm no TypeScript errors**

```bash
npm run build
```

Expected: compiles with no errors.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all tests pass (wizard has no unit tests by design).

- [ ] **Step 7: Commit**

```bash
git add src/wizard.ts
git commit -m "feat: add WCAG contrast check to setup wizard"
```

---

## Task 4: Generator Integration

**Files:**
- Modify: `src/tools/generate.ts`
- Modify: `tests/generate.test.ts`

- [ ] **Step 1: Write the failing generator a11y test**

In `tests/generate.test.ts`, add this test inside the existing `describe('generateCanvasPage', ...)` block, after the last existing test:

```ts
  it('includes a11y:-prefixed warnings when generated HTML has contrast issues', () => {
    // The template generates: background:#cccccc;color:#ffffff on badge elements.
    // #cccccc on white = ~1.6:1, well below the 4.5:1 AA threshold.
    // The contrast check matches background: shorthand with hex values, so this fires.
    const lowContrastConfig: InstitutionConfig = {
      ...config,
      colors: { ...config.colors, secondary: '#cccccc' },
    };
    const result = generateCanvasPage(input, lowContrastConfig);
    const a11yWarnings = result.warnings.filter(w => w.startsWith('a11y:'));
    expect(a11yWarnings.length).toBeGreaterThan(0);
    expect(a11yWarnings[0]).toMatch(/^a11y:/);
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- tests/generate.test.ts
```

Expected: the new test fails because `generateCanvasPage` does not yet call `auditAccessibility`.

- [ ] **Step 3: Add the a11y import to `src/tools/generate.ts`**

At the top of `src/tools/generate.ts`, add after the existing imports:

```ts
import { auditAccessibility } from './accessibility.js';
```

- [ ] **Step 4: Call the auditor inside `generateCanvasPage`**

In `src/tools/generate.ts`, find this block near the end of `generateCanvasPage`:

```ts
  const validation = validateCanvasHtml(html);
  const warnings = validation.violations.map(v => v.rule);
```

Replace with:

```ts
  const validation = validateCanvasHtml(html);
  const a11y = auditAccessibility(html);
  const warnings = [
    ...validation.violations.map(v => v.rule),
    ...a11y.map(w => `a11y: ${w.check} — ${w.message}`),
  ];
```

- [ ] **Step 5: Run the tests to confirm all pass**

```bash
npm test -- tests/generate.test.ts
```

Expected: all 10 tests pass (9 existing + 1 new).

- [ ] **Step 6: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/tools/generate.ts tests/generate.test.ts
git commit -m "feat: include accessibility warnings in page generation output"
```

---

## Task 5: Publisher Integration

**Files:**
- Modify: `src/tools/publish.ts`
- Modify: `tests/publish.test.ts`

- [ ] **Step 1: Write the failing publisher a11y test**

In `tests/publish.test.ts`, add this test inside the existing `describe('publishToCanvas', ...)` block, after the last existing test:

```ts
  it('includes accessibilityWarnings in success response without blocking publish', async () => {
    // A table with no <th> triggers the table-no-headers check
    const htmlWithTable = '<h2>Grades</h2><table><tr><td>Student</td><td>Score</td></tr></table>';
    const api = apiMock();
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas(
      { courseId: 42, html: htmlWithTable, pageTitle: 'New Page', skipFerpaCheck: true },
      config,
      api,
    );

    expect(result).not.toMatchObject({ code: expect.any(String) }); // not an error
    expect(result).toMatchObject({ action: 'created' });
    expect((result as { accessibilityWarnings?: unknown[] }).accessibilityWarnings).toBeDefined();
    expect((result as { accessibilityWarnings: unknown[] }).accessibilityWarnings.length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- tests/publish.test.ts
```

Expected: the new test fails because `PublishSuccess` has no `accessibilityWarnings` field.

- [ ] **Step 3: Add the a11y import to `src/tools/publish.ts`**

At the top of `src/tools/publish.ts`, add after the existing imports:

```ts
import { auditAccessibility } from './accessibility.js';
import type { AccessibilityWarning } from './accessibility.js';
```

- [ ] **Step 4: Add `accessibilityWarnings` to `PublishSuccess`**

In `src/tools/publish.ts`, find the `PublishSuccess` interface:

```ts
export interface PublishSuccess {
  url: string;
  action: 'created' | 'updated';
  pageTitle: string;
  tip: string;
}
```

Replace with:

```ts
export interface PublishSuccess {
  url: string;
  action: 'created' | 'updated';
  pageTitle: string;
  accessibilityWarnings?: AccessibilityWarning[];
  tip: string;
}
```

- [ ] **Step 5: Run the a11y auditor before each successful return in `publishToCanvas`**

In `src/tools/publish.ts`, find the helper used to build success results. The function has three return points that produce a `PublishSuccess` (update, related create, default create). Add a single helper above the try block:

Find the line:

```ts
  try {
    const pages = await api.listPages(input.courseId);
```

Immediately before it, add:

```ts
  const a11yWarnings = auditAccessibility(input.html);
```

Then find all three `PublishSuccess` return objects and add the optional field. They currently look like:

```ts
return { url: pageUrl(updated), action: 'updated', pageTitle: updated.title, tip: versionControlTip() };
```

```ts
return { url: pageUrl(created), action: 'created', pageTitle: created.title, tip: versionControlTip() };
```

Change each to pass `accessibilityWarnings` when non-empty:

```ts
return {
  url: pageUrl(updated),
  action: 'updated',
  pageTitle: updated.title,
  ...(a11yWarnings.length > 0 && { accessibilityWarnings: a11yWarnings }),
  tip: versionControlTip(),
};
```

```ts
return {
  url: pageUrl(created),
  action: 'created',
  pageTitle: created.title,
  ...(a11yWarnings.length > 0 && { accessibilityWarnings: a11yWarnings }),
  tip: versionControlTip(),
};
```

Note: there are two `created` return paths (one for `related`, one for the default create). Update both.

- [ ] **Step 6: Run the tests to confirm all pass**

```bash
npm test -- tests/publish.test.ts
```

Expected: all 19 tests pass (18 existing + 1 new).

- [ ] **Step 7: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/tools/publish.ts tests/publish.test.ts
git commit -m "feat: include accessibility warnings in publish success response"
```

---

## Task 6: MCP Handler Update

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add the a11y import**

In `src/index.ts`, add after the existing tool imports:

```ts
import { auditAccessibility } from './tools/accessibility.js';
```

- [ ] **Step 2: Update the `validate_canvas_html` handler**

Find this block in the `CallToolRequestSchema` handler:

```ts
      if (name === 'validate_canvas_html') {
        const { html } = args as { html: string };
        const result = validateCanvasHtml(html);
        const summary = result.valid
          ? '✓ HTML is Canvas-compliant. No violations found.'
          : `✗ ${result.violations.length} violation(s) found:\n\n` +
            result.violations.map((v, i) => `${i + 1}. ${v.rule}\n   Context: ${v.context}`).join('\n\n');
        return { content: [{ type: 'text', text: summary }] };
      }
```

Replace with:

```ts
      if (name === 'validate_canvas_html') {
        const { html } = args as { html: string };
        const rce = validateCanvasHtml(html);
        const a11y = auditAccessibility(html);
        const lines: string[] = [];

        if (rce.valid) {
          lines.push('✓ No Canvas RCE violations found.');
        } else {
          lines.push(`✗ ${rce.violations.length} Canvas RCE violation(s):\n`);
          rce.violations.forEach((v, i) => {
            lines.push(`${i + 1}. ${v.rule}\n   Context: ${v.context}`);
          });
        }

        if (a11y.length > 0) {
          lines.push(`\n⚠ ${a11y.length} accessibility advisory (non-blocking):\n`);
          a11y.forEach((w, i) => {
            lines.push(`${i + 1}. ${w.message}${w.context ? `\n   Context: ${w.context}` : ''}`);
          });
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: compiles with no errors.

- [ ] **Step 4: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: include accessibility audit in validate_canvas_html response"
```

---

## Task 7: Final Verification and Docs

**Files:**
- Modify: `docs/handoff-to-Claude.md`
- Modify: `docs/technical-roadmap.md`
- Modify: `docs/feature-roadmap.md`

- [ ] **Step 1: Full verification**

```bash
npm test
npm run build
git status --short --branch
```

Expected:
- All tests pass (target: 82 existing + ~20 new = ~102 total)
- TypeScript build clean
- No untracked files except docs changes

- [ ] **Step 2: Update `docs/technical-roadmap.md`**

Change SP3 status from `Next` to `Done` in the implementation steps table. Update the current notes column to reflect completion.

- [ ] **Step 3: Update `docs/feature-roadmap.md`**

Move "Accessibility checks" from "Coming Next" to "Available Now" section. Update the "Where We Are" table to show accessibility as available.

- [ ] **Step 4: Update `docs/handoff-to-Claude.md`**

Replace the entire file with the standard handoff format:

```md
# Handoff to Claude — Canvas Design Studio SP3

**Date:** 2026-05-05
**From:** [agent name]
**To:** Claude
**Project:** Canvas Design Studio MCP Server

## Completed This Step

SP3 Accessibility Module — all 7 tasks complete.

- Task 1: `src/tools/contrast.ts` — `wcagContrastRatio()` using existing `color` package
- Task 2: `src/tools/accessibility.ts` — `auditAccessibility()` with 5 WCAG checks
- Task 3: `src/wizard.ts` — inline contrast check with optional re-prompt per color
- Task 4: `src/tools/generate.ts` — a11y warnings appended to `warnings[]` with `a11y:` prefix
- Task 5: `src/tools/publish.ts` — `accessibilityWarnings?` in `PublishSuccess`, non-blocking
- Task 6: `src/index.ts` — `validate_canvas_html` handler runs both RCE + a11y auditors
- Task 7: Docs updated, committed, pushed

## Verification

- `npm test`: [N] passing
- `npm run build`: passing

## Git

- Latest commit: `[hash] [subject]`
- Branch: `master`
- Remote: `origin`

## Next Step

SP4 — Design Intelligence Brain. Before starting:
1. Read `docs/superpowers/specs/2026-04-29-mcp-future-additions.md` (SP4 section)
2. Read `docs/technical-roadmap.md` (SP4 context)
3. Run `superpowers:brainstorming` to spec SP4 — do not implement before spec is approved
```

- [ ] **Step 5: Commit docs**

```bash
git add docs/handoff-to-Claude.md docs/technical-roadmap.md docs/feature-roadmap.md
git commit -m "docs: SP3 complete — update handoff, roadmaps, status"
```

- [ ] **Step 6: Push**

```bash
git push origin master
```

Expected: all SP3 commits reach GitHub.
