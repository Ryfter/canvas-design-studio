# DesignPLUS Multi-Tool

> **Parent:** [[../README]] | **Related:** [[DesignPLUS-Overview]], [[DesignPLUS-Sidebar-Guide]]
>
> **Official Docs:** [Cidi Labs Multi-Tool Guide](https://support.cidilabs.com/knowledgebase)

---

## What It Does

The Multi-Tool is the time-saving centerpiece of DesignPLUS for course *scaffolding* (as opposed to the Sidebar which handles *design*). It uses the Canvas API to create module structures in bulk — without clicking through the Canvas UI repeatedly.

**What the Multi-Tool creates:**
- Module text headers
- Pages (with optional template applied)
- Assignments
- Discussions
- Quizzes (Classic and New)
- Module item structures

The result: a complete course structure in **minutes** instead of hours.

---

## Accessing the Multi-Tool

The Multi-Tool is hidden from the course navigation by default:

1. Go to **Course Settings** → **Navigation** tab
2. Find "Multi-Tool" in the disabled items list
3. Click it → Enable
4. Click **Save**
5. The Multi-Tool now appears in your course navigation

---

## Core Workflow

### Step 1: Create a Module Template

Design a "pattern" defining what each module should contain. Example pattern:

```
[Text Header] — Learning Objectives
[Page]        — Week Overview
[Page]        — Lecture Notes
[Assignment]  — Lab Assignment
[Discussion]  — Weekly Reflection
[Quiz]        — Knowledge Check
[Text Header] — Resources
```

### Step 2: Define the Settings

For each item type, you set:
- **Naming conventions** — e.g., "Week {N}: {Title}" or "Lab {N} — {Topic}"
- **Due date patterns** — relative to module start date
- **Points** — for graded items
- **Template** (Pages only) — apply a DesignPLUS page template automatically

### Step 3: Generate

The Multi-Tool uses the Canvas API to create all items across all modules in one operation. A 16-week course with 6 items per module = 96 items created in under 60 seconds.

---

## Multi-Tool for Date Management

Beyond initial creation, the Multi-Tool also handles:

- **Bulk date adjustment** — shift all due dates when the course is imported for a new semester
- **Availability date management** — open modules progressively
- **Cross-module date checking** — surface conflicts

This is particularly valuable at the start of each semester when importing and adjusting course shells.

---

## Relationship to Canvas Blueprint Courses

The Multi-Tool complements (but doesn't replace) Canvas Blueprint courses:
- Blueprint: syncs content changes across associated courses
- Multi-Tool: creates initial structure; not a sync mechanism

For mass course deployments (e.g., multi-section courses), use both together:
1. Build the master course structure with Multi-Tool
2. Set as Blueprint
3. Associate sections
4. Sync

---

## See Also

- [[DesignPLUS-Overview]] — Installation and institutional context
- [[DesignPLUS-Sidebar-Guide]] — Page design after structure is created
- [[DesignPLUS-QuickStart-Wizard]] — Template selection for individual pages

---

# DesignPLUS QuickStart Wizard

> **Related:** [[DesignPLUS-Overview]], [[DesignPLUS-Sidebar-Guide]]
>
> **Official Docs:** [QuickStart Wizard Guide — Cidi Labs](https://support.cidilabs.com/knowledgebase)

---

## What It Does

The QuickStart Wizard is the entry point to DesignPLUS for faculty and non-technical users. It appears as a button **next to the page title field** when editing any blank Canvas content item (page, assignment, discussion, syllabus, etc.).

It provides **preview-first template selection**: browse institutional and Cidi Labs templates, see a live preview, rearrange sections with drag-and-drop, and insert — all without touching HTML.

---

## Key Capabilities

- **Full-page templates** — complete course home pages, module overviews, assignment pages
- **Content blocks** — individual components: callouts, cards, headers, etc.
- **Live preview** — full-width interactive preview before inserting
- **Drag-and-drop reordering** — rearrange template sections in the preview
- **Institutional branding applied automatically** — colors and fonts match your institution's configured theme
- **Canvas editor stays the primary tool** — after insertion, you edit content normally in the RCE

---

## When the Wizard Appears

The QuickStart Wizard button only appears when:
1. The item is **blank** (no existing content)
2. You are in **edit mode**

For existing content, use the DesignPLUS Sidebar instead.

---

## Workflow

1. Create a new page (or open an existing blank page for editing)
2. Click the "DesignPLUS QuickStart Wizard" button near the title field
3. Browse Template Content or Content Blocks in the right panel
4. Click a template name to preview it on the left
5. Drag sections to reorder if needed
6. Click the insert button at the bottom
7. The template HTML is injected into the RCE
8. Edit the placeholder text with your actual content

---

## Difference from Sidebar

| | QuickStart Wizard | Sidebar |
|---|---|---|
| Best for | Starting from blank | Editing existing content |
| Access | Title area button | Keyboard shortcut |
| Scope | Full page structure | Element-level editing |
| User level | Less technical | More technical |

---

## See Also

- [[DesignPLUS-Sidebar-Guide]] — For editing after template insertion
- [[../05-patterns/Course-Home-Page]] — What a well-designed home page looks like
