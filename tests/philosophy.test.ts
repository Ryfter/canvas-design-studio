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
