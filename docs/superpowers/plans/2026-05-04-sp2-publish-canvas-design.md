# SP2 Publish Canvas Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Canvas API course listing and page publishing while preserving the beginner workflow where a professor generates Canvas-safe HTML and pastes it into Canvas manually.

**Architecture:** Keep Canvas HTTP concerns in a thin `src/canvas-api.ts` client, keep professor-facing tool logic in focused files under `src/tools/`, and register only small MCP request handlers in `src/index.ts`. Canvas API features must be additive: `generate_canvas_page` and `validate_canvas_html` remain usable without an API token. The publish flow is deliberately staged: config/token check, FERPA scan, HTML validation, title collision check, Canvas create/update call, then a version-control tip.

**Tech Stack:** Node.js 18+, TypeScript 5, `@modelcontextprotocol/sdk`, Vitest, native `fetch`.

---

## Important Implementation Decision

### Non-API Workflow Is First-Class

Professors must be able to use Canvas Design Studio without configuring a Canvas API token. The beginner workflow is:

1. Run setup with institution colors and Canvas URL.
2. Generate Canvas-safe HTML with `generate_canvas_page`.
3. Paste the HTML manually into the Canvas RCE.

`list_canvas_courses` and `publish_to_canvas` are advanced convenience tools that require a Canvas API token. Missing-token errors should appear only when a professor calls one of those API-dependent tools. Setup must not require a token, and the MCP server must not block startup just because the token is blank.

### Review Corrections to Apply During SP2

These changes came out of Codex review after comparing the SP2 plan against current Canvas API documentation and Kevin's product intent:

1. **Do not make Canvas API setup mandatory.** `generate_canvas_page` and `validate_canvas_html` must keep working without an API token. Only API-dependent tools should require the token.
2. **Keep `courseId` required for `publish_to_canvas`.** MCP tools cannot pause for an interactive course selection. If `courseId` is missing, return `COURSE_ID_REQUIRED` and tell the professor to run `list_canvas_courses` first.
3. **Use Canvas course include parameters.** Course listing should request `include[]=term`, `include[]=total_students`, and `include[]=teachers` so the metadata in the spec is actually present.
4. **Verify the enrollment-state query before implementation.** Current Canvas docs for `GET /api/v1/courses` describe `enrollment_workflow_state[]` values such as `active`, `completed`, `invited`, `pending`, and `creation_pending`. Do not hard-code the spec's `invited_or_pending` string unless a live Canvas test confirms it works for Boise State.
5. **Support Canvas `friendly_name`.** Canvas course nicknames may arrive as `friendly_name`; display `nickname ?? friendly_name ?? name`.
6. **Improve fuzzy title matching beyond Levenshtein.** A suffix like "AI Projects" can drag normalized Levenshtein below `0.8` even when the base assignment title clearly collides. Add token containment or token-set similarity.
7. **Avoid overblocking emails in FERPA scan.** Student IDs and grade/name patterns should block. Non-professor email addresses should be warning-only or allowlisted by domain to avoid false positives in legitimate assignment content.
8. **Soften 403 wording.** A 403 may be token scope, course role, or course policy. Message it as "your token or Canvas role does not allow editing pages in this course" and then offer token-scope guidance as one possible fix.
9. **Fix the planned API error test.** The draft test calls `client.listPages(42)` twice with only one mocked fetch. Store the promise once or mock two failures.

### Title Collision Flow

The design spec says to present a confirmation dialog when a title collision is detected. MCP tool calls are request/response and do not provide an in-tool interactive dialog primitive, so SP2 should implement this as a structured stop response:

```json
{
  "error": "A page with a similar title already exists.",
  "code": "TITLE_COLLISION",
  "details": {
    "existingPage": { "title": "ITM 310 - Assignment 16.06 AI Projects", "url": "itm-310-assignment-16-06-ai-projects" },
    "newTitle": "ITM 310 - Assignment 16.06",
    "score": 0.86,
    "options": [
      "Rerun with collisionAction: \"update\"",
      "Rerun with collisionAction: \"create\"",
      "Rerun with collisionAction: \"related\" and relatedPageTitle",
      "Rerun with collisionAction: \"cancel\""
    ]
  }
}
```

`publish_to_canvas` should therefore accept these optional parameters in addition to the spec's required fields:

```ts
collisionAction?: 'update' | 'create' | 'related' | 'cancel';
relatedPageTitle?: string;
```

This keeps professor intent explicit and prevents silent overwrites.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types.ts` | Modify | Add Canvas course/page/config/publish types |
| `src/config.ts` | Modify | Preserve optional config fields used by SP2 |
| `src/wizard.ts` | Modify | Let setup collect optional professor email and favorite course IDs |
| `src/canvas-api.ts` | Create | Canvas API client with auth, JSON body handling, pagination, retries |
| `src/tools/gotchas.ts` | Create | Professor-readable warning and tip text |
| `src/tools/list-courses.ts` | Create | `list_canvas_courses` pure implementation |
| `src/tools/publish.ts` | Create | `publish_to_canvas` pure implementation |
| `src/index.ts` | Modify | Register and route the two new MCP tools |
| `tests/config.test.ts` | Modify | Cover optional SP2 config fields |
| `tests/canvas-api.test.ts` | Create | Mocked fetch tests for client, pagination, retries, errors |
| `tests/gotchas.test.ts` | Create | Message formatting tests |
| `tests/list-courses.test.ts` | Create | Course filter, favorite pinning, tip, gotcha tests |
| `tests/publish.test.ts` | Create | FERPA, validation, collision, create/update, error-shape tests |
| `README.md` | Modify | Document new tools and publishing flow |
| `docs/handoff-to-Claude.md` | Modify each step | Cross-agent status, reasoning, current commit, next action |

---

### Task 1: SP2 Types and Config Shape

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`
- Modify: `tests/config.test.ts`

- [x] **Step 1: Write the failing config/type tests**

Add this test to `tests/config.test.ts` inside the existing `describe('config', ...)` block:

```ts
it('preserves optional SP2 config fields', () => {
  const config = {
    ...SAMPLE_CONFIG,
    professorEmail: 'kevin.rank@boisestate.edu',
    favoriteCourses: [12345, 67890],
    kbTipShown: false,
  };

  saveConfig(config);
  const loaded = loadConfig();

  expect(loaded.professorEmail).toBe('kevin.rank@boisestate.edu');
  expect(loaded.favoriteCourses).toEqual([12345, 67890]);
  expect(loaded.kbTipShown).toBe(false);
});
```

- [x] **Step 2: Run the config test to verify it fails**

Run:

```bash
npm test -- tests/config.test.ts
```

Expected: TypeScript fails because `InstitutionConfig` does not yet define `professorEmail`, `favoriteCourses`, or `kbTipShown`.

- [x] **Step 3: Extend shared types**

Replace `src/types.ts` with:

```ts
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
  professorEmail?: string;
  favoriteCourses?: number[];
  kbTipShown?: boolean;
}

export interface CanvasEnrollment {
  type?: string;
  role?: string;
  role_id?: number;
  user_id?: number;
  enrollment_state?: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string;
  nickname?: string;
  friendly_name?: string;
  workflow_state?: string;
  start_at?: string | null;
  end_at?: string | null;
  enrollments?: CanvasEnrollment[];
  total_students?: number;
  teachers?: Array<{ id?: number; display_name?: string; name?: string }>;
  term?: { id?: number; name?: string };
}

export interface CanvasPage {
  title: string;
  url: string;
  html_url?: string;
  published?: boolean;
  updated_at?: string;
}

export interface ToolError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export type SemesterFilter = 'current' | 'future' | 'past' | 'all';
export type CollisionAction = 'update' | 'create' | 'related' | 'cancel';
```

- [x] **Step 4: Keep config loading unchanged**

Do not add migrations in `src/config.ts`. JSON parse/stringify already preserves optional fields. Open the file and verify `loadConfig()` returns parsed JSON as `InstitutionConfig` and `saveConfig()` writes the object unchanged.

- [x] **Step 5: Run tests to verify the type change passes**

Run:

```bash
npm test -- tests/config.test.ts
```

Expected: all config tests pass.

- [x] **Step 6: Commit**

```bash
git add src/types.ts tests/config.test.ts
git commit -m "feat: extend institution config for Canvas publishing"
```

Implementation note: Codex implemented the Task 1 tests and type changes in one patch, so no separate failing-test run was captured. Final verification passed with `npm test -- tests/config.test.ts`, `npm test`, and `npm run build`.

---

### Task 2: Canvas API Client

**Files:**
- Create: `src/canvas-api.ts`
- Create: `tests/canvas-api.test.ts`

- [x] **Step 1: Write the failing Canvas API tests**

Create `tests/canvas-api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstitutionConfig } from '../src/types.js';

const config: InstitutionConfig = {
  institution: 'Boise State University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://boisestate.instructure.com/',
  apiToken: 'token-123',
};

function response(body: unknown, init: { status?: number; ok?: boolean; link?: string } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.ok === false ? 'Error' : 'OK',
    headers: {
      get: (name: string) => name.toLowerCase() === 'link' ? init.link ?? null : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('CanvasApiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('lists courses with auth header and enrollment state', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response([{ id: 42, name: 'ITM 310' }]) as Response);
    const { CanvasApiClient } = await import('../src/canvas-api.js');

    const client = new CanvasApiClient(config);
    const courses = await client.listCourses('active');

    expect(courses[0].id).toBe(42);
    expect(fetch).toHaveBeenCalledWith(
      'https://boisestate.instructure.com/api/v1/courses?per_page=50&enrollment_state=active',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      })
    );
  });

  it('paginates list responses using Canvas Link headers', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(
        [{ id: 1, name: 'Page 1' }],
        { link: '<https://boisestate.instructure.com/api/v1/courses?page=2>; rel="next"' }
      ) as Response)
      .mockResolvedValueOnce(response([{ id: 2, name: 'Page 2' }]) as Response);
    const { CanvasApiClient } = await import('../src/canvas-api.js');

    const client = new CanvasApiClient(config);
    const courses = await client.listCourses();

    expect(courses.map(c => c.id)).toEqual([1, 2]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('creates a Canvas page with published true by default', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      title: 'Assignment 16.06',
      url: 'assignment-16-06',
      html_url: 'https://boisestate.instructure.com/courses/42/pages/assignment-16-06',
    }) as Response);
    const { CanvasApiClient } = await import('../src/canvas-api.js');

    const client = new CanvasApiClient(config);
    const page = await client.createPage(42, 'Assignment 16.06', '<h2>Hello</h2>');

    expect(page.url).toBe('assignment-16-06');
    expect(fetch).toHaveBeenCalledWith(
      'https://boisestate.instructure.com/api/v1/courses/42/pages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ wiki_page: { title: 'Assignment 16.06', body: '<h2>Hello</h2>', published: true } }),
      })
    );
  });

  it('updates an existing Canvas page by page url', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      title: 'Assignment 16.06',
      url: 'assignment-16-06',
      html_url: 'https://boisestate.instructure.com/courses/42/pages/assignment-16-06',
    }) as Response);
    const { CanvasApiClient } = await import('../src/canvas-api.js');

    const client = new CanvasApiClient(config);
    await client.updatePage(42, 'assignment-16-06', '<h2>Updated</h2>');

    expect(fetch).toHaveBeenCalledWith(
      'https://boisestate.instructure.com/api/v1/courses/42/pages/assignment-16-06',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ wiki_page: { body: '<h2>Updated</h2>' } }),
      })
    );
  });

  it('retries 429 responses three times before succeeding', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ message: 'rate limited' }, { ok: false, status: 429 }) as Response)
      .mockResolvedValueOnce(response({ message: 'rate limited' }, { ok: false, status: 429 }) as Response)
      .mockResolvedValueOnce(response([{ id: 7, name: 'Recovered' }]) as Response);
    const { CanvasApiClient } = await import('../src/canvas-api.js');

    const client = new CanvasApiClient(config, { retryDelaysMs: [1, 1, 1] });
    const courses = await client.listCourses();

    expect(courses[0].name).toBe('Recovered');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('maps Canvas HTTP errors into professor-readable errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ errors: ['forbidden'] }, { ok: false, status: 403 }) as Response);
    const { CanvasApiClient, CanvasApiError } = await import('../src/canvas-api.js');

    const client = new CanvasApiClient(config);

    await expect(client.listPages(42)).rejects.toBeInstanceOf(CanvasApiError);
    await expect(client.listPages(42)).rejects.toMatchObject({
      code: 'CANVAS_FORBIDDEN',
      message: "Your Canvas API token can read Canvas but not write, or it does not have access to this course.",
    });
  });
});
```

- [x] **Step 2: Run the API tests to verify they fail**

Run:

```bash
npm test -- tests/canvas-api.test.ts
```

Expected: fail because `src/canvas-api.ts` does not exist.

- [x] **Step 3: Implement the Canvas API client**

Create `src/canvas-api.ts`:

```ts
import type { CanvasCourse, CanvasPage, InstitutionConfig } from './types.js';

type HttpMethod = 'GET' | 'POST' | 'PUT';

export interface CanvasApiClientOptions {
  retryDelaysMs?: number[];
}

export class CanvasApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'CanvasApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function joinApiUrl(baseUrl: string, path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(`${trimTrailingSlash(baseUrl)}/api/v1/${path.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}

function parseNextLink(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;
  const parts = linkHeader.split(',');
  const next = parts.find(part => part.includes('rel="next"'));
  const match = next?.match(/<([^>]+)>/);
  return match?.[1];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mapError(status: number, details: unknown): CanvasApiError {
  if (status === 401) {
    return new CanvasApiError(status, 'CANVAS_UNAUTHORIZED', 'Canvas rejected the API token. Run `setup_institution` to update it.', details);
  }
  if (status === 403) {
    return new CanvasApiError(status, 'CANVAS_FORBIDDEN', 'Your Canvas API token can read Canvas but not write, or it does not have access to this course.', details);
  }
  if (status === 404) {
    return new CanvasApiError(status, 'CANVAS_NOT_FOUND', "Course or page not found. It may have been deleted or your token does not have access to it.", details);
  }
  if (status === 422) {
    return new CanvasApiError(status, 'CANVAS_REJECTED_HTML', 'Canvas rejected the page content. Review the Canvas response details.', details);
  }
  if (status === 429) {
    return new CanvasApiError(status, 'CANVAS_RATE_LIMITED', 'Canvas is rate limiting requests. Try again in a few minutes.', details);
  }
  return new CanvasApiError(status, 'CANVAS_HTTP_ERROR', `Canvas API returned HTTP ${status}.`, details);
}

export class CanvasApiClient {
  private readonly config: InstitutionConfig;
  private readonly retryDelaysMs: number[];

  constructor(config: InstitutionConfig, options: CanvasApiClientOptions = {}) {
    this.config = config;
    this.retryDelaysMs = options.retryDelaysMs ?? [2000, 4000, 8000];
  }

  async listCourses(enrollmentState?: string): Promise<CanvasCourse[]> {
    return this.paginatedGet<CanvasCourse>('courses', {
      per_page: '50',
      enrollment_state: enrollmentState,
    });
  }

  async listPages(courseId: number): Promise<CanvasPage[]> {
    return this.paginatedGet<CanvasPage>(`courses/${courseId}/pages`, { per_page: '50' });
  }

  async createPage(courseId: number, title: string, html: string): Promise<CanvasPage> {
    return this.request<CanvasPage>('POST', `courses/${courseId}/pages`, {
      wiki_page: { title, body: html, published: true },
    });
  }

  async updatePage(courseId: number, pageUrl: string, html: string): Promise<CanvasPage> {
    return this.request<CanvasPage>('PUT', `courses/${courseId}/pages/${encodeURIComponent(pageUrl)}`, {
      wiki_page: { body: html },
    });
  }

  private async paginatedGet<T>(path: string, params?: Record<string, string | undefined>): Promise<T[]> {
    let nextUrl: string | undefined = joinApiUrl(this.config.canvasUrl, path, params);
    const all: T[] = [];

    while (nextUrl) {
      const response = await this.fetchWithRetry(nextUrl, { method: 'GET', headers: this.headers() });
      const body = await response.json() as T[];
      all.push(...body);
      nextUrl = parseNextLink(response.headers.get('link'));
    }

    return all;
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const url = joinApiUrl(this.config.canvasUrl, path);
    const response = await this.fetchWithRetry(url, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return response.json() as Promise<T>;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (err) {
        throw new CanvasApiError(0, 'CANVAS_NETWORK_ERROR', 'Canvas API unreachable - check your Canvas URL in institution config and try again.', err);
      }

      if (response.ok) return response;

      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }

      if (response.status === 429 && attempt < this.retryDelaysMs.length) {
        await sleep(this.retryDelaysMs[attempt]);
        continue;
      }

      throw mapError(response.status, details);
    }

    throw new CanvasApiError(429, 'CANVAS_RATE_LIMITED', 'Canvas is rate limiting requests. Try again in a few minutes.');
  }
}
```

- [x] **Step 4: Run the API tests**

Run:

```bash
npm test -- tests/canvas-api.test.ts
```

Expected: all Canvas API tests pass.

- [x] **Step 5: Commit**

```bash
git add src/canvas-api.ts tests/canvas-api.test.ts
git commit -m "feat: add Canvas API client"
```

Implementation note: Codex implemented the reviewed version of this task rather than the original draft exactly. The client uses `include[]=term`, `include[]=total_students`, `include[]=teachers`, `enrollment_workflow_state[]`, a role-aware 403 message, and a fixed one-promise API error test. Final verification passed with `npm test -- tests/canvas-api.test.ts`, `npm test`, and `npm run build`.

---

### Task 3: Gotcha Message Module

**Files:**
- Create: `src/tools/gotchas.ts`
- Create: `tests/gotchas.test.ts`

- [x] **Step 1: Write gotcha tests**

Create `tests/gotchas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { CanvasCourse } from '../src/types.js';
import {
  courseCoordinatorGotcha,
  ferpaGotcha,
  titleCollisionGotcha,
  tokenScopeGotcha,
  versionControlTip,
} from '../src/tools/gotchas.js';

describe('gotchas', () => {
  it('detects coordinator-like courses', () => {
    const course: CanvasCourse = {
      id: 1,
      name: 'ITM Coordination Shell',
      total_students: 0,
      teachers: [{ display_name: 'A' }, { display_name: 'B' }, { display_name: 'C' }],
    };

    expect(courseCoordinatorGotcha(course)).toContain('0 students');
    expect(courseCoordinatorGotcha(course)).toContain('3 teachers');
  });

  it('does not warn for normal courses', () => {
    const course: CanvasCourse = { id: 2, name: 'ITM 310', total_students: 28, teachers: [{ display_name: 'Dr. Rank' }] };
    expect(courseCoordinatorGotcha(course)).toBeUndefined();
  });

  it('formats title collision options', () => {
    const message = titleCollisionGotcha('Old Title', 'New Title', 0.84);
    expect(message).toContain('similar title already exists');
    expect(message).toContain('collisionAction: "update"');
  });

  it('formats FERPA warning with line number', () => {
    expect(ferpaGotcha('possible student ID', 34)).toContain('line 34');
  });

  it('formats token scope hint against the Canvas URL', () => {
    expect(tokenScopeGotcha('https://boisestate.instructure.com')).toContain('https://boisestate.instructure.com/profile/settings');
  });

  it('returns the version control tip', () => {
    expect(versionControlTip()).toContain('Git is the right tool');
  });
});
```

- [x] **Step 2: Run gotcha tests to verify they fail**

Run:

```bash
npm test -- tests/gotchas.test.ts
```

Expected: fail because `src/tools/gotchas.ts` does not exist.

- [x] **Step 3: Implement gotcha messages**

Create `src/tools/gotchas.ts`:

```ts
import type { CanvasCourse } from '../types.js';

function teacherCount(course: CanvasCourse): number {
  return course.teachers?.length ?? course.enrollments?.filter(e => e.type === 'teacher' || e.role === 'TeacherEnrollment').length ?? 0;
}

function studentCount(course: CanvasCourse): number {
  return course.total_students ?? course.enrollments?.filter(e => e.type === 'student' || e.role === 'StudentEnrollment').length ?? 0;
}

export function courseCoordinatorGotcha(course: CanvasCourse): string | undefined {
  const teachers = teacherCount(course);
  const students = studentCount(course);
  if (students === 0 || teachers >= 3) {
    return `Heads up: this course has ${teachers} teachers and ${students} students. If you are listed as a coordinator rather than the instructor of record, publishing here may affect a live course you do not manage. Double-check you have the right course.`;
  }
  return undefined;
}

export function titleCollisionGotcha(existingTitle: string, newTitle: string, score: number): string {
  return [
    'A page with a similar title already exists:',
    `  Existing: "${existingTitle}"`,
    `  New:      "${newTitle}"`,
    `  Similarity: ${score.toFixed(2)}`,
    '',
    'Rerun publish_to_canvas with one of these options:',
    '  collisionAction: "update" to replace the existing page content',
    '  collisionAction: "create" to create a new page with this title',
    '  collisionAction: "related" and relatedPageTitle to create a clearly named variation',
    '  collisionAction: "cancel" to stop',
  ].join('\n');
}

export function tokenScopeGotcha(canvasUrl: string): string {
  return `Your Canvas API token can read Canvas but not write. Generate a new token at ${canvasUrl.replace(/\/+$/, '')}/profile/settings with the Pages - Edit scope enabled. Then run setup_institution to update it.`;
}

export function ferpaGotcha(reason: string, line: number): string {
  return `This HTML may contain student data (${reason} near line ${line}). Publishing student records to a Canvas page may violate FERPA. Review before continuing. Pass skipFerpaCheck: true to override.`;
}

export function versionControlTip(): string {
  return "Tip: Save your HTML source to a Git repo before publishing. Canvas stores page revisions, but they are hard to diff and expire. Git is the right tool for tracking changes over time.";
}
```

- [x] **Step 4: Run gotcha tests**

Run:

```bash
npm test -- tests/gotchas.test.ts
```

Expected: all gotcha tests pass.

- [x] **Step 5: Commit**

```bash
git add src/tools/gotchas.ts tests/gotchas.test.ts
git commit -m "feat: add Canvas publishing gotcha messages"
```

Implementation note: Codex implemented role-aware token permission wording and added coverage for singular/plural course coordinator warnings, enrollment-derived counts, title collision actions, FERPA line references, and the version-control tip. Final verification passed with `npm test -- tests/gotchas.test.ts`, `npm test`, and `npm run build`.

---

### Task 4: list_canvas_courses Tool Logic

**Files:**
- Create: `src/tools/list-courses.ts`
- Create: `tests/list-courses.test.ts`

- [x] **Step 1: Write list course tests**

Create `tests/list-courses.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { CanvasCourse, InstitutionConfig } from '../src/types.js';

const config: InstitutionConfig = {
  institution: 'Boise State University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://boisestate.instructure.com',
  apiToken: 'token',
  favoriteCourses: [2],
  kbTipShown: false,
};

function course(id: number, name: string, extras: Partial<CanvasCourse> = {}): CanvasCourse {
  return { id, name, term: { name: 'Spring 2026' }, total_students: 28, teachers: [{ display_name: 'Dr. Rank' }], ...extras };
}

describe('listCanvasCourses', () => {
  it('maps semester=current to active enrollment state', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue([course(1, 'ITM 310')]) };
    const saveConfig = vi.fn();
    const { listCanvasCourses } = await import('../src/tools/list-courses.js');

    await listCanvasCourses({ semester: 'current' }, config, api, saveConfig);

    expect(api.listCourses).toHaveBeenCalledWith('active');
  });

  it('maps semester=all to no enrollment state', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue([course(1, 'ITM 310')]) };
    const saveConfig = vi.fn();
    const { listCanvasCourses } = await import('../src/tools/list-courses.js');

    await listCanvasCourses({ semester: 'all' }, config, api, saveConfig);

    expect(api.listCourses).toHaveBeenCalledWith(undefined);
  });

  it('pins favorite courses to the top with a star marker', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue([course(1, 'ITM 310'), course(2, 'ITM 370')]) };
    const saveConfig = vi.fn();
    const { listCanvasCourses } = await import('../src/tools/list-courses.js');

    const result = await listCanvasCourses({ semester: 'current', includeFavorites: true }, config, api, saveConfig);

    expect(result.courses[0].id).toBe(2);
    expect(result.text).toContain('Course ID: 2');
    expect(result.text).toContain('* Favorite');
  });

  it('shows naming convention tip once and persists kbTipShown', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue([course(1, 'ITM 310')]) };
    const saveConfig = vi.fn();
    const { listCanvasCourses } = await import('../src/tools/list-courses.js');

    const result = await listCanvasCourses({ semester: 'current' }, config, api, saveConfig);

    expect(result.text).toContain('Canvas lets you set a course nickname');
    expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({ kbTipShown: true }));
  });

  it('includes coordinator gotcha for course shells', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue([course(3, 'Coordinator Shell', { total_students: 0, teachers: [{}, {}, {}] })]) };
    const saveConfig = vi.fn();
    const { listCanvasCourses } = await import('../src/tools/list-courses.js');

    const result = await listCanvasCourses({ semester: 'current' }, { ...config, kbTipShown: true }, api, saveConfig);

    expect(result.text).toContain('Heads up: this course has 3 teachers and 0 students');
  });
});
```

- [x] **Step 2: Run list course tests to verify they fail**

Run:

```bash
npm test -- tests/list-courses.test.ts
```

Expected: fail because `src/tools/list-courses.ts` does not exist.

- [x] **Step 3: Implement list course logic**

Create `src/tools/list-courses.ts`:

```ts
import type { CanvasCourse, InstitutionConfig, SemesterFilter } from '../types.js';
import { courseCoordinatorGotcha } from './gotchas.js';

export interface ListCanvasCoursesInput {
  semester?: SemesterFilter;
  includeFavorites?: boolean;
}

export interface ListCanvasCoursesResult {
  courses: CanvasCourse[];
  text: string;
}

interface CourseApi {
  listCourses(enrollmentState?: string): Promise<CanvasCourse[]>;
}

type SaveConfig = (config: InstitutionConfig) => void;

const SEMESTER_TO_ENROLLMENT_STATE: Record<SemesterFilter, string | undefined> = {
  current: 'active',
  future: 'invited_or_pending',
  past: 'completed',
  all: undefined,
};

function teacherNames(course: CanvasCourse): string {
  const names = course.teachers?.map(t => t.display_name ?? t.name).filter(Boolean) ?? [];
  return names.length > 0 ? names.join(', ') : 'Not provided by Canvas';
}

function studentCount(course: CanvasCourse): string {
  if (typeof course.total_students === 'number') return `${course.total_students} enrolled`;
  return 'Not provided by Canvas';
}

function courseBlock(course: CanvasCourse, favorite: boolean): string {
  const lines = [
    favorite ? '* Favorite' : undefined,
    `Course ID: ${course.id}`,
    `Name: ${course.name}`,
    course.nickname ? `Nickname: ${course.nickname}` : undefined,
    `Students: ${studentCount(course)}`,
    `Teachers: ${teacherNames(course)}`,
    `Term: ${course.term?.name ?? 'Not provided by Canvas'}`,
  ].filter(Boolean) as string[];

  const gotcha = courseCoordinatorGotcha(course);
  if (gotcha) lines.push(`Warning: ${gotcha}`);

  return lines.join('\n');
}

function sortCourses(courses: CanvasCourse[], favoriteIds: number[], includeFavorites: boolean): CanvasCourse[] {
  if (!includeFavorites) return [...courses];
  return [...courses].sort((a, b) => {
    const aFav = favoriteIds.includes(a.id) ? 0 : 1;
    const bFav = favoriteIds.includes(b.id) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    return a.name.localeCompare(b.name);
  });
}

export async function listCanvasCourses(
  input: ListCanvasCoursesInput,
  config: InstitutionConfig,
  api: CourseApi,
  saveConfig: SaveConfig
): Promise<ListCanvasCoursesResult> {
  const semester = input.semester ?? 'current';
  const includeFavorites = input.includeFavorites ?? true;
  const enrollmentState = SEMESTER_TO_ENROLLMENT_STATE[semester];
  const courses = sortCourses(await api.listCourses(enrollmentState), config.favoriteCourses ?? [], includeFavorites);

  const blocks = courses.map(course => courseBlock(course, includeFavorites && (config.favoriteCourses ?? []).includes(course.id)));

  if (!config.kbTipShown) {
    blocks.push([
      'Tip: Canvas lets you set a course nickname visible only to you.',
      'A format like Sp26 | ITM 310-002 Business Intelligence (RANK) makes it easy to filter courses at a glance, especially when you teach multiple sections or coordinate courses you do not teach.',
    ].join('\n'));
    saveConfig({ ...config, kbTipShown: true });
  }

  return {
    courses,
    text: blocks.join('\n\n'),
  };
}
```

- [x] **Step 4: Run list course tests**

Run:

```bash
npm test -- tests/list-courses.test.ts
```

Expected: all list course tests pass.

- [x] **Step 5: Commit**

```bash
git add src/tools/list-courses.ts tests/list-courses.test.ts
git commit -m "feat: add Canvas course listing tool logic"
```

Implementation note: Codex implemented the reviewed version of this task. Future courses map to `['invited', 'pending', 'creation_pending']`, the no-token workflow returns a friendly manual-paste message before API calls, and course nicknames display with `nickname ?? friendly_name`. Final verification passed with `npm test -- tests/list-courses.test.ts`, `npm test`, and `npm run build`.

---

### Task 5: publish_to_canvas Tool Logic

**Files:**
- Create: `src/tools/publish.ts`
- Create: `tests/publish.test.ts`

- [x] **Step 1: Write publish tests**

Create `tests/publish.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { CanvasPage, InstitutionConfig } from '../src/types.js';

const config: InstitutionConfig = {
  institution: 'Boise State University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://boisestate.instructure.com',
  apiToken: 'token',
  professorEmail: 'kevin.rank@boisestate.edu',
};

const page: CanvasPage = {
  title: 'ITM 310 - Assignment 16.06',
  url: 'itm-310-assignment-16-06',
  html_url: 'https://boisestate.instructure.com/courses/42/pages/itm-310-assignment-16-06',
};

describe('publishToCanvas', () => {
  it('fails before HTTP when API token is missing', async () => {
    const api = { listPages: vi.fn(), createPage: vi.fn(), updatePage: vi.fn() };
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas({ courseId: 42, html: '<h2>Hello</h2>', pageTitle: 'New Page' }, { ...config, apiToken: '' }, api);

    expect(result).toMatchObject({ code: 'MISSING_API_TOKEN' });
    expect(api.listPages).not.toHaveBeenCalled();
  });

  it('blocks obvious FERPA patterns before Canvas API calls', async () => {
    const api = { listPages: vi.fn(), createPage: vi.fn(), updatePage: vi.fn() };
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas({ courseId: 42, html: '<h2>Grades</h2>\n<p>Student B12345678: A</p>', pageTitle: 'Grades' }, config, api);

    expect(result).toMatchObject({ code: 'FERPA_REVIEW_REQUIRED' });
    expect(api.listPages).not.toHaveBeenCalled();
  });

  it('allows FERPA override when skipFerpaCheck is true', async () => {
    const api = { listPages: vi.fn().mockResolvedValue([]), createPage: vi.fn().mockResolvedValue(page), updatePage: vi.fn() };
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas({ courseId: 42, html: '<h2>Grades</h2>\n<p>Student B12345678: A</p>', pageTitle: 'Grades', skipFerpaCheck: true }, config, api);

    expect(result).toMatchObject({ action: 'created', url: page.html_url });
  });

  it('blocks invalid Canvas HTML unless forcePublish is true', async () => {
    const api = { listPages: vi.fn(), createPage: vi.fn(), updatePage: vi.fn() };
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas({ courseId: 42, html: '<h1>Bad</h1>', pageTitle: 'Bad Page' }, config, api);

    expect(result).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(api.listPages).not.toHaveBeenCalled();
  });

  it('returns TITLE_COLLISION when a similar page exists and no action is provided', async () => {
    const api = { listPages: vi.fn().mockResolvedValue([page]), createPage: vi.fn(), updatePage: vi.fn() };
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas({ courseId: 42, html: '<h2>Hello</h2>', pageTitle: 'ITM 310 - Assignment 16.06 AI Projects' }, config, api);

    expect(result).toMatchObject({ code: 'TITLE_COLLISION' });
    expect(api.createPage).not.toHaveBeenCalled();
  });

  it('updates existing page when collisionAction is update', async () => {
    const api = { listPages: vi.fn().mockResolvedValue([page]), createPage: vi.fn(), updatePage: vi.fn().mockResolvedValue(page) };
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas({ courseId: 42, html: '<h2>Hello</h2>', pageTitle: page.title, collisionAction: 'update' }, config, api);

    expect(api.updatePage).toHaveBeenCalledWith(42, 'itm-310-assignment-16-06', '<h2>Hello</h2>');
    expect(result).toMatchObject({ action: 'updated', url: page.html_url });
  });

  it('creates a related page with relatedPageTitle', async () => {
    const related = { ...page, title: 'ITM 310 - Assignment 16.06 Makeup', url: 'itm-310-assignment-16-06-makeup' };
    const api = { listPages: vi.fn().mockResolvedValue([page]), createPage: vi.fn().mockResolvedValue(related), updatePage: vi.fn() };
    const { publishToCanvas } = await import('../src/tools/publish.js');

    const result = await publishToCanvas({
      courseId: 42,
      html: '<h2>Hello</h2>',
      pageTitle: page.title,
      collisionAction: 'related',
      relatedPageTitle: related.title,
    }, config, api);

    expect(api.createPage).toHaveBeenCalledWith(42, related.title, '<h2>Hello</h2>');
    expect(result).toMatchObject({ action: 'created', pageTitle: related.title });
  });
});
```

- [x] **Step 2: Run publish tests to verify they fail**

Run:

```bash
npm test -- tests/publish.test.ts
```

Expected: fail because `src/tools/publish.ts` does not exist.

- [x] **Step 3: Implement publish logic**

Create `src/tools/publish.ts`:

```ts
import type { CanvasPage, CollisionAction, InstitutionConfig, ToolError } from '../types.js';
import { CanvasApiError } from '../canvas-api.js';
import { validateCanvasHtml } from './validate.js';
import { ferpaGotcha, titleCollisionGotcha, tokenScopeGotcha, versionControlTip } from './gotchas.js';

export interface PublishToCanvasInput {
  courseId: number;
  html: string;
  pageTitle: string;
  forcePublish?: boolean;
  skipFerpaCheck?: boolean;
  collisionAction?: CollisionAction;
  relatedPageTitle?: string;
}

export interface PublishSuccess {
  url: string;
  action: 'created' | 'updated';
  pageTitle: string;
  tip: string;
}

interface PublishApi {
  listPages(courseId: number): Promise<CanvasPage[]>;
  createPage(courseId: number, title: string, html: string): Promise<CanvasPage>;
  updatePage(courseId: number, pageUrl: string, html: string): Promise<CanvasPage>;
}

interface FerpaFinding {
  reason: string;
  line: number;
}

function lineForOffset(text: string, offset: number): number {
  return text.slice(0, offset).split(/\r?\n/).length;
}

export function scanFerpa(html: string, professorEmail?: string): FerpaFinding | undefined {
  const patterns: Array<{ reason: string; pattern: RegExp }> = [
    { reason: 'possible 9-digit student ID', pattern: /\b\d{9}\b/ },
    { reason: 'possible BSU student ID', pattern: /\bB\d{8}\b/i },
    { reason: 'possible grade disclosure', pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+[^<\n]{0,40}\b(?:A|B|C|D|F|[0-9]{1,3}%)\b/ },
  ];

  for (const item of patterns) {
    const match = item.pattern.exec(html);
    if (match?.index !== undefined) return { reason: item.reason, line: lineForOffset(html, match.index) };
  }

  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig;
  for (const match of html.matchAll(emailPattern)) {
    if (match[0].toLowerCase() !== professorEmail?.toLowerCase()) {
      return { reason: 'email address that does not match the configured professor email', line: lineForOffset(html, match.index ?? 0) };
    }
  }

  return undefined;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

export function titleSimilarity(a: string, b: string): number {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  const longest = Math.max(left.length, right.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(left, right) / longest;
}

function bestCollision(pages: CanvasPage[], pageTitle: string): { page: CanvasPage; score: number } | undefined {
  const scored = pages
    .map(page => ({ page, score: titleSimilarity(page.title, pageTitle) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best && best.score >= 0.8 ? best : undefined;
}

function pageUrl(page: CanvasPage): string {
  return page.html_url ?? page.url;
}

function validationError(html: string): ToolError | undefined {
  const validation = validateCanvasHtml(html);
  if (validation.valid) return undefined;
  return {
    error: `Validation failed - ${validation.violations.length} issue(s) found before publishing.`,
    code: 'VALIDATION_FAILED',
    details: { violations: validation.violations },
  };
}

export async function publishToCanvas(
  input: PublishToCanvasInput,
  config: InstitutionConfig,
  api: PublishApi
): Promise<PublishSuccess | ToolError> {
  if (!config.apiToken?.trim()) {
    return {
      error: `No Canvas API token configured. Run setup_institution to add one. Generate your token at ${config.canvasUrl.replace(/\/+$/, '')}/profile/settings.`,
      code: 'MISSING_API_TOKEN',
    };
  }

  if (!input.skipFerpaCheck) {
    const finding = scanFerpa(input.html, config.professorEmail);
    if (finding) {
      return { error: ferpaGotcha(finding.reason, finding.line), code: 'FERPA_REVIEW_REQUIRED', details: finding };
    }
  }

  if (!input.forcePublish) {
    const error = validationError(input.html);
    if (error) return error;
  }

  try {
    const pages = await api.listPages(input.courseId);
    const collision = bestCollision(pages, input.pageTitle);

    if (collision && !input.collisionAction) {
      return {
        error: titleCollisionGotcha(collision.page.title, input.pageTitle, collision.score),
        code: 'TITLE_COLLISION',
        details: { existingPage: collision.page, newTitle: input.pageTitle, score: collision.score },
      };
    }

    if (input.collisionAction === 'cancel') {
      return { error: 'Publishing cancelled. No Canvas page was changed.', code: 'PUBLISH_CANCELLED' };
    }

    if (input.collisionAction === 'update') {
      if (!collision) {
        return { error: 'No matching existing page was found to update.', code: 'NO_COLLISION_TO_UPDATE' };
      }
      const updated = await api.updatePage(input.courseId, collision.page.url, input.html);
      return { url: pageUrl(updated), action: 'updated', pageTitle: updated.title, tip: versionControlTip() };
    }

    if (input.collisionAction === 'related') {
      if (!input.relatedPageTitle?.trim()) {
        return { error: 'relatedPageTitle is required when collisionAction is "related".', code: 'RELATED_TITLE_REQUIRED' };
      }
      const created = await api.createPage(input.courseId, input.relatedPageTitle, input.html);
      return { url: pageUrl(created), action: 'created', pageTitle: created.title, tip: versionControlTip() };
    }

    const created = await api.createPage(input.courseId, input.pageTitle, input.html);
    return { url: pageUrl(created), action: 'created', pageTitle: created.title, tip: versionControlTip() };
  } catch (err) {
    if (err instanceof CanvasApiError) {
      if (err.code === 'CANVAS_FORBIDDEN') {
        return { error: tokenScopeGotcha(config.canvasUrl), code: err.code, details: { status: err.status, canvas: err.details } };
      }
      return { error: err.message, code: err.code, details: { status: err.status, canvas: err.details } };
    }
    return { error: err instanceof Error ? err.message : String(err), code: 'PUBLISH_FAILED' };
  }
}
```

- [x] **Step 4: Run publish tests**

Run:

```bash
npm test -- tests/publish.test.ts
```

Expected: all publish tests pass.

- [x] **Step 5: Commit**

```bash
git add src/tools/publish.ts tests/publish.test.ts
git commit -m "feat: add Canvas page publishing tool logic"
```

Implementation note: Codex expanded the planned Task 5 coverage to 18 publish tests, including missing `courseId`, `forcePublish`, `collisionAction: "create"`, `collisionAction: "cancel"`, `RELATED_TITLE_REQUIRED`, title-similarity token containment, and Canvas 403 mapping. The implementation keeps ordinary email addresses non-blocking in the FERPA scan, while blocking obvious student IDs and grade disclosures. Final verification passed with `npm test -- tests/publish.test.ts`, `npm test`, and `npm run build`.

---

### Task 6: Register MCP Tools

**Files:**
- Modify: `src/index.ts`

- [x] **Step 1: Add imports**

In `src/index.ts`, add:

```ts
import { CanvasApiClient } from './canvas-api.js';
import { saveConfig } from './config.js';
import { listCanvasCourses } from './tools/list-courses.js';
import { publishToCanvas, type PublishToCanvasInput } from './tools/publish.js';
```

Change the existing config import from:

```ts
import { configExists, loadConfig } from './config.js';
```

to:

```ts
import { configExists, loadConfig, saveConfig } from './config.js';
```

- [x] **Step 2: Add tool schemas**

Add these two entries to the `tools` array returned from `ListToolsRequestSchema`, after `update_canvas_kb`:

```ts
{
  name: 'list_canvas_courses',
  description: 'List Canvas courses available to the configured professor, with semester filtering, favorite pinning, and course metadata to help choose the right course.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      semester: {
        type: 'string',
        enum: ['current', 'future', 'past', 'all'],
        description: 'Course filter: current active courses, future invited/pending courses, past completed courses, or all courses.',
      },
      includeFavorites: {
        type: 'boolean',
        description: 'Pin configured favorite course IDs to the top. Defaults to true.',
      },
    },
  },
},
{
  name: 'publish_to_canvas',
  description: 'Validate and publish Canvas-safe HTML to a Canvas course page. Detects FERPA risks, validation issues, and similar existing page titles before writing.',
  inputSchema: {
    type: 'object' as const,
    required: ['courseId', 'html', 'pageTitle'],
    properties: {
      courseId: { type: 'number', description: 'Canvas course ID from list_canvas_courses.' },
      html: { type: 'string', description: 'Canvas-safe HTML to publish.' },
      pageTitle: { type: 'string', description: 'Canvas page title.' },
      forcePublish: { type: 'boolean', description: 'Skip Canvas HTML validation gate. Defaults to false.' },
      skipFerpaCheck: { type: 'boolean', description: 'Skip FERPA/PII scan. Defaults to false.' },
      collisionAction: {
        type: 'string',
        enum: ['update', 'create', 'related', 'cancel'],
        description: 'Use only after a TITLE_COLLISION response to choose how to proceed.',
      },
      relatedPageTitle: {
        type: 'string',
        description: 'Required when collisionAction is related.',
      },
    },
  },
},
```

- [x] **Step 3: Add call handlers**

Add these cases inside the `CallToolRequestSchema` handler before the unknown-tool return:

```ts
if (name === 'list_canvas_courses') {
  const config = loadConfig();
  const api = new CanvasApiClient(config);
  const result = await listCanvasCourses(args ?? {}, config, api, saveConfig);
  return { content: [{ type: 'text', text: result.text }] };
}

if (name === 'publish_to_canvas') {
  const config = loadConfig();
  const api = new CanvasApiClient(config);
  const result = await publishToCanvas(args as unknown as PublishToCanvasInput, config, api);
  const isError = 'error' in result;
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    isError,
  };
}
```

- [x] **Step 4: Build**

Run:

```bash
npm run build
```

Expected: TypeScript compiles with no errors.

- [x] **Step 5: Run full tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [x] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: register Canvas course and publish tools"
```

Implementation note: Codex registered both SP2 Canvas tools in `src/index.ts`. `list_canvas_courses` now loads config, instantiates `CanvasApiClient`, delegates to `listCanvasCourses`, and persists the one-time naming tip through `saveConfig`. `publish_to_canvas` now delegates to `publishToCanvas` and returns the structured result as JSON with `isError` set when the result is a `ToolError`. Final verification passed with `npm run build` and `npm test`.

---

### Task 7: Setup Wizard Enhancements

**Files:**
- Modify: `src/wizard.ts`

- [ ] **Step 1: Make Canvas API token optional in setup**

Find the existing API token prompt in `src/wizard.ts` and change it from a required credential to an optional advanced credential:

```ts
const apiToken = await password({
  message: 'Canvas API token (optional - leave blank to generate HTML and paste it manually):',
  validate: (v) => !v || v.length > 10 || 'Token looks too short - leave blank or paste the full token from Canvas Account Settings > Approved Integrations',
});
```

This preserves the beginner workflow: setup can complete without a token, `generate_canvas_page` still works, and only `list_canvas_courses` / `publish_to_canvas` should return missing-token errors.

- [ ] **Step 2: Add optional SP2 setup prompts**

In `src/wizard.ts`, after the API token prompt, add:

```ts
const professorEmail = await input({
  message: 'Professor email for FERPA scan allowlist (optional):',
  default: '',
});

const favoriteCoursesRaw = await input({
  message: 'Favorite Canvas course IDs, comma-separated (optional):',
  default: '',
  validate: (v) => {
    if (!v.trim()) return true;
    return v.split(',').every(id => /^\d+$/.test(id.trim())) || 'Use only numeric Canvas course IDs separated by commas.';
  },
});
```

- [ ] **Step 3: Parse favorite course IDs**

Still in `runWizard()`, before building the `config` object, add:

```ts
const favoriteCourses = favoriteCoursesRaw
  .split(',')
  .map(id => id.trim())
  .filter(Boolean)
  .map(Number);
```

- [ ] **Step 4: Save SP2 config fields**

Change the `config` object to:

```ts
const config: InstitutionConfig = {
  institution,
  colors,
  canvasUrl,
  apiToken,
  professorEmail: professorEmail.trim() || undefined,
  favoriteCourses: favoriteCourses.length > 0 ? favoriteCourses : undefined,
  kbTipShown: false,
};
```

- [ ] **Step 5: Update setup success output**

Add these lines after the existing color output:

```ts
if (!apiToken.trim()) {
  console.log('Canvas API token skipped. You can still generate HTML and paste it into Canvas manually.');
}
if (professorEmail.trim()) {
  console.log(`✓ FERPA scan allowlist email: ${professorEmail.trim()}`);
}
if (favoriteCourses.length > 0) {
  console.log(`✓ Favorite Canvas courses: ${favoriteCourses.join(', ')}`);
}
```

- [ ] **Step 6: Build**

Run:

```bash
npm run build
```

Expected: TypeScript compiles with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/wizard.ts
git commit -m "feat: capture Canvas publishing preferences in setup"
```

---

### Task 8: README Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the tools table**

Replace the README tool table with:

```md
| Tool | Description |
|---|---|
| `setup_institution` | Re-run setup to update institution colors, Canvas URL, API token, professor email, and favorite course IDs |
| `generate_canvas_page` | Generate a Canvas-safe HTML assignment page from a brief |
| `validate_canvas_html` | Check HTML for Canvas RCE compliance violations |
| `update_canvas_kb` | Refresh the Canvas sanitizer allowlist cache |
| `list_canvas_courses` | List courses available through the configured Canvas token |
| `publish_to_canvas` | Validate and publish HTML to a Canvas page |
```

- [ ] **Step 2: Add the publish flow section**

Add this section after `## Usage`:

```md
## Publishing to Canvas

1. Run `list_canvas_courses` to find the correct course ID.
2. Run `publish_to_canvas` with `courseId`, `pageTitle`, and the generated HTML.
3. If the tool returns `TITLE_COLLISION`, rerun with one of:
   - `collisionAction: "update"` to replace the existing page body.
   - `collisionAction: "create"` to create a new page with the requested title.
   - `collisionAction: "related"` plus `relatedPageTitle` to create a named variation.
   - `collisionAction: "cancel"` to stop.

`publish_to_canvas` scans for common FERPA/PII mistakes and validates Canvas RCE compatibility before it writes to Canvas. Use `skipFerpaCheck: true` or `forcePublish: true` only after reviewing the warning.
```

- [ ] **Step 3: Run no-code verification**

Run:

```bash
git diff -- README.md
```

Expected: README documents both new tools and the collision rerun flow.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document Canvas publishing workflow"
```

---

### Task 9: Final Verification and Handoff

**Files:**
- Modify: `docs/handoff-to-Claude.md`

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run build
git status --short --branch
```

Expected:
- Vitest passes all tests.
- TypeScript build passes.
- Worktree shows only intentional handoff changes before final commit.

- [ ] **Step 2: Update `docs/handoff-to-Claude.md`**

Use this structure:

```md
# Handoff to Claude - Canvas Design Studio SP2

**Date:** 2026-05-04
**From:** Codex
**To:** Claude
**Project:** Canvas Design Studio MCP Server

## Completed This Step

- Generated SP2 implementation plan at `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`.
- Applied the Superpowers `writing-plans` workflow by reading the local Claude plugin skill instructions.
- Captured one required implementation adjustment: title collision confirmation must be a structured MCP response plus rerun parameters, not an in-tool dialog.

## Reasoning

MCP tool calls are not interactive once invoked. Returning `TITLE_COLLISION` with explicit follow-up parameters preserves the original safety goal, avoids accidental overwrites, and still gives professors a clear Update/Create/Related/Cancel choice.

## Verification

- `npm test`: passing
- `npm run build`: passing

## Git

- Latest commit: `<commit hash> <commit subject>`
- Branch: `master`
- Remote: `origin`

## Next Step

Implement Task 1 of the SP2 plan.
```

- [ ] **Step 3: Commit handoff**

```bash
git add docs/handoff-to-Claude.md
git commit -m "docs: hand off SP2 implementation status to Claude"
```

- [ ] **Step 4: Push**

```bash
git push origin master
```

Expected: GitHub remote receives all SP2 commits.

---

## Self-Review

**Spec coverage:** The plan covers `list_canvas_courses`, `publish_to_canvas`, config additions, Canvas API pagination, rate-limit retries, missing-token handling, FERPA scan, validation gate, fuzzy collision detection, update/create/related/cancel handling, professor-facing gotcha messages, version-control tip, MCP registration, tests, docs, and handoff.

**Known deviation from spec:** The collision "dialog" is implemented as a structured MCP response plus rerun parameters because MCP tools cannot pause inside a call and collect a selection. The behavior still enforces explicit professor choice before overwriting.

**Placeholder scan:** No step relies on unspecified error handling or unnamed tests. Every task names exact files, commands, expected results, and commit messages.

**Type consistency:** Shared names are consistent across tasks: `InstitutionConfig`, `CanvasCourse`, `CanvasPage`, `ToolError`, `SemesterFilter`, `CollisionAction`, `CanvasApiClient`, `listCanvasCourses`, and `publishToCanvas`.
