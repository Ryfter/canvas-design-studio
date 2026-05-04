# Other Canvas Design Tools

> **Parent:** [[../README]] | **Related:** [[DesignPLUS-Overview]], [[Canvas-Theme-Editor]]

---

## Loree Design (SoaringEd)

**The most direct DesignPLUS competitor.**

[soaringed.com/loree-design](https://soaringed.com/loree-design)

Loree is a zero-code LTI 1.3 tool that lets instructors build responsive, multi-column Canvas pages entirely inside Canvas — no HTML knowledge required. Key differentiators vs. DesignPLUS:

| Feature | DesignPLUS | Loree |
|---|---|---|
| Multi-column layouts | ✅ | ✅ |
| Interactive elements (tabs, accordions, flip cards) | ✅ | ✅ |
| Google Fonts integration | ⚠️ Institutional config | ✅ Built-in |
| Custom brand colors | ✅ Institutional config | ✅ Per-institution |
| H5P integration | ❌ | ✅ |
| Canvas Studio integration | ❌ | ✅ |
| Kaltura integration | ❌ | ✅ |
| Template library | ✅ Hundreds | ✅ Institution-wide |
| API-based save to Canvas | ✅ | ✅ |
| LTI version | LTI (legacy) | LTI 1.3 |

**When Loree might be preferred:** Institutions already using H5P, Canvas Studio, or Kaltura heavily, or wanting tighter Google Fonts support out of the box.

**When DesignPLUS might be preferred:** Institutions already invested in DesignPLUS training and templates, or using the Multi-Tool for bulk course scaffolding (Loree focuses on page design, not course structure).

---

## HowToCanvas (Sean Nufer's Tutorial Site)

[howtocanvas.com/create-amazing-pages-in-canvas](https://www.howtocanvas.com/create-amazing-pages-in-canvas)

Not a tool — a practitioner tutorial library. Sean Nufer's site is the single best independent resource for Canvas HTML design. Covers:

| Tutorial | URL |
|---|---|
| Page separations + Canvas border classes | https://www.howtocanvas.com/create-amazing-pages-in-canvas/page-separations |
| Canvas Theme Editor CSS guide | https://www.howtocanvas.com/theme-editor/css-theme-editor |
| Accordion menus (simple) | https://www.howtocanvas.com/create-amazing-pages-in-canvas/accordions |
| Accordion menus (advanced) | https://www.howtocanvas.com/create-amazing-pages-in-canvas/advanced-accordions |
| Background/pattern effects | https://www.howtocanvas.com/create-amazing-pages-in-canvas/background-css |
| Dynamic image effects | https://www.howtocanvas.com/create-amazing-pages-in-canvas/dynamic-images |
| HTML image maps | https://www.howtocanvas.com/create-amazing-pages-in-canvas/html-image-map |
| Timeline creation | https://www.howtocanvas.com/create-amazing-pages-in-canvas/timeline |
| Interactive photo slideshow | https://www.howtocanvas.com/create-amazing-pages-in-canvas/slideshow |
| Styled discussion posts | https://www.howtocanvas.com/create-amazing-pages-in-canvas/styled-discussion-post |
| Responsive YouTube iframes | https://www.howtocanvas.com/create-amazing-pages-in-canvas/responsive-youtube-iframes |

> Key discovery from this site: Canvas ships with built-in utility CSS classes (`border`, `border-trbl`, `border-round`, `content-box`, `grid-row`, `col-md-*`) that instructors can use without admin access. See [[../01-canvas-rce/Canvas-Built-In-CSS-Classes]].

---

## Fleximode / Manukau Canvas Cheat Sheet

[fleximode.manukau.ac.nz/cheat-sheet-for-canvas](https://fleximode.manukau.ac.nz/cheat-sheet-for-canvas/)

A concise, practitioner-maintained HTML cheat sheet with copy-paste snippets. Particularly useful for the responsive grid examples using Canvas's built-in classes. Includes:
- Basic and rounded-corner box patterns
- Responsive 2 and 3 column layouts using `content-box` / `grid-row` / `col-*`
- `ic-Table` and `ic-Table--hover-row` table patterns
- Responsive table wrapper using `overflow-x: auto`
- Color palette reference (institution-specific but illustrative)

---

## Johns Hopkins Engineering Design Guide

[support.cmts.jhu.edu — Advanced Course Design Options for Canvas](https://support.cmts.jhu.edu/hc/en-us/articles/7794555282445-Advanced-Course-Design-Options-for-Canvas)

A thorough institutional guide covering HTML patterns that don't require DesignPLUS:
- Accordion (with accessibility notes)
- Tabs layout
- Blockquotes
- Styled button links
- Canvas HTML allowlist reference

Good model for what a well-documented institutional design guide looks like.

---

## Canvas Commons

[commons.instructure.com](https://commons.instructure.com)

Canvas's built-in content sharing marketplace. Relevant for design purposes:
- Search for "course template" to find importable course shells with pre-built designs
- Look for institution-specific template packages
- Cornell's sample layouts (minimalist, module-only, custom homepage) are available here
- BC Digital Learning Design Toolkit templates importable via Commons

---

## Canvas GitHub (Open Source)

[github.com/instructure/canvas-lms](https://github.com/instructure/canvas-lms)

The Canvas LMS source code. Useful for:
- Finding the actual CSS class definitions (search for `ic-Table`, `grid-row`, `content-box`)
- Understanding what HTML gets sanitized and why
- Tracking upcoming feature changes via pull requests
- Verifying allowlist behavior at the code level

---

## See Also

- [[DesignPLUS-Overview]] — Primary commercial Canvas design tool
- [[Canvas-Theme-Editor]] — Admin-level CSS/JS injection
- [[../01-canvas-rce/Canvas-Built-In-CSS-Classes]] — Built-in CSS classes (no admin needed)
- [[../07-resources/Official-Canvas-Links]] — All external links consolidated
