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
