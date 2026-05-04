# Canvas Design Studio Roadmap

**Last updated:** 2026-05-04  
**Audience:** Professors, instructional designers, and project collaborators  
**Purpose:** Show what Canvas Design Studio can do now, what is being built next, and where feedback would be most useful.

Canvas Design Studio helps professors create polished, accessible Canvas LMS pages without hand-writing Canvas-safe HTML. The roadmap keeps the low-barrier workflow first: a professor should always be able to generate HTML and paste it into Canvas manually. Canvas API publishing is an optional convenience layer, not a requirement.

## Status Legend

| Status | Meaning |
|---|---|
| Done | Implemented and committed |
| In progress | Planned or actively being implemented now |
| Next | Expected soon after the current work |
| Later | Roadmap item, not yet specified |
| Idea | Useful possibility, not scheduled |

## Current Capabilities

| Feature | Status | What professors can do | Implementation step |
|---|---|---|---|
| Canvas-safe HTML generation | Done | Turn assignment instructions into a designed Canvas page that can be pasted into Canvas | SP1 |
| Manual paste workflow | Done | Use the tool without a Canvas API token or technical Canvas setup | SP1 |
| Canvas HTML validation | Done | Check for Canvas RCE problems like `<style>`, `<script>`, `box-shadow`, `gap`, missing image alt text, and invalid heading hierarchy | SP1 |
| Institution setup | Done | Configure institution name, colors, Canvas URL, and stored preferences | SP1 |
| Design tokens and base templates | Done | Generate pages using consistent colors, spacing, headings, and Canvas-compatible layout patterns | SP1 |
| Canvas KB update helper | Done | Refresh the local Canvas sanitizer allowlist cache | SP1 |
| CI, build, and package scaffold | Done | Keep the MCP server testable and publishable | SP1 |

## In Progress: SP2 Optional Canvas Publishing

SP2 adds direct Canvas publishing, but keeps the manual HTML workflow intact. A professor who does not want to configure an API token can continue generating HTML and pasting it into Canvas.

| Feature | Status | What professors can do | Implementation step |
|---|---|---|---|
| Optional API token setup | In progress | Skip API setup at first, then add it later if direct publishing becomes useful | SP2.1 |
| Canvas course listing | In progress | See available Canvas courses with course ID, name, nickname, term, student count, and teacher count | SP2.2 |
| Favorite course pinning | In progress | Keep frequently used courses at the top of the course list | SP2.3 |
| Direct Canvas page publishing | In progress | Publish generated HTML directly to a Canvas page when an API token is configured | SP2.4 |
| FERPA/PII preflight | In progress | Catch obvious student IDs or grade disclosures before publishing to Canvas | SP2.5 |
| Canvas HTML validation before publish | In progress | Stop invalid HTML before it is sent to Canvas, with an override for intentional legacy content | SP2.6 |
| Title collision protection | In progress | Detect similar existing page titles and require an explicit update/create/cancel decision | SP2.7 |
| Professor-readable API errors | In progress | Show plain-language guidance for missing tokens, expired tokens, permission issues, rate limits, and unreachable Canvas URLs | SP2.8 |
| Version-control reminder | In progress | Remind users to save source HTML because Canvas page revisions are hard to diff | SP2.9 |

## Next: SP3 Accessibility Module

| Feature | Status | What professors can do | Implementation step |
|---|---|---|---|
| Color contrast checks | Next | Know whether institution colors are readable against page backgrounds | SP3.1 |
| Heading hierarchy checks | Next | Catch skipped or confusing heading levels before students see the page | SP3.2 |
| Descriptive link checks | Next | Replace vague links like "click here" with meaningful link text | SP3.3 |
| Data table checks | Next | Identify tables that need header cells | SP3.4 |
| Meaningful image alt text review | Next | Flag images that need better accessibility descriptions | SP3.5 |
| Accessibility-by-default generation | Next | Generate pages that follow accessibility rules from the start | SP3.6 |

## Coming Up

| Roadmap item | Feature | Status | What professors could do | Implementation step |
|---|---|---|---|---|
| SP4 | Design Intelligence Brain | Later | Get a design critique and suggested improvements for a generated Canvas page | SP4 |
| SP5 | Panopto integration | Later | Search, check captions, and embed Panopto videos in Canvas-safe HTML | SP5 |
| SP6 | Assignment folder ingest | Later | Drop a brief, rubric, existing shell, and style notes into a folder and have the tool build from all of it | SP6 |
| SP7 | Student persona review | Later | Have statistically grounded student personas review a page for clarity, tone, missing information, and accessibility friction | SP7 |
| SP8 | Professor philosophy knowledge base | Later | Capture teaching philosophy so generated pages match the professor's tone, priorities, and expectations | SP8 |
| Future | Community assignment standard | Idea | Share reusable course design systems, components, and assignment formats across institutions | Future |

## Feedback Requested

These are the best places for professor feedback right now:

1. **Manual vs. direct publish workflow:** Is the no-API copy/paste workflow enough for first-time users?
2. **Course listing details:** What information helps you confidently pick the right Canvas course?
3. **FERPA warnings:** What should block publishing, and what should only warn?
4. **Title collision language:** When a similar page already exists, what wording makes the choices clear?
5. **Accessibility checks:** Which accessibility warnings would you want surfaced first?
6. **Folder ingest:** Would professors use a folder-based workflow for brief, rubric, shell, and style notes?
7. **Student personas:** Would persona feedback be useful before publishing an assignment page?

## Implementation Rhythm

Each roadmap item should move through the same lightweight process:

1. **Idea:** Capture the problem and user value.
2. **Spec:** Write the behavior and design decisions.
3. **Plan:** Break implementation into small tested steps.
4. **Build:** Implement in commits with tests.
5. **Verify:** Run tests/build and, when relevant, manual Canvas checks.
6. **Share:** Update this roadmap and the current handoff file.

## Maintenance Rule

Update this roadmap whenever a feature changes status, a new implementation step is added, a professor gives feedback that changes direction, or a sub-project is completed.

## Source Documents

- SP1 plan: `docs/superpowers/plans/2026-05-03-canvas-mcp-subproject-1.md`
- SP2 spec: `docs/superpowers/specs/2026-05-04-sp2-publish-canvas-design.md`
- SP2 plan: `docs/superpowers/plans/2026-05-04-sp2-publish-canvas-design.md`
- Future additions: `docs/superpowers/specs/2026-04-29-mcp-future-additions.md`
