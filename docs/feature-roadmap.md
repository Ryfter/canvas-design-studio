# Canvas Design Studio Roadmap

**Last updated:** 2026-05-04  
**Audience:** Professors, instructional designers, and teaching collaborators  
**Purpose:** A shareable overview of what Canvas Design Studio can do now, what is coming next, and where professor feedback would help.

Canvas Design Studio helps professors create polished Canvas LMS pages without hand-writing Canvas-safe HTML. The easiest workflow stays simple: generate HTML, paste it into Canvas, and keep teaching. Direct Canvas publishing is being added as an optional convenience for users who want it.

## Where We Are

| Stage | Status | What it means |
|---|---|---|
| Generate and paste | Available now | Create Canvas-ready HTML and paste it into Canvas manually. No API setup required. |
| Validate before use | Available now | Check whether HTML will survive Canvas's editor rules. |
| Publish directly to Canvas | In progress | Let the tool publish pages for you after optional Canvas API setup. |
| Accessibility and design review | Coming next | Add stronger checks for readability, accessibility, and page quality. |

## Available Now

| Feature | What professors can do |
|---|---|
| Canvas-safe page generation | Turn assignment instructions into a polished Canvas page. |
| Manual paste workflow | Try the tool without Canvas API credentials or advanced setup. |
| HTML validation | Catch common Canvas editor problems before students see the page. |
| Institution styling | Use consistent colors, spacing, headings, and Canvas-compatible layout patterns. |
| Knowledge base refresh | Keep the tool aligned with Canvas editor rules as they change. |

## Being Built Now

Current build focus: the Canvas connection layer and professor-facing warning messages are in place; the next piece is course selection.

| Feature | What professors will be able to do |
|---|---|
| Optional Canvas API setup | Start simple, then add direct publishing later if useful. |
| Course picker | See your Canvas courses with enough detail to choose the right one. |
| Favorite courses | Pin frequently used courses to the top. |
| Direct page publishing | Send generated HTML directly into a Canvas page. |
| FERPA preflight | Catch obvious student IDs or grade disclosures before publishing. |
| Title collision protection | Avoid accidentally overwriting or duplicating an existing Canvas page. |
| Plain-language Canvas errors | Understand what went wrong without decoding API messages. |

## Coming Next

| Feature | What professors could gain |
|---|---|
| Accessibility checks | Better warnings for color contrast, heading structure, link text, tables, and images. |
| Design critique | Suggestions to make pages clearer, more polished, and less template-like. |
| Video support | Easier, accessible Panopto video embeds when institutional setup allows it. |
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
6. Would you use a folder-based workflow for a brief, rubric, shell, and style notes?
7. Would student-persona feedback help you improve an assignment before publishing it?

## How This Roadmap Is Maintained

This shareable roadmap is updated whenever a feature changes status or professor feedback changes the direction. A more detailed implementation roadmap lives in `docs/technical-roadmap.md`.
