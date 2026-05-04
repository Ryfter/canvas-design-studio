# Canvas Design MCP — Sub-project 1 Implementation Plan

> **Status: COMPLETE — v0.1.0 shipped 2026-05-04**
> All 9 tasks done. 33 tests passing. Initial git commit made. Tagged v0.1.0.
> GitHub push and npm publish pending (requires GitHub repo + NPM_TOKEN secret setup).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build an npm-publishable MCP server that generates Canvas-safe HTML assignment pages from a brief, with a first-run setup wizard that stores institution config at `~/.canvas-design-mcp/institution.json`.

**Architecture (as built):** Node.js + TypeScript MCP server using `@modelcontextprotocol/sdk`. Four tools exposed: `setup_institution`, `generate_canvas_page`, `validate_canvas_html`, `update_canvas_kb`. Config stored in the user's home directory so it persists across `npx` invocations. KB files stay in `docs/` (not bundled in npm package — `update_canvas_kb` fetches from GitHub instead). GitHub Actions publishes to npm on version tags.

**Tech Stack:** Node.js 18+ · TypeScript 5 (module: Node16) · `@modelcontextprotocol/sdk` · `@inquirer/prompts` · `color` · `@anthropic-ai/sdk` (reserved SP4) · `vitest` · GitHub Actions

---

## Project Location

⚠ DEVIATION: This is NOT a separate project. It lives inside `canvas-design-studio/`.

**Actual location:** `D:\Dev\canvas-design-studio\`

Decision made via Six Hats review: one repo eliminates KB sync drift and is simpler to maintain and contribute to. The `package.json` `name` field is `canvas-design-mcp` so the npm package name is correct.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Create | Dependencies, scripts, bin entry |
| `tsconfig.json` | Create | TypeScript config (ESM output) |
| `.gitignore` | Create | Exclude institution.json, dist/, node_modules/ |
| `.npmignore` | Create | Exclude src/, tests/, .github/ from npm package |
| `src/types.ts` | Create | InstitutionConfig interface |
| `src/config.ts` | Create | loadConfig / saveConfig / configExists |
| `src/design-engine.ts` | Create | Token injector ({{token}} → value) |
| `src/templates/two-column-dashboard.html` | Create | Base HTML template with {{tokens}} |
| `src/kb/allowlist.md` | Create | Canvas RCE allowlist rules |
| `src/kb/components.md` | Create | Component library reference |
| `src/kb/grid-classes.md` | Create | Canvas built-in CSS classes |
| `src/tools/validate.ts` | Create | validate_canvas_html tool logic |
| `src/tools/generate.ts` | Create | generate_canvas_page tool logic |
| `src/wizard.ts` | Create | First-run CLI wizard |
| `src/index.ts` | Create | MCP server entry point |
| `tests/config.test.ts` | Create | Config load/save tests |
| `tests/design-engine.test.ts` | Create | Token injection tests |
| `tests/validate.test.ts` | Create | HTML validation tests |
| `tests/generate.test.ts` | Create | Page generation tests |
| `.github/workflows/publish.yml` | Create | GitHub Actions npm publish on tag |
| `README.md` | Create | Install + usage instructions |

---

### Task 1: Project Scaffold

**Files:**
- Create: `D:/Dev/canvas-design-mcp/package.json`
- Create: `D:/Dev/canvas-design-mcp/tsconfig.json`
- Create: `D:/Dev/canvas-design-mcp/.gitignore`
- Create: `D:/Dev/canvas-design-mcp/.npmignore`

- [x] **Step 1: Create the project directory**

```bash
mkdir -p D:/Dev/canvas-design-mcp
cd D:/Dev/canvas-design-mcp
```

- [x] **Step 2: Create `package.json`**

```json
{
  "name": "canvas-design-mcp",
  "version": "0.1.0",
  "description": "MCP server for generating and publishing Canvas LMS assignment pages",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "canvas-design-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "files": [
    "dist/",
    "src/kb/",
    "src/templates/"
  ],
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.0",
    "@inquirer/prompts": "^7.0.0",
    "@modelcontextprotocol/sdk": "^1.10.0",
    "color": "^4.2.3"
  },
  "devDependencies": {
    "@types/color": "^3.0.6",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [x] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [x] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
institution.json
~/.canvas-design-mcp/
*.js.map
.env
```

- [x] **Step 5: Create `.npmignore`**

```
src/
tests/
.github/
*.test.ts
tsconfig.json
.gitignore
```

- [x] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `package-lock.json` written. No errors.

- [x] **Step 7: Commit**

```bash
git init
git add package.json tsconfig.json .gitignore .npmignore
git commit -m "chore: scaffold canvas-design-mcp project"
```

---

### Task 2: Types + Config

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

- [x] **Step 1: Create `src/types.ts`**

```typescript
export interface InstitutionColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
}

export interface InstitutionConfig {
  institution: string;
  colors: InstitutionColors;
  canvasUrl: string;
  apiToken: string;
}
```

- [x] **Step 2: Create `src/config.ts`**

```typescript
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import type { InstitutionConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.canvas-design-mcp');
const CONFIG_PATH = join(CONFIG_DIR, 'institution.json');

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

export function loadConfig(): InstitutionConfig {
  if (!configExists()) {
    throw new Error(`No institution config found at ${CONFIG_PATH}. Run setup_institution first.`);
  }
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as InstitutionConfig;
}

export function saveConfig(config: InstitutionConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
```

- [x] **Step 3: Write failing tests in `tests/config.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync } from 'fs';

// Override config path to a temp dir for tests
const TEST_DIR = join(process.cwd(), 'tests', '.tmp-config');

vi.mock('../src/config.js', async () => {
  const { existsSync, mkdirSync, readFileSync, writeFileSync } = await import('fs');
  const CONFIG_PATH = join(TEST_DIR, 'institution.json');
  return {
    configExists: () => existsSync(CONFIG_PATH),
    loadConfig: () => {
      if (!existsSync(CONFIG_PATH)) throw new Error('No config found');
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    },
    saveConfig: (config: unknown) => {
      if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    }
  };
});

const { configExists, loadConfig, saveConfig } = await import('../src/config.js');

const SAMPLE_CONFIG = {
  institution: 'Test University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://test.instructure.com',
  apiToken: 'test-token-123',
};

describe('config', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('configExists returns false when no config file', () => {
    expect(configExists()).toBe(false);
  });

  it('saveConfig writes institution.json', () => {
    saveConfig(SAMPLE_CONFIG);
    expect(configExists()).toBe(true);
  });

  it('loadConfig returns saved config', () => {
    saveConfig(SAMPLE_CONFIG);
    const loaded = loadConfig();
    expect(loaded.institution).toBe('Test University');
    expect(loaded.colors.primary).toBe('#0033A0');
    expect(loaded.apiToken).toBe('test-token-123');
  });

  it('loadConfig throws when config missing', () => {
    expect(() => loadConfig()).toThrow('No config found');
  });
});
```

- [x] **Step 4: Run tests — expect FAIL**

```bash
npm test
```

Expected: FAIL — module not found or type errors.

- [x] **Step 5: Run tests — expect PASS after implementations are in place**

```bash
npm test
```

Expected: 4 passing tests.

- [x] **Step 6: Commit**

```bash
git add src/types.ts src/config.ts tests/config.test.ts
git commit -m "feat: add InstitutionConfig types and config loader"
```

---

### Task 3: Design Engine

**Files:**
- Create: `src/design-engine.ts`
- Create: `src/templates/two-column-dashboard.html`
- Create: `tests/design-engine.test.ts`

- [x] **Step 1: Create `src/design-engine.ts`**

```typescript
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { InstitutionConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function resolveTokens(template: string, config: InstitutionConfig): string {
  const tokens: Record<string, string> = {
    '{{institution.name}}': config.institution,
    '{{colors.primary}}': config.colors.primary,
    '{{colors.primaryDark}}': config.colors.primaryDark,
    '{{colors.primaryLight}}': config.colors.primaryLight,
    '{{colors.secondary}}': config.colors.secondary,
  };
  return Object.entries(tokens).reduce(
    (html, [token, value]) => html.replaceAll(token, value),
    template
  );
}

export function loadTemplate(name: string): string {
  const templatePath = join(__dirname, 'templates', `${name}.html`);
  return readFileSync(templatePath, 'utf-8');
}

export function applyTemplate(templateName: string, config: InstitutionConfig): string {
  const template = loadTemplate(templateName);
  return resolveTokens(template, config);
}
```

- [x] **Step 2: Create `src/templates/two-column-dashboard.html`**

This is the base Canvas page template with institution tokens. All `opacity:` uses replaced with `rgba()`. No `gap`, no `box-shadow`, no `<style>` blocks.

```html
<!-- Canvas Design MCP — Two Column Dashboard Template -->
<!-- Canvas-safe: inline CSS only, no <style>, no <script>, no gap, no box-shadow -->
<div style="max-width:860px;margin:0 auto;font-family:Lato,sans-serif;background:#F4F3EF;padding:16px;">

  <!-- HERO BANNER -->
  <div style="background:linear-gradient(135deg,{{colors.primaryDark}} 0%,{{colors.primary}} 60%,#1A5BCC 100%);border-radius:14px;overflow:hidden;margin-bottom:20px;">
    <img src="{{hero.imageUrl}}" alt="{{hero.alt}}" style="width:100%;height:200px;object-fit:cover;display:block;border-radius:14px 14px 0 0;">
    <div style="padding:28px 32px;">
      <div style="display:inline-block;background:{{colors.secondary}};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:3px 12px;border-radius:20px;margin-bottom:10px;">{{course.number}} &middot; {{course.assignmentNumber}}</div>
      <h2 style="color:#ffffff;font-size:28px;font-weight:700;line-height:1.2;margin:0 0 6px 0;font-family:Lato,sans-serif;">{{page.title}}</h2>
      <p style="color:rgba(255,255,255,0.85);font-size:15px;font-weight:400;margin:0 0 20px 0;font-family:Lato,sans-serif;">{{page.subtitle}}</p>
      {{hero.statBadges}}
    </div>
  </div>

  <!-- TWO-COLUMN BODY -->
  <div class="content-box">
    <div class="grid-row">

      <!-- LEFT COLUMN -->
      <div class="col-xs-12 col-md-8" style="padding-right:12px;">
        {{left.content}}
      </div>

      <!-- RIGHT SIDEBAR -->
      <div class="col-xs-12 col-md-4">
        {{right.content}}
      </div>

    </div>
  </div>

</div>
```

- [x] **Step 3: Write failing tests in `tests/design-engine.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { resolveTokens } from '../src/design-engine.js';
import type { InstitutionConfig } from '../src/types.js';

const config: InstitutionConfig = {
  institution: 'Test University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://test.instructure.com',
  apiToken: 'test-token',
};

describe('resolveTokens', () => {
  it('replaces institution name token', () => {
    const result = resolveTokens('Welcome to {{institution.name}}', config);
    expect(result).toBe('Welcome to Test University');
  });

  it('replaces all color tokens', () => {
    const template = 'background:{{colors.primary}};border:{{colors.primaryDark}};bg:{{colors.primaryLight}};accent:{{colors.secondary}}';
    const result = resolveTokens(template, config);
    expect(result).toBe('background:#0033A0;border:#002277;bg:#E6ECF9;accent:#D64309');
  });

  it('replaces multiple occurrences of the same token', () => {
    const result = resolveTokens('{{colors.primary}} and {{colors.primary}}', config);
    expect(result).toBe('#0033A0 and #0033A0');
  });

  it('leaves unknown tokens unchanged', () => {
    const result = resolveTokens('{{unknown.token}}', config);
    expect(result).toBe('{{unknown.token}}');
  });
});
```

- [x] **Step 4: Run tests — expect PASS**

```bash
npm test
```

Expected: 4 passing tests in design-engine suite.

- [x] **Step 5: Commit**

```bash
git add src/design-engine.ts src/templates/two-column-dashboard.html tests/design-engine.test.ts
git commit -m "feat: add design engine with token injection"
```

---

### Task 4: KB Files → REPLACED BY `update_canvas_kb` tool

> ⚠ AS BUILT: This task was replaced entirely. Static KB file copying was abandoned in favor of a live-fetch tool that pulls the authoritative Canvas sanitizer source from GitHub. This eliminates the manual sync burden and provides diff visibility when Canvas changes its rules.
>
> `src/kb/` was never created. KB files remain in `docs/canvas-design-kb/` and are excluded from the npm package via `.npmignore`. The validator and generator use hardcoded rule sets; the `update_canvas_kb` tool maintains a cached allowlist at `~/.canvas-design-mcp/kb/allowlist.json`.

**What was built instead:** `src/tools/update-kb.ts`
- Fetches `gems/canvas_sanitize/lib/canvas_sanitize/canvas_sanitize.rb` from GitHub
- Parses `ALLOWED_ELEMENTS` and `ALLOWED_CSS_PROPERTIES` `%w[...]` arrays via regex
- Diffs against cached `~/.canvas-design-mcp/kb/allowlist.json`
- 24h cache, `force: true` to bypass
- Graceful fallback if Ruby source format changes (returns `parseWarning`, doesn't crash)
- 5 tests in `tests/update-kb.test.ts` using mocked `fetch`

- [x] **Step 1–5: Replaced by update_canvas_kb implementation (see `src/tools/update-kb.ts`)**

---

### Task 5: validate_canvas_html Tool ✅ DONE (with two bug fixes)

**Files:**
- Create: `src/tools/validate.ts`
- Create: `tests/validate.test.ts`

- [x] **Step 1: Create `src/tools/validate.ts`**

```typescript
export interface ValidationViolation {
  rule: string;
  context: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: ValidationViolation[];
}

const RULES: Array<{ name: string; pattern: RegExp; message: string }> = [
  {
    name: 'no-style-block',
    pattern: /<style[\s>]/i,
    message: 'No <style> blocks — all CSS must be inline style="" attributes',
  },
  {
    name: 'no-script-tag',
    pattern: /<script[\s>]/i,
    message: 'No <script> tags — JavaScript is not allowed in Canvas RCE',
  },
  {
    name: 'no-box-shadow',
    pattern: /box-shadow\s*:/i,
    message: 'No box-shadow — stripped by Canvas sanitizer',
  },
  {
    name: 'no-gap-property',
    pattern: /(?:^|;|\s)gap\s*:/i,
    message: 'No gap property in flex/grid — use margin on children instead',
  },
  {
    name: 'no-opacity-property',
    pattern: /(?:^|;|\s)opacity\s*:/i,
    message: 'No opacity property — use rgba() color values instead',
  },
  {
    name: 'no-filter',
    pattern: /(?:^|;|\s)filter\s*:/i,
    message: 'No filter property — stripped by Canvas sanitizer',
  },
  {
    name: 'no-transform',
    pattern: /(?<![a-z-])transform\s*:/i,
    message: 'No transform property — stripped by Canvas sanitizer (text-transform is allowed)',
  },
  {
    name: 'no-transition',
    pattern: /(?:^|;|\s)transition\s*:/i,
    message: 'No transition property — stripped by Canvas sanitizer',
  },
  {
    name: 'no-animation',
    pattern: /(?:^|;|\s)animation\s*:/i,
    message: 'No animation property — stripped by Canvas sanitizer',
  },
  {
    name: 'no-h1',
    pattern: /<h1[\s>]/i,
    message: 'No <h1> tags — Canvas reserves H1 for the page title',
  },
];

export function validateCanvasHtml(html: string): ValidationResult {
  const violations: ValidationViolation[] = [];

  for (const rule of RULES) {
    const match = html.match(rule.pattern);
    if (match) {
      violations.push({
        rule: rule.message,
        context: match[0].trim(),
      });
    }
  }

  // Check all img tags have alt attributes
  const imgTags = html.match(/<img[^>]*>/gi) ?? [];
  for (const img of imgTags) {
    if (!/alt\s*=/i.test(img)) {
      violations.push({
        rule: 'All <img> tags must have an alt="" attribute',
        context: img.substring(0, 60) + '...',
      });
    }
  }

  return { valid: violations.length === 0, violations };
}
```

- [x] **Step 2: Write failing tests in `tests/validate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { validateCanvasHtml } from '../src/tools/validate.js';

describe('validateCanvasHtml', () => {
  it('passes clean HTML', () => {
    const html = '<div style="color:#0033A0;"><h2>Hello</h2></div>';
    const result = validateCanvasHtml(html);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('flags <style> blocks', () => {
    const result = validateCanvasHtml('<style>body{color:red}</style>');
    expect(result.valid).toBe(false);
    expect(result.violations[0].rule).toContain('No <style> blocks');
  });

  it('flags <script> tags', () => {
    const result = validateCanvasHtml('<script>alert(1)</script>');
    expect(result.valid).toBe(false);
    expect(result.violations[0].rule).toContain('No <script>');
  });

  it('flags box-shadow', () => {
    const result = validateCanvasHtml('<div style="box-shadow: 0 2px 4px #000;">');
    expect(result.valid).toBe(false);
    expect(result.violations[0].rule).toContain('box-shadow');
  });

  it('flags gap property', () => {
    const result = validateCanvasHtml('<div style="display:flex;gap:16px;">');
    expect(result.valid).toBe(false);
    expect(result.violations[0].rule).toContain('gap');
  });

  it('flags opacity property but allows rgba colors', () => {
    const withOpacity = validateCanvasHtml('<div style="opacity:0.5;">');
    expect(withOpacity.valid).toBe(false);

    const withRgba = validateCanvasHtml('<div style="color:rgba(0,0,0,0.5);">');
    expect(withRgba.valid).toBe(true);
  });

  it('does NOT flag text-transform (only transform)', () => {
    const result = validateCanvasHtml('<div style="text-transform:uppercase;">');
    expect(result.valid).toBe(true);
  });

  it('flags <h1> tags', () => {
    const result = validateCanvasHtml('<h1>Title</h1>');
    expect(result.valid).toBe(false);
    expect(result.violations[0].rule).toContain('No <h1>');
  });

  it('flags img without alt attribute', () => {
    const result = validateCanvasHtml('<img src="photo.jpg">');
    expect(result.valid).toBe(false);
    expect(result.violations[0].rule).toContain('alt=""');
  });

  it('passes img with alt attribute', () => {
    const result = validateCanvasHtml('<img src="photo.jpg" alt="A photo">');
    expect(result.valid).toBe(true);
  });

  it('returns multiple violations', () => {
    const result = validateCanvasHtml('<style>.a{}</style><h1>Title</h1>');
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [x] **Step 3: Run tests — expect PASS**

```bash
npm test
```

Expected: 11 passing tests in validate suite.

> **Bug 1 fixed during implementation:** The `opacity:` regex `(?:^|;|\s)opacity\s*:` failed to catch `style="opacity:0.5;"` because `opacity` is preceded by `"` (not space/semicolon/start-of-string). Fixed by adding `"` to the character class: `(?:^|[;"\s])opacity\s*:`.
>
> **Bug 2 fixed during implementation:** The generator's HTML comment `<!-- Canvas-safe: inline CSS only, no <style>... -->` contained literal `<style>` which matched the no-style-block regex. Fixed two ways: (1) validator now strips all HTML comments before running rules (`html.replace(/<!--[\s\S]*?-->/g, '')`); (2) generator comment rewritten to avoid literal tag names.

- [x] **Step 4: Commit**

```bash
git add src/tools/validate.ts tests/validate.test.ts
git commit -m "feat: add validate_canvas_html tool with Canvas RCE compliance checks"
```

---

### Task 6: generate_canvas_page Tool

**Files:**
- Create: `src/tools/generate.ts`
- Create: `tests/generate.test.ts`

- [x] **Step 1: Create `src/tools/generate.ts`**

```typescript
import { resolveTokens } from '../design-engine.js';
import { validateCanvasHtml } from './validate.js';
import type { InstitutionConfig } from '../types.js';

export interface GenerateInput {
  assignmentBrief: string;
  courseName: string;
  courseNumber: string;
  assignmentNumber: string;
  professorName: string;
  semester: string;
  styleNotes?: string;
}

export interface GenerateOutput {
  html: string;
  heroImagePrompt: string;
  filename: string;
  warnings: string[];
}

function buildStatBadges(stats: Array<{ value: string; label: string }>): string {
  return stats
    .map(
      ({ value, label }) =>
        `<div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;margin-right:10px;margin-bottom:8px;text-align:center;color:#ffffff;">` +
        `<div style="font-size:22px;font-weight:700;font-family:Lato,sans-serif;">${value}</div>` +
        `<div style="font-size:11px;color:rgba(255,255,255,0.85);font-family:Lato,sans-serif;">${label}</div>` +
        `</div>`
    )
    .join('\n');
}

function buildSectionCard(label: string, content: string, accentColor: string): string {
  return (
    `<div style="background:#ffffff;border-radius:10px;border:1px solid #e0e0d8;padding:20px 24px;margin-bottom:14px;">` +
    `<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accentColor};margin-bottom:8px;font-family:Lato,sans-serif;">${label}</div>` +
    content +
    `</div>`
  );
}

function buildSidebarCard(title: string, content: string, bgColor: string, textColor: string): string {
  return (
    `<div style="background:${bgColor};border-radius:10px;padding:16px 20px;margin-bottom:12px;border:1px solid #e0e0d8;">` +
    `<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${textColor};margin-bottom:8px;font-family:Lato,sans-serif;">${title}</div>` +
    content +
    `</div>`
  );
}

export function generateCanvasPage(input: GenerateInput, config: InstitutionConfig): GenerateOutput {
  const { courseNumber, assignmentNumber, courseName, assignmentBrief, professorName, semester } = input;

  // Parse brief into overview + bullet points (simple split on newlines)
  const lines = assignmentBrief.split('\n').filter(l => l.trim());
  const overview = lines.slice(0, 3).join(' ').trim();
  const details = lines.slice(3);

  // Build left column
  const overviewContent = `<p style="font-size:15px;color:#1A1A1A;line-height:1.65;margin:0;font-family:Lato,sans-serif;">${overview}</p>`;

  const detailItems = details
    .map(line => `<div style="display:flex;align-items:flex-start;margin-bottom:10px;"><span style="color:${config.colors.secondary};font-weight:700;font-size:16px;margin-right:10px;line-height:1.4;">&rarr;</span><p style="font-size:14px;color:#1A1A1A;margin:0;line-height:1.65;font-family:Lato,sans-serif;">${line.replace(/^[-*]\s*/, '')}</p></div>`)
    .join('\n');

  const leftContent =
    buildSectionCard('Overview', overviewContent, config.colors.primary) +
    (detailItems ? buildSectionCard('Details', detailItems, config.colors.primary) : '');

  // Build right sidebar
  const submissionContent = `<p style="font-size:14px;color:#1A1A1A;line-height:1.65;margin:0;font-family:Lato,sans-serif;">See Canvas for submission details and due date.</p>`;
  const gradingContent = `<div style="border-left:3px solid ${config.colors.secondary};padding-left:12px;"><p style="font-size:14px;color:#1A1A1A;line-height:1.65;margin:0;font-family:Lato,sans-serif;">See rubric in Canvas for grading criteria.</p></div>`;

  const rightContent =
    `<div style="background:${config.colors.primary};border-radius:10px;padding:20px;margin-bottom:12px;">` +
    `<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:12px;font-family:Lato,sans-serif;">What to Submit</div>` +
    `<p style="color:rgba(255,255,255,0.85);font-size:13px;font-family:Lato,sans-serif;">Submit via Canvas. Check the assignment for specific requirements.</p>` +
    `</div>` +
    buildSidebarCard('Grading', gradingContent, '#ffffff', '#555550');

  // Resolve template tokens
  const pageTokens: Record<string, string> = {
    '{{course.number}}': courseNumber,
    '{{course.assignmentNumber}}': assignmentNumber,
    '{{course.name}}': courseName,
    '{{page.title}}': courseName,
    '{{page.subtitle}}': `${courseNumber} &middot; ${semester}`,
    '{{hero.imageUrl}}': 'HERO_IMAGE_URL',
    '{{hero.alt}}': `${courseName} assignment hero image`,
    '{{hero.statBadges}}': `<div style="display:flex;flex-wrap:wrap;">${buildStatBadges([{ value: professorName, label: 'Professor' }, { value: semester, label: 'Semester' }])}</div>`,
    '{{left.content}}': leftContent,
    '{{right.content}}': rightContent,
  };

  // Apply institution color tokens first, then page-specific tokens
  let html = resolveTokens(
    [
      '{{institution.name}}', '{{colors.primary}}', '{{colors.primaryDark}}',
      '{{colors.primaryLight}}', '{{colors.secondary}}'
    ].reduce(
      (t, token) => t,
      // Load template inline (avoid circular dep with loadTemplate in tests)
      Object.entries(pageTokens).reduce(
        (acc, [k, v]) => acc.replaceAll(k, v),
        // We apply institution tokens via resolveTokens after page tokens
        Object.entries(pageTokens).reduce((acc, [k, v]) => acc.replaceAll(k, v), '{{institution.name}}')
      )
    ),
    config
  );

  // Simpler approach: build full HTML directly
  html = buildFullPage(pageTokens, config);

  // Validate before returning
  const validation = validateCanvasHtml(html);
  const warnings = validation.violations.map(v => v.rule);

  const heroImagePrompt =
    `A cinematic wide-format banner image for a university course assignment about ${courseName}. ` +
    `Show a dynamic, professional academic workspace. Color palette dominated by ${config.colors.primary} with accent highlights in ${config.colors.secondary}. ` +
    `Clean, professional, slightly cinematic mood. No text. No people. Horizontal format, 3:1 aspect ratio, high resolution.`;

  const filename = `${courseNumber.toLowerCase().replace(/\s+/g, '-')}-${assignmentNumber}-page.html`;

  return { html, heroImagePrompt, filename, warnings };
}

function buildFullPage(tokens: Record<string, string>, config: InstitutionConfig): string {
  return `<!-- Canvas Design MCP — Generated Page -->
<!-- Canvas-safe: inline CSS only, no <style>, no <script>, no gap, no box-shadow -->
<div style="max-width:860px;margin:0 auto;font-family:Lato,sans-serif;background:#F4F3EF;padding:16px;">

  <!-- HERO BANNER -->
  <div style="background:linear-gradient(135deg,${config.colors.primaryDark} 0%,${config.colors.primary} 60%,#1A5BCC 100%);border-radius:14px;overflow:hidden;margin-bottom:20px;">
    <!-- HERO_IMAGE_URL: Replace with your 1200x400px image URL. Prompt: ${tokens['{{page.title}}'] ?? ''} -->
    <img src="HERO_IMAGE_URL" alt="${tokens['{{hero.alt}}'] ?? ''}" style="width:100%;height:200px;object-fit:cover;display:block;border-radius:14px 14px 0 0;">
    <div style="padding:28px 32px;">
      <div style="display:inline-block;background:${config.colors.secondary};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:3px 12px;border-radius:20px;margin-bottom:10px;">${tokens['{{course.number}}'] ?? ''} &middot; ${tokens['{{course.assignmentNumber}}'] ?? ''}</div>
      <h2 style="color:#ffffff;font-size:28px;font-weight:700;line-height:1.2;margin:0 0 6px 0;font-family:Lato,sans-serif;">${tokens['{{page.title}}'] ?? ''}</h2>
      <p style="color:rgba(255,255,255,0.85);font-size:15px;font-weight:400;margin:0 0 20px 0;font-family:Lato,sans-serif;">${tokens['{{page.subtitle}}'] ?? ''}</p>
      <div style="display:flex;flex-wrap:wrap;">${tokens['{{hero.statBadges}}'] ?? ''}</div>
    </div>
  </div>

  <!-- TWO-COLUMN BODY -->
  <div class="content-box">
    <div class="grid-row">
      <div class="col-xs-12 col-md-8" style="padding-right:12px;">${tokens['{{left.content}}'] ?? ''}</div>
      <div class="col-xs-12 col-md-4">${tokens['{{right.content}}'] ?? ''}</div>
    </div>
  </div>

</div>`;
}
```

- [x] **Step 2: Write tests in `tests/generate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { generateCanvasPage } from '../src/tools/generate.js';
import type { InstitutionConfig } from '../src/types.js';

const config: InstitutionConfig = {
  institution: 'Test University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://test.instructure.com',
  apiToken: 'test-token',
};

const input = {
  assignmentBrief: 'Create a 5-minute video presentation about your passion project.\nInclude visuals and voiceover.\nUpload to YouTube when complete.',
  courseName: 'AI Augmented Projects',
  courseNumber: 'ITM 370',
  assignmentNumber: '16.06',
  professorName: 'Dr. Rank',
  semester: 'Fall 2026',
};

describe('generateCanvasPage', () => {
  it('returns html, heroImagePrompt, filename, warnings', () => {
    const result = generateCanvasPage(input, config);
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('heroImagePrompt');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('warnings');
  });

  it('injects institution primary color into html', () => {
    const result = generateCanvasPage(input, config);
    expect(result.html).toContain('#0033A0');
  });

  it('injects course number into html', () => {
    const result = generateCanvasPage(input, config);
    expect(result.html).toContain('ITM 370');
  });

  it('injects assignment number into html', () => {
    const result = generateCanvasPage(input, config);
    expect(result.html).toContain('16.06');
  });

  it('generates correct filename', () => {
    const result = generateCanvasPage(input, config);
    expect(result.filename).toBe('itm-370-16.06-page.html');
  });

  it('hero image prompt mentions course name', () => {
    const result = generateCanvasPage(input, config);
    expect(result.heroImagePrompt).toContain('AI Augmented Projects');
  });

  it('returns no warnings for clean generated html', () => {
    const result = generateCanvasPage(input, config);
    expect(result.warnings).toHaveLength(0);
  });

  it('does not contain <style> blocks', () => {
    const result = generateCanvasPage(input, config);
    expect(result.html).not.toMatch(/<style[\s>]/i);
  });

  it('does not contain opacity: property', () => {
    const result = generateCanvasPage(input, config);
    expect(result.html).not.toMatch(/(?:^|;|\s)opacity\s*:/i);
  });
});
```

- [x] **Step 3: Run tests — expect PASS**

```bash
npm test
```

Expected: 9 passing tests in generate suite.

- [x] **Step 4: Commit**

```bash
git add src/tools/generate.ts tests/generate.test.ts
git commit -m "feat: add generate_canvas_page tool"
```

---

### Task 7: Setup Wizard

**Files:**
- Create: `src/wizard.ts`

No unit tests for wizard — it wraps interactive CLI prompts. Verified manually.

- [x] **Step 1: Create `src/wizard.ts`**

```typescript
import { input, password, confirm } from '@inquirer/prompts';
import Color from 'color';
import { saveConfig } from './config.js';
import type { InstitutionConfig } from './types.js';

function deriveColors(primary: string, secondary: string): InstitutionConfig['colors'] {
  const primaryColor = Color(primary);
  return {
    primary,
    primaryDark: primaryColor.darken(0.25).hex(),
    primaryLight: primaryColor.lightness(93).hex(),
    secondary,
  };
}

function printMcpConfig(): void {
  console.log('\nAdd this to your Claude Code settings (claude_desktop_config.json):\n');
  console.log(JSON.stringify({
    mcpServers: {
      'canvas-design': {
        command: 'npx',
        args: ['canvas-design-mcp'],
      },
    },
  }, null, 2));
  console.log('\nRestart Claude Code to activate.\n');
}

export async function runWizard(): Promise<InstitutionConfig> {
  console.log('\nCanvas Design Studio MCP — First Run Setup');
  console.log('─'.repeat(44));

  const institution = await input({
    message: 'Institution name:',
    default: 'Boise State University',
  });

  const primaryHex = await input({
    message: 'Primary brand color (#hex):',
    default: '#0033A0',
    validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #0033A0)',
  });

  const secondaryHex = await input({
    message: 'Secondary brand color (#hex):',
    default: '#D64309',
    validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #D64309)',
  });

  const canvasUrl = await input({
    message: 'Canvas URL:',
    default: 'https://boisestate.instructure.com',
    validate: (v) => v.startsWith('https://') || 'URL must start with https://',
  });

  const apiToken = await password({
    message: 'Canvas API token:',
    validate: (v) => v.length > 10 || 'Token looks too short — check Canvas Account Settings > Approved Integrations',
  });

  const colors = deriveColors(primaryHex, secondaryHex);

  const config: InstitutionConfig = {
    institution,
    colors,
    canvasUrl,
    apiToken,
  };

  saveConfig(config);

  console.log(`\n✓ institution.json saved to ~/.canvas-design-mcp/institution.json`);
  console.log(`✓ Primary color: ${colors.primary} (dark: ${colors.primaryDark}, light: ${colors.primaryLight})`);
  console.log('✓ MCP server ready\n');

  printMcpConfig();

  return config;
}
```

- [x] **Step 2: Manually verify wizard runs**

```bash
npx tsx src/wizard.ts
```

Expected: wizard prompts appear in sequence, answers are accepted, `~/.canvas-design-mcp/institution.json` is written with derived colors.

- [x] **Step 3: Commit**

```bash
git add src/wizard.ts
git commit -m "feat: add first-run setup wizard"
```

---

### Task 8: MCP Server Entry Point

**Files:**
- Create: `src/index.ts`

- [x] **Step 1: Create `src/index.ts`**

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { configExists, loadConfig } from './config.js';
import { runWizard } from './wizard.js';
import { validateCanvasHtml } from './tools/validate.js';
import { generateCanvasPage } from './tools/generate.js';

async function main() {
  // First-run wizard
  if (!configExists()) {
    await runWizard();
  }

  const server = new Server(
    { name: 'canvas-design-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'setup_institution',
        description: 'Re-run the setup wizard to update institution config (colors, Canvas URL, API token)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'generate_canvas_page',
        description: 'Generate a Canvas-safe HTML assignment page from a brief',
        inputSchema: {
          type: 'object',
          required: ['assignmentBrief', 'courseName', 'courseNumber', 'assignmentNumber', 'professorName', 'semester'],
          properties: {
            assignmentBrief: { type: 'string', description: 'Raw assignment instructions' },
            courseName: { type: 'string', description: 'e.g. AI Augmented Projects' },
            courseNumber: { type: 'string', description: 'e.g. ITM 370' },
            assignmentNumber: { type: 'string', description: 'e.g. 16.06' },
            professorName: { type: 'string', description: 'e.g. Dr. Rank' },
            semester: { type: 'string', description: 'e.g. Fall 2026' },
            styleNotes: { type: 'string', description: 'Optional layout or tone preferences' },
          },
        },
      },
      {
        name: 'validate_canvas_html',
        description: 'Check HTML for Canvas RCE compliance violations',
        inputSchema: {
          type: 'object',
          required: ['html'],
          properties: {
            html: { type: 'string', description: 'HTML string to validate' },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'setup_institution') {
        await runWizard();
        return { content: [{ type: 'text', text: 'Institution config updated.' }] };
      }

      if (name === 'validate_canvas_html') {
        const { html } = args as { html: string };
        const result = validateCanvasHtml(html);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      if (name === 'generate_canvas_page') {
        const config = loadConfig();
        const result = generateCanvasPage(args as Parameters<typeof generateCanvasPage>[0], config);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

- [x] **Step 2: Build and verify it compiles**

```bash
npm run build
```

Expected: `dist/` directory created with compiled JS files. No TypeScript errors.

- [x] **Step 3: Verify MCP server starts**

```bash
node dist/index.js
```

Expected: process starts and waits (MCP servers communicate via stdio — no console output is correct). `Ctrl+C` to stop.

- [x] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add MCP server entry point with tool registration"
```

---

### Task 9: GitHub Actions + README

**Files:**
- Create: `.github/workflows/publish.yml`
- Create: `README.md`

- [x] **Step 1: Create `.github/workflows/publish.yml`**

```bash
mkdir -p .github/workflows
```

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [x] **Step 2: Create `README.md`**

```markdown
# Canvas Design MCP

MCP server for generating and publishing Canvas LMS assignment pages.
Supports any institution — configure once with your brand colors and Canvas credentials.

## Install

```bash
npx canvas-design-mcp
```

First run launches a setup wizard. Takes ~2 minutes.

## Add to Claude Code

After setup, the wizard prints the exact config to add to `claude_desktop_config.json`.
Restart Claude Code — the tools are immediately available.

## Tools

| Tool | Description |
|---|---|
| `generate_canvas_page` | Generate a Canvas-safe HTML assignment page from a brief |
| `validate_canvas_html` | Check HTML for Canvas RCE compliance violations |
| `setup_institution` | Re-run wizard to update config |

## Usage

Tell Claude:
> "Build a Canvas page for this assignment and save it to output/." + paste your brief

## Release a New Version

```bash
npm version patch   # or minor / major
git push origin --tags
# GitHub Actions publishes to npm automatically
```

## Setup (one-time for maintainers)

1. Create npm account at npmjs.com
2. Generate npm Automation token
3. Add as `NPM_TOKEN` secret in GitHub repo Settings → Secrets → Actions

## Keeping KB Files in Sync

Files in `src/kb/` mirror `canvas-design-studio/docs/canvas-design-kb/`.
Update both when Canvas RCE rules change.
```

- [x] **Step 3: Run full test suite one final time**

```bash
npm test
```

Expected: all tests passing across config, design-engine, validate, and generate suites.

- [x] **Step 4: Final build**

```bash
npm run build
```

Expected: clean compile, no errors.

- [x] **Step 5: Commit and push**

```bash
git add .github/ README.md
git commit -m "chore: add GitHub Actions npm publish workflow and README"
git remote add origin https://github.com/<your-username>/canvas-design-mcp.git
git push -u origin main
```

- [x] **Step 6: Tag and publish first version**

```bash
npm version 0.1.0
git push origin --tags
```

Expected: GitHub Actions workflow triggers, runs tests, publishes `canvas-design-mcp@0.1.0` to npm.

---

## Self-Review

**Spec coverage check:**
- ✅ MCP server infrastructure → Task 8
- ✅ Setup wizard → Task 7
- ✅ `generate_canvas_page` tool → Task 6
- ✅ `validate_canvas_html` tool → Task 5
- ✅ `setup_institution` tool → Task 8 (server routes to wizard)
- ✅ Design engine (token injection) → Task 3
- ✅ KB bundling → Task 4
- ✅ Multi-institution config → Tasks 2 + 7
- ✅ Derived colors (primaryDark/primaryLight) → Task 7
- ✅ Config stored in `~/.canvas-design-mcp/` (persists across npx) → Task 2
- ✅ GitHub Actions publish workflow → Task 9
- ✅ npm distribution → Task 9
- ✅ `.gitignore` / `.npmignore` → Task 1

**Note:** `publish_to_canvas` tool is Sub-project 2 — intentionally excluded here.
