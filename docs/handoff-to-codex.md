# Handoff to Codex — Canvas Design Studio SP2

**Date:** 2026-05-04  
**From:** Claude Code (claude-sonnet-4-6) — session 37815ffd  
**To:** Codex (or next AI session)  
**Project:** Canvas Design Studio MCP Server  
**Repo:** `D:\Dev\canvas-design-studio\` (private GitHub: `github.com/Ryfter/canvas-design-studio`)

---

## What This Project Is

An MCP server (Node.js + TypeScript, stdio transport) that gives AI assistants tools for generating, validating, and publishing Canvas LMS assignment pages. Published to npm as `canvas-design-mcp`. Professors install it once with `npx canvas-design-mcp` and configure it via a CLI wizard.

**v0.1.0 is complete and committed to git.** It has 4 tools:
- `generate_canvas_page` — turns a brief into Canvas-safe HTML
- `validate_canvas_html` — checks HTML against Canvas RCE sanitizer rules
- `update_canvas_kb` — fetches the Canvas allowlist from GitHub source
- `setup_institution` — CLI wizard for institution config

---

## Where We Left Off

**SP2 design is complete.** The brainstorming + design session finished. A full spec is at:

```
docs/superpowers/specs/2026-05-04-sp2-publish-canvas-design.md
```

**The next step is to invoke the `writing-plans` skill** to turn that spec into a detailed implementation plan, then implement SP2.

Do NOT skip the writing-plans step — the spec is thorough but the plan needs task-level breakdowns with file paths and test cases.

---

## SP2 Summary (what to build)

Two new MCP tools:

### `list_canvas_courses`
- Calls `GET /api/v1/courses?enrollment_state=<state>`
- Filters by `semester` param: `current` (active) / `future` (invited_or_pending) / `past` (completed) / `all`
- Displays per course: ID, name, nickname, student count, teacher count, term
- Pins `favoriteCourses` from `institution.json` to top with ★
- Shows naming convention tip once (stored in `institution.json` as `kbTipShown: true`)

### `publish_to_canvas`
- Params: `courseId`, `html`, `pageTitle`, `forcePublish?`, `skipFerpaCheck?`
- **Step 1:** Check API token exists (fail early with friendly message if not)
- **Step 2:** FERPA/PII scan on HTML (regex, unless `skipFerpaCheck: true`)
- **Step 3:** Validate HTML via existing `validate_canvas_html` logic (unless `forcePublish: true`)
- **Step 4:** Fuzzy title collision detection against existing pages
- **Step 5:** If collision ≥ 0.8 match — present confirmation dialog (Update / Create New / Create as Related Page / Cancel)
- **Step 6:** POST or PUT to Canvas API
- **Step 7:** Return URL + version control tip

---

## Key Architecture Decisions

| Decision | What was chosen | Why |
|---|---|---|
| Course selection UX | Always list, never ask for ID | Professors don't know Canvas course IDs |
| Create vs. update | Fuzzy detect + confirmation dialog | Explicit parameters were too technical; silent auto-detect risks overwrites |
| Collision threshold | Levenshtein ≥ 0.8 = show dialog | Catches near-duplicates, ignores clearly different titles |
| Validation | Always on, `forcePublish` override | Silent publish of broken HTML wastes professor's time |
| FERPA scan | Regex heuristic, `skipFerpaCheck` override | Federal law — heuristic catches obvious cases; override respects autonomy |
| Version tip | In success output, every time | Canvas revisions aren't diffable; Git is the right tool |
| Rate limits | Retry 3x with exponential backoff | Canvas 429s are transient |
| Missing token | Fail before HTTP with clear message | Canvas 401 is opaque; pre-check is professor-friendly |

---

## File Structure (what exists)

```
canvas-design-studio/
├── CLAUDE.md                    ← Loaded every session — read this first
├── src/
│   ├── index.ts                 ← MCP server, tool registry
│   ├── tools/
│   │   ├── generate.ts          ← generate_canvas_page
│   │   ├── validate.ts          ← validate_canvas_html
│   │   ├── update-kb.ts         ← update_canvas_kb
│   │   └── setup.ts             ← setup_institution (wizard)
│   └── config.ts                ← reads/writes institution.json
├── tests/                       ← 33 tests, all passing (npm test)
├── docs/
│   ├── canvas-design-kb/        ← Reference KB (26 files — Canvas rules)
│   └── superpowers/
│       ├── specs/               ← Design specs
│       │   ├── 2026-04-29-canvas-mcp-design.md       ← SP1 spec (as-built)
│       │   ├── 2026-04-29-mcp-future-additions.md    ← SP2–8 planning
│       │   └── 2026-05-04-sp2-publish-canvas-design.md  ← SP2 SPEC (start here)
│       └── plans/
│           └── 2026-05-03-canvas-mcp-subproject-1.md ← SP1 plan (all done)
├── Dockerfile                   ← Built, committed, NOT tested yet (deferred to release)
└── .github/workflows/
    ├── ci.yml                   ← Node 18/20/22 matrix
    └── publish.yml              ← npm + Docker publish on git tag push
```

**New files SP2 will need to create:**
- `src/canvas-api.ts` — thin Canvas API client (auth header, base URL, pagination)
- `src/tools/publish.ts` — `publish_to_canvas` implementation
- `src/tools/list-courses.ts` — `list_canvas_courses` implementation
- `src/tools/gotchas.ts` — gotcha message module
- `tests/publish.test.ts`
- `tests/list-courses.test.ts`
- `tests/canvas-api.test.ts`

---

## Gotcha Pattern (important design detail)

`src/tools/gotchas.ts` is a module that surfaces contextual warnings at the right moment — not errors, just professor-readable messages. Five gotchas defined for SP2:

1. **Course coordinator edge case** — course shows as "teacher" but has 0 students / 3+ teachers
2. **Title collision** — fuzzy match triggers confirmation dialog
3. **API token scope** — 403 on write → explain token scope requirements
4. **FERPA/PII scan** — 9-digit IDs, grade disclosure patterns in HTML → block with override
5. **Version control tip** — always shown in success output

Full gotcha specs in `docs/superpowers/specs/2026-05-04-sp2-publish-canvas-design.md`.

---

## Canvas API Endpoints for SP2

```
GET  /api/v1/courses?enrollment_state=active&per_page=50
GET  /api/v1/courses/:id/pages?per_page=50
POST /api/v1/courses/:id/pages          body: { wiki_page: { title, body, published: true } }
PUT  /api/v1/courses/:id/pages/:url     body: { wiki_page: { body } }
```

Auth header: `Authorization: Bearer <token>` (token from `institution.json`)  
Base URL: `institution.json` → `canvasUrl` + `/api/v1`

Pagination: Canvas returns Link headers with `rel="next"` — must paginate course and page lists.

---

## What Kevin Wants (user context)

- **Kevin Rank** — professor at Boise State University, teaches ITM courses
- Builds Canvas pages for his own courses. The naming convention he uses: `Sp26 | ITM 310-002 Business Intelligence (RANK)`
- Wants the tool to help professors who aren't technical — every error message should be professor-readable, not developer-readable
- FERPA awareness is important to him — he flagged this specifically
- Version control tip was his idea — he knows Git is the right tool
- The repo stays private until he decides to ship it

---

## What Is NOT Done Yet (in rough priority order)

1. **SP2 implementation** — spec complete, needs writing-plans → implementation
2. **npm account + NPM_TOKEN** — Kevin needs to: run `npm login`, create Automation token, add `NPM_TOKEN` secret to GitHub repo settings → then push a release tag to trigger publish
3. **SP3** — Accessibility module (see `2026-04-29-mcp-future-additions.md`)
4. **SP4–SP8** — see future additions doc

---

## How to Pick This Up

1. Read `CLAUDE.md` (loaded automatically in Claude Code)
2. Read `docs/superpowers/specs/2026-05-04-sp2-publish-canvas-design.md` (SP2 spec)
3. Invoke the `writing-plans` skill to create the SP2 implementation plan
4. Implement per the plan
5. Run `npm test` after each tool is added — tests must stay green

If you're in Claude Code, the `superpowers:brainstorming` and `superpowers:writing-plans` skills are available via the `Skill` tool.

---

## Git State

- All SP1 work is committed to `master`
- GitHub remote: `origin` → `github.com/Ryfter/canvas-design-studio` (private)
- No release tag pushed yet (npm publish not wired up — NPM_TOKEN not set)
- SP2 spec and this handoff doc will be committed before this session ends

