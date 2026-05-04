# KB Overview

> **Parent:** [[../README]]

This knowledge base is structured around three converging concerns:

1. **Canvas constraints** — what HTML/CSS you can actually use inside the Canvas RCE
2. **Design systems** — how to define and maintain a consistent visual language
3. **Tools and patterns** — what DesignPLUS and similar tools make possible, and how to replicate or extend those capabilities manually or with AI assistance

---

## Folder Structure

```
canvas-design-kb/
├── README.md                  ← This file (MOC)
├── 00-meta/                   ← KB management
├── 01-canvas-rce/             ← How Canvas handles HTML/CSS
├── 02-design-md/              ← Google DESIGN.md specification
├── 03-design-systems/         ← Design system principles and components
├── 04-tools/                  ← DesignPLUS and other tools
├── 05-patterns/               ← Page and component templates
├── 06-accessibility/          ← WCAG and inclusive design
└── 07-resources/              ← External links and references
```

---

## Update Cadence

| Area | When to review |
|---|---|
| HTML Allowlist | When Canvas releases a major update |
| DesignPLUS guides | When Cidi Labs releases a new sidebar version |
| DESIGN.md spec | Monthly — spec is in alpha, changes frequently |
| Patterns/templates | Ongoing — add when you build something useful |
| Accessibility | When WCAG guidelines update |

---

## How to Use in an AI Design Studio

This knowledge base is designed to be ingested as context for an AI assistant generating Canvas-ready HTML. The recommended workflow:

1. Load [[02-design-md/DESIGN-MD-Canvas-Template]] as your `DESIGN.md`
2. Feed [[01-canvas-rce/HTML-Allowlist]] as a hard constraint file
3. Reference [[05-patterns/Component-Library]] for the component vocabulary
4. Ask the AI to generate HTML matching a specific [[05-patterns/]] template
5. Validate with the [[06-accessibility/Color-Contrast-Rules]] checker

---

## Key Decisions Documented Here

- **Why inline styles?** Canvas strips `<style>` tags from the RCE. All styling must be inline. See [[01-canvas-rce/CSS-Inline-Strategy]].
- **Why DESIGN.md?** It provides a machine-readable + human-readable design contract that an AI can reliably follow. See [[02-design-md/DESIGN-MD-Overview]].
- **Why not just use DesignPLUS?** DesignPLUS requires an institutional license. This KB enables high-quality design without it, and can complement it when available. See [[04-tools/DesignPLUS-Overview]].

---

*[[Changelog]] | [[Contributing]]*
