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
