# MCP Future Additions — Planning Notes

**Status:** Not started. Do not implement until a full brainstorm + spec cycle is run.  
**Parent spec:** `2026-04-29-canvas-mcp-design.md`

---

## Build Order

| # | Addition | Why this order |
|---|---|---|
| Sub-project 3 | Accessibility Module | Improves every page generated. Lower complexity, highest impact. |
| Sub-project 4 | Canvas API Publish | Core workflow completion (already spec'd in parent) |
| Sub-project 5 | Design Intelligence Brain | Elevates output quality across all generation |
| Sub-project 6 | Panopto Integration | Optional module, depends on API auth confirmation |
| Future | Community Assignment Standard | Long-term vision, needs ecosystem buy-in |

---

## Sub-project 3 — Accessibility Module

### What it is
WCAG 2.1 AA checks baked into the validation layer and generation pipeline. Every page generated is accessible by default — not as an afterthought.

### Where it lives
Three places: wizard (color validation at setup), `validate_canvas_html` (extended checks), `generate_canvas_page` (accessible output by default).

### Wizard addition
After professor enters primary color, immediately compute contrast against white:
```
? Primary brand color: #0033A0
  ✓ Contrast on white: 7.2:1 — passes WCAG AA (4.5:1 required)

? Primary brand color: #6699CC
  ⚠ Contrast on white: 3.1:1 — fails WCAG AA for body text.
  Consider a darker shade. Proceed anyway? (Y/n)
```

### Extended `validate_canvas_html` checks

| Check | Rule | Detection method |
|---|---|---|
| Color contrast | 4.5:1 body text, 3:1 large text | Parse inline style color pairs, compute ratio |
| Meaningful alt text | Content images need descriptive alt | Flag non-empty src with `alt=""` (heuristic) |
| Heading hierarchy | No skipped levels (H2→H4 without H3) | Parse heading tags in document order |
| Descriptive links | No "click here", "here", "read more" | String match on `<a>` text content |
| Table headers | Data tables need `<th>` | Flag `<table>` without any `<th>` |
| Video captions | Panopto embeds need captions | Flag embeds where `hasCaptions: false` |

Accessibility violations are **advisory** (warn but don't block) — professor decides whether to fix.

### Generation pipeline defaults
- Hero image `alt` derived from assignment topic, never blank
- All link text descriptive by construction
- Heading hierarchy H2 → H3 → H4, never skipped
- Institution colors pre-validated at wizard time

### Things to confirm before spec
- `wcag-contrast` npm package for contrast ratio computation
- Whether advisory vs. blocking is the right call (recommend advisory)
- BSU accessibility policy — does it go beyond WCAG 2.1 AA?

---

## Sub-project 5 — Design Intelligence Brain

### What it is
A design-aware layer that critiques and elevates generated Canvas pages. Goes beyond "is this valid HTML" to "is this good design." Powered by a curated design principles KB + Claude API reasoning.

### The problem it solves
The current generation pipeline produces correct, branded pages — but they follow one template. The Design Brain makes pages feel intentionally designed: varied layouts, thoughtful visual hierarchy, creative use of color, better typography rhythm, spatial awareness. The goal is Canvas pages that feel like they were made by a skilled designer, not a template engine.

### How it fits in
New tool: `critique_canvas_page`

**Input:** `{ html: string, context: string }` (context = what the page is for)

**Process:**
1. Loads design principles KB (`src/kb/design-principles.md`) — curated rules on visual hierarchy, whitespace, color usage, typography, component selection
2. Sends HTML + context to Claude API with a design-critic prompt
3. Returns scored critique + specific suggestions

**Output:**
```ts
{
  score: number,          // 0-100 overall design quality
  strengths: string[],
  improvements: Array<{
    area: string,         // e.g. "Visual hierarchy", "Whitespace", "Color"
    issue: string,
    suggestion: string,
    htmlFix?: string      // optional: the actual fixed HTML snippet
  }>
}
```

**Second tool: `redesign_canvas_page`**
Takes the critique output and applies all fixes automatically, returning improved HTML.

### Design KB (`src/kb/design-principles.md`)
A curated file covering:
- Visual hierarchy: size, weight, color, spacing as signals
- Whitespace: breathing room between sections, card padding rhythm
- Color usage: primary for navigation/CTAs, secondary for accents/warnings, neutrals for backgrounds
- Typography: scale ratios, line height, label styles
- Component selection: when to use cards vs. callouts vs. tables
- Canvas-specific: working within the ~860px content width, mobile-first thinking
- Accessibility + design: how good design and accessibility reinforce each other

### Creative shells vision
The Brain unlocks a new workflow:
> *"Generate a creative Canvas home page for ITM 370. Make it visually distinctive — not the standard template."*

Claude uses the Brain to iterate: generate → critique → redesign → critique again until score exceeds threshold. The result is pages that feel handcrafted.

### Things to confirm before spec
- Claude API integration: use `@anthropic-ai/sdk` (already in dependencies)
- Model to use for critique: claude-sonnet-4-6 (balance of quality + speed)
- Whether critique is synchronous (blocking) or streamed
- Threshold score for "good enough" (suggest 75/100)

---

## Sub-project 6 — Panopto Integration (Optional Module)

### What it is
Optional MCP module for embedding Panopto videos in Canvas pages. 100% opt-in.

### New tool: `embed_panopto_video`

**Input:**
```ts
{
  videoId?: string,
  searchQuery?: string,
  placement: "hero" | "inline" | "sidebar"
}
```

**Process:**
1. Search or fetch video metadata from Panopto API
2. Check captions status — warn if missing (accessibility)
3. Generate accessible iframe embed with fallback link

**Output:**
```ts
{
  embedHtml: string,
  hasCaptions: boolean,
  videoTitle: string,
  duration: string
}
```

**Accessibility gate:** If no captions, Claude warns professor before embedding.

### Auth
API key confirmed. Stored in `institution.json` under optional `panopto` block.
Wizard gains optional Panopto section (skippable).

### Things to confirm before spec
- BSU Canvas whitelist for Panopto iframe embeds
- Panopto embed URL format (session ID → embed URL)
- API key header format

---

## Future Vision — Community Assignment Standard

### The idea
An open-source, community-maintained specification for AI-driven Canvas course design. Think `llms.txt` meets `Design.md` — a standard format that any AI can read to understand how to generate course content for a given institution or discipline.

### Why it matters
Right now every institution has to build their own design system from scratch. A community standard would let:
- Institutions share and inherit design systems
- AI tools interoperate around a common format
- Best practices (accessibility, pedagogy, UX) get codified once and shared everywhere
- A marketplace of course shells, assignment templates, and component libraries

### What it might look like
```
/course-design-standard/
├── institution.design.md     ← brand tokens, fonts, colors
├── pedagogy.md               ← course structure philosophy
├── components/               ← shared component definitions
│   ├── assignment-page.md
│   ├── module-overview.md
│   └── resource-list.md
└── accessibility.md          ← institution accessibility policy
```

### Status
Way down the line. Needs ecosystem buy-in from other institutions and tools.
Start by dogfooding the format internally at BSU, then open-source once proven.

---

## Other Gaps to Address (No Sub-project Yet)

### Hero Image Upload Automation
Currently professors generate a hero image in ChatGPT, upload it to Canvas Files manually, and paste the URL back. The Canvas Files API supports uploading images directly. A `upload_canvas_image` tool would complete the loop — professor drops an image file path, tool uploads it and returns the Canvas-hosted URL, which gets injected into the page automatically.

**Priority:** Medium. Adds significant polish to the workflow.

### Template Library
Currently one template: two-column dashboard. A library of 4-5 templates would cover the full range of Canvas page types:
- Module overview page
- Course home page
- Resource list page
- Discussion prompt page
- Syllabus page

**Priority:** Medium. Unlocks the "creative shells" vision.

### Batch Generation
Generate an entire course's worth of pages in one prompt. Professor provides a course outline; the MCP generates all pages consistently branded and publishes them in sequence.

**Priority:** Low until single-page workflow is proven. High value once it is.
