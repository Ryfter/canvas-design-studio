# Accessibility Overview

> **Parent:** [[../README]] | **Related:** [[Color-Contrast-Rules]], [[Semantic-HTML-in-Canvas]], [[Alt-Text-and-Media]]
>
> **Key Reference:** [Canvas Course Accessibility Checklist — Instructure Community](https://community.instructure.com/en/kb/articles/529364-canvas-course-accessibility-checklist)

---

## Why Accessibility Matters in Canvas

- **Legal requirement:** Most U.S. institutions are covered by Section 508, ADA, and WCAG 2.1 AA standards
- **Student diversity:** Students with visual, motor, cognitive, or learning differences rely on accessible design
- **Canvas built-in checker:** Canvas has a built-in accessibility checker in the RCE that flags common issues
- **DesignPLUS:** Includes 6 accessibility checkers. See [[DesignPLUS-A11y-Checkers]]

---

## WCAG 2.1 AA — Core Requirements for Canvas Content

### Perceivable

| Requirement | How it applies to Canvas HTML |
|---|---|
| Alt text for images | Every `<img>` must have `alt="descriptive text"` or `alt=""` for decorative images |
| Color not sole conveyor | Don't communicate meaning only through color (e.g., "required fields in red") |
| Contrast ratio ≥ 4.5:1 | Text on background must meet minimum contrast |
| Captions for video | All embedded video must have captions |

### Operable

| Requirement | How it applies to Canvas HTML |
|---|---|
| Keyboard accessible | Links and interactive elements (accordions, details) must be reachable by keyboard |
| No seizure-inducing content | No flashing content |
| Clear link text | Link text must describe the destination (not "click here") |

### Understandable

| Requirement | How it applies to Canvas HTML |
|---|---|
| Reading level | Appropriate language for your audience |
| Consistent navigation | Same navigation structure across all pages in a course |
| Error identification | Form errors must be clearly labeled |

### Robust

| Requirement | How it applies to Canvas HTML |
|---|---|
| Valid markup | Well-structured HTML without broken or unclosed tags |
| Semantic HTML | Use heading tags, lists, tables correctly |

---

## Canvas RCE Accessibility Checker

The built-in Canvas accessibility checker (the "person" icon in the RCE toolbar) checks for:
- Missing image alt text
- Heading structure issues
- Color contrast (basic check)
- Table header issues
- Link text problems

**Run this check before publishing any page.**

---

## Heading Hierarchy Rules

In Canvas, `<h1>` is used by Canvas for the page title. Your content starts at `<h2>`.

```
Page Title (Canvas H1 — not in your HTML)
├── <h2> Major Section
│   ├── <h3> Sub-section
│   │   └── <h4> Component or detail
│   └── <h3> Another sub-section
└── <h2> Another major section
```

**Never skip heading levels.** Going from H2 to H4 without an H3 creates confusion for screen reader users navigating by heading structure.

---

## Color Contrast Quick Reference

Minimum ratios (WCAG 2.1 AA):
- **Normal text** (< 18pt / < 14pt bold): **4.5:1**
- **Large text** (≥ 18pt / ≥ 14pt bold): **3:1**
- **UI components / icons:** **3:1**

### Verified Accessible Color Combinations from Component Library

| Text color | Background | Ratio | Status |
|---|---|---|---|
| `#085041` on `#e1f5ee` | Success callout text on bg | ~5.2:1 | ✅ AA |
| `#0C447C` on `#E6F1FB` | Info callout text on bg | ~6.8:1 | ✅ AA |
| `#633806` on `#FAEEDA` | Warning callout text on bg | ~6.1:1 | ✅ AA |
| `#791F1F` on `#FCEBEB` | Danger callout text on bg | ~6.4:1 | ✅ AA |
| `#fff` on `#0F6E56` | White on primary green | ~4.8:1 | ✅ AA |
| `#fff` on `#085041` | White on dark green | ~6.9:1 | ✅ AA |
| `#1A1A1A` on `#F4F3EF` | Body text on page bg | ~17.5:1 | ✅ AAA |

**Tool:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Common Accessibility Mistakes in Canvas HTML

### ❌ Decorative image without empty alt
```html
<!-- Wrong: decorative divider icon still needs alt="" -->
<img src="divider.png">

<!-- Correct: empty alt tells screen readers to skip it -->
<img src="divider.png" alt="">
```

### ❌ Non-descriptive link text
```html
<!-- Wrong -->
<a href="/modules">Click here</a>

<!-- Correct -->
<a href="/modules">View all course modules</a>
```

### ❌ Color as sole meaning
```html
<!-- Wrong: only color distinguishes required vs optional -->
<p style="color: red;">Required: Submit by Friday</p>

<!-- Correct: text + color -->
<p><strong>Required:</strong> <span style="color: #A32D2D;">Submit by Friday</span></p>
```

### ❌ Tables for layout
```html
<!-- Wrong: using a table just for columns -->
<table><tr><td>Left</td><td>Right</td></tr></table>

<!-- Correct: use flex div layout for non-data grids -->
<div style="display: flex;">
  <div style="flex: 1;">Left</div>
  <div style="flex: 1; margin-left: 16px;">Right</div>
</div>
```

### ❌ Skipped heading levels
```html
<!-- Wrong -->
<h2>Section</h2>
<h4>Detail</h4>  <!-- Skipped H3 -->

<!-- Correct -->
<h2>Section</h2>
<h3>Sub-section</h3>
<h4>Detail</h4>
```

---

## See Also

- [[Color-Contrast-Rules]] — Detailed contrast guidance and tools
- [[Semantic-HTML-in-Canvas]] — Correct use of headings, lists, tables
- [[Alt-Text-and-Media]] — Image and video accessibility
- [[DesignPLUS-A11y-Checkers]] — Built-in tools in DesignPLUS
- [[../01-canvas-rce/HTML-Allowlist]] — ARIA attributes that Canvas allows
