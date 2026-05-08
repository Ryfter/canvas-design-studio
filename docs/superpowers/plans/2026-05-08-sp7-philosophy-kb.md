# SP7 — Professor Philosophy KB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent teaching philosophy KB (`~/.canvas-design-mcp/professor-philosophy.md`) that steers Canvas page generation, with two MCP tools to read and update it, a wizard interview phase, and description updates on four existing tools.

**Architecture:** A new `src/tools/philosophy.ts` module handles all file I/O and section manipulation. The wizard gains a philosophy phase (first-run interview or subsequent-run update offer) that calls the same helpers the MCP tools use. Existing tool descriptions are updated with philosophy-KB guidance so Claude applies the KB automatically when it's in context — no logic changes to existing handlers.

**Tech Stack:** TypeScript 5 strict ESM, `node:fs`, `node:os`, `node:path`, `@inquirer/prompts` (already installed), Vitest.

**Spec:** `docs/superpowers/specs/2026-05-07-sp7-philosophy-kb-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/tools/philosophy.ts` | All KB logic: constants, types, `savePhilosophyKb`, `getPhilosophyKb`, `updatePhilosophyKb` |
| Create | `tests/philosophy.test.ts` | 12 unit tests — no mocks, real temp files |
| Modify | `src/wizard.ts` | Add philosophy phase after Panopto section |
| Modify | `src/index.ts` | Import 2 new tools, register descriptors, add handlers, update 4 descriptions |

No new npm dependencies. No new fixture directories (tests use `os.tmpdir()`).

---

### Task 1: `src/tools/philosophy.ts` — foundation (types, constants, `savePhilosophyKb`)

**Why this first:** Every other task imports from this module. Getting it compiling cleanly before writing tests avoids confusing type errors during TDD.

**Files:**
- Create: `src/tools/philosophy.ts`

- [ ] **Step 1: Create `src/tools/philosophy.ts` with types, constants, and `savePhilosophyKb`**

```typescript
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export const PHILOSOPHY_KB_PATH = join(homedir(), '.canvas-design-mcp', 'professor-philosophy.md');

// Saved to disk (empty sections, no placeholder prose — clean slate for detection logic)
export const PHILOSOPHY_TEMPLATE = [
  '# Professor Philosophy KB',
  '',
  '## Core Teaching Philosophy',
  '',
  '## Course-Specific Focus',
  '',
  '## Quotes & Aphorisms',
  '',
  '## From Lecture Captures',
  '',
].join('\n');

// Embedded interview questions — returned to Claude when no KB file exists yet
const PHILOSOPHY_QUESTIONS_HINT = [
  '*No answers yet. Ask the professor these questions one at a time to populate this section:*',
  '',
  '1. What\'s one thing you always tell students about this subject that you wish they\'d really internalize?',
  '2. What does a student who truly gets it do differently from one who just completes the work?',
  '3. What\'s the biggest mistake students make on your assignments?',
  '4. What separates an A from a B in concrete terms?',
  '5. Are there teaching frameworks you consciously draw from? (Bloom\'s, UDL, constructivism, andragogy, etc.)',
  '6. Any quotes or sayings you use regularly in class?',
  '',
].join('\n');

export interface GetPhilosophyKbResult {
  content: string;
  exists: boolean;
  sections: {
    hasCore: boolean;
    hasCourseSpecific: boolean;
    hasQuotes: boolean;
    hasLectureCaptures: boolean;
  };
}

export interface UpdatePhilosophyKbInput {
  entry: string;
  section: 'core' | 'course' | 'quotes' | 'lectures';
  courseKey?: string;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function savePhilosophyKb(content: string, kbPath = PHILOSOPHY_KB_PATH): void {
  ensureDir(kbPath);
  writeFileSync(kbPath, content, 'utf-8');
}
```

- [ ] **Step 2: Verify it compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/tools/philosophy.ts
git commit -m "feat(sp7): add philosophy.ts foundation — types, constants, savePhilosophyKb"
```

---

### Task 2: `getPhilosophyKb()` — read KB with section detection + 3 tests

**Why:** `getPhilosophyKb` is the read path that Claude calls at session start. Section detection (`hasCore`, `hasCourseSpecific`, `hasQuotes`, `hasLectureCaptures`) tells Claude what's been filled in.

**Section detection rules:**
- `hasCore` — Core section has at least one non-empty line
- `hasCourseSpecific` — Course-Specific section contains a `### ` subsection heading
- `hasQuotes` — Quotes section has at least one `- ` list item
- `hasLectureCaptures` — Lectures section has at least one `- ` list item

When `exists: false` (no file on disk), all section flags are `false` regardless of template content.

**Files:**
- Modify: `src/tools/philosophy.ts`
- Create: `tests/philosophy.test.ts`

- [ ] **Step 1: Write the 3 failing tests**

Create `tests/philosophy.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import {
  getPhilosophyKb,
  savePhilosophyKb,
  PHILOSOPHY_TEMPLATE,
} from '../src/tools/philosophy.js';

const TEST_KB = join(tmpdir(), 'canvas-design-test-philosophy.md');

beforeEach(() => { if (existsSync(TEST_KB)) unlinkSync(TEST_KB); });
afterEach(() => { if (existsSync(TEST_KB)) unlinkSync(TEST_KB); });

describe('getPhilosophyKb', () => {
  it('returns template with exists=false and all section flags false when no file exists', () => {
    const result = getPhilosophyKb(TEST_KB);
    expect(result.exists).toBe(false);
    expect(result.content).toContain('## Core Teaching Philosophy');
    expect(result.content).toContain('Ask the professor these questions');
    expect(result.sections.hasCore).toBe(false);
    expect(result.sections.hasCourseSpecific).toBe(false);
    expect(result.sections.hasQuotes).toBe(false);
    expect(result.sections.hasLectureCaptures).toBe(false);
  });

  it('returns exists=true and all section flags true for a fully populated KB', () => {
    const full = [
      '# Professor Philosophy KB',
      '',
      '## Core Teaching Philosophy',
      '',
      '- AI is an expertise multiplier.',
      '',
      '## Course-Specific Focus',
      '',
      '### ITM 370 — AI Augmented Projects',
      '',
      'Focus on real-world application.',
      '',
      '## Quotes & Aphorisms',
      '',
      '- "Without expertise, you produce zero quality."',
      '',
      '## From Lecture Captures',
      '',
      '- "Domain knowledge matters." — Week 1, 2026-01-15',
      '',
    ].join('\n');
    savePhilosophyKb(full, TEST_KB);
    const result = getPhilosophyKb(TEST_KB);
    expect(result.exists).toBe(true);
    expect(result.sections.hasCore).toBe(true);
    expect(result.sections.hasCourseSpecific).toBe(true);
    expect(result.sections.hasQuotes).toBe(true);
    expect(result.sections.hasLectureCaptures).toBe(true);
  });

  it('returns hasCore=true and hasCourseSpecific=false for a core-only KB', () => {
    const partial = PHILOSOPHY_TEMPLATE.replace(
      '## Core Teaching Philosophy\n',
      '## Core Teaching Philosophy\n\n- Learning by doing is essential.\n'
    );
    savePhilosophyKb(partial, TEST_KB);
    const result = getPhilosophyKb(TEST_KB);
    expect(result.exists).toBe(true);
    expect(result.sections.hasCore).toBe(true);
    expect(result.sections.hasCourseSpecific).toBe(false);
    expect(result.sections.hasQuotes).toBe(false);
    expect(result.sections.hasLectureCaptures).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- philosophy
```

Expected: 3 failures — `getPhilosophyKb is not a function` or similar.

- [ ] **Step 3: Implement `getPhilosophyKb` in `src/tools/philosophy.ts`**

Append after `savePhilosophyKb`:

```typescript
function extractSectionContent(content: string, heading: string): string {
  const pattern = `## ${heading}`;
  const idx = content.indexOf(pattern);
  if (idx === -1) return '';
  const after = idx + pattern.length;
  const next = content.indexOf('\n## ', after);
  return next === -1 ? content.slice(after) : content.slice(after, next);
}

function detectSections(content: string): GetPhilosophyKbResult['sections'] {
  const core = extractSectionContent(content, 'Core Teaching Philosophy');
  const course = extractSectionContent(content, 'Course-Specific Focus');
  const quotes = extractSectionContent(content, 'Quotes & Aphorisms');
  const lectures = extractSectionContent(content, 'From Lecture Captures');
  return {
    hasCore: core.split('\n').some(l => l.trim().length > 0),
    hasCourseSpecific: course.includes('### '),
    hasQuotes: quotes.split('\n').some(l => l.trim().startsWith('- ')),
    hasLectureCaptures: lectures.split('\n').some(l => l.trim().startsWith('- ')),
  };
}

export function getPhilosophyKb(kbPath = PHILOSOPHY_KB_PATH): GetPhilosophyKbResult {
  if (!existsSync(kbPath)) {
    const content = PHILOSOPHY_TEMPLATE.replace(
      '## Core Teaching Philosophy\n',
      `## Core Teaching Philosophy\n\n${PHILOSOPHY_QUESTIONS_HINT}`
    );
    return {
      content,
      exists: false,
      sections: { hasCore: false, hasCourseSpecific: false, hasQuotes: false, hasLectureCaptures: false },
    };
  }
  const content = readFileSync(kbPath, 'utf-8');
  return { content, exists: true, sections: detectSections(content) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- philosophy
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```
git add src/tools/philosophy.ts tests/philosophy.test.ts
git commit -m "feat(sp7): add getPhilosophyKb with section detection"
```

---

### Task 3: `updatePhilosophyKb()` — core, quotes, lectures + 6 tests

**Why:** `updatePhilosophyKb` is the write path for Claude and the wizard. It appends to a specific section without overwriting existing content. Quotes and lectures entries get `- ` list-item formatting; core entries are appended as prose. The course section is handled separately in Task 4 (it has more complex subsection logic).

**Files:**
- Modify: `src/tools/philosophy.ts`
- Modify: `tests/philosophy.test.ts`

- [ ] **Step 1: Add 6 failing tests to `tests/philosophy.test.ts`**

Append after the `getPhilosophyKb` describe block:

```typescript
import {
  updatePhilosophyKb,
} from '../src/tools/philosophy.js';
import { readFileSync } from 'node:fs';

describe('updatePhilosophyKb', () => {
  it('appends entry to Core Teaching Philosophy section', () => {
    savePhilosophyKb(PHILOSOPHY_TEMPLATE, TEST_KB);
    updatePhilosophyKb({ entry: 'Mastery requires deliberate practice.', section: 'core' }, TEST_KB);
    const content = readFileSync(TEST_KB, 'utf-8');
    const coreIdx = content.indexOf('## Core Teaching Philosophy');
    const nextH2 = content.indexOf('\n## ', coreIdx + 1);
    const coreSection = content.slice(coreIdx, nextH2);
    expect(coreSection).toContain('Mastery requires deliberate practice.');
  });

  it('appends to Quotes & Aphorisms formatted as a list item', () => {
    savePhilosophyKb(PHILOSOPHY_TEMPLATE, TEST_KB);
    updatePhilosophyKb({ entry: 'AI is an expertise multiplier.', section: 'quotes' }, TEST_KB);
    const content = readFileSync(TEST_KB, 'utf-8');
    expect(content).toContain('- AI is an expertise multiplier.');
  });

  it('does not double-prefix a quote that already starts with "- "', () => {
    savePhilosophyKb(PHILOSOPHY_TEMPLATE, TEST_KB);
    updatePhilosophyKb({ entry: '- Already a list item.', section: 'quotes' }, TEST_KB);
    const content = readFileSync(TEST_KB, 'utf-8');
    expect(content).not.toContain('- - Already');
    expect(content).toContain('- Already a list item.');
  });

  it('appends to From Lecture Captures formatted as a list item', () => {
    savePhilosophyKb(PHILOSOPHY_TEMPLATE, TEST_KB);
    updatePhilosophyKb({ entry: 'Domain knowledge matters. — Week 1', section: 'lectures' }, TEST_KB);
    const content = readFileSync(TEST_KB, 'utf-8');
    expect(content).toContain('- Domain knowledge matters. — Week 1');
  });

  it('throws when section is "course" but courseKey is missing', () => {
    savePhilosophyKb(PHILOSOPHY_TEMPLATE, TEST_KB);
    expect(() =>
      updatePhilosophyKb({ entry: 'Focus on AI.', section: 'course' }, TEST_KB)
    ).toThrow("courseKey is required when section is 'course'");
  });

  it('creates KB from template then appends when no file exists', () => {
    // TEST_KB is deleted in beforeEach — no setup needed
    updatePhilosophyKb({ entry: 'Learning by doing is essential.', section: 'core' }, TEST_KB);
    const result = getPhilosophyKb(TEST_KB);
    expect(result.exists).toBe(true);
    expect(result.content).toContain('Learning by doing is essential.');
    expect(result.sections.hasCore).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- philosophy
```

Expected: 6 new failures (updatePhilosophyKb not yet implemented). The 3 existing tests still pass.

- [ ] **Step 3: Implement `updatePhilosophyKb` and helpers in `src/tools/philosophy.ts`**

Append after `getPhilosophyKb`:

```typescript
const HEADING_MAP: Record<string, string> = {
  core: 'Core Teaching Philosophy',
  course: 'Course-Specific Focus',
  quotes: 'Quotes & Aphorisms',
  lectures: 'From Lecture Captures',
};

function formatEntry(input: UpdatePhilosophyKbInput): string {
  const e = input.entry.trim();
  if (input.section === 'quotes' || input.section === 'lectures') {
    return e.startsWith('- ') ? e : `- ${e}`;
  }
  return e;
}

function appendToCourseSection(
  content: string,
  courseSectionAfterHeading: number,
  courseSectionEnd: number,
  courseKey: string,
  entry: string
): string {
  const subsectionHeading = `### ${courseKey}`;
  const subsectionIdx = content.indexOf(subsectionHeading, courseSectionAfterHeading);

  if (subsectionIdx === -1 || subsectionIdx >= courseSectionEnd) {
    const before = content.slice(0, courseSectionEnd).trimEnd();
    const after = content.slice(courseSectionEnd);
    return before + `\n\n${subsectionHeading}\n\n${entry.trim()}\n` + after;
  }

  const afterSub = subsectionIdx + subsectionHeading.length;
  const nextSubIdx = content.indexOf('\n### ', afterSub);
  const nextH2Idx = content.indexOf('\n## ', afterSub);
  let subsectionEnd = courseSectionEnd;
  if (nextSubIdx !== -1 && nextSubIdx < subsectionEnd) subsectionEnd = nextSubIdx;
  if (nextH2Idx !== -1 && nextH2Idx < subsectionEnd) subsectionEnd = nextH2Idx;

  const before = content.slice(0, subsectionEnd).trimEnd();
  const after = content.slice(subsectionEnd);
  return before + '\n' + entry.trim() + '\n' + after;
}

function appendToSection(content: string, input: UpdatePhilosophyKbInput): string {
  const heading = HEADING_MAP[input.section];
  const headingPattern = `## ${heading}`;
  const headingIdx = content.indexOf(headingPattern);

  if (headingIdx === -1) {
    return content.trimEnd() + `\n\n## ${heading}\n\n${formatEntry(input)}\n`;
  }

  const afterHeading = headingIdx + headingPattern.length;
  const nextH2Idx = content.indexOf('\n## ', afterHeading);
  const sectionEnd = nextH2Idx === -1 ? content.length : nextH2Idx;

  if (input.section === 'course') {
    return appendToCourseSection(content, afterHeading, sectionEnd, input.courseKey!, input.entry);
  }

  const entry = formatEntry(input);
  const before = content.slice(0, sectionEnd).trimEnd();
  const after = content.slice(sectionEnd);
  return before + '\n' + entry + '\n' + after;
}

export function updatePhilosophyKb(input: UpdatePhilosophyKbInput, kbPath = PHILOSOPHY_KB_PATH): string {
  if (input.section === 'course' && !input.courseKey) {
    throw new Error(
      "courseKey is required when section is 'course' — provide the course name, e.g. 'ITM 370 — AI Augmented Projects'"
    );
  }

  const content = existsSync(kbPath) ? readFileSync(kbPath, 'utf-8') : PHILOSOPHY_TEMPLATE;
  const updated = appendToSection(content, input);
  savePhilosophyKb(updated, kbPath);

  const sectionLabel =
    input.section === 'course' ? `Course-Specific Focus (${input.courseKey})` :
    input.section === 'core' ? 'Core Teaching Philosophy' :
    input.section === 'quotes' ? 'Quotes & Aphorisms' :
    'From Lecture Captures';

  const preview = input.entry.length > 80 ? input.entry.slice(0, 80) + '...' : input.entry;
  return `✓ Added to ${sectionLabel}: "${preview}"`;
}
```

- [ ] **Step 4: Run tests**

```
npm test -- philosophy
```

Expected: 9 passed (3 from Task 2 + 6 new).

- [ ] **Step 5: Commit**

```
git add src/tools/philosophy.ts tests/philosophy.test.ts
git commit -m "feat(sp7): add updatePhilosophyKb — core, quotes, lectures sections"
```

---

### Task 4: `updatePhilosophyKb` — course section + 3 more tests + `savePhilosophyKb` round-trip

**Why:** The course section has its own logic (create `### subsection` on first use, append to existing subsection on subsequent calls). Tested independently to keep Task 3 focused.

**Files:**
- Modify: `tests/philosophy.test.ts` (append tests to the `updatePhilosophyKb` describe block)

The implementation is already complete from Task 3. This task adds test coverage for the course path.

- [ ] **Step 1: Add 3 failing tests**

Inside the `updatePhilosophyKb` describe block in `tests/philosophy.test.ts`, append:

```typescript
  it('creates a ### subsection for a new courseKey', () => {
    savePhilosophyKb(PHILOSOPHY_TEMPLATE, TEST_KB);
    updatePhilosophyKb({
      entry: 'Focus on real-world AI application.',
      section: 'course',
      courseKey: 'ITM 370 — AI Augmented Projects',
    }, TEST_KB);
    const content = readFileSync(TEST_KB, 'utf-8');
    expect(content).toContain('### ITM 370 — AI Augmented Projects');
    expect(content).toContain('Focus on real-world AI application.');
  });

  it('appends to an existing ### subsection without duplicating the heading', () => {
    const initial = [
      '# Professor Philosophy KB',
      '',
      '## Core Teaching Philosophy',
      '',
      '## Course-Specific Focus',
      '',
      '### ITM 370 — AI Augmented Projects',
      '',
      'First note.',
      '',
      '## Quotes & Aphorisms',
      '',
      '## From Lecture Captures',
      '',
    ].join('\n');
    savePhilosophyKb(initial, TEST_KB);
    updatePhilosophyKb({
      entry: 'Second note.',
      section: 'course',
      courseKey: 'ITM 370 — AI Augmented Projects',
    }, TEST_KB);
    const content = readFileSync(TEST_KB, 'utf-8');
    expect((content.match(/### ITM 370/g) ?? []).length).toBe(1);
    expect(content).toContain('First note.');
    expect(content).toContain('Second note.');
  });

  it('round-trip: savePhilosophyKb with core answers → getPhilosophyKb detects hasCore=true', () => {
    const kb = PHILOSOPHY_TEMPLATE.replace(
      '## Core Teaching Philosophy\n',
      '## Core Teaching Philosophy\n\n- AI is an expertise multiplier.\n- Students who get it ask better questions.\n'
    );
    savePhilosophyKb(kb, TEST_KB);
    const result = getPhilosophyKb(TEST_KB);
    expect(result.exists).toBe(true);
    expect(result.sections.hasCore).toBe(true);
    expect(result.sections.hasCourseSpecific).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify only the new 3 fail**

```
npm test -- philosophy
```

Expected: 9 pass, 3 fail (the new ones). All 3 failures should be on course-section tests.

- [ ] **Step 3: Run full test suite to confirm nothing else broke**

```
npm test
```

Expected: 175 pass (existing) + 9 pass (philosophy) = 184 total. The 3 new tests fail — that is expected at this step.

- [ ] **Step 4: Verify Task 3 implementation handles course tests (no code changes needed)**

The `appendToCourseSection` function written in Task 3 already covers these cases. Run philosophy tests:

```
npm test -- philosophy
```

Expected: all 12 pass.

- [ ] **Step 5: Run full suite**

```
npm test
```

Expected: 187 passed (175 + 12).

- [ ] **Step 6: Commit**

```
git add tests/philosophy.test.ts
git commit -m "feat(sp7): add course-section and round-trip tests — 12 philosophy tests passing"
```

---

### Task 5: Wizard philosophy phase in `src/wizard.ts`

**Why:** The wizard is the primary entry point for professors. The philosophy phase after Panopto asks 6 interview questions on first run and offers course-specific updates on re-runs. This builds the Core Teaching Philosophy section interactively — the same section `updatePhilosophyKb` appends to.

**Files:**
- Modify: `src/wizard.ts`

- [ ] **Step 1: Add imports to `src/wizard.ts`**

After the existing imports (line 5, after `import { wcagContrastRatio }...`), add:

```typescript
import {
  getPhilosophyKb,
  savePhilosophyKb,
  updatePhilosophyKb,
  PHILOSOPHY_TEMPLATE,
} from './tools/philosophy.js';
```

- [ ] **Step 2: Add the philosophy phase after the Panopto block**

In `src/wizard.ts`, the Panopto block ends at line 170 with `console.log('✓ Panopto API credentials saved')`. The philosophy phase goes between the closing `}` of the Panopto if-block (line 170) and the final summary console.log lines (line 172 `console.log('\n✓ Config saved...')`).

Find this exact section and insert the philosophy phase between the `}` closing the Panopto block and the first summary `console.log`:

```typescript
  // Philosophy KB phase — runs after Panopto, before final summary
  const kbResult = getPhilosophyKb();

  if (!kbResult.exists) {
    const buildKb = await confirm({
      message: 'Would you like to build your teaching philosophy KB now?\nClaude uses it to tailor every Canvas page to your style.\n(You can skip and build it in Claude later.)',
      default: true,
    });

    if (buildKb) {
      console.log('\nBuilding your teaching philosophy KB...\n');
      const philosophyQuestions = [
        "What's one thing you always tell students about this subject that you wish they'd really internalize?",
        "What does a student who truly gets it do differently from one who just completes the work?",
        "What's the biggest mistake students make on your assignments?",
        "What separates an A from a B in concrete terms?",
        "Are there teaching frameworks you consciously draw from? (Bloom's, UDL, constructivism, andragogy, etc.)",
        "Any quotes or sayings you use regularly in class?",
      ];
      const answers: string[] = [];
      for (const q of philosophyQuestions) {
        const answer = await input({ message: q });
        if (answer.trim()) answers.push(answer.trim());
      }
      const coreContent = answers.map(a => `- ${a}`).join('\n');
      const kbContent = PHILOSOPHY_TEMPLATE.replace(
        '## Core Teaching Philosophy\n',
        `## Core Teaching Philosophy\n\n${coreContent}\n`
      );
      savePhilosophyKb(kbContent);
      console.log('✓ Teaching philosophy KB saved');
    } else {
      savePhilosophyKb(PHILOSOPHY_TEMPLATE);
      console.log('✓ Philosophy KB template saved — build it in Claude anytime');
    }
  } else {
    const updateKb = await confirm({
      message: 'You already have a philosophy KB. Would you like to review or update it?',
      default: false,
    });

    if (updateKb) {
      console.log('\nYour current philosophy KB:\n');
      console.log(kbResult.content);
      console.log('');

      const addCourse = await confirm({
        message: 'Would you like to add course-specific focus for a course?',
        default: false,
      });

      if (addCourse) {
        const courseKey = await input({
          message: 'Course key (e.g. "ITM 370 — AI Augmented Projects"):',
          validate: (v) => v.trim().length > 0 || 'Course key is required',
        });
        const courseNote = await input({
          message: `What should Claude know specifically about ${courseKey.trim()}?`,
        });
        if (courseNote.trim()) {
          updatePhilosophyKb({ entry: courseNote.trim(), section: 'course', courseKey: courseKey.trim() });
          console.log(`✓ Course-specific focus added for ${courseKey.trim()}`);
        }
      }
    }
  }
```

- [ ] **Step 3: Verify it compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite (wizard has no automated tests — existing tests must still pass)**

```
npm test
```

Expected: 187 passed.

- [ ] **Step 5: Commit**

```
git add src/wizard.ts
git commit -m "feat(sp7): add philosophy KB phase to wizard — first-run interview + subsequent-run update"
```

---

### Task 6: Register tools in `src/index.ts` + update 4 existing tool descriptions

**Why:** The MCP tools expose `get_philosophy_kb` and `update_philosophy_kb` to Claude. The 4 existing tool descriptions get a one-sentence philosophy-KB note so Claude applies the KB automatically whenever it's in context — no handler logic changes needed.

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add imports after line 30 (after the `ingest` imports)**

After the two `ingest` import lines, add:

```typescript
import { getPhilosophyKb, updatePhilosophyKb } from './tools/philosophy.js';
import type { UpdatePhilosophyKbInput } from './tools/philosophy.js';
```

- [ ] **Step 2: Update the `generate_canvas_page` tool description**

Find the current `generate_canvas_page` description string (line 63):
```typescript
description: 'Generate a beautiful, Canvas-safe HTML assignment page from a brief. Returns HTML ready to paste into Canvas, a hero image prompt for ChatGPT, and the suggested filename.',
```

Replace with:
```typescript
description: 'Generate a beautiful, Canvas-safe HTML assignment page from a brief. Returns HTML ready to paste into Canvas, a hero image prompt for ChatGPT, and the suggested filename. If the professor philosophy KB is in context, apply the professor\'s tone, framing, and pedagogical emphasis preferences when generating content.',
```

- [ ] **Step 3: Update the `critique_canvas_page` tool description**

Find (line ~143):
```typescript
description: 'Evaluate a Canvas HTML page for visual design quality. Returns a score, strengths, and prioritized findings. Use quick mode for a fast structural check; comprehensive mode for a full design review with KB context for Claude to reason about.',
```

Replace with:
```typescript
description: 'Evaluate a Canvas HTML page for visual design quality. Returns a score, strengths, and prioritized findings. Use quick mode for a fast structural check; comprehensive mode for a full design review with KB context for Claude to reason about. If the professor philosophy KB is in context, evaluate the page against the professor\'s stated standards and teaching philosophy.',
```

- [ ] **Step 4: Update the `redesign_canvas_page` tool description**

Find (line ~165):
```typescript
description: 'Apply design fixes to Canvas HTML based on critique findings. Applies mechanical fixes automatically; returns remaining findings and KB context for Claude to address. Runs WCAG 2.1 AA accessibility check on output.',
```

Replace with:
```typescript
description: 'Apply design fixes to Canvas HTML based on critique findings. Applies mechanical fixes automatically; returns remaining findings and KB context for Claude to address. Runs WCAG 2.1 AA accessibility check on output. If the professor philosophy KB is in context, redesign toward the professor\'s aesthetic and pedagogical preferences.',
```

- [ ] **Step 5: Update the `ingest_assignment_folder` tool description**

Find the `ingest_assignment_folder` description (the multi-line string starting at line ~225). Replace the existing description string:
```typescript
description: 'Read assignment materials from a folder and generate a Canvas-safe HTML page. ' +
  'Supports simple mode (ingest/ folder with up to 5 files) and advanced mode ' +
  '(assignments/{id}/ subfolders with shared rubric and shell inheritance for assignment groups). ' +
  'Returns the generated HTML alongside the raw brief, rubric, and shell content so Claude can ' +
  'review brief clarity, rubric alignment, and shell completeness. ' +
  'Brief and style-notes are per-assignment; rubric and shell are inherited from parent folders if not present locally.',
```

Replace with:
```typescript
description: 'Read assignment materials from a folder and generate a Canvas-safe HTML page. ' +
  'Supports simple mode (ingest/ folder with up to 5 files) and advanced mode ' +
  '(assignments/{id}/ subfolders with shared rubric and shell inheritance for assignment groups). ' +
  'Returns the generated HTML alongside the raw brief, rubric, and shell content so Claude can ' +
  'review brief clarity, rubric alignment, and shell completeness. ' +
  'Brief and style-notes are per-assignment; rubric and shell are inherited from parent folders if not present locally. ' +
  'If the professor philosophy KB is in context, apply it when generating the page and note any alignment between the assignment materials and the professor\'s philosophy.',
```

- [ ] **Step 6: Add `get_philosophy_kb` and `update_philosophy_kb` tool descriptors**

In the `ListToolsRequestSchema` handler, after the `ingest_assignment_folder` descriptor closing `},` and before the `]`, add:

```typescript
      {
        name: 'get_philosophy_kb',
        description: 'Load the professor\'s teaching philosophy KB into context. Returns the full KB content, whether it exists, and which sections have been populated. Call once at the start of a session when working on Canvas pages. If the KB does not exist yet, returns an empty template with interview questions embedded so you can build it through conversation.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'update_philosophy_kb',
        description: 'Append a new entry to the professor\'s philosophy KB. Use after a professor shares a quote, teaching insight, or course-specific note. Also used to save Panopto-sourced statements after professor approval. Never overwrites existing content — always appends.',
        inputSchema: {
          type: 'object' as const,
          required: ['entry', 'section'],
          properties: {
            entry: { type: 'string', description: 'Content to add to the specified section.' },
            section: {
              type: 'string',
              enum: ['core', 'course', 'quotes', 'lectures'],
              description: 'core: Core Teaching Philosophy (applies to all courses). course: Course-Specific Focus (requires courseKey). quotes: Quotes & Aphorisms. lectures: From Lecture Captures.',
            },
            courseKey: {
              type: 'string',
              description: 'Required when section is "course". The course identifier, e.g. "ITM 370 — AI Augmented Projects".',
            },
          },
        },
      },
```

- [ ] **Step 7: Add `get_philosophy_kb` and `update_philosophy_kb` handlers**

In the `CallToolRequestSchema` handler, after the `ingest_assignment_folder` handler closing `}` and before the unknown-tool fallback `return { content: [...Unknown tool...] }`, add:

```typescript
      if (name === 'get_philosophy_kb') {
        const result = getPhilosophyKb();
        const lines: string[] = [];
        if (!result.exists) {
          lines.push('> No philosophy KB found. Returning template with interview questions.');
          lines.push('> To build the KB: run setup_institution or ask the professor the interview questions and call update_philosophy_kb for each answer.');
        }
        lines.push('> Apply this philosophy when generating, critiquing, or redesigning Canvas pages for this professor.');
        lines.push('');
        lines.push(`Sections populated — Core: ${result.sections.hasCore}, Course-specific: ${result.sections.hasCourseSpecific}, Quotes: ${result.sections.hasQuotes}, Lecture captures: ${result.sections.hasLectureCaptures}`);
        lines.push('');
        lines.push(result.content);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }

      if (name === 'update_philosophy_kb') {
        const input = args as unknown as UpdatePhilosophyKbInput;
        const result = updatePhilosophyKb(input);
        return { content: [{ type: 'text', text: result }] };
      }
```

- [ ] **Step 8: Verify it compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Run full test suite**

```
npm test
```

Expected: 187 passed (175 existing + 12 philosophy). `updatePhilosophyKb` throws on missing courseKey — the outer try/catch in `src/index.ts` catches it and returns `isError: true` automatically.

- [ ] **Step 10: Commit**

```
git add src/index.ts
git commit -m "feat(sp7): register get_philosophy_kb and update_philosophy_kb tools; update 4 tool descriptions"
```

---

### Task 7: Update handoff docs + push

**Why:** Kevin uses ChatGPT Codex and Gemini for project status — they read cold from GitHub. Every sprint update must reach the remote so those agents stay current.

**Files:**
- Modify: `docs/handoff-to-Claude.md`
- Modify: `docs/technical-roadmap.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update `docs/handoff-to-Claude.md`**

In the SP status table, change:
```
| SP7 | Professor Philosophy KB | Next | — |
```
to:
```
| SP7 | Professor Philosophy KB | ✅ Done | 187 |
```

Add SP8 row if not present:
```
| SP8 | Student Persona Review | Next | — |
```

In the "Current tools" list, add after `ingest_assignment_folder`:
```
`get_philosophy_kb`, `update_philosophy_kb`
```
(Total: 14 tools)

In the "Next sprint" section, update to reflect SP8 as next.

- [ ] **Step 2: Update `docs/technical-roadmap.md`**

Mark SP7 row as Done. Add 187 tests. Update SP8 as next.

- [ ] **Step 3: Update `AGENTS.md`**

Update the tool count (12 → 14). Update current sprint from SP7 to SP8. Note the philosophy KB location (`~/.canvas-design-mcp/professor-philosophy.md`) in the config section.

- [ ] **Step 4: Commit docs**

```
git add docs/handoff-to-Claude.md docs/technical-roadmap.md AGENTS.md
git commit -m "docs: update handoff, roadmap, AGENTS.md for SP7 completion — 14 tools, 187 tests"
```

- [ ] **Step 5: Push to GitHub**

```
git push
```

Expected: push succeeds. Codex/Gemini can now read the updated docs.

---

## Self-Review Checklist

- **Spec coverage:**
  - ✅ `get_philosophy_kb` tool → Task 6
  - ✅ `update_philosophy_kb` tool → Tasks 3 + 4 + 6
  - ✅ Wizard first-run interview → Task 5
  - ✅ Wizard subsequent-run update offer → Task 5
  - ✅ 4 existing tool description updates → Task 6
  - ✅ Panopto scan flow → covered by existing `fetch_panopto_captions` + `update_philosophy_kb` (no new code needed — the spec explicitly says this is a Claude conversation flow, not a tool)
  - ✅ Error: missing courseKey → Task 3 (throws, outer handler returns `isError: true`)
  - ✅ Error: no KB file → returns template silently with `exists: false` → Task 2
  - ✅ 12 tests → Tasks 2 + 3 + 4 (3 + 6 + 3 = 12)

- **Type consistency:** `UpdatePhilosophyKbInput` defined in Task 1, used in Tasks 3 + 6. `GetPhilosophyKbResult` defined in Task 1, returned in Task 2. No renames across tasks.

- **No placeholders:** All code blocks are complete. No "implement later" or "add error handling" filler.
