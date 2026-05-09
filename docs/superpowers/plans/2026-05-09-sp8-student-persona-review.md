# SP8 — Student Persona Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two MCP tools — `generate_student_personas` and `get_student_personas` — that give Claude statistically grounded student personas to use when reviewing Canvas assignment instructions.

**Architecture:** The server handles all mechanical work: weighted random sampling for race/ethnicity and learning disabilities (real probability tables), uniform random sampling for 21 other dimensions (CSV-sourced example pools embedded as TypeScript constants). Generated personas are saved to `~/.canvas-design-mcp/student-personas.md`. Claude does the review reasoning — no API calls from the server. Follows the same optional-KB-injection pattern as SP7 philosophy KB.

**Tech Stack:** TypeScript 5 ESM, Node.js `fs` built-ins, Vitest. No new npm dependencies.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/tools/personas.ts` | Create | Types, dimension pools, probability tables, `weightedSample`, `poolSample`, `buildPersona`, `generateStudentPersonas`, `getStudentPersonas`, file I/O |
| `tests/personas.test.ts` | Create | 10 tests — sampling distribution, count clamping, file round-trip, missing-file behavior, 23-dimension coverage |
| `src/index.ts` | Modify | Import and register 2 new tools; update 2 existing tool descriptions |

---

## Task 1: `src/tools/personas.ts` — types, constants, and dimension pools

**Why this task first:** All subsequent tasks depend on having the types, the probability tables, and the dimension pools in place. This task is pure data — no logic, no tests needed yet. After writing the file, verify it compiles cleanly before moving on.

**Files:**
- Create: `src/tools/personas.ts`

- [ ] **Step 1: Create `src/tools/personas.ts` with imports, path constant, template, types, and all data**

```typescript
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export const PERSONAS_PATH = join(homedir(), '.canvas-design-mcp', 'student-personas.md');

export const PERSONAS_TEMPLATE = '# Student Personas\n\nNo personas generated yet. Call generate_student_personas to create a set.\n';

export interface GenerateStudentPersonasInput {
  count?: number;  // default 3, min 1, max 20
}

export interface GetStudentPersonasResult {
  content: string;
  exists: boolean;
}

// Weighted probability table entry — cumulative column from Student-Personas.md
interface WeightedEntry {
  cumulative: number;
  value: string;
}

// Race/Ethnic Background — real population distribution from Student-Personas.md
export const RACE_TABLE: WeightedEntry[] = [
  { cumulative: 0.578, value: 'White' },
  { cumulative: 0.765, value: 'Hispanic/Latino' },
  { cumulative: 0.886, value: 'Black' },
  { cumulative: 0.945, value: 'Asian' },
  { cumulative: 0.956, value: 'Native American' },
  { cumulative: 0.958, value: 'Native Pacific Islander' },
  { cumulative: 0.969, value: 'Mixed Race (White and Black)' },
  { cumulative: 0.977, value: 'Mixed Race (Asian and White)' },
  { cumulative: 0.982, value: 'Mixed Race (Native American and Hispanic/Latino)' },
  { cumulative: 0.990, value: 'Mixed Race (Black and Hispanic/Latino)' },
  { cumulative: 0.996, value: 'Mixed Race (Asian and Black)' },
  { cumulative: 1.000, value: 'Adopted (choose race of student and family)' },
];

// Learning Disabilities/Challenges — real prevalence distribution from Student-Personas.md
export const DISABILITY_TABLE: WeightedEntry[] = [
  { cumulative: 0.61,  value: 'None' },
  { cumulative: 0.70,  value: 'ADHD' },
  { cumulative: 0.76,  value: 'Dyslexia' },
  { cumulative: 0.81,  value: 'Speech Impediment' },
  { cumulative: 0.85,  value: 'Anxiety' },
  { cumulative: 0.89,  value: 'Dysgraphia' },
  { cumulative: 0.93,  value: 'Mild Dyslexia' },
  { cumulative: 0.96,  value: 'Mild Anxiety' },
  { cumulative: 0.98,  value: 'Visual Processing Disorder' },
  { cumulative: 0.998, value: 'Hearing Impairment' },
  { cumulative: 1.000, value: 'Memory Retention Challenges' },
];

// The 21 non-weighted dimensions. Values sourced from AI-Personas-ideas_Student-Personas.csv,
// deduplicated and lightly cleaned. Uniform random selection (each value equally likely).
export const DIMENSION_POOLS: Record<string, string[]> = {
  age: [
    '18-year-old freshman',
    '19-year-old sophomore',
    '20-year-old sophomore',
    '21-year-old sophomore',
    '22-year-old senior',
    '23-year-old junior',
    '24-year-old graduate student',
    '26-year-old junior',
    '28-year-old PhD candidate',
    '30-year-old returning student',
    '32-year-old first-year law student',
    '35-year-old MBA student',
  ],
  familySituation: [
    'Single with no dependents',
    'Married, no children',
    'Single parent with two kids',
    'Engaged, no children',
    'Married with a toddler',
    'Living with parents',
    'Divorced with shared custody',
    'Lives on campus, single',
    'Single, caregiver for a sibling',
    'Lives with partner',
    'Lives on campus; supportive parents, one younger sibling',
    'Lives off-campus with roommates; close-knit family, one older sibling',
    'Lives at home with supportive parents who own a small business',
    'Married with two young children; supportive spouse',
    'Lives at home with working-class immigrant parents and younger siblings',
    'Lives off-campus with roommates; supportive parents, only child',
  ],
  workStudyBalance: [
    'Full-time student, no job',
    'Part-time job, full-time student',
    'Full-time job, part-time student',
    'Research assistant, full-time student',
    'Part-time retail job, full-time student',
    'Full-time job, night classes',
    'Student-athlete, full-time',
    'Full-time student with part-time campus job (10 hrs/week)',
    'Full-time student, volunteers 5–8 hours/week',
    'Full-time student with an online side business (15–20 hrs/week)',
    'Part-time student (9 credits), works full-time (40 hrs/week)',
    'Full-time student, works part-time to contribute to household income',
  ],
  previousEducation: [
    'High school valedictorian',
    'GED recipient',
    'Some college, no degree',
    'Undergraduate degree in sociology',
    'Associate degree completed',
    'Top 10% in high school',
    'Community college transfer',
    "Bachelor's degree in business",
    "Master's in biology",
    'Homeschooled background',
    "Bachelor's in history; returning after a gap",
    'Graduated high school with honors; strong STEM focus, multiple AP credits',
    'High school diploma with 3.8 GPA; active in debate and student government',
    'High school diploma; vocational courses in graphic design, self-taught in e-commerce',
    'First in family to attend college; high school diploma with a 3.5 GPA',
    'No prior college experience; first-generation college student',
  ],
  subjectStrengths: [
    'Strong in science',
    'Excels in English',
    'Good with math',
    'Skilled in research methods',
    'Good at presentations',
    'Strong in history',
    'Financial analysis',
    'Data analysis',
    'Creative writing',
    'Logic and reasoning',
    'Social studies',
    'Mathematics, physics, and computer programming',
    'Writing, sociology, political science, and critical analysis',
    'Graphic design, marketing, and digital media',
    'English composition, literature, and communication',
    'Advanced programming, data structures, and algorithms',
  ],
  subjectWeaknesses: [
    'Struggles with math',
    'Weak in science',
    'Struggles with literature',
    'Struggles with statistics',
    'Weak in analytical writing',
    'Struggles in public speaking',
    'Struggles with creative tasks',
    'Weak in technical writing',
    'Struggles with sustained focus',
    'Essay writing and public speaking',
    'Statistics and advanced mathematics',
    'Advanced calculus and complex scientific theories',
    'Adapting to new technology platforms',
    'Advanced mathematics and academic vocabulary',
  ],
  academicConfidence: [
    'Highly confident',
    'Moderate confidence',
    'Low confidence',
    'Growing confidence',
    'Very high confidence',
    'Confident in technical skills',
    'Building confidence after setbacks',
    'High in STEM, moderate in humanities',
    'High in discussions and writing',
    'High in creative work, lower in traditional exam settings',
    'Moderate; sometimes experiences imposter syndrome',
    'High, particularly in problem-solving and coding',
  ],
  shortTermGoals: [
    'Pass the class with an A',
    'Understand key concepts deeply',
    'Complete all assignments on time',
    'Publish a research finding',
    'Improve analytical writing skills',
    'Improve public speaking skills',
    'Apply course material directly to current job',
    'Pass the class with a solid grade',
    'Balance athletics and academics',
    'Maintain a 3.8 GPA and join a club',
    'Get an A in research methods and secure an internship',
    'Pass all prerequisites and get comfortable with online learning',
    'Maintain a 3.0 GPA and start using tutoring services',
    'Complete a capstone project and secure a job offer',
  ],
  longTermGoals: [
    'Aspires to be a doctor',
    'Interested in teaching at the secondary level',
    'Undecided; exploring options',
    'Wants to become a professor',
    'Aspires to manage a team in industry',
    'Planning to go to law school',
    'Aims to work in data science',
    'Seeks executive-level roles',
    'Academic research career',
    'Aspires to be a lawyer',
    'Interested in sports management',
    'Electrical engineer; tech company or renewable energy',
    'Policy analyst and social justice advocate',
    'Full-time entrepreneur and creative director',
    'Registered Nurse specializing in pediatrics or critical care',
    'Teacher or social worker',
    'Software engineer, data scientist, or cybersecurity specialist',
  ],
  confidenceLevels: [
    'High confidence overall',
    'Moderate confidence',
    'Low confidence; working to overcome self-doubt',
    'Very confident',
    'Confidence varies day-to-day',
    'Confident in academics but not social situations',
    'High, particularly in intellectual abilities',
    'High in group settings and when expressing opinions',
    'High in entrepreneurial and artistic skills; lower facing academic setbacks',
    'Building; initially low due to long break from academia',
    'Growing; gaining confidence with each small success in college',
  ],
  learningMotivation: [
    'Passionate about the subject',
    'Focused on earning the degree',
    'Driven by career advancement',
    'Wants a higher salary',
    'Wants to build a professional network',
    'Driven by personal curiosity',
    'Learning for personal growth',
    'Passionate about social justice',
    'Driven by athletic and competitive goals',
    'Intrinsic; curiosity and desire to build and innovate',
    'Intrinsic; passionate about social change',
    'Intrinsic; creativity and desire to build a business',
    'Extrinsic initially (career prospects), with growing intrinsic interest in the field',
    'Mix of extrinsic (support family) and intrinsic (personal growth)',
  ],
  engagementStyle: [
    'Proactive; asks clarifying questions',
    'Observant and reserved',
    'Active in online discussions',
    'Prefers working independently',
    'Rarely participates in open discussion',
    'Highly engaged; sits at the front',
    'Prefers small group discussions',
    'Observes and participates occasionally',
    'Proactive researcher; finds primary sources independently',
    'Rarely speaks up in class; more comfortable in writing',
    'Prefers debate and structured discussion',
    'Enjoys team-based activities and collaborative projects',
    'Engages actively in labs and problem-solving; asks clarifying questions in lectures',
    'Participates frequently in discussions; enjoys debates',
    'Engages most in project-based courses; quieter in traditional lectures',
    'Attentive listener; prefers to absorb information before contributing',
    'Asks questions in smaller groups or during office hours rather than in lecture',
  ],
  preferredLearningMethods: [
    'Hands-on activities and experimentation',
    'Visual aids and diagrams',
    'Reading textbooks and articles',
    'Listening to lectures',
    'Group activities and peer discussion',
    'Video tutorials',
    'Case studies and real-world examples',
    'Research papers and primary sources',
    'Written outlines and structured notes',
    'Hands-on labs, problem sets, and online tutorials',
    'Scholarly articles, group discussions, and writing essays',
    'Visual demonstrations, workshops, and learning by doing',
    'Online modules, practical examples, and self-paced learning',
    'One-on-one tutoring, structured lessons, and clear outlines',
  ],
  technologyComfortLevel: [
    'Very comfortable; adopts new tools quickly',
    'Prefers traditional in-person methods',
    'Comfortable with common online resources',
    'Advanced tech skills across multiple platforms',
    'Adequate; manages required tools with some effort',
    'Enjoys using digital tools to organize work',
    'Tech-savvy and adaptive to new platforms',
    'Expert in domain-specific scientific software',
    'Basic tech skills; needs help with new systems',
    'Proficient with legal and research databases',
    'Extremely high; proficient with multiple programming languages and engineering tools',
    'High; comfortable with research databases and online collaboration tools',
    'High; adept at graphic design software and social media marketing tools',
    'Moderate; comfortable with Word and email, needs guidance with new platforms',
    'Moderate; comfortable with basic computer use, needs help with specialized software',
  ],
  academicSupport: [
    'Access to a peer study group',
    'Tutors available through the institution',
    'Limited access to support services',
    'Utilizes peer study groups independently',
    'Online tutoring available',
    'Peer-led study group',
    'Attends office hours regularly',
    'Mentorship program through the department',
    'Research group support from faculty',
    'University-provided tutors',
    'Writing center and faculty office hours',
    'Access to specialized labs, research opportunities, and peer study groups',
    'Undergraduate research opportunities, writing center, and faculty mentorship',
    'Mentorship from professors in creative fields and business advising',
    'Academic advising, writing center, and technology support for online learning',
    'Tutoring in math and science, financial aid counseling, and academic coaching',
  ],
  emotionalSupport: [
    'Strong support from family',
    'Encouragement from close friends',
    'Relies on community and faith support',
    'Supportive partner',
    'Finds motivation from academic peers',
    'Relies on family support from home',
    'Spouse is a strong emotional anchor',
    'Close-knit group of college friends',
    'Strong connection to cultural community',
    'Friends with shared academic interests; uses sports and hobbies for stress relief',
    'Close friends; self-care practices and occasional counseling',
    'Creative community and understanding family; practices stress management',
    'Strong support from spouse and family; peer group of non-traditional students',
    'Family support, mentorship from older students and faculty, community resources',
  ],
  culturalBackground: [
    'First-generation college student',
    'Bilingual; embraces cultural diversity',
    'Military family background',
    'International student background',
    'Native American background influences worldview',
    'Suburban middle-class upbringing',
    'From an underrepresented community in higher education',
    'Urban upper-middle-class background',
    'Diverse international cultural perspectives',
    'Rural background; first in family to leave the region for school',
    'Ethnic minority; navigates a predominantly white institution',
    'Suburban middle-income; values practicality and hard work',
    'Strong emphasis on education and family values',
    'Values social justice and intellectual discourse',
    'Strong family ties; celebrates cultural heritage through art and food',
    'Midwestern; values hard work and self-reliance',
    'Close-knit community; values resilience, often first in family to pursue higher education',
  ],
  financialSituation: [
    'Financially stable; family covers tuition',
    'Needs to work part-time to cover expenses',
    'Receiving financial aid; budget is tight',
    'Financially independent; self-sufficient',
    'Works to afford child care alongside school',
    'Financially supported by family',
    'Self-funded entirely through part-time work',
    'Well-compensated in current career; returning to school',
    'Funded through grants and scholarships',
    'Uses student loans for tuition; manages debt carefully',
    'Financially strained; unexpected expenses are a major risk',
    'Relies on a scholarship; cannot afford to lose it',
    'Comfortable; tuition covered by parents, part-time job for spending money',
    'Stable; some financial aid, parents provide supplemental support',
    'Variable; relies on business income and some parental support',
    'Strained; relies on financial aid and full-time work, manages a very tight budget',
    'Strained; relies heavily on financial aid, often helps support family financially',
  ],
  responsivenessToFeedback: [
    'Actively seeks out feedback',
    'Handles feedback well without defensiveness',
    'Appreciates constructive feedback when it is specific',
    'Values feedback primarily from professors',
    'Finds critical feedback difficult to process emotionally',
    'Open to feedback from any source',
    'Welcomes constructive criticism and acts on it quickly',
    'Enjoys feedback as a tool to refine skills',
    'Feedback-driven; tracks progress against prior critiques',
    'Finds feedback motivating; uses it to set new goals',
    'Values detailed, written feedback over verbal comments',
    'Highly responsive; seeks feedback to improve and refine understanding',
    'Very responsive; thrives on constructive criticism to strengthen arguments',
    'Responsive in creative critiques; can be sensitive to purely subjective criticism',
    'Highly responsive; eager to learn, seeks clear and actionable feedback',
    'Responsive, but hesitant to ask for clarification; benefits from explicit encouragement',
  ],
  growthMindset: [
    'Open to learning from mistakes',
    'Growth-oriented; embraces challenges',
    'Shows perseverance through setbacks',
    'Views setbacks as learning opportunities',
    'Willing to try new strategies when stuck',
    'Always seeks ways to improve',
    'Sees challenges as chances to grow',
    'Highly resilient and adaptive',
    'Passionate about continuous self-improvement',
    'Seeks gradual, steady improvement over time',
    'Strong growth mindset; views challenges as opportunities to develop new skills',
    'Strong growth mindset; actively seeks new knowledge and changing perspectives',
    'Strong growth mindset; constantly iterating on ideas and learning from failures',
    'Strong growth mindset; determined to master new subjects returning to school',
    'Developing growth mindset; working to overcome self-doubt and embrace learning',
  ],
  timeManagement: [
    'Balances school and social life well',
    'Struggles to meet deadlines consistently',
    'Must juggle work, children, and school simultaneously',
    'Organized and plans ahead reliably',
    'Finds it hard to stay organized without structure',
    'Easily distracted; struggles with long reading assignments',
    'Manages time effectively; rarely behind',
    'Tight schedule; well-organized with strict routines',
    'Juggles research and coursework with few conflicts',
    'Sometimes misses deadlines during high-stress periods',
    'Tightly manages limited time; little room for error',
    'Needs flexibility in deadlines due to unpredictable schedule',
    'Excellent; uses a digital planner, schedules study blocks, rarely procrastinates',
    'Very good; balances academics, volunteering, and social life with a detailed planner',
    'Variable; prioritizes business tasks, sometimes sacrifices sleep for schoolwork',
    'Excellent; highly organized due to family and work commitments, uses strict schedules',
    'Challenged; struggles with balancing work, family obligations, and studies',
  ],
};
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

Run: `npm run build`
Expected: exits 0, `dist/` updated, no TypeScript errors.

If it fails, fix type errors before continuing — do not proceed to Task 2 with a broken build.

- [ ] **Step 3: Commit**

```bash
git add src/tools/personas.ts
git commit -m "feat(sp8): add personas.ts foundation — types, constants, dimension pools"
```

---

## Task 2: Sampling functions + tests

**Why:** `weightedSample` and `poolSample` are pure functions with no I/O — the easiest place to start TDD. Getting these right first means the generation logic in Task 3 can be tested at a higher level without worrying about the math.

**Files:**
- Modify: `src/tools/personas.ts` (add two functions after `DIMENSION_POOLS`)
- Create: `tests/personas.test.ts`

- [ ] **Step 1: Write the test file with sampling tests**

Create `tests/personas.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  weightedSample,
  poolSample,
  generateStudentPersonas,
  getStudentPersonas,
  RACE_TABLE,
  DISABILITY_TABLE,
  DIMENSION_POOLS,
} from '../src/tools/personas.js';

const TEST_PERSONAS = join(tmpdir(), 'canvas-design-test-personas.md');

beforeEach(() => { if (existsSync(TEST_PERSONAS)) unlinkSync(TEST_PERSONAS); });
afterEach(() => { if (existsSync(TEST_PERSONAS)) unlinkSync(TEST_PERSONAS); });

describe('weightedSample', () => {
  it('samples race according to weighted distribution', () => {
    // White is 57.8% of the population — over 1000 trials, expect ~578 ± 50
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const result = weightedSample(RACE_TABLE);
      counts[result] = (counts[result] ?? 0) + 1;
    }
    expect(counts['White']).toBeGreaterThan(528);
    expect(counts['White']).toBeLessThan(628);
  });

  it('samples disability status according to weighted distribution', () => {
    // None is 61% of the population — over 1000 trials, expect ~610 ± 50
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const result = weightedSample(DISABILITY_TABLE);
      counts[result] = (counts[result] ?? 0) + 1;
    }
    expect(counts['None']).toBeGreaterThan(560);
    expect(counts['None']).toBeLessThan(660);
  });
});

describe('poolSample', () => {
  it('returns all values from a small pool over many trials', () => {
    // A 5-item pool should have all 5 values appear in 200 draws
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(poolSample(pool));
    expect(seen.size).toBe(5);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail (functions not defined yet)**

Run: `npm test -- --reporter=verbose tests/personas.test.ts`
Expected: FAIL — `weightedSample is not a function` or similar import error.

- [ ] **Step 3: Add `weightedSample` and `poolSample` to `src/tools/personas.ts`**

Add these two functions after the `DIMENSION_POOLS` constant:

```typescript
// Compare a single Math.random() draw against the cumulative table.
// The last entry must have cumulative === 1.0 to guarantee a match.
export function weightedSample(table: WeightedEntry[]): string {
  const r = Math.random();
  for (const entry of table) {
    if (r < entry.cumulative) return entry.value;
  }
  return table[table.length - 1].value;
}

// Uniform random pick from an array. All values are equally likely.
export function poolSample(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test -- --reporter=verbose tests/personas.test.ts`
Expected: 3 tests pass. (The generation/file tests are not written yet — they will fail with import errors once added in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/tools/personas.ts tests/personas.test.ts
git commit -m "feat(sp8): add weightedSample and poolSample; 3 sampling tests passing"
```

---

## Task 3: `buildPersona` + `generateStudentPersonas` + tests

**Why:** Generation is the core of SP8. `buildPersona` is a private helper that assembles one persona as a Markdown block by sampling all 23 dimensions. `generateStudentPersonas` clamps the count, calls `buildPersona` N times, assembles the file, writes it, and returns the result. Tests verify the count behavior, file creation, dimension completeness, and overwrite semantics.

**Files:**
- Modify: `src/tools/personas.ts` (add `ensureDir`, `buildPersona`, `generateStudentPersonas`)
- Modify: `tests/personas.test.ts` (add generation tests)

- [ ] **Step 1: Add generation tests to `tests/personas.test.ts`**

Add a new `describe` block after the `poolSample` block:

```typescript
describe('generateStudentPersonas', () => {
  it('generates 3 personas by default', () => {
    const result = generateStudentPersonas({}, TEST_PERSONAS);
    expect(result).toContain('Count: 3');
    expect(result).toContain('## Persona 1');
    expect(result).toContain('## Persona 2');
    expect(result).toContain('## Persona 3');
    expect(result).not.toContain('## Persona 4');
  });

  it('clamps count below 1 up to 1', () => {
    const result = generateStudentPersonas({ count: 0 }, TEST_PERSONAS);
    expect(result).toContain('Count: 1');
    expect(result).not.toContain('## Persona 2');
  });

  it('clamps count above 20 down to 20', () => {
    const result = generateStudentPersonas({ count: 99 }, TEST_PERSONAS);
    expect(result).toContain('Count: 20');
    expect(result).toContain('## Persona 20');
    expect(result).not.toContain('## Persona 21');
  });

  it('writes the personas file to personasPath', () => {
    expect(existsSync(TEST_PERSONAS)).toBe(false);
    generateStudentPersonas({ count: 1 }, TEST_PERSONAS);
    expect(existsSync(TEST_PERSONAS)).toBe(true);
  });

  it('each persona contains all 23 dimension labels', () => {
    const result = generateStudentPersonas({ count: 1 }, TEST_PERSONAS);
    const labels = [
      '**Age:**', '**Family Situation:**', '**Work and Study Balance:**',
      '**Previous Education:**', '**Subject Strengths:**', '**Subject Weaknesses:**',
      '**Academic Confidence:**', '**Short-Term Goals:**', '**Long-Term Goals:**',
      '**Confidence Levels:**', '**Learning Motivation:**', '**Engagement Style:**',
      '**Preferred Learning Methods:**', '**Technology Comfort Level:**',
      '**Academic Support:**', '**Emotional Support:**', '**Cultural Background:**',
      '**Financial Situation:**', '**Responsiveness to Feedback:**',
      '**Growth Mindset:**', '**Time Management:**',
      '**Race/Ethnic Background:**', '**Learning Disabilities/Challenges:**',
    ];
    for (const label of labels) {
      expect(result).toContain(label);
    }
  });

  it('overwrites the existing file on a second generation call', () => {
    generateStudentPersonas({ count: 2 }, TEST_PERSONAS);
    generateStudentPersonas({ count: 1 }, TEST_PERSONAS);
    const { content } = getStudentPersonas(TEST_PERSONAS);
    expect(content).toContain('Count: 1');
    expect(content).not.toContain('## Persona 2');
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run: `npm test -- --reporter=verbose tests/personas.test.ts`
Expected: FAIL — `generateStudentPersonas is not a function`.

- [ ] **Step 3: Add `ensureDir`, `buildPersona`, and `generateStudentPersonas` to `src/tools/personas.ts`**

Add after `poolSample`:

```typescript
function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// Samples all 23 dimensions and formats one persona as a Markdown section.
// index is 1-based (Persona 1, Persona 2, ...).
function buildPersona(index: number): string {
  return [
    `## Persona ${index}`,
    '',
    `- **Age:** ${poolSample(DIMENSION_POOLS.age)}`,
    `- **Family Situation:** ${poolSample(DIMENSION_POOLS.familySituation)}`,
    `- **Work and Study Balance:** ${poolSample(DIMENSION_POOLS.workStudyBalance)}`,
    `- **Previous Education:** ${poolSample(DIMENSION_POOLS.previousEducation)}`,
    `- **Subject Strengths:** ${poolSample(DIMENSION_POOLS.subjectStrengths)}`,
    `- **Subject Weaknesses:** ${poolSample(DIMENSION_POOLS.subjectWeaknesses)}`,
    `- **Academic Confidence:** ${poolSample(DIMENSION_POOLS.academicConfidence)}`,
    `- **Short-Term Goals:** ${poolSample(DIMENSION_POOLS.shortTermGoals)}`,
    `- **Long-Term Goals:** ${poolSample(DIMENSION_POOLS.longTermGoals)}`,
    `- **Confidence Levels:** ${poolSample(DIMENSION_POOLS.confidenceLevels)}`,
    `- **Learning Motivation:** ${poolSample(DIMENSION_POOLS.learningMotivation)}`,
    `- **Engagement Style:** ${poolSample(DIMENSION_POOLS.engagementStyle)}`,
    `- **Preferred Learning Methods:** ${poolSample(DIMENSION_POOLS.preferredLearningMethods)}`,
    `- **Technology Comfort Level:** ${poolSample(DIMENSION_POOLS.technologyComfortLevel)}`,
    `- **Academic Support:** ${poolSample(DIMENSION_POOLS.academicSupport)}`,
    `- **Emotional Support:** ${poolSample(DIMENSION_POOLS.emotionalSupport)}`,
    `- **Cultural Background:** ${poolSample(DIMENSION_POOLS.culturalBackground)}`,
    `- **Financial Situation:** ${poolSample(DIMENSION_POOLS.financialSituation)}`,
    `- **Responsiveness to Feedback:** ${poolSample(DIMENSION_POOLS.responsivenessToFeedback)}`,
    `- **Growth Mindset:** ${poolSample(DIMENSION_POOLS.growthMindset)}`,
    `- **Time Management:** ${poolSample(DIMENSION_POOLS.timeManagement)}`,
    `- **Race/Ethnic Background:** ${weightedSample(RACE_TABLE)}`,
    `- **Learning Disabilities/Challenges:** ${weightedSample(DISABILITY_TABLE)}`,
  ].join('\n');
}

export function generateStudentPersonas(
  input: GenerateStudentPersonasInput,
  personasPath = PERSONAS_PATH,
): string {
  const count = Math.min(20, Math.max(1, input.count ?? 3));
  const date = new Date().toISOString().slice(0, 10);
  const personas = Array.from({ length: count }, (_, i) => buildPersona(i + 1));
  const content = `# Student Personas\n\nGenerated: ${date} | Count: ${count}\n\n${personas.join('\n\n')}\n`;
  ensureDir(personasPath);
  writeFileSync(personasPath, content, 'utf-8');
  return `✓ Generated ${count} student persona${count === 1 ? '' : 's'} and saved to ${personasPath}\n\n${content}`;
}
```

- [ ] **Step 4: Run tests to confirm generation tests pass**

Run: `npm test -- --reporter=verbose tests/personas.test.ts`
Expected: 9 tests pass (3 sampling + 6 generation). The 2 `getStudentPersonas` tests still fail — they are added in Task 4.

Note: The "overwrites" test calls `getStudentPersonas` — if that function is not yet defined, it will fail. That test can be skipped temporarily with `.skip` and re-enabled in Task 4, or you can stub `getStudentPersonas` now. Either is fine — the important thing is that the other 5 generation tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/personas.ts tests/personas.test.ts
git commit -m "feat(sp8): add buildPersona and generateStudentPersonas; 9 tests passing"
```

---

## Task 4: `getStudentPersonas` + remaining tests

**Why:** The load/check tool is the entry point for every persona review session. It must return the saved file when it exists and a usable template when it doesn't — same pattern as `getPhilosophyKb` in `src/tools/philosophy.ts`.

**Files:**
- Modify: `src/tools/personas.ts` (add `getStudentPersonas`)
- Modify: `tests/personas.test.ts` (add `getStudentPersonas` tests, remove any `.skip`)

- [ ] **Step 1: Add `getStudentPersonas` tests**

Add after the `generateStudentPersonas` describe block in `tests/personas.test.ts`:

```typescript
describe('getStudentPersonas', () => {
  it('returns content and exists: true when file exists', () => {
    generateStudentPersonas({ count: 1 }, TEST_PERSONAS);
    const result = getStudentPersonas(TEST_PERSONAS);
    expect(result.exists).toBe(true);
    expect(result.content).toContain('## Persona 1');
  });

  it('returns template and exists: false when no file', () => {
    const result = getStudentPersonas(TEST_PERSONAS);
    expect(result.exists).toBe(false);
    expect(result.content).toBeTruthy();
  });
});
```

Also remove any `.skip` from the "overwrites" test if you added it in Task 3.

- [ ] **Step 2: Run tests to confirm the two new tests fail**

Run: `npm test -- --reporter=verbose tests/personas.test.ts`
Expected: FAIL — `getStudentPersonas is not a function`.

- [ ] **Step 3: Add `getStudentPersonas` to `src/tools/personas.ts`**

Add after `generateStudentPersonas`:

```typescript
export function getStudentPersonas(personasPath = PERSONAS_PATH): GetStudentPersonasResult {
  if (!existsSync(personasPath)) {
    return { content: PERSONAS_TEMPLATE, exists: false };
  }
  return { content: readFileSync(personasPath, 'utf-8'), exists: true };
}
```

- [ ] **Step 4: Run the full personas test suite**

Run: `npm test -- --reporter=verbose tests/personas.test.ts`
Expected: all 11 tests pass (3 sampling + 6 generation + 2 get).

- [ ] **Step 5: Run the full project test suite to check for regressions**

Run: `npm test`
Expected: all 187 existing tests still pass; personas tests also pass for a total of 198 passing.

- [ ] **Step 6: Commit**

```bash
git add src/tools/personas.ts tests/personas.test.ts
git commit -m "feat(sp8): add getStudentPersonas; 11 persona tests passing, 198 total"
```

---

## Task 5: Register tools in `src/index.ts` + update 2 existing descriptions

**Why:** The tools don't exist in the MCP server until they are registered in `src/index.ts`. This task also adds the philosophy-KB-style opt-in hint language to the two tools that benefit from persona context. No new logic — wiring and description strings only.

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add imports at the top of `src/index.ts`**

Find this line (around line 30):
```typescript
import { getPhilosophyKb, updatePhilosophyKb } from './tools/philosophy.js';
import type { UpdatePhilosophyKbInput } from './tools/philosophy.js';
```

Add immediately after it:
```typescript
import { generateStudentPersonas, getStudentPersonas } from './tools/personas.js';
import type { GenerateStudentPersonasInput } from './tools/personas.js';
```

- [ ] **Step 2: Register the two new tools in the `ListToolsRequestSchema` handler**

Find this line (around line 271):
```typescript
      },
    ],
  }));
```

The closing `]` is the end of the tools array. Insert the two new descriptors before that closing bracket — immediately after the `update_philosophy_kb` block:

```typescript
      {
        name: 'get_student_personas',
        description: 'Load saved student personas into context. If personas have been generated previously, returns them and asks whether to reuse or generate a new set. If none exist, returns an empty template and instructs you to call generate_student_personas. Call this at the start of any persona review session before asking the professor what to do.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'generate_student_personas',
        description: 'Generate statistically grounded student personas using real demographic distributions for race/ethnicity and learning disabilities/challenges, with randomized values across 21 other dimensions (age, work/study balance, financial situation, motivation, confidence, etc.). Saves to ~/.canvas-design-mcp/student-personas.md and returns the full content. Always overwrites any existing saved personas — this is a fresh start.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            count: {
              type: 'number',
              description: 'Number of personas to generate. Default 3. Min 1, max 20.',
            },
          },
        },
      },
```

- [ ] **Step 3: Add handlers in the `CallToolRequestSchema` handler**

Find the last `if (name === ...)` block in the handler (the `update_philosophy_kb` handler, around line 511). Add these two blocks immediately after it:

```typescript
      if (name === 'get_student_personas') {
        const result = getStudentPersonas();
        const lines: string[] = [];
        if (result.exists) {
          lines.push('> Saved personas found. Ask the professor whether to reuse these or generate a new set before reviewing.');
        } else {
          lines.push('> No personas saved yet. Ask the professor how many to generate, then call generate_student_personas.');
        }
        lines.push('');
        lines.push(result.content);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }

      if (name === 'generate_student_personas') {
        const input = (args ?? {}) as GenerateStudentPersonasInput;
        const result = generateStudentPersonas(input);
        return { content: [{ type: 'text', text: result }] };
      }
```

- [ ] **Step 4: Update the `critique_canvas_page` description**

Find this line (around line 145):
```typescript
        description: 'Evaluate a Canvas HTML page for visual design quality. Returns a score, strengths, and prioritized findings. Use quick mode for a fast structural check; comprehensive mode for a full design review with KB context for Claude to reason about. If the professor philosophy KB is in context, evaluate the page against the professor\'s stated standards and teaching philosophy.',
```

Replace with:
```typescript
        description: 'Evaluate a Canvas HTML page for visual design quality. Returns a score, strengths, and prioritized findings. Use quick mode for a fast structural check; comprehensive mode for a full design review with KB context for Claude to reason about. If the professor philosophy KB is in context, evaluate the page against the professor\'s stated standards and teaching philosophy. If student personas are in context, factor their backgrounds into the findings where relevant.',
```

- [ ] **Step 5: Update the `ingest_assignment_folder` description**

Find this line (around line 227):
```typescript
        description: 'Read assignment materials from a folder and generate a Canvas-safe HTML page. ' +
```

The full description string spans multiple lines. Add the persona note at the end of the last string in the concatenation. Find:
```typescript
          'If the professor philosophy KB is in context, apply it when generating the page and note any alignment between the assignment materials and the professor\'s philosophy.',
```

Replace with:
```typescript
          'If the professor philosophy KB is in context, apply it when generating the page and note any alignment between the assignment materials and the professor\'s philosophy. ' +
          'If student personas are in context, consider their backgrounds when noting alignment gaps between assignment materials and student needs.',
```

- [ ] **Step 6: Build and run all tests**

Run: `npm run build && npm test`
Expected: build passes, 198 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/index.ts
git commit -m "feat(sp8): register get_student_personas and generate_student_personas tools; update 2 tool descriptions"
```

---

## Task 6: Docs update and push

**Why:** Every sprint ends by updating the handoff docs before pushing. These docs are the cold-start orientation for the next agent (Claude, Codex, or Gemini). Without them, the next session has to rediscover everything by reading the code. The docs take 10 minutes and save hours.

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/handoff-to-Claude.md`
- Modify: `docs/technical-roadmap.md`
- Modify: `docs/feature-roadmap.md`

- [ ] **Step 1: Update `AGENTS.md`**

**Repository layout — add `personas.ts` and `personas.test.ts`:**

Find:
```
│       └── philosophy.ts              ← get_philosophy_kb, update_philosophy_kb, KB file I/O, section helpers
```
Replace with:
```
│       ├── philosophy.ts              ← get_philosophy_kb, update_philosophy_kb, KB file I/O, section helpers
│       └── personas.ts                ← generate_student_personas, get_student_personas, dimension pools, weighted sampler
```

Find:
```
│   └── philosophy.test.ts             ← 12 tests
```
Replace with:
```
│   ├── philosophy.test.ts             ← 12 tests
│   └── personas.test.ts               ← 11 tests
```

**MCP Tools section header:**

Find: `## Current MCP Tools (SP1–SP7 Complete)`
Replace with: `## Current MCP Tools (SP1–SP8 Complete)`

**Add tools 15 and 16 after tool 14:**

```markdown
### 15. `get_student_personas`
Load saved student personas into context. Returns saved personas if they exist and asks whether to reuse or regenerate. Returns an empty template with instructions if no personas have been generated yet.

**Input:** none

### 16. `generate_student_personas`
Generate N statistically grounded student personas. Race/ethnicity and learning disabilities use real probability tables; 21 other dimensions draw from CSV-sourced example pools. Saves to `~/.canvas-design-mcp/student-personas.md`. Always overwrites existing file.

**Input:** `count?` (number — default 3, min 1, max 20)
```

**Testing Conventions — update test count:**

Find: `- Current passing test count: **187**`
Replace with: `- Current passing test count: **198**`

**Completed Sprints — add SP8:**

After the SP7 entry, add:

```markdown
### SP8 — Student Persona Review (complete, 2026-05-09)
`get_student_personas`, `generate_student_personas`. Statistically grounded student personas saved to `~/.canvas-design-mcp/student-personas.md`. Race/ethnicity and learning disabilities use real cumulative probability tables from Kevin's persona generator materials. 21 other dimensions draw uniformly from CSV-sourced example pools embedded as TypeScript constants in `src/tools/personas.ts`. Default count: 3. Personas are saved on generation and reused across sessions; professor is prompted to reuse or regenerate on each use. 11 new tests. Total: **198 passing**.

Key implementation details:
- `weightedSample(table)` — `Math.random()` compared against cumulative thresholds; last entry must be 1.0
- `poolSample(pool)` — `Math.floor(Math.random() * pool.length)` uniform pick
- `buildPersona(index)` — private; samples all 23 dimensions, returns Markdown `## Persona N` block
- `generateStudentPersonas(input, personasPath?)` and `getStudentPersonas(personasPath?)` accept optional path for testability via `os.tmpdir()`
- Description updates: `critique_canvas_page`, `ingest_assignment_folder`
```

**Key Architectural Decisions — add one row:**

Find the last row in the table and add after it:
```
| Persona generation in server, review in Claude | `generateStudentPersonas` does random sampling (pure math); Claude does the judgment review | Random selection is deterministic computation — no API calls; review requires reading comprehension and contextual judgment |
```

- [ ] **Step 2: Update `docs/handoff-to-Claude.md`**

Add a new handoff section at the end of the file:

```markdown
---

# Handoff to Next Agent — SP8 Student Persona Review

**Date:** 2026-05-09
**Status:** COMPLETE — 198 tests passing

## What SP8 Built

Two new MCP tools:
- `get_student_personas` — returns saved personas from `~/.canvas-design-mcp/student-personas.md`; if no file exists, returns an empty template with instructions to call `generate_student_personas`
- `generate_student_personas(count?)` — generates N personas using real probability tables for race/ethnicity and learning disabilities, and uniform pool sampling for 21 other dimensions; saves to file; default count 3, clamped to [1, 20]

Description updates to `critique_canvas_page` and `ingest_assignment_folder`.

## SP8 Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Server does generation, Claude does review | `generateStudentPersonas` is pure computation; no API calls | Random selection is math — same category as `sanitizeFilename`. Review requires judgment, which is Claude's job |
| Dimension pools embedded as TS constants | Values extracted from `docs/AI-Personas-ideas_Student-Personas.csv` | No runtime file reads; no CSV parsing dependency; data is stable |
| Two weighted dimensions, 21 uniform | Race and disability use cumulative probability tables; others use `poolSample` | Only race and disability have real statistical distributions in Kevin's source materials |
| Always overwrites on generation | `generateStudentPersonas` always overwrites the saved file | No need for history of past persona sets; the reuse/regenerate prompt handles the common case |
| Default count: 3 | Kevin's stated preference | Enough for meaningful pattern detection without overwhelming the review |
| Optional `personasPath` parameter | Defaults to `PERSONAS_PATH`; tests use `os.tmpdir()` | Same pattern as philosophy.ts — no filesystem mocking needed |

## SP8 Commits

(Run `git log --oneline -10` to see SP8 commits)

## Next Step: SP9 (TBD)

No SP9 is currently specified. Check `docs/technical-roadmap.md` for the current roadmap.
```

- [ ] **Step 3: Update `docs/technical-roadmap.md`**

**Update the header date:**

Find: `**Last updated:** 2026-05-08 (SP7 complete)`
Replace with: `**Last updated:** 2026-05-09 (SP8 complete)`

**Update the SP8 row in the Implementation Steps table:**

Find:
```
| SP8 | Student persona review | Next | likely persona generator integration and report output | Future additions doc plus Kevin's persona generator materials | Must use statistically grounded personas, not generic archetypes. |
```
Replace with:
```
| SP8 | Student persona review | Done ✅ | `src/tools/personas.ts`, `tests/personas.test.ts`, `src/index.ts` | `docs/superpowers/specs/2026-05-09-sp8-student-persona-review-design.md`, `docs/superpowers/plans/2026-05-09-sp8-student-persona-review.md` | 2 new tools: `get_student_personas`, `generate_student_personas`. Real probability tables for race and disability; 21 pool-sampled dimensions. Personas saved to `~/.canvas-design-mcp/student-personas.md`. 11 new tests. 198 total. |
```

**Add SP8 Technical Context section** after the SP7 Technical Context section (before "Known Documentation Notes"):

```markdown
## SP8 Technical Context

SP8 added two MCP tools for statistically grounded student persona generation and retrieval.

### New Files

| File | Responsibility |
|---|---|
| `src/tools/personas.ts` | `RACE_TABLE`, `DISABILITY_TABLE`, `DIMENSION_POOLS` (21 arrays, values from CSV), `weightedSample`, `poolSample`, `buildPersona` (private), `generateStudentPersonas`, `getStudentPersonas`, file I/O |
| `tests/personas.test.ts` | 11 tests — weighted distribution correctness, pool coverage, count clamping, file creation, 23-dimension presence, overwrite behavior, load/template behavior |

### Key Design

The 23 persona dimensions come from Kevin's `docs/Student-Personas.md` and `docs/AI-Personas-ideas_Student-Personas.csv`. Race/ethnicity and learning disabilities have real cumulative probability tables; the other 21 dimensions draw uniformly from example pools embedded as TypeScript constants. Generation is pure computation — no API calls. The review is Claude's job.

### Implementation Details

| Detail | What to know |
|---|---|
| `weightedSample(table)` | Single `Math.random()` draw compared against cumulative thresholds; last entry must be 1.0 to guarantee match |
| `poolSample(pool)` | `Math.floor(Math.random() * pool.length)` — all values equally likely |
| `buildPersona(index)` | Private helper; samples all 23 dimensions, returns `## Persona N` Markdown block with all 23 as bullet list |
| Count clamping | `Math.min(20, Math.max(1, count ?? 3))` — silent clamp, no error |
| Overwrite on generate | `writeFileSync` always overwrites — generation is a fresh start by design |
| Optional `personasPath` | Both exported functions accept `personasPath?` for testability; tests use `os.tmpdir()` |

---
```

- [ ] **Step 4: Update `docs/feature-roadmap.md`**

**Update header:**

Find: `**Last updated:** 2026-05-08 (SP7 complete)`
Replace with: `**Last updated:** 2026-05-09 (SP8 complete)`

**Add v0.8 section** after the v0.7 section and before "Coming Next":

```markdown
## Now Available (v0.8)

### Student Persona Review (SP8)

Professors can now get feedback on Canvas assignment instructions from realistic, statistically grounded student perspectives before publishing.

| Feature | What professors can do |
|---|---|
| Generate student personas | Create 3–20 student personas using real demographic distributions for race/ethnicity and learning disabilities |
| Save and reuse personas | Personas are saved across sessions; Claude asks whether to reuse or regenerate on each review |
| Assignment instruction review | Ask Claude to review any assignment through each student persona's lens — confusion points, missing info, tone flags, accessibility barriers |
| Aggregate summary | See which issues were flagged by multiple personas — the high-agreement items are the priority |
```

**Update "Coming Next":**

Find:
```markdown
## Coming Next

| Feature | What professors could gain |
|---|---|
| Student persona review | Get feedback from realistic, statistically grounded student perspectives before publishing. |
```
Replace with:
```markdown
## Coming Next

No additional sprints are currently specified. The core professor workflow is complete through SP8.
```

- [ ] **Step 5: Run tests one final time**

Run: `npm test`
Expected: 198 tests pass.

- [ ] **Step 6: Commit docs and push**

```bash
git add AGENTS.md docs/handoff-to-Claude.md docs/technical-roadmap.md docs/feature-roadmap.md
git commit -m "docs(sp8): update all handoff docs — 16 tools, 198 tests, SP8 complete"
git push origin master
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `generate_student_personas(count?)` — Task 3 + Task 5
- ✅ `get_student_personas()` — Task 4 + Task 5
- ✅ Race/disability weighted sampling — Task 2
- ✅ 21 pool-sampled dimensions — Task 1
- ✅ Default count 3, min 1, max 20 — Task 3
- ✅ Saved to `~/.canvas-design-mcp/student-personas.md` — Task 3
- ✅ `exists: boolean` flag — Task 4
- ✅ "Ask professor to reuse or regenerate" hint — Task 5
- ✅ Optional `personasPath` for testability — Tasks 3–4
- ✅ Description updates to `critique_canvas_page` and `ingest_assignment_folder` — Task 5
- ✅ 10+ tests covering all spec test scenarios — Tasks 2–4
- ✅ Docs updated — Task 6

**Type consistency:** `GenerateStudentPersonasInput`, `GetStudentPersonasResult`, `weightedSample`, `poolSample`, `generateStudentPersonas`, `getStudentPersonas` — consistent across all tasks. `RACE_TABLE`, `DISABILITY_TABLE`, `DIMENSION_POOLS` defined in Task 1, used in Tasks 2–3.

**No placeholders:** All code blocks contain actual runnable TypeScript. All test assertions are explicit. All `git commit` messages are specified.
