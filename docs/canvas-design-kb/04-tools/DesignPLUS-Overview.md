# DesignPLUS Overview

> **Parent:** [[../README]] | **Related:** [[DesignPLUS-Sidebar-Guide]], [[DesignPLUS-Multi-Tool]], [[DesignPLUS-QuickStart-Wizard]]
>
> **Official Resources:**
> - [Cidi Labs DesignPLUS Product Page](https://cidilabs.com/landing/design-tools/)
> - [DesignPLUS Support Portal](https://support.cidilabs.com/knowledgebase)
> - [DesignPLUS Design Showcase](https://showcase.cidilabs.com/)
> - [Cidi Labs Video Hub](https://learnmore.cidilabs.com)

---

## What Is DesignPLUS?

DesignPLUS is a commercial Canvas LMS add-on by [Cidi Labs](https://cidilabs.com/) — an edtech company founded by former educators. It extends Canvas with four integrated tools:

1. **DesignPLUS Sidebar** — A right-panel tool that adds design elements to pages without requiring HTML or CSS knowledge
2. **Multi-Tool** — Rapid course scaffolding: create modules, pages, assignments, discussions, quizzes, and headers in bulk
3. **Upload/Embed Image Tool** — In-Canvas image editing with Pexels/Unsplash integration
4. **QuickStart Wizard** — Template-first design workflow for non-technical users

Used by **600+ institutions** including University of Colorado Boulder, Utah State, University of Florida, and Boise State University.

---

## Why It Matters for This KB

DesignPLUS shows what is *possible* in Canvas course design — it's the benchmark for quality. Understanding what DesignPLUS does (and how) helps you:

1. **Replicate its patterns manually** via the Component Library when DesignPLUS isn't available
2. **Use DesignPLUS more effectively** when it is available
3. **Understand the HTML DesignPLUS generates** and modify it

DesignPLUS works by injecting JavaScript and CSS at the Canvas account level (bypassing the RCE sanitizer), then writing structured HTML into page content. Much of what it does can be replicated with carefully crafted inline HTML — the components in this KB are derived from that approach.

---

## How DesignPLUS Extends Canvas

| Capability | Without DesignPLUS | With DesignPLUS |
|---|---|---|
| Box shadows | ❌ Stripped | ✅ Via account JS/CSS |
| Animated elements | ❌ Stripped | ✅ Via account JS/CSS |
| True tab navigation | ❌ No JS | ✅ Via account JS |
| Interactive accordions | ⚠️ `<details>` workaround | ✅ Styled, consistent |
| Flip cards | ❌ | ✅ |
| Custom fonts | ⚠️ Lato (theme-loaded) | ✅ Institution-configured |
| Template library | ❌ Build from scratch | ✅ Hundreds of templates |
| Consistency at scale | 🔧 Manual discipline | ✅ Enforced by system |
| Accessibility checks | 🔧 Manual | ✅ 6 built-in checkers |

---

## Installation

DesignPLUS installs at the Canvas admin level via LTI. It is **not** something individual instructors can install — it requires an institutional purchase and admin configuration.

- Delivery: SaaS, Canvas-integrated
- Integration method: LTI + custom CSS/JS files at account level
- Access control: Can be scoped to sub-accounts or restricted by role

---

## Current Version Notes (2026)

- The **Legacy DesignPLUS Sidebar** was decommissioned December 31, 2025
- The **New DesignPLUS Sidebar** is the current version (launched fully in 2025)
- Content built with the legacy sidebar needs migration — an upgrade tool is built into the new sidebar
- The new sidebar features improved visual organization with clear iconography and better categorization

---

## Pricing

DesignPLUS is sold as an annual SaaS subscription priced by student FTE (higher education) or student count (K-12). Implementation and training fees apply in year one.

[Contact Cidi Labs](https://cidilabs.com/contact-cidi-labs/) for current pricing.

---

## What DesignPLUS Cannot Do

- It cannot override Canvas's own UI (navigation, gradebook, etc.)
- It doesn't work outside the Canvas RCE context
- Content must be updated/migrated when major sidebar versions change
- It requires institutional buy-in — individual instructors at non-subscribing institutions cannot use it

---

## See Also

- [[DesignPLUS-Sidebar-Guide]] — Feature-by-feature sidebar reference
- [[DesignPLUS-Multi-Tool]] — Module and assignment bulk creation
- [[DesignPLUS-QuickStart-Wizard]] — Template-first workflow
- [[../03-design-systems/Component-Library]] — Manual HTML equivalents
- [[../07-resources/DesignPLUS-Links]] — All official training and documentation links
