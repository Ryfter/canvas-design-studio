# Design System Principles for Canvas

> **Parent:** [[../README]] | **Related:** [[Color-and-Typography]], [[Spacing-and-Layout]], [[Component-Library]]

---

## Why a Design System for Canvas?

Most Canvas courses look different from each other — and even inconsistent within the same course. A lightweight design system solves this by defining rules that are applied consistently. The payoff:

- Students spend less cognitive energy on navigation and more on learning
- Instructors can build pages faster once the patterns are established
- Copying a course to a new semester preserves professional quality
- Your DESIGN.md feeds an AI that generates compliant HTML automatically

---

## The Canvas Design System Hierarchy

```
Institution Level (Canvas Theme Editor — admin)
  └── Brand colors, global font, account-wide CSS classes
      
Course Level (your DESIGN.md + component library)
  └── Color palette, component patterns, page templates

Page Level (individual HTML in RCE)
  └── Specific content using system components
```

This KB primarily covers the **Course Level** layer.

---

## Five Principles

### 1. Consistency Over Novelty

Use the same card pattern on every page. Use the same callout style for warnings everywhere. Novelty surprises users; consistency builds trust and reduces cognitive load.

> The goal isn't to look impressive — it's to help students find and understand content quickly.

### 2. Content First

Design should serve content, not compete with it. A well-structured heading hierarchy with plain paragraphs beats a flashy layout that obscures the learning objectives.

### 3. Work Within Canvas Constraints

Fighting Canvas's sanitizer wastes time. Design within the allowed properties. When you need more, work with your admin to extend via Theme Editor.

### 4. Mobile as a Real Use Case

University students frequently access Canvas on phones. Any layout that doesn't degrade gracefully to single-column is broken for a significant portion of your students.

### 5. Accessibility Is Non-Negotiable

WCAG 2.1 AA compliance isn't optional at most institutions. Color contrast, heading hierarchy, and alt text should be checked before publishing, not treated as optional polish.

---

## What Makes a Canvas Design System

At minimum, a Canvas design system for a course includes:

| Element | Defined in |
|---|---|
| Color palette | [[../02-design-md/DESIGN-MD-Canvas-Template]] |
| Typography scale | [[Color-and-Typography]] |
| Spacing system | [[Spacing-and-Layout]] |
| Component library | [[Component-Library]] |
| Page templates | [[../05-patterns/]] |
| Accessibility rules | [[../06-accessibility/Accessibility-Overview]] |
| Canvas constraints | [[../01-canvas-rce/HTML-Allowlist]] |

---

## Lightweight vs. Full System

For individual instructors, a lightweight system is realistic:
- 2–3 colors (primary, neutral, text)
- 1 callout pattern (reuse for all info/warnings)
- 1 card pattern
- 1 hero banner style
- Consistent heading use (H2 → H3 → H4)

For instructional design teams managing multiple courses, a full system makes sense:
- Complete DESIGN.md with all tokens
- Template library (QuickStart Wizard or manual)
- DesignPLUS institutional configuration
- Documented update process

---

## See Also

- [[../02-design-md/DESIGN-MD-Overview]] — How to formalize your system as a DESIGN.md
- [[Color-and-Typography]] — Palette and font guidance
- [[Spacing-and-Layout]] — Layout and spacing rules
- [[Component-Library]] — Ready-to-use HTML components
