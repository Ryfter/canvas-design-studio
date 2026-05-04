# MCP Future Additions — Planning Notes

**Status:** Not started. Do not implement until a full brainstorm + spec cycle is run.  
**Parent spec:** `2026-04-29-canvas-mcp-design.md`  
**Last updated:** 2026-05-04 — build order revised after Six Hats review; three new sub-projects added (SP6, SP7, SP8)

> Sub-projects 1 is complete. The order below reflects the revised priority from the Six Hats session — Canvas API Publish (SP2) moved ahead of Accessibility (SP3) because it completes the core professor workflow. The Design Brain moved from SP4 to SP5 to make room for the Assignment Folder Ingest (SP6) which unlocks the "meet professors where they are" workflow.

---

## Build Order

| # | Addition | Why this order |
|---|---|---|
| SP1 | MCP Server Core | ✅ DONE — v0.1.0 |
| SP2 | Canvas API Publish | Completes the core workflow — prompt → live URL. Spec already written in parent. |
| SP3 | Accessibility Module | Improves every page generated. Lower complexity, highest impact after core flow works. |
| SP4 | Design Intelligence Brain | Elevates output quality. Runs through host AI — no extra API key. Needs the core working well first. |
| SP5 | Panopto Integration | Optional module. Depends on API auth and BSU whitelist confirmation. |
| SP6 | Assignment Folder Ingest | Professor drops brief/rubric/shell into a folder — MCP reads all, builds + recommends. |
| SP7 | Student Personas | Statistically generated personas (NOT archetypes) review generated pages. Uses Kevin's existing generator. |
| SP8 | Professor Philosophy KB | Interview-built KB that steers tone, rubrics, persona priorities. Optional. Grows over time. Last because it needs all other tools working well before it can meaningfully steer them. |
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

## Sub-project 6 — Assignment Folder Ingest *(added 2026-05-04)*

### What it is
Professor drops their raw materials into a structured folder. The MCP reads everything, builds the Canvas page, and returns improvement recommendations for the source materials alongside the HTML. The tool meets professors where they are — they already have a brief, a rubric, and often a rough outline.

### Folder structure
```
assignments/
└── 16.06-ignite-talk/
    ├── brief.md          ← raw assignment instructions (any format)
    ├── rubric.md         ← grading rubric
    ├── shell.md          ← existing page outline (optional)
    └── style-notes.md    ← layout/tone preferences (optional)
```

### What the tool returns
1. **Generated HTML** — Canvas-safe assignment page
2. **Brief recommendations** — student-friendliness, clarity, missing context
3. **Rubric recommendations** — alignment with brief, missing criteria, ambiguous language
4. **Shell recommendations** — structure, flow, missing sections

Professor can act on recommendations and re-run. Iterative refinement built into the workflow.

### Why this order (after SP5)
Panopto auth depends on external confirmation. Assignment Folder Ingest is entirely self-contained and directly extends the professor's existing workflow. Professors already have this material — they shouldn't have to reformat it for the AI.

### Things to confirm before spec
- Whether to watch the folder (filesystem events) or require an explicit tool call
- How to handle missing files gracefully (brief required; rubric/shell/style-notes optional)
- Where to write output (alongside source files, or to a separate `output/` folder)

---

## Sub-project 7 — Student Personas *(added 2026-05-04)*

### What it is
After a page is generated, AI-powered student personas review it from multiple perspectives and return a structured report: confusion points, missing information, tone flags, and accessibility issues each persona would encounter.

### Persona approach: statistically grounded, not archetypes
Do NOT use generic archetypes (The Overwhelmed Student, The High Achiever, etc.).

**Use Kevin's existing persona generator** — a prompt + spreadsheet system that generates personas based on per capita distributions, including race, disability status, and socioeconomic factors. This grounds the review in reality rather than stereotype.

**Volume matters:** 5–10 personas per review, not 1–2. Diversity and volume surface issues that a single-perspective review misses.

### What personas return per page
- **Confusion points** — "I don't understand what format to submit in"
- **Missing information** — "How long should the video be?"
- **Tone flags** — "This feels intimidating" / "The instructions feel vague"
- **Accessibility issues** — issues the persona would encounter (e.g., screen reader user, color blind, low English proficiency)

### Output format
A persona review report alongside the generated HTML. Professor decides what to act on — no automatic changes.

### Future extension
Optional saved persona database. Professors can save personas based on real students they've known — building a personal, grounded library over time. This makes reviews increasingly accurate and personal.

### Things to confirm before spec
- Integration point for Kevin's existing persona generator
- Whether personas are generated fresh per review or pulled from a saved database
- Whether to surface personas one at a time or all at once in the report

---

## Sub-project 8 — Professor Philosophy Knowledge Base *(added 2026-05-04)*

### What it is
A growing, interview-built knowledge base that captures the professor's teaching philosophy and steers all content generation. When present, it makes every tool output feel more personal and intentional. When absent, tools work fine without it.

### Why last
The philosophy layer needs all other tools working well before it can meaningfully steer them. Build the engine first, then add the soul.

### How it works
- **First time:** Claude conducts a structured interview — questions about teaching beliefs, course goals, student expectations, grading philosophy, communication style, what good work looks like
- **Answers are synthesized** into `professor-philosophy.md` stored alongside `institution.json` at `~/.canvas-design-mcp/`
- **Over time:** Claude surfaces new questions when it notices gaps or new topics arise. The KB deepens naturally
- **Optional throughout** — professor can always skip or defer

### Entry points (not just Q&A)
- Teaching frameworks: Bloom's Taxonomy, UDL, constructivism, pedagogy vs. andragogy
- Favorite quotes the professor uses or believes in
- Reference materials, books, articles they return to
- Personal teaching stories or moments that shaped their approach

### What it steers
- **Tone** of assignment pages (rigorous vs. encouraging vs. Socratic)
- **Rubric framing** — how criteria are described and weighted
- **Student persona priorities** — which student types to weight most heavily
- **Design Brain choices** — layout emphasis, visual language
- **Persona review lens** — what would this professor's students struggle with?

### Interview design principles
- Questions come WITH examples so professors understand what a good answer looks like — never feel like homework
- Start small (5–10 questions), expand as the professor uses the tool more
- The KB is theirs — export, edit, or delete it at any time

### Example questions
- "What do you want students to feel when they open one of your assignment pages?"
- "How do you think about the relationship between instructions and creativity?"
- "What does a student who truly succeeds in your course look like?"

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
