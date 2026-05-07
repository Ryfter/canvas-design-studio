# Canvas Design Studio Roadmap

**Last updated:** 2026-05-07 (SP5 complete)  
**Audience:** Professors, instructional designers, and teaching collaborators  
**Purpose:** A shareable overview of what Canvas Design Studio can do now, what is coming next, and where professor feedback would help.

Canvas Design Studio helps professors create polished Canvas LMS pages without hand-writing Canvas-safe HTML. The easiest workflow stays simple: generate HTML, paste it into Canvas, and keep teaching. Direct Canvas publishing is being added as an optional convenience for users who want it.

## Where We Are

| Stage | Status | What it means |
|---|---|---|
| Generate and paste | Available now | Create Canvas-ready HTML and paste it into Canvas manually. No API setup required. |
| Validate before use | Available now | Check whether HTML will survive Canvas's editor rules. |
| Publish directly to Canvas | Available now | Let the tool publish pages for you after optional Canvas API setup. |
| Accessibility checks | Available now | WCAG 2.1 AA advisory checks built into color setup, page generation, publishing, and validation. |
| Design critique and redesign | Available now | Scored visual design feedback with prioritized findings, mechanical HTML fixes, and KB context for deeper redesign. |

## Available Now

| Feature | What professors can do |
|---|---|
| Canvas-safe page generation | Turn assignment instructions into a polished Canvas page. |
| Manual paste workflow | Try the tool without Canvas API credentials or advanced setup. |
| HTML validation | Catch common Canvas editor problems before students see the page. |
| Institution styling | Use consistent colors, spacing, headings, and Canvas-compatible layout patterns. |
| Knowledge base refresh | Keep the tool aligned with Canvas editor rules as they change. |

## Now Available (v0.4)

SP2 added the Canvas connection layer, course picker, and direct publishing. SP3 added advisory WCAG 2.1 AA checks across color setup, page generation, publishing, and validation. SP4 added visual design critique and mechanical redesign.

| Feature | What professors can do |
|---|---|
| Optional Canvas API setup | Start simple with generate-and-paste, then add direct publishing when ready. |
| Course picker | See Canvas courses with student count, teacher list, and term — enough to pick the right one. |
| Favorite courses | Pin frequently used course IDs to the top of the list. |
| Direct page publishing | Send generated HTML directly into a Canvas page with one command. |
| FERPA preflight | Catch obvious student IDs or grade disclosures before publishing. |
| Title collision protection | Avoid accidentally overwriting or duplicating an existing Canvas page. |
| Plain-language Canvas errors | Understand what went wrong without decoding raw API messages. |
| Accessibility checks (WCAG 2.1 AA) | Get advisory warnings for color contrast, heading structure, link text, table headers, and alt text — at every stage. |
| Design critique | Get a scored visual design report (0–100) with strengths and prioritized findings. Quick mode runs 8 structural checks instantly; comprehensive mode includes design KB context for deeper analysis. |
| Design redesign | Apply mechanical fixes automatically (font floor, hero image placeholders) and get a list of remaining findings for Claude to address. Accessibility check runs on the output automatically. |

## Now Available (v0.5)

SP5 added Panopto video integration. Professors with Panopto access can now search their lecture library, generate accessible video embeds, and download caption transcripts directly from Claude.

| Feature | What professors can do |
|---|---|
| Panopto video search | Browse or search your full Panopto lecture library — titles, durations, captions status — without leaving Claude. Requires Panopto API credentials. |
| Accessible video embeds | Generate Canvas-safe embed HTML for any Panopto video: iframe embed for whitelisted institutions, or an accessible fallback link when not whitelisted. Works without API credentials. |
| Caption transcript download | Download Panopto captions, strip timestamps, and save as a plain-text Markdown transcript to your local KB. Build a searchable lecture knowledge base over time. Requires API credentials. |
| Video captions check | Accessibility validation now flags Panopto iframes without `captions=true` in the embed URL. |

## Coming Next

| Feature | What professors could gain |
|---|---|
| Assignment folder ingest | Drop in a brief, rubric, existing shell, and style notes; let the tool build from all of it. |
| Student persona review | Get feedback from realistic student perspectives before publishing. |
| Teaching philosophy profile | Let the tool learn a professor's tone, priorities, and expectations over time. |

## Feedback Requested

These are the best questions to ask other professors right now:

1. Is the no-API generate-and-paste workflow enough for first-time users?
2. What course details would help you confidently pick the right Canvas course?
3. What FERPA warnings should block publishing, and what should only warn?
4. If a similar Canvas page already exists, what wording makes Update, Create New, and Cancel clear?
5. Which accessibility warnings would you want surfaced first?
6. After running a design critique, would you want the tool to automatically apply all mechanical fixes, or would you prefer to review each one?
7. Would student-persona feedback help you improve an assignment before publishing it?

## How This Roadmap Is Maintained

This shareable roadmap is updated whenever a feature changes status or professor feedback changes the direction. A more detailed implementation roadmap lives in `docs/technical-roadmap.md`.
