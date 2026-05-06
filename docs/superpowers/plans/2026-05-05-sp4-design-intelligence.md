# SP4 — Design Intelligence Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two MCP tools — `critique_canvas_page` and `redesign_canvas_page` — that give professors scored visual design feedback and apply mechanical HTML fixes.

**Architecture:** The critique engine runs 8 code-based checks (quick mode) and optionally injects a KB design principles file into the response (comprehensive mode) for Claude to reason about. No Anthropic API calls from the server — Claude is the MCP host and provides the AI judgment. The redesign tool applies mechanical fixes (font floor, hero URL comment), routes everything else to `skippedFindings`, then runs the SP3 accessibility audit on the output HTML.

**Tech Stack:** TypeScript 5, Node.js ESM, Vitest, `node:fs` (readFileSync), `node:path` + `node:url` (ESM-safe path resolution). No new npm dependencies.

---

## File Map

| File | Action | What it does |
|---|---|---|
| `src/kb/design-principles.md` | Create | Condensed visual design principles (~450 words) injected in comprehensive mode |
| `src/tools/critique.ts` | Create | 8 check functions, score calculation, strengths derivation, `critiqueCanvasPage()` |
| `src/tools/redesign.ts` | Create | Font floor fix, hero URL comment fix, accessibility wiring, `redesignCanvasPage()` |
| `src/index.ts` | Modify | Register `critique_canvas_page` and `redesign_canvas_page` tools |
| `tests/critique.test.ts` | Create | 11 tests: one per check + score + clean HTML + comprehensive mode |
| `tests/redesign.test.ts` | Create | 5 tests: font fix, hero fix, skipped findings, a11y wiring, comprehensive mode |

---

## Task 1: KB Design Principles File

**Files:**
- Create: `src/kb/design-principles.md`

- [ ] **Step 1: Create the KB directory and file**

Create `src/kb/design-principles.md` with this exact content:

```markdown
# Canvas Design Studio — Visual Design Principles

## Visual Hierarchy
- Hero banner anchors the page: full-width, primary color, generous padding (48px top/bottom)
- H2 > H3 > H4 weight progression: 28px bold → 18px semibold → 15px semibold
- Most important content (assignment brief, weekly objectives) belongs in the first visible card
- Use size, weight, and color together — not independently — to signal importance

## Whitespace
- 24px margin between major sections
- 20–24px internal card padding
- 8px margin between inline elements (badges, pills)
- Dense pages read as overwhelming — breathing room is a design choice, not wasted space

## Color
- Primary (#0033A0 for BSU): hero banners, active states, primary buttons, section labels
- Secondary (#D64309 for BSU): accent arrows, pill badges, decorative borders only
- Neutral (#F4F3EF): page background; white (#ffffff): card backgrounds
- Semantic colors (info blue, success green, warning amber, danger red): status callouts only
- Maximum 6–7 distinct colors per page — more creates visual noise

## Typography
- Body text: 14–15px, line-height 1.65, color #1A1A1A
- Section labels: 11px, font-weight 700, letter-spacing 0.08em, text-transform uppercase
- Minimum font size: 13px — anything smaller is illegible on mobile
- Font family: Lato, sans-serif throughout — no @font-face or @import

## Components
- Cards (white bg, 1px #e0e0d8 border, 10px radius, 20px padding): structured content sections
- Callouts (3px colored left border, semantic bg, right-rounded corners): tips, warnings, key notes
- Tables (ic-Table class): comparative data only — never use tables for layout
- Avoid free-floating paragraphs without a card or section wrapper

## Canvas Constraints
- Max content width: 860px; effective column width ~680px with sidebar
- All CSS must be inline in style="" attributes — no <style> blocks
- Forbidden: box-shadow, gap, opacity, transform, transition, animation
- No <h1> — Canvas reserves it for the page title; always start at H2
- Use col-xs-12 col-md-6 (or col-md-8/col-md-4) for responsive columns

## Content Prominence by Page Type
- **Assignment page**: brief in card 1 or 2; submission instructions visible without scrolling at 768px viewport
- **Week overview**: week number and objectives prominent; readings and tasks scannable in 30 seconds
- **Course home**: navigation-first layout; current week pinned to top
- **Syllabus**: clearly structured sections; grading table uses ic-Table class
```

- [ ] **Step 2: Verify the file exists**

Run:
```
Get-Content src\kb\design-principles.md | Select-Object -First 5
```
Expected: first 5 lines of the file printed without error.

- [ ] **Step 3: Commit**

```
git add src/kb/design-principles.md
git commit -m "feat: add design principles KB for comprehensive critique mode"
```

---

## Task 2: Critique Module — Types + Checks 1–4

**Files:**
- Create: `src/tools/critique.ts`
- Create: `tests/critique.test.ts`

This task writes the full test file (all 11 tests) and implements checks 1–4. Tests 5–11 will fail until Task 3.

- [ ] **Step 1: Write the full test file**

Create `tests/critique.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { critiqueCanvasPage } from '../src/tools/critique.js';

const CLEAN_HTML = `
<div style="max-width:860px;font-family:Lato,sans-serif;">
  <h2 style="font-size:28px;color:#0033A0;">Assignment Overview</h2>
  <div class="grid-row">
    <div class="col-md-8" style="padding-right:12px;">
      <div style="background:#ffffff;border:1px solid #e0e0d8;border-radius:10px;padding:20px;">
        <p style="font-size:15px;color:#1A1A1A;line-height:1.65;">
          This assignment asks students to create a five-minute video presentation about their passion project.
          Students should include relevant visuals and a voiceover narration explaining their topic.
          The video must be uploaded to the course media library when complete.
          Submit your final video link through the Canvas assignment submission box before the due date.
          Late submissions will receive a ten percent deduction per day.
        </p>
      </div>
    </div>
    <div class="col-md-4">
      <div style="background:#ffffff;border:1px solid #e0e0d8;border-radius:10px;padding:16px;">
        <p style="font-size:14px;color:#555550;line-height:1.65;">
          Grading follows the rubric posted in Canvas. See the rubric for full details on scoring.
          Contact the professor at least 48 hours before the deadline with any questions.
        </p>
      </div>
    </div>
  </div>
</div>`;

describe('critiqueCanvasPage', () => {
  describe('check 1: unreplaced hero', () => {
    it('flags HERO_IMAGE_URL placeholder', () => {
      const html = '<img src="HERO_IMAGE_URL" alt="hero"><h2>Title</h2><p>Content with enough words to pass sparse check.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'completeness' && f.priority === 'high')).toBe(true);
    });

    it('does not flag when hero URL is replaced', () => {
      const html = '<img src="https://example.com/hero.jpg" alt="hero"><h2>Title</h2>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'completeness' && f.issue.includes('placeholder'))).toBe(false);
    });
  });

  describe('check 2: wall of text', () => {
    it('flags paragraph over 80 words', () => {
      const longText = Array(85).fill('word').join(' ');
      const html = `<h2>Title</h2><p>${longText}</p>`;
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'content' && f.priority === 'high')).toBe(true);
    });

    it('does not flag paragraph at 80 words or fewer', () => {
      const text = Array(80).fill('word').join(' ');
      const html = `<h2>Title</h2><p>${text}</p>`;
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'content' && f.priority === 'high')).toBe(false);
    });
  });

  describe('check 3: no headings', () => {
    it('flags HTML with no H2 or H3', () => {
      const html = '<p>Some content without any heading elements.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'hierarchy' && f.priority === 'high')).toBe(true);
    });

    it('does not flag HTML with H2', () => {
      const html = '<h2>Title</h2><p>Content.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'hierarchy')).toBe(false);
    });

    it('does not flag HTML with H3', () => {
      const html = '<h3>Subtitle</h3><p>Content.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'hierarchy')).toBe(false);
    });
  });

  describe('check 4: too sparse', () => {
    it('flags page with fewer than 100 words', () => {
      const html = '<h2>Hello</h2><p>Short page with just a few words.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'content' && f.priority === 'medium')).toBe(true);
    });

    it('does not flag page at 100 words or more', () => {
      const text = Array(100).fill('word').join(' ');
      const html = `<h2>Title</h2><p>${text}</p>`;
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'content' && f.priority === 'medium')).toBe(false);
    });
  });

  describe('check 5: color chaos', () => {
    it('flags more than 7 distinct hex colors', () => {
      const colors = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888'];
      const html = colors.map(c => `<p style="color:${c};">text</p>`).join('') + '<h2>Title</h2>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'color')).toBe(true);
    });

    it('does not flag 7 or fewer distinct hex colors', () => {
      const colors = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'];
      const html = colors.map(c => `<p style="color:${c};">text</p>`).join('') + '<h2>Title</h2>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'color')).toBe(false);
    });
  });

  describe('check 6: font below floor', () => {
    it('flags font-size below 13px', () => {
      const html = '<h2>Title</h2><p style="font-size:11px;">Small text.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'typography')).toBe(true);
    });

    it('does not flag font-size at 13px or above', () => {
      const html = '<h2>Title</h2><p style="font-size:13px;">Fine text.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'typography')).toBe(false);
    });
  });

  describe('check 7: missing submission language', () => {
    it('flags assignment page with no submit/upload/due/deadline', () => {
      const text = Array(100).fill('word').join(' ');
      const html = `<h2>Assignment</h2><p>${text}</p>`;
      const result = critiqueCanvasPage({ html, pageType: 'assignment', primaryGoal: 'complete work' });
      expect(result.findings.some(f => f.area === 'completeness' && f.priority === 'medium')).toBe(true);
    });

    it('does not flag assignment page that contains "submit"', () => {
      const text = Array(100).fill('word').join(' ');
      const html = `<h2>Assignment</h2><p>${text}</p><p>Submit your work by Friday.</p>`;
      const result = critiqueCanvasPage({ html, pageType: 'assignment', primaryGoal: 'complete work' });
      expect(result.findings.some(f => f.area === 'completeness' && f.priority === 'medium')).toBe(false);
    });

    it('does not flag non-assignment page types', () => {
      const text = Array(100).fill('word').join(' ');
      const html = `<h2>Week Overview</h2><p>${text}</p>`;
      const result = critiqueCanvasPage({ html, pageType: 'week-overview', primaryGoal: 'learn' });
      expect(result.findings.some(f => f.area === 'completeness' && f.priority === 'medium')).toBe(false);
    });
  });

  describe('check 8: column imbalance', () => {
    it('flags two-column layout where wide column has 3x more words', () => {
      const manyWords = Array(120).fill('word').join(' ');
      const fewWords = Array(10).fill('word').join(' ');
      const html = `
        <h2>Title</h2>
        <div class="grid-row">
          <div class="col-md-8">${manyWords}</div>
          <div class="col-md-4">${fewWords}</div>
        </div>`;
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'layout')).toBe(true);
    });

    it('does not flag balanced two-column layout', () => {
      const html = `
        <h2>Title</h2>
        <div class="grid-row">
          <div class="col-md-8">Left content with some reasonable amount of text here for the wide column.</div>
          <div class="col-md-4">Right sidebar with notes.</div>
        </div>`;
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'layout')).toBe(false);
    });

    it('does not flag HTML without two-column layout', () => {
      const html = '<h2>Title</h2><p>Single column page.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      expect(result.findings.some(f => f.area === 'layout')).toBe(false);
    });
  });

  describe('score and strengths', () => {
    it('deducts 15 for high and 8 for medium findings → score 77', () => {
      // 1 high (no headings) + 1 medium (font floor)
      const html = '<p style="font-size:11px;">No heading here, just a small paragraph.</p>';
      const result = critiqueCanvasPage({ html, pageType: 'other', primaryGoal: 'read' });
      const hasHigh = result.findings.some(f => f.priority === 'high');
      const hasMedium = result.findings.some(f => f.priority === 'medium');
      expect(hasHigh).toBe(true);
      expect(hasMedium).toBe(true);
      expect(result.score).toBe(100 - 15 - 8);
    });

    it('scores 85 or higher for clean HTML', () => {
      const result = critiqueCanvasPage({ html: CLEAN_HTML, pageType: 'assignment', primaryGoal: 'submit work' });
      expect(result.score).toBeGreaterThanOrEqual(85);
    });
  });

  describe('comprehensive mode', () => {
    it('returns kbContext string in comprehensive mode', () => {
      const result = critiqueCanvasPage({ html: CLEAN_HTML, pageType: 'assignment', primaryGoal: 'submit work', mode: 'comprehensive' });
      expect(typeof result.kbContext).toBe('string');
      expect(result.kbContext!.length).toBeGreaterThan(0);
    });

    it('does not return kbContext in quick mode', () => {
      const result = critiqueCanvasPage({ html: CLEAN_HTML, pageType: 'assignment', primaryGoal: 'submit work', mode: 'quick' });
      expect(result.kbContext).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they all fail (module not found)**

```
npm test -- tests/critique.test.ts 2>&1
```
Expected: FAIL — `Cannot find module '../src/tools/critique.js'`

- [ ] **Step 3: Create `src/tools/critique.ts` with types + checks 1–4**

Create `src/tools/critique.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface CritiqueInput {
  html: string;
  pageType: 'assignment' | 'week-overview' | 'course-home' | 'syllabus' | 'other';
  primaryGoal: string;
  audience?: string;
  mode?: 'quick' | 'comprehensive';
}

export interface CritiqueFinding {
  area: 'hierarchy' | 'content' | 'color' | 'typography' | 'layout' | 'completeness';
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CritiqueResult {
  score: number;
  mode: 'quick' | 'comprehensive';
  pageType: string;
  strengths: string[];
  findings: CritiqueFinding[];
  kbContext?: string;
}

const DEDUCTIONS: Record<CritiqueFinding['priority'], number> = { high: 15, medium: 8, low: 3 };

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function checkUnreplacedHero(html: string): CritiqueFinding | undefined {
  if (!html.includes('HERO_IMAGE_URL')) return undefined;
  return {
    area: 'completeness',
    issue: 'Hero image placeholder has not been replaced.',
    suggestion: 'Replace HERO_IMAGE_URL with the URL of your hosted 1200×400px banner image.',
    priority: 'high',
  };
}

function checkWallOfText(html: string): CritiqueFinding | undefined {
  const pTag = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pTag.exec(html)) !== null) {
    if (wordCount(stripTags(m[1])) > 80) {
      return {
        area: 'content',
        issue: 'A paragraph exceeds 80 words — hard for students to scan quickly.',
        suggestion: 'Break long paragraphs into bullet points or split across multiple section cards.',
        priority: 'high',
      };
    }
  }
  return undefined;
}

function checkNoHeadings(html: string): CritiqueFinding | undefined {
  if (/<h[23][\s>]/i.test(html)) return undefined;
  return {
    area: 'hierarchy',
    issue: 'Page has no H2 or H3 headings — content has no visible structure.',
    suggestion: 'Add H2 headings to divide major sections. Use H3 for subsections within a card.',
    priority: 'high',
  };
}

function checkTooSparse(html: string): CritiqueFinding | undefined {
  const total = wordCount(stripTags(html));
  if (total >= 100) return undefined;
  return {
    area: 'content',
    issue: `Page contains only ${total} words — looks unfinished.`,
    suggestion: 'Add more content: an overview, details, submission instructions, or grading notes.',
    priority: 'medium',
  };
}

function checkColorChaos(_html: string): CritiqueFinding | undefined {
  // implemented in Task 3
  return undefined;
}

function checkFontFloor(_html: string): CritiqueFinding | undefined {
  // implemented in Task 3
  return undefined;
}

function checkMissingSubmissionLanguage(_html: string, _pageType: string): CritiqueFinding | undefined {
  // implemented in Task 3
  return undefined;
}

function checkColumnImbalance(_html: string): CritiqueFinding | undefined {
  // implemented in Task 3
  return undefined;
}

function calculateScore(findings: CritiqueFinding[]): number {
  const deduction = findings.reduce((sum, f) => sum + DEDUCTIONS[f.priority], 0);
  return Math.max(0, 100 - deduction);
}

function deriveStrengths(html: string, findings: CritiqueFinding[]): string[] {
  const foundAreas = new Set(findings.map(f => f.area));
  const strengths: string[] = [];
  if (!foundAreas.has('hierarchy') && /<h[23][\s>]/i.test(html)) {
    strengths.push('Clear heading structure');
  }
  if (!foundAreas.has('color')) {
    strengths.push('Consistent color palette');
  }
  if (!foundAreas.has('content')) {
    strengths.push('Well-proportioned content length');
  }
  return strengths.slice(0, 3);
}

function loadKb(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  try {
    return readFileSync(join(__dirname, '../../src/kb/design-principles.md'), 'utf-8');
  } catch {
    return '';
  }
}

export function critiqueCanvasPage(input: CritiqueInput): CritiqueResult {
  const { html, pageType, mode = 'quick' } = input;

  const findings = [
    checkUnreplacedHero(html),
    checkWallOfText(html),
    checkNoHeadings(html),
    checkTooSparse(html),
    checkColorChaos(html),
    checkFontFloor(html),
    checkMissingSubmissionLanguage(html, pageType),
    checkColumnImbalance(html),
  ].filter((f): f is CritiqueFinding => f !== undefined);

  const score = calculateScore(findings);
  const strengths = deriveStrengths(html, findings);

  const result: CritiqueResult = { score, mode, pageType, strengths, findings };

  if (mode === 'comprehensive') {
    const kb = loadKb();
    if (kb) result.kbContext = kb;
  }

  return result;
}
```

- [ ] **Step 4: Run tests — checks 1–4 should pass, 5–11 fail**

```
npm test -- tests/critique.test.ts 2>&1
```
Expected: checks 1–4 tests pass. Checks 5–8 tests fail (stubs return `undefined`). Score and comprehensive tests may also fail.

- [ ] **Step 5: Commit the skeleton**

```
git add src/tools/critique.ts tests/critique.test.ts
git commit -m "feat: add critique module skeleton with checks 1-4"
```

---

## Task 3: Critique Module — Checks 5–8 + Score + Comprehensive

**Files:**
- Modify: `src/tools/critique.ts`

- [ ] **Step 1: Replace stub check functions with full implementations**

Replace the four stub functions in `src/tools/critique.ts`:

```typescript
function expandHex3(hex: string): string {
  if (hex.length === 4) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toLowerCase();
}

function checkColorChaos(html: string): CritiqueFinding | undefined {
  const hexPattern = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b/g;
  const colors = new Set((html.match(hexPattern) ?? []).map(expandHex3));
  if (colors.size <= 7) return undefined;
  return {
    area: 'color',
    issue: `${colors.size} distinct colors used — visual palette is fragmented.`,
    suggestion: 'Limit to 6–7 colors: primary, secondary, neutrals, and semantic status colors.',
    priority: 'medium',
  };
}

function checkFontFloor(html: string): CritiqueFinding | undefined {
  const pattern = /font-size:\s*(\d+(?:\.\d+)?)px/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    if (parseFloat(m[1]) < 13) {
      return {
        area: 'typography',
        issue: `Font size ${m[1]}px found — below the 13px minimum for mobile readability.`,
        suggestion: 'Use a minimum of 13px for all visible text.',
        priority: 'medium',
      };
    }
  }
  return undefined;
}

function checkMissingSubmissionLanguage(html: string, pageType: string): CritiqueFinding | undefined {
  if (pageType !== 'assignment') return undefined;
  if (/submit|upload|due|deadline/i.test(html)) return undefined;
  return {
    area: 'completeness',
    issue: 'Assignment page has no submission instructions — students will not know what to do.',
    suggestion: 'Add a section explaining how to submit, the expected format, and the due date.',
    priority: 'medium',
  };
}

function extractDivText(html: string, className: string): string {
  const pattern = new RegExp(`class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)</div>`, 'i');
  const m = pattern.exec(html);
  return m ? stripTags(m[1]) : '';
}

function checkColumnImbalance(html: string): CritiqueFinding | undefined {
  if (!html.includes('col-md-8') || !html.includes('col-md-4')) return undefined;
  const wideWords = wordCount(extractDivText(html, 'col-md-8'));
  const narrowWords = wordCount(extractDivText(html, 'col-md-4'));
  if (narrowWords === 0 || wideWords / narrowWords <= 3) return undefined;
  return {
    area: 'layout',
    issue: 'Left column has significantly more content than the sidebar — layout feels lopsided.',
    suggestion: 'Move secondary content (grading notes, resources) into the sidebar to balance columns.',
    priority: 'low',
  };
}
```

The full `src/tools/critique.ts` after this edit (replacing the four stubs, everything else unchanged):

```typescript
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface CritiqueInput {
  html: string;
  pageType: 'assignment' | 'week-overview' | 'course-home' | 'syllabus' | 'other';
  primaryGoal: string;
  audience?: string;
  mode?: 'quick' | 'comprehensive';
}

export interface CritiqueFinding {
  area: 'hierarchy' | 'content' | 'color' | 'typography' | 'layout' | 'completeness';
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CritiqueResult {
  score: number;
  mode: 'quick' | 'comprehensive';
  pageType: string;
  strengths: string[];
  findings: CritiqueFinding[];
  kbContext?: string;
}

const DEDUCTIONS: Record<CritiqueFinding['priority'], number> = { high: 15, medium: 8, low: 3 };

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function checkUnreplacedHero(html: string): CritiqueFinding | undefined {
  if (!html.includes('HERO_IMAGE_URL')) return undefined;
  return {
    area: 'completeness',
    issue: 'Hero image placeholder has not been replaced.',
    suggestion: 'Replace HERO_IMAGE_URL with the URL of your hosted 1200×400px banner image.',
    priority: 'high',
  };
}

function checkWallOfText(html: string): CritiqueFinding | undefined {
  const pTag = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pTag.exec(html)) !== null) {
    if (wordCount(stripTags(m[1])) > 80) {
      return {
        area: 'content',
        issue: 'A paragraph exceeds 80 words — hard for students to scan quickly.',
        suggestion: 'Break long paragraphs into bullet points or split across multiple section cards.',
        priority: 'high',
      };
    }
  }
  return undefined;
}

function checkNoHeadings(html: string): CritiqueFinding | undefined {
  if (/<h[23][\s>]/i.test(html)) return undefined;
  return {
    area: 'hierarchy',
    issue: 'Page has no H2 or H3 headings — content has no visible structure.',
    suggestion: 'Add H2 headings to divide major sections. Use H3 for subsections within a card.',
    priority: 'high',
  };
}

function checkTooSparse(html: string): CritiqueFinding | undefined {
  const total = wordCount(stripTags(html));
  if (total >= 100) return undefined;
  return {
    area: 'content',
    issue: `Page contains only ${total} words — looks unfinished.`,
    suggestion: 'Add more content: an overview, details, submission instructions, or grading notes.',
    priority: 'medium',
  };
}

function expandHex3(hex: string): string {
  if (hex.length === 4) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toLowerCase();
}

function checkColorChaos(html: string): CritiqueFinding | undefined {
  const hexPattern = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b/g;
  const colors = new Set((html.match(hexPattern) ?? []).map(expandHex3));
  if (colors.size <= 7) return undefined;
  return {
    area: 'color',
    issue: `${colors.size} distinct colors used — visual palette is fragmented.`,
    suggestion: 'Limit to 6–7 colors: primary, secondary, neutrals, and semantic status colors.',
    priority: 'medium',
  };
}

function checkFontFloor(html: string): CritiqueFinding | undefined {
  const pattern = /font-size:\s*(\d+(?:\.\d+)?)px/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    if (parseFloat(m[1]) < 13) {
      return {
        area: 'typography',
        issue: `Font size ${m[1]}px found — below the 13px minimum for mobile readability.`,
        suggestion: 'Use a minimum of 13px for all visible text.',
        priority: 'medium',
      };
    }
  }
  return undefined;
}

function checkMissingSubmissionLanguage(html: string, pageType: string): CritiqueFinding | undefined {
  if (pageType !== 'assignment') return undefined;
  if (/submit|upload|due|deadline/i.test(html)) return undefined;
  return {
    area: 'completeness',
    issue: 'Assignment page has no submission instructions — students will not know what to do.',
    suggestion: 'Add a section explaining how to submit, the expected format, and the due date.',
    priority: 'medium',
  };
}

function extractDivText(html: string, className: string): string {
  const pattern = new RegExp(`class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)</div>`, 'i');
  const m = pattern.exec(html);
  return m ? stripTags(m[1]) : '';
}

function checkColumnImbalance(html: string): CritiqueFinding | undefined {
  if (!html.includes('col-md-8') || !html.includes('col-md-4')) return undefined;
  const wideWords = wordCount(extractDivText(html, 'col-md-8'));
  const narrowWords = wordCount(extractDivText(html, 'col-md-4'));
  if (narrowWords === 0 || wideWords / narrowWords <= 3) return undefined;
  return {
    area: 'layout',
    issue: 'Left column has significantly more content than the sidebar — layout feels lopsided.',
    suggestion: 'Move secondary content (grading notes, resources) into the sidebar to balance columns.',
    priority: 'low',
  };
}

function calculateScore(findings: CritiqueFinding[]): number {
  const deduction = findings.reduce((sum, f) => sum + DEDUCTIONS[f.priority], 0);
  return Math.max(0, 100 - deduction);
}

function deriveStrengths(html: string, findings: CritiqueFinding[]): string[] {
  const foundAreas = new Set(findings.map(f => f.area));
  const strengths: string[] = [];
  if (!foundAreas.has('hierarchy') && /<h[23][\s>]/i.test(html)) {
    strengths.push('Clear heading structure');
  }
  if (!foundAreas.has('color')) {
    strengths.push('Consistent color palette');
  }
  if (!foundAreas.has('content')) {
    strengths.push('Well-proportioned content length');
  }
  return strengths.slice(0, 3);
}

function loadKb(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  try {
    return readFileSync(join(__dirname, '../../src/kb/design-principles.md'), 'utf-8');
  } catch {
    return '';
  }
}

export function critiqueCanvasPage(input: CritiqueInput): CritiqueResult {
  const { html, pageType, mode = 'quick' } = input;

  const findings = [
    checkUnreplacedHero(html),
    checkWallOfText(html),
    checkNoHeadings(html),
    checkTooSparse(html),
    checkColorChaos(html),
    checkFontFloor(html),
    checkMissingSubmissionLanguage(html, pageType),
    checkColumnImbalance(html),
  ].filter((f): f is CritiqueFinding => f !== undefined);

  const score = calculateScore(findings);
  const strengths = deriveStrengths(html, findings);

  const result: CritiqueResult = { score, mode, pageType, strengths, findings };

  if (mode === 'comprehensive') {
    const kb = loadKb();
    if (kb) result.kbContext = kb;
  }

  return result;
}
```

- [ ] **Step 2: Build**

```
npm run build 2>&1
```
Expected: no TypeScript errors.

- [ ] **Step 3: Run critique tests — all 11 should pass**

```
npm test -- tests/critique.test.ts 2>&1
```
Expected: `11 passed`

- [ ] **Step 4: Run full suite — no regressions**

```
npm test 2>&1
```
Expected: all tests passing (107 existing + 11 new = 118).

- [ ] **Step 5: Commit**

```
git add src/tools/critique.ts
git commit -m "feat: complete critique engine with all 8 checks, scoring, and comprehensive mode"
git push origin master
```

---

## Task 4: Redesign Module

**Files:**
- Create: `src/tools/redesign.ts`
- Create: `tests/redesign.test.ts`

- [ ] **Step 1: Write the redesign test file**

Create `tests/redesign.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { redesignCanvasPage } from '../src/tools/redesign.js';
import type { CritiqueFinding } from '../src/tools/critique.js';

const fontFinding: CritiqueFinding = {
  area: 'typography',
  issue: 'Font size 11px found — below the 13px minimum for mobile readability.',
  suggestion: 'Use a minimum of 13px for all visible text.',
  priority: 'medium',
};

const heroFinding: CritiqueFinding = {
  area: 'completeness',
  issue: 'Hero image placeholder has not been replaced.',
  suggestion: 'Replace HERO_IMAGE_URL with the URL of your hosted 1200×400px banner image.',
  priority: 'high',
};

const wallFinding: CritiqueFinding = {
  area: 'content',
  issue: 'A paragraph exceeds 80 words — hard for students to scan quickly.',
  suggestion: 'Break long paragraphs into bullet points or split across multiple section cards.',
  priority: 'high',
};

describe('redesignCanvasPage', () => {
  it('fixes font-size below 13px to 13px', () => {
    const html = '<h2>Title</h2><p style="font-size:11px;">Text.</p>';
    const result = redesignCanvasPage({ html, findings: [fontFinding] });
    expect(result.html).toContain('font-size:13px');
    expect(result.html).not.toContain('font-size:11px');
    expect(result.appliedFixes.length).toBeGreaterThan(0);
  });

  it('adds hero URL comment before the HERO_IMAGE_URL img tag', () => {
    const html = '<img src="HERO_IMAGE_URL" alt="hero"><h2>Title</h2>';
    const result = redesignCanvasPage({ html, findings: [heroFinding] });
    expect(result.html).toContain('<!-- Replace HERO_IMAGE_URL');
    expect(result.appliedFixes.length).toBeGreaterThan(0);
  });

  it('puts non-mechanical findings in skippedFindings', () => {
    const html = '<h2>Title</h2><p>Content.</p>';
    const result = redesignCanvasPage({ html, findings: [wallFinding] });
    expect(result.skippedFindings).toContain(wallFinding.suggestion);
    expect(result.appliedFixes).toHaveLength(0);
  });

  it('runs accessibility check and populates accessibilityWarnings for low-contrast html', () => {
    const html = '<h2>Title</h2><div style="background:#cccccc;color:#ffffff;">Low contrast text.</div>';
    const result = redesignCanvasPage({ html, findings: [] });
    expect(result.accessibilityWarnings).toBeDefined();
    expect(result.accessibilityWarnings!.length).toBeGreaterThan(0);
  });

  it('returns kbContext in comprehensive mode', () => {
    const html = '<h2>Title</h2><p>Content.</p>';
    const result = redesignCanvasPage({ html, findings: [], mode: 'comprehensive' });
    expect(typeof result.kbContext).toBe('string');
    expect(result.kbContext!.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- tests/redesign.test.ts 2>&1
```
Expected: FAIL — `Cannot find module '../src/tools/redesign.js'`

- [ ] **Step 3: Create `src/tools/redesign.ts`**

Create `src/tools/redesign.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { auditAccessibility, type AccessibilityWarning } from './accessibility.js';
import type { CritiqueFinding } from './critique.js';

export interface RedesignInput {
  html: string;
  findings: CritiqueFinding[];
  mode?: 'quick' | 'comprehensive';
  pageType?: string;
  primaryGoal?: string;
}

export interface RedesignResult {
  html: string;
  appliedFixes: string[];
  skippedFindings: string[];
  accessibilityWarnings?: AccessibilityWarning[];
  kbContext?: string;
}

function fixFontFloor(html: string): { html: string; fixed: boolean } {
  let fixed = false;
  const result = html.replace(/font-size:\s*(\d+(?:\.\d+)?)px/gi, (match, size) => {
    if (parseFloat(size) < 13) {
      fixed = true;
      return 'font-size:13px';
    }
    return match;
  });
  return { html: result, fixed };
}

function fixHeroUrl(html: string): { html: string; fixed: boolean } {
  if (!html.includes('HERO_IMAGE_URL')) return { html, fixed: false };
  const comment = '<!-- Replace HERO_IMAGE_URL with your hosted image URL (1200×400px) -->';
  const result = html.replace(/(<img[^>]*src="HERO_IMAGE_URL"[^>]*>)/i, `${comment}$1`);
  return { html: result, fixed: result !== html };
}

function loadKb(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  try {
    return readFileSync(join(__dirname, '../../src/kb/design-principles.md'), 'utf-8');
  } catch {
    return '';
  }
}

export function redesignCanvasPage(input: RedesignInput): RedesignResult {
  const { findings, mode = 'quick' } = input;
  let { html } = input;
  const appliedFixes: string[] = [];
  const skippedFindings: string[] = [];

  const fontResult = fixFontFloor(html);
  if (fontResult.fixed) {
    html = fontResult.html;
    appliedFixes.push('Bumped all font sizes below 13px to 13px');
  }

  const heroResult = fixHeroUrl(html);
  if (heroResult.fixed) {
    html = heroResult.html;
    appliedFixes.push('Added comment to replace HERO_IMAGE_URL with hosted image URL');
  }

  for (const finding of findings) {
    const isHeroFinding = finding.area === 'completeness' && finding.issue.includes('placeholder');
    const isFontFinding = finding.area === 'typography';
    if ((isHeroFinding && heroResult.fixed) || (isFontFinding && fontResult.fixed)) continue;
    skippedFindings.push(finding.suggestion);
  }

  const a11y = auditAccessibility(html);

  const result: RedesignResult = {
    html,
    appliedFixes,
    skippedFindings,
    ...(a11y.length > 0 && { accessibilityWarnings: a11y }),
  };

  if (mode === 'comprehensive') {
    const kb = loadKb();
    if (kb) result.kbContext = kb;
  }

  return result;
}
```

- [ ] **Step 4: Build**

```
npm run build 2>&1
```
Expected: no TypeScript errors.

- [ ] **Step 5: Run redesign tests — all 5 should pass**

```
npm test -- tests/redesign.test.ts 2>&1
```
Expected: `5 passed`

- [ ] **Step 6: Run full suite**

```
npm test 2>&1
```
Expected: all tests passing (118 + 5 = 123 total).

- [ ] **Step 7: Commit**

```
git add src/tools/redesign.ts tests/redesign.test.ts
git commit -m "feat: add redesign module with mechanical fixes and accessibility wiring"
git push origin master
```

---

## Task 5: MCP Tool Registration

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add imports at the top of `src/index.ts`**

After the existing import block (after `import type { PublishToCanvasInput } from './tools/publish.js';`), add:

```typescript
import { critiqueCanvasPage } from './tools/critique.js';
import type { CritiqueInput } from './tools/critique.js';
import { redesignCanvasPage } from './tools/redesign.js';
import type { RedesignInput } from './tools/redesign.js';
```

- [ ] **Step 2: Add tool definitions to the `ListToolsRequestSchema` handler**

Inside the `tools: [...]` array in the `ListToolsRequestSchema` handler, add these two entries after `publish_to_canvas`:

```typescript
{
  name: 'critique_canvas_page',
  description: 'Evaluate a Canvas HTML page for visual design quality. Returns a score, strengths, and prioritized findings. Use quick mode for a fast structural check; comprehensive mode for a full design review with KB context for Claude to reason about.',
  inputSchema: {
    type: 'object' as const,
    required: ['html', 'pageType', 'primaryGoal'],
    properties: {
      html: { type: 'string', description: 'Canvas HTML to evaluate.' },
      pageType: {
        type: 'string',
        enum: ['assignment', 'week-overview', 'course-home', 'syllabus', 'other'],
        description: 'Type of Canvas page — informs which checks apply.',
      },
      primaryGoal: { type: 'string', description: 'What a student should do or understand from this page. e.g. "Submit the video project" or "Know what to read this week."' },
      audience: { type: 'string', description: 'Optional. e.g. "first-year undergrads" or "graduate students".' },
      mode: {
        type: 'string',
        enum: ['quick', 'comprehensive'],
        description: 'quick: fast code-based checks only. comprehensive: adds KB design principles to the response for deeper Claude analysis. Defaults to quick.',
      },
    },
  },
},
{
  name: 'redesign_canvas_page',
  description: 'Apply design fixes to Canvas HTML based on critique findings. Applies mechanical fixes automatically; returns remaining findings and KB context for Claude to address. Runs WCAG 2.1 AA accessibility check on output.',
  inputSchema: {
    type: 'object' as const,
    required: ['html', 'findings'],
    properties: {
      html: { type: 'string', description: 'Original Canvas HTML to fix.' },
      findings: { type: 'array', description: 'findings array from critique_canvas_page output.' },
      mode: {
        type: 'string',
        enum: ['quick', 'comprehensive'],
        description: 'quick: mechanical fixes only. comprehensive: mechanical fixes + KB context for Claude to complete the redesign. Defaults to quick.',
      },
      pageType: { type: 'string', description: 'Optional. Helps Claude in comprehensive mode.' },
      primaryGoal: { type: 'string', description: 'Optional. Helps Claude in comprehensive mode.' },
    },
  },
},
```

- [ ] **Step 3: Add handlers to the `CallToolRequestSchema` handler**

Inside the `try` block of the `CallToolRequestSchema` handler, after the `publish_to_canvas` block and before the final `return { content: [{ type: 'text', text: 'Unknown tool...' }] }`:

```typescript
if (name === 'critique_canvas_page') {
  const input = args as unknown as CritiqueInput;
  const result = critiqueCanvasPage(input);

  const lines: string[] = [];
  lines.push(`Design Score: ${result.score}/100 (${result.mode} mode — ${input.pageType})`);

  if (result.strengths.length > 0) {
    lines.push(`\n\nStrengths:\n${result.strengths.map(s => `  ✓ ${s}`).join('\n')}`);
  }

  if (result.findings.length === 0) {
    lines.push('\n\n✓ No design issues found.');
  } else {
    for (const p of ['high', 'medium', 'low'] as const) {
      const group = result.findings.filter(f => f.priority === p);
      if (group.length === 0) continue;
      lines.push(`\n\n${p.toUpperCase()} priority:\n` +
        group.map(f => `  [${f.area}] ${f.issue}\n  → ${f.suggestion}`).join('\n'));
    }
  }

  if (result.kbContext) {
    lines.push(`\n\n---\nDesign KB (comprehensive mode):\n${result.kbContext}`);
  }

  return { content: [{ type: 'text', text: lines.join('') }] };
}

if (name === 'redesign_canvas_page') {
  const input = args as unknown as RedesignInput;
  const result = redesignCanvasPage(input);

  const lines: string[] = [];

  if (result.appliedFixes.length > 0) {
    lines.push(`✓ Applied ${result.appliedFixes.length} fix(es):\n${result.appliedFixes.map(f => `  • ${f}`).join('\n')}`);
  } else {
    lines.push('No mechanical fixes were applicable.');
  }

  if (result.skippedFindings.length > 0) {
    lines.push(`\n\n⚠ ${result.skippedFindings.length} finding(s) need manual attention:\n` +
      result.skippedFindings.map(s => `  • ${s}`).join('\n'));
  }

  if (result.accessibilityWarnings?.length) {
    lines.push(`\n\nAccessibility (WCAG 2.1 AA — advisory):\n` +
      result.accessibilityWarnings.map(w => `  ⚠ ${w.check}: ${w.message}`).join('\n'));
  }

  if (result.kbContext) {
    lines.push(`\n\n---\nDesign KB (use this to complete remaining fixes):\n${result.kbContext}`);
  }

  lines.push(`\n\n\`\`\`html\n${result.html}\n\`\`\``);

  return { content: [{ type: 'text', text: lines.join('') }] };
}
```

- [ ] **Step 4: Build**

```
npm run build 2>&1
```
Expected: no TypeScript errors.

- [ ] **Step 5: Run full test suite**

```
npm test 2>&1
```
Expected: 123 tests passing, 12 test files.

- [ ] **Step 6: Commit and push**

```
git add src/index.ts
git commit -m "feat: register critique_canvas_page and redesign_canvas_page MCP tools"
git push origin master
```

---

## Task 6: Docs Update

**Files:**
- Modify: `docs/handoff-to-Claude.md`
- Modify: `docs/technical-roadmap.md`
- Modify: `docs/feature-roadmap.md`

- [ ] **Step 1: Update `docs/handoff-to-Claude.md`**

Replace the entire file content with a handoff doc that:
- Marks SP4 as COMPLETE
- Lists all 6 tasks done and what each built
- Records final test count (123 passing, 12 files)
- Lists the 6 new commits (get them from `git log --oneline -8`)
- Includes a "Next Step: SP5 — Panopto Integration" section noting the deferred video captions check and the Panopto API dependency
- Notes the `src/kb/design-principles.md` file can be updated without a rebuild

- [ ] **Step 2: Update `docs/technical-roadmap.md`**

Change SP4 row from `Next` to `Done`. Add an SP4 Technical Context section (after the SP3 section) covering:
- New files and what each does
- The KB injection pattern (no API call — Claude is the host)
- How comprehensive mode differs from quick mode (KB context in response)
- The `loadKb()` path resolution using `import.meta.url` (works both in test and compiled)

Change SP5 row from `Later` to `Next`.

- [ ] **Step 3: Update `docs/feature-roadmap.md`**

- Change "Design critique and redesign" from `Coming Next` to `Available Now`
- Move it into the Available Now table with description: "Get a scored visual design critique and apply mechanical fixes. Comprehensive mode includes KB context for deeper Claude analysis."
- Update version note from `v0.3` to `v0.4`
- Remove it from the Coming Next section

- [ ] **Step 4: Commit and push**

```
git add docs/handoff-to-Claude.md docs/technical-roadmap.md docs/feature-roadmap.md
git commit -m "docs: SP4 complete — update handoff, roadmaps, and status"
git push origin master
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `critiqueCanvasPage` with `CritiqueInput` → `CritiqueResult` | Task 2–3 |
| 8 quick checks (hero, wall, headings, sparse, color, font, submission, columns) | Task 2–3 |
| Score: 100 − deductions, floor 0 | Task 3 |
| Strengths from passing checks | Task 3 |
| Comprehensive mode: load KB, attach as `kbContext` | Task 3 |
| `redesignCanvasPage` with `RedesignInput` → `RedesignResult` | Task 4 |
| Fix font floor (< 13px → 13px) | Task 4 |
| Fix hero URL (add comment before img with HERO_IMAGE_URL src) | Task 4 |
| Non-mechanical findings → `skippedFindings` | Task 4 |
| `auditAccessibility` wired into redesign output | Task 4 |
| Comprehensive redesign: mechanical fixes + KB context | Task 4 |
| `critique_canvas_page` MCP tool registered | Task 5 |
| `redesign_canvas_page` MCP tool registered | Task 5 |
| `src/kb/design-principles.md` created | Task 1 |
| Handoff + roadmap docs updated | Task 6 |

All requirements covered. No placeholders. Types used in later tasks (`CritiqueFinding`, `RedesignInput`) match definitions in earlier tasks.
