# Canvas Design Knowledge Base

> **Purpose:** A living reference for creating rich, professional Canvas LMS pages — combining Google's DESIGN.md specification, Instructure's HTML/CSS rules, and the best patterns from DesignPLUS and the broader Canvas design ecosystem.
>
> **Intended use:** Read, update, and extend regularly. Feed into an AI design studio to generate Canvas-ready HTML. Maintained in Obsidian.

---

## Map of Content

### 🗂 Meta
- [[00-meta/KB-Overview]] — How this KB is organized, update cadence, versioning
- [[00-meta/Changelog]] — What changed and when
- [[00-meta/Contributing]] — How to add or update notes

### 🖊 Canvas Rich Content Editor (RCE)
- [[01-canvas-rce/RCE-Overview]] — What the RCE is and how it works
- [[01-canvas-rce/HTML-Allowlist]] — Every allowed tag, attribute, and CSS property
- [[01-canvas-rce/Canvas-Built-In-CSS-Classes]] ⭐ — Canvas's own utility classes (grid, borders, tables — no admin needed)
- [[01-canvas-rce/CSS-Inline-Strategy]] — How to get styles to survive Canvas sanitization
- [[01-canvas-rce/RCE-Limitations-and-Workarounds]] — What gets stripped, and how to work around it
- [[01-canvas-rce/Canvas-Page-Types]] — Pages, Assignments, Discussions, Syllabus — differences

### 🎨 DESIGN.md Specification
- [[02-design-md/DESIGN-MD-Overview]] — What DESIGN.md is and why it matters
- [[02-design-md/DESIGN-MD-File-Structure]] — YAML tokens + Markdown prose anatomy
- [[02-design-md/DESIGN-MD-Canvas-Template]] — A Canvas-specific DESIGN.md starter file
- [[02-design-md/DESIGN-MD-Toolchain]] — CLI lint, diff, export commands
- [[02-design-md/DESIGN-MD-AI-Integration]] — Using DESIGN.md as an AI agent prompt context

### 🏗 Design Systems for Canvas
- [[03-design-systems/Design-System-Principles]] — What makes a Canvas design system work
- [[03-design-systems/Color-and-Typography]] — Palette strategy, web-safe fonts, inline color
- [[03-design-systems/Spacing-and-Layout]] — Grid, flex, and spacing within Canvas constraints
- [[03-design-systems/Component-Library]] — Reusable HTML snippets: cards, callouts, hero, nav, etc.
- [[03-design-systems/Branding-for-Courses]] — Institution color, logo, voice

### 🛠 Tools and Integrations
- [[04-tools/DesignPLUS-Overview]] — What DesignPLUS does and how to use it
- [[04-tools/DesignPLUS-Sidebar-Guide]] — Sidebar features, keyboard shortcuts, templates
- [[04-tools/DesignPLUS-Multi-Tool]] — Rapid module and page generation
- [[04-tools/DesignPLUS-QuickStart-Wizard]] — Template-first design workflow
- [[04-tools/Other-Canvas-Design-Tools]] ⭐ — Loree Design, HowToCanvas, Fleximode, alternatives
- [[04-tools/Canvas-Theme-Editor]] — Account-level CSS/JS injection

### 🧩 Page Patterns and Templates
- [[05-patterns/Course-Home-Page]] — Hero, nav, welcome, week-at-a-glance
- [[05-patterns/Module-Overview-Page]] — Week intro, objectives, activity cards
- [[05-patterns/Assignment-Page]] — Instructions, rubric preview, resource links
- [[05-patterns/Content-Page]] — Lecture notes, reading, explainer patterns
- [[05-patterns/Callouts-and-Alerts]] — Info boxes, warnings, tips, deadlines
- [[05-patterns/Navigation-Patterns]] — In-course navigation bars and breadcrumbs
- [[05-patterns/Interactive-Elements]] — Accordions, tabs, flip cards (within Canvas limits)

### ♿ Accessibility
- [[06-accessibility/Accessibility-Overview]] — WCAG 2.1 requirements in Canvas context
- [[06-accessibility/Color-Contrast-Rules]] — Minimum ratios, tools to check
- [[06-accessibility/Semantic-HTML-in-Canvas]] — Heading hierarchy, landmark roles
- [[06-accessibility/Alt-Text-and-Media]] — Images, video, audio in Canvas
- [[06-accessibility/DesignPLUS-A11y-Checkers]] — Built-in accessibility tools in DesignPLUS

### 📚 External Resources
- [[07-resources/Official-Canvas-Links]] — Instructure docs, HowToCanvas tutorials, community, API
- [[07-resources/Inspiration-and-Showcases]] ⭐ — U Michigan, Cornell, Baylor, BC, USask — real examples with analysis
- [[07-resources/Official-Canvas-Links#DESIGN.md External Links]] — GitHub repo, Stitch, spec docs
- [[07-resources/Official-Canvas-Links#DesignPLUS Links]] — Cidi Labs docs, showcase, training
- [[07-resources/Official-Canvas-Links#Tools and Utilities]] — CSS inliners, color checkers, font resources

---

## Quick Reference

| Task | Go to |
|---|---|
| Know what CSS is allowed | [[01-canvas-rce/HTML-Allowlist]] |
| Use responsive columns without admin | [[01-canvas-rce/Canvas-Built-In-CSS-Classes]] |
| Generate a DESIGN.md for your course | [[02-design-md/DESIGN-MD-Canvas-Template]] |
| Build a course home page | [[05-patterns/Course-Home-Page]] |
| Fix an accessibility issue | [[06-accessibility/Accessibility-Overview]] |
| Add a callout box | [[05-patterns/Callouts-and-Alerts]] |
| Understand DesignPLUS sidebar | [[04-tools/DesignPLUS-Sidebar-Guide]] |
| See real well-designed Canvas courses | [[07-resources/Inspiration-and-Showcases]] |
| Find tutorials for specific HTML effects | [[04-tools/Other-Canvas-Design-Tools]] |
| Compare DesignPLUS alternatives | [[04-tools/Other-Canvas-Design-Tools]] |

---

*Last updated: 2026-04-28 | [[00-meta/Changelog]]*
