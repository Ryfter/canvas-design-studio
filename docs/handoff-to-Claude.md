# Handoff to Claude — Canvas Design Studio SP4

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
