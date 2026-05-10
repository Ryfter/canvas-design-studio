# Handoff to Claude — Canvas Design Studio SP4

## Release Checkpoint - 2026-05-10

Canvas Design Studio is published publicly as `canvas-design-mcp@0.9.3`.

- Public repo: `Ryfter/canvas-design-studio`
- npm package: `canvas-design-mcp@0.9.3`; `latest` points to `0.9.3`
- Successful Publish workflow: run `25617742960`, tag `v0.9.3`
- Successful jobs in that run: `test`, `publish-npm`, `publish-docker`
- GHCR image: `ghcr.io/Ryfter/canvas-design-studio`
- Earlier failed Publish runs are superseded and should not be rerun. They failed on npm token permissions/2FA and then missing `repository.url` for provenance. The fixed package metadata includes the public repository URL.

Private backup needs to stay full-fidelity with internal docs. Public repo updates still go through `.\scripts\deploy-public.ps1`; do not push the private docs directly to `origin`.

---

**Date:** 2026-05-06
**From:** Claude (claude-sonnet-4-6)
**To:** Claude / Codex
**Project:** Canvas Design Studio MCP Server
**Repo:** `D:\Dev\canvas-design-studio` (private: github.com/Ryfter/canvas-design-studio)

## SP4 Status: COMPLETE — All 6 Tasks Done

### What Was Built

**Task 1 — `src/kb/design-principles.md`**
- Condensed visual design principles file (~450 words, ~500 tokens)
- 7 sections: Visual Hierarchy, Whitespace, Color, Typography, Components, Canvas Constraints, Content Prominence by Page Type
- Read at runtime by `critique.ts` and `redesign.ts` when comprehensive mode is requested
- Not compiled into the TypeScript build — update without a rebuild

**Task 2 — `src/tools/critique.ts` (skeleton) + `tests/critique.test.ts`**
- Full type definitions: `CritiqueInput`, `CritiqueFinding`, `CritiqueResult`
- Checks 1–4 live: `checkUnreplacedHero`, `checkWallOfText`, `checkNoHeadings`, `checkTooSparse`
- Checks 5–8 initially stubbed; score, strengths, KB loading already wired

**Task 3 — `src/tools/critique.ts` (completion)**
- Filled in checks 5–8: `checkColorChaos` (hex dedup with 3→6 expansion), `checkFontFloor`, `checkMissingSubmissionLanguage`, `checkColumnImbalance`
- `extractDivText` uses depth-counting (not lazy regex) to correctly capture nested column content
- All 23 critique tests passing

**Task 4 — `src/tools/redesign.ts` + `tests/redesign.test.ts`**
- `fixFontFloor`: replaces all `font-size: Npx` (N < 13) with `font-size:13px`
- `fixHeroUrl`: inserts `<!-- Replace HERO_IMAGE_URL with your hosted image URL (1200×400px) -->` before the img tag
- Non-mechanical findings routed to `skippedFindings`
- `auditAccessibility` wired unconditionally; `accessibilityWarnings` populated when non-empty
- Comprehensive mode: loads KB and attaches as `kbContext`
- 6 redesign tests passing

**Task 5 — `src/index.ts`**
- Registered `critique_canvas_page` and `redesign_canvas_page` MCP tools
- `critique_canvas_page` handler: formats score, strengths, findings by priority tier, optional KB context
- `redesign_canvas_page` handler: applied fixes, skipped findings, accessibility warnings, optional KB context, fixed HTML block

**Task 6 — Docs (this file + roadmaps)**
- `docs/handoff-to-Claude.md` updated (this file)
- `docs/technical-roadmap.md` updated — SP4 marked Done, SP5 marked Next
- `docs/feature-roadmap.md` updated — design critique moved to Available Now

### Verification

- `npm test`: 136 passing (13 test files)
- `npm run build`: passing

### Git — SP4 Commits

- `87593cf` fix: guard against undefined pageType in critique handler score header
- `92c2f58` feat: register critique_canvas_page and redesign_canvas_page MCP tools
- `d730d9a` fix: simplify fixHeroUrl return value; add symmetric font-suppression test
- `429d835` feat: add redesign module with mechanical fixes and accessibility wiring
- `fafd67a` fix: use depth-counting in extractDivText to capture full column content with nested divs
- `c9a2431` fix: revert unauthorized check logic changes; fix test fixtures
- `ea3495c` feat: complete critique engine with all 8 checks, scoring, and comprehensive mode
- `782744b` fix: score test fixture (100-word paragraphs, no wall-of-text interference)
- `df76831` feat: add critique module skeleton with checks 1-4
- `c3e1ca9` fix: add filter to KB forbidden list, clarify card padding
- `8f208fd` feat: add design principles KB for comprehensive critique mode

Branch: `master`
Remote: `origin`

---

## SP4 Design Decisions (preserved for SP5+)

| Decision | Choice | Reasoning |
|---|---|---|
| Two tools (critique + redesign) vs one | Two tools | Professor needs a real decision point between diagnosis and fix — combined tool removes that |
| No Anthropic API call from server | Claude IS the host | MCP server runs inside Claude Code; calling API internally is redundant and costly |
| Comprehensive mode = KB injection | Attach `design-principles.md` as `kbContext` | Gives Claude the context it needs without a separate API round-trip |
| Quick checks are code-only | 8 regex/string checks | Deterministic, testable, zero latency — same pattern as SP3 |
| KB file on disk, not compiled | Read at runtime | KB content may be updated without a rebuild |
| Score model | −15 high, −8 medium, −3 low, floor 0 | Simple, predictable, professor-legible |
| `extractDivText` uses depth-counting | Counts opening/closing div tags | Lazy regex cuts off at first inner `</div>`, missing content in nested column cards |
| Font suppression is area-level | `area === 'typography'` | Only one typography check exists; acceptable simplification for now |

---

## Next Step: SP5 — Panopto Integration

### What SP5 Builds

Accessible Panopto video embeds for Canvas pages. Likely involves:
- A new tool: `embed_panopto_video`
- Config additions: Panopto domain, iframe whitelist status
- Video captions check (deferred from SP3's accessibility module — see `src/tools/accessibility.ts` note)

### Key Dependencies

- BSU iframe whitelist confirmation (is Panopto whitelisted in Canvas?)
- Panopto API auth details
- The video captions check was explicitly deferred from SP3 to SP5 (`src/tools/accessibility.ts` has a comment)

### Start With

Run `/brainstorm` on SP5 — Panopto Integration. Check:
- `docs/canvas-design-kb/04-tools/` for existing Panopto notes
- `src/tools/accessibility.ts` for the deferred video captions comment
- `docs/superpowers/specs/2026-04-29-mcp-future-additions.md` for original SP5 scope notes

---

## Implementation Plan Location

`docs/superpowers/plans/2026-05-05-sp4-design-intelligence.md`

## Spec Location

`docs/superpowers/specs/2026-05-05-sp4-design-intelligence-design.md`

---

# Handoff to Next Agent — SP5 Panopto Integration

**Date:** 2026-05-06
**Status:** Spec approved — plan written — ready to execute

## What SP5 Builds

Three new MCP tools:
- `search_panopto_videos` — search/browse Panopto library with captions status (requires API)
- `embed_panopto_video` — Canvas-safe iframe embed or accessible fallback link
- `fetch_panopto_captions` — download VTT captions, strip timestamps, save as Markdown to `~/.canvas-design-mcp/transcripts/`

One new accessibility check:
- `video-no-captions` — flags Panopto iframes in `auditAccessibility` when `captions=true` is missing from the embed URL

## Key SP5 Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| `PanoptoConfig` type location | `src/types.ts` | Spec incorrectly said `src/config.ts`; all types live in `src/types.ts` |
| Three tools, not two | Added `fetch_panopto_captions` | VTT → plain-text transcript saved to local KB for future professor philosophy / context use |
| OAuth2 token caching | Fetch fresh per request | Tokens are short-lived; caching deferred to future iteration |
| Captions search result ceiling | 500 results max per call | Prevents runaway API usage |
| Fallback link color | Uses `#0033A0` (BSU primary) | Hardcoded in the fallback link HTML — consistent with brand without needing config threading |
| `iframeWhitelisted: null` | Treated same as `false` | When unsure, generate accessible fallback link rather than risk broken iframe |

## Files to Create or Modify

| File | Action |
|---|---|
| `src/types.ts` | Add `PanoptoConfig` interface + `panopto?: PanoptoConfig` to `InstitutionConfig` |
| `src/tools/panopto.ts` | Create: all Panopto logic (URL builders, HTML gen, OAuth2, search, metadata, captions) |
| `src/tools/accessibility.ts` | Add `checkPanoptoNoCaptions` to `auditAccessibility` |
| `src/wizard.ts` | Skippable Panopto setup section |
| `src/index.ts` | Register 3 new tools |
| `tests/panopto.test.ts` | Create: 18 tests |
| `tests/accessibility.test.ts` | Add 2 tests for `video-no-captions` |
| `AGENTS.md` | Create: comprehensive agent orientation file for Codex |

## Test Target

136 (current) + 18 panopto + 2 accessibility = **156 tests**

## Where to Start

1. Run `npm test` to confirm 136 passing baseline
2. Read `docs/superpowers/plans/2026-05-06-sp5-panopto.md` — 9 tasks, TDD throughout
3. Execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`

## Spec and Plan Locations

- Spec: `docs/superpowers/specs/2026-05-06-sp5-panopto-design.md`
- Plan: `docs/superpowers/plans/2026-05-06-sp5-panopto.md`

---

# Handoff to Next Agent — SP5 Panopto Integration

**Date:** 2026-05-06
**Status:** COMPLETE — 156 tests passing

## What SP5 Built

Three new MCP tools:
- `search_panopto_videos` — search/browse Panopto library with captions status (requires API)
- `embed_panopto_video` — Canvas-safe iframe embed or accessible fallback link; optional API for metadata
- `fetch_panopto_captions` — download VTT captions, strip timestamps, save as Markdown to `~/.canvas-design-mcp/transcripts/`

One new accessibility check:
- `video-no-captions` — flags Panopto iframes without `captions=true` in `auditAccessibility`

Wizard updated: optional Panopto section (domain, whitelist status, API credentials).

## SP5 Commits

- `1a94bfe` feat(sp5): add PanoptoConfig type to InstitutionConfig
- `84b647f` feat(sp5): panopto pure functions — URL builders, embed HTML, VTT parser, formatters
- `7bd8a17` fix(sp5): parseVttToText strips cue IDs and NOTE blocks; formatDuration rounds input
- `6df08db` feat(sp5): searchPanoptoVideos with OAuth2 client credentials and pagination
- `045f41b` fix(sp5): guard getPanoptoToken against missing credentials
- `d6d4689` feat(sp5): embedPanoptoVideo with optional API metadata and caption warning
- `903ff43` feat(sp5): fetchPanoptoCaptions — download VTT, strip timestamps, save to ~/.canvas-design-mcp/transcripts/
- `fdf271b` feat(sp5): add video-no-captions accessibility check for Panopto iframes
- `f1401fa` feat(sp5): register search_panopto_videos, embed_panopto_video, fetch_panopto_captions
- `54275b0` feat(sp5): add skippable Panopto domain/whitelist/API setup to wizard
- `68cd78e` fix(sp5): HTML escaping in embed, hours in formatDuration, isError for API_NOT_CONFIGURED, minor cleanups

## SP5 Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Three tools not two | Added `fetch_panopto_captions` | VTT → plain-text transcript saved to local KB for future professor philosophy / context use |
| `PanoptoConfig` type location | `src/types.ts` | Spec incorrectly said `src/config.ts`; all types live in `src/types.ts` |
| OAuth2 token caching | Fetch fresh per request | Tokens are short-lived; caching deferred to future iteration |
| Captions search result ceiling | 500 results max per call | Prevents runaway API usage |
| Fallback link color | Uses `#0033A0` (BSU primary) | Hardcoded in the fallback link HTML — consistent with brand |
| `iframeWhitelisted: null` | Treated same as `false` | When unsure, generate accessible fallback link rather than risk broken iframe |
| `parseVttToText` strips cue IDs | Added `cueIdRe = /^\d+$/` check | Real Panopto VTT files include numeric cue IDs before timestamps |
| `formatDuration` rounds input | `Math.round(seconds)` before math | Prevents float artifacts (e.g., 65.7 → `01:5.700...`) |
| `formatDuration` supports hours | `h:mm:ss` format for ≥ 3600s | University lectures can exceed 60 min; `60:00` format is non-standard |
| HTML escaping in embed | `escapeHtml()` on title | Panopto video names may contain `"` or `<`; protects `aria-label` and link text |
| `videoId` URL-encoded in URL builders | `encodeURIComponent(videoId)` | videoId is user-supplied; UUID chars are safe but encoding is defensive |
| `API_NOT_CONFIGURED` → `isError: true` | Check prefix in handlers | Consistent with all other error paths in `src/index.ts` |

## Next Step: SP6 — Assignment Folder Ingest

Run `/brainstorm` on SP6 — Assignment Folder Ingest. Check:
- `docs/technical-roadmap.md` SP6 row for context
- `docs/superpowers/specs/2026-04-29-mcp-future-additions.md` for original SP6 scope notes

---

# Handoff to Next Agent — SP6 Assignment Folder Ingest

**Date:** 2026-05-07
**Status:** COMPLETE — 175 tests passing

## What SP6 Built

One new MCP tool: `ingest_assignment_folder`

- **Simple mode** — reads from `ingest/` folder (course-config.md + assignment-brief.md + optional rubric/shell/style-notes)
- **Advanced mode** — reads from `assignments/{id}/` subfolders; rubric.md and shell.md are inherited from parent folders for assignment groups (e.g., all AI Challenge weeks share one rubric)
- **Course config merge** — shared `assignments/course-config.md` + per-folder override; closest file wins field-by-field; blank values don't override
- Returns HTML + structured `sources` (brief, rubric, shell, styleNotes) so Claude can review alignment without additional tool calls

## SP6 Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Shell as sources context, not HTML injection | Pass shell in `sources.shell`, not as template | Applying structural templates requires Claude's judgment; `generateCanvasPage()` ignores `styleNotes` anyway |
| Walk termination at first path segment | Stop at `assignments/` or `ingest/` level | Prevents stray files in parent directories from being picked up |
| Blank config values = not set | Blank line in override file does not override shared value | Lets professors create minimal per-assignment configs that only set what changes |
| Tests use real fixture folders | No filesystem mocking | File-discovery functions operate on real paths; fixture folders are small and self-contained |
| Cross-drive path guard | `getWalkRoot` throws if path is outside the project | Windows edge case: `path.relative()` returns absolute string for cross-drive paths |

## SP6 Commits

- `e6ea45c` fix(sp6): surface styleNotes in ingest handler response
- `6cc1bcd` feat(sp6): register ingest_assignment_folder MCP tool
- `2f35a4f` fix(sp6): tighten placeholder regex, improve error messages and cast comment
- `f426b32` feat(sp6): ingestAssignmentFolder — file discovery, config merge, HTML generation
- `dc90ca1` fix(sp6): add cross-drive path guard to getWalkRoot
- `34b8813` feat(sp6): file discovery — findFileWithInheritance, findCourseConfig, walk helpers
- `e6dcdb0` fix(sp6): remove incorrect type cast in validateCourseInfo, add colon-in-value test
- `612d805` feat(sp6): ingest types, parseCourseConfig, validateCourseInfo
- `00c1ca0` fix(sp6): remove empty fixture dirs, deduplicate assignment numbers
- `23d64a2` test(sp6): add fixture folder trees for ingest tool tests
- `aa50a31` docs: SP6 implementation plan — Assignment Folder Ingest
- `cc224aa` docs(sp6): add SP6 assignment folder ingest design spec

## Next Step: SP7 — Professor Philosophy KB

Run `/brainstorm` on SP7. Check `docs/technical-roadmap.md` SP7 row and `docs/superpowers/specs/2026-04-29-mcp-future-additions.md` for original scope notes.

---

# Handoff to Next Agent — SP7 Professor Philosophy KB

**Date:** 2026-05-08
**Status:** COMPLETE — 187 tests passing

## What SP7 Built

Two new MCP tools:
- `get_philosophy_kb` — returns the full KB content from `~/.canvas-design-mcp/professor-philosophy.md`; when no file exists, returns the empty template with 6 interview questions injected so Claude can build the KB through conversation
- `update_philosophy_kb` — appends a single entry (`entry`, `section`, optional `courseKey`) to the professor's philosophy KB; handles new course subsections automatically; never overwrites existing content

Philosophy phase added to setup wizard (6-question interview, skippable). Four description updates to existing tools (`generate_canvas_page`, `critique_canvas_page`, `redesign_canvas_page`, `ingest_assignment_folder`).

## SP7 Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| KB file location | `~/.canvas-design-mcp/professor-philosophy.md` | Consistent with `institution.json` location; survives npm reinstalls; platform-agnostic home dir |
| Four-section KB format | Core Teaching Philosophy / Course-Specific Focus / Quotes & Aphorisms / From Lecture Captures | Each section has a different update path and inheritance scope; Markdown headers make them human-editable and Claude-parseable |
| Interview in wizard, not in tool | Wizard handles 6-question interview; `update_philosophy_kb` appends single entries | Keeps the tool simple (save only); judgment and interview flow live in Claude or wizard |
| `kbPath` optional parameter | `getPhilosophyKb(kbPath?)` and `updatePhilosophyKb(input, kbPath?)` | Tests use `os.tmpdir()` temp files — no filesystem mocking needed |
| Template vs. hints separation | `PHILOSOPHY_TEMPLATE` (bare headings) saved to disk; `PHILOSOPHY_QUESTIONS_HINT` injected only into returned content | Template must stay clean for `detectSections`; hints shown to Claude but not persisted |
| No config type change | Philosophy KB is a standalone file, not added to `InstitutionConfig` | Philosophy is distinct from institution/technical config; mixing them would pollute the config schema |

## SP7 Commits

- `34d9e62` feat(sp7): add philosophy.ts foundation — types, constants, savePhilosophyKb
- `99f0626` feat(sp7): add getPhilosophyKb with section detection
- `db29257` feat(sp7): add updatePhilosophyKb — core, quotes, lectures sections
- `6901e64` feat(sp7): add course-section and round-trip tests — 12 philosophy tests passing
- `e0125d5` feat(sp7): add philosophy KB phase to wizard — first-run interview + subsequent-run update
- `911b53b` feat(sp7): register get_philosophy_kb and update_philosophy_kb tools; update 4 tool descriptions
- `aff0be7` docs: update handoff, roadmap, AGENTS.md for SP7 completion — 14 tools, 187 tests

## Next Step: SP8 — Student Persona Review

Run `/brainstorm` on SP8. Check `docs/technical-roadmap.md` SP8 row and `docs/superpowers/specs/2026-04-29-mcp-future-additions.md` for original scope notes.

Key constraint: personas must be statistically grounded (Kevin's persona generator materials), not generic archetypes. See `docs/superpowers/specs/2026-05-07-sp7-philosophy-kb-design.md` (Design Alternatives section) for the deferred per-assignment reasoning decision that shaped this constraint.

---

# Handoff to Next Agent — SP8 Student Persona Review

**Date:** 2026-05-09
**Status:** COMPLETE — 199 tests passing

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

- `54cde75` fix(sp8): add getStudentPersonas unreadable-file error handling; 12 persona tests, 199 total
- `68cdd0f` feat(sp8): register get_student_personas and generate_student_personas tools; update 2 tool descriptions
- `ef1cc8b` feat(sp8): add getStudentPersonas; 11 persona tests passing, 198 total
- `aa8be5c` feat(sp8): add buildPersona and generateStudentPersonas; 8 tests passing
- `f1e0401` fix(sp8): export WeightedEntry; clarify test fixture hooks
- `ef2544f` feat(sp8): add weightedSample and poolSample; 3 sampling tests passing
- `e0b5642` feat(sp8): add personas.ts foundation — types, constants, dimension pools
- `6b0db9c` docs(sp8): add Student Persona Review implementation plan + persona source docs
- `f549769` docs(sp8): add Student Persona Review design spec

## Current Status: Post-SP9 — Published

SP1–SP9 complete. Repo is public at `github.com/Ryfter/canvas-design-studio`. Two-repo workflow is configured (private backup at `github.com/Ryfter/canvas-design-studio-private`). See `docs/handoff-to-codex.md` for the full workflow.

**Next milestone:** npm publish — add `NPM_TOKEN` secret to GitHub repo settings and push a release tag.

---

## SP9 — Assignment Improvement Loop (2026-05-09)

### What Was Built

Two new MCP tools: `load_canvas_page` (reads from `output/`, auto-selects most recent `.html` by mtime) and `save_canvas_page` (writes `.bak` before overwriting). Closes the editing loop so Claude can apply critique and persona findings directly to output files rather than only generating fresh pages.

### New Files
- `src/tools/page-io.ts` — `loadCanvasPage`, `saveCanvasPage`, 4 exported types
- `tests/page-io.test.ts` — 10 tests

### Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| `outputDir` as optional parameter | Yes (default `OUTPUT_DIR = join(cwd(), 'output')`) | Same testability pattern as `personas.ts` — tests pass `tmpdir()`, no mocking needed |
| `.bak` written before original clobber | Yes — `copyFileSync` before `writeFileSync` | Original is never lost if backup fails |
| One `.bak` per file (overwrites) | Yes | Sufficient for MVP; professor can restore one version back |
| Auto-create `output/` on save | Yes — `mkdirSync({ recursive: true })` | Professor may not have pre-created the directory |
| `utimesSync` in mtime test | Yes | Filesystem resolution <1ms on fast machines; explicit `utimesSync` guarantees ordering |

### Commits

- `6baee97` feat(sp9): add loadCanvasPage + 5 load tests
- `b95e122` feat(sp9): add saveCanvasPage + 5 save tests — 209 total
- `9a329fe` feat(sp9): register load_canvas_page and save_canvas_page in MCP server
- `0a3d55b` docs: SP9 complete — 209 tests, load/save canvas page tools documented

### Post-SP9: Current State

- Repo is public: `github.com/Ryfter/canvas-design-studio`
- Private backup: `github.com/Ryfter/canvas-design-studio-private` (default `git push` target)
- Deploy script: `.\scripts\deploy-public.ps1` strips internal docs and updates public repo
- Local install: `node D:\Dev\canvas-design-studio\dist\index.js` via Claude Desktop config
- npm publish not yet done — requires `NPM_TOKEN` GitHub secret + release tag

---

## Release Readiness Check (2026-05-09)

Codex re-read the current docs, verified the working tree, and ran the release checks:

- `npm test`: 209 passing (18 test files)
- `npm run build`: passing
- `npm pack --dry-run`: passing
- Release version: `0.9.0`

### Packaging Fix

`package.json` now includes the public professor-facing docs in the npm package allowlist:

- `CLAUDE.md`
- `DESIGN.md`
- `PROFESSOR-INSTRUCTIONS.txt`
- `docs/canvas-design-kb/`
- `docs/feature-roadmap.md`
- `docs/installation.md`
- `scripts/deploy-public.ps1`

Reasoning: the README and Codex handoff describe these as public/installable resources, but the previous npm `files` allowlist shipped only `dist/`, `src/kb/`, `src/templates/`, and `README.md`. The dry-run tarball now contains the Canvas KB, installation guide, feature roadmap, professor instructions, and design docs.

`package.json`, `package-lock.json`, and `AGENTS.md` were also moved from `0.1.0` to `0.9.0`. Reasoning: the existing `v0.1.0` tag points at the old SP1 initial-release commit on the public repo, while the completed application is documented through v0.9/SP9. The clean release path is to publish a new `v0.9.0` tag after the npm token secret is configured.

CI workflow maintenance: `.github/workflows/ci.yml` and `.github/workflows/publish.yml` now use `actions/checkout@v6` and `actions/setup-node@v6` to avoid the GitHub Actions Node.js 20 runtime deprecation warning seen on the public CI run.

### Public Docs Cleanup (2026-05-09)

Codex cleaned the production documentation after Kevin clarified that the third-party Canvas design add-on was only early research inspiration, not part of the final product:

- Removed the DesignPLUS pages from `docs/canvas-design-kb/04-tools/`.
- Rewrote the 04-tools docs around Canvas Theme Editor context and external Canvas design references.
- Removed production guidance that framed Canvas Design Studio as dependent on or adjacent to that add-on.
- Left DesignPLUS references only in `docs/canvas-design-kb/07-resources/Inspiration-and-Showcases.md`, where they are clearly external inspiration.
- Converted the public KB away from Obsidian-style `[[...]]` links to normal Markdown links.
- Removed links to nonexistent KB pages and fixed stale external URLs.
- Link audit result: public docs have 0 broken internal Markdown links; external URL check covered 45 URLs with 0 failures, skipping only intentional local/Boise Canvas examples.

### Remaining Work

No application sprint work remains for SP1-SP9. The only concrete release task left is operational: add the `NPM_TOKEN` secret in GitHub, then push `v0.9.0` so `.github/workflows/publish.yml` publishes npm and Docker artifacts. Live Canvas-course testing and Docker runtime testing are recommended after release, but they are validation tasks, not blockers found in code.
