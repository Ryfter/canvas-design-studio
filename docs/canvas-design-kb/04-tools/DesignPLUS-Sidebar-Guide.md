# DesignPLUS Sidebar Guide

> **Parent:** [[../README]] | **Related:** [[DesignPLUS-Overview]], [[DesignPLUS-QuickStart-Wizard]]
>
> **Official Docs:** [DesignPLUS Sidebar Resources — Cidi Labs Support](https://support.cidilabs.com/knowledgebase/designplus-sidebar-resources)

---

## Launching the Sidebar

The sidebar launches from within the Canvas RCE (you must be in edit mode first).

**Keyboard shortcut:**
- **Mac:** `Option + Shift + D`
- **Windows:** `Alt + Shift + D`

Click inside the RCE text area to activate, then use the shortcut. A rocket ship icon will appear in the upper right corner of the RCE.

**Auto-launch setting:** Once opened, go to the triple-dot menu (⋯) → User Settings → check "Automatically Launch Sidebar." Settings are browser/computer-specific.

---

## Main Navigation Tabs

The New DesignPLUS Sidebar (2025–present) has five main tabs:

### 1. Edit Current Element
Shows editing options for the currently selected element. When you click on a piece of content in the RCE, this tab updates to show style and content controls for that specific element type (card, callout, header image, etc.).

### 2. Add New Elements
Browse and insert new design elements. Content is organized by category:
- Getting Started
- Basic Content
- Navigation
- Headers / Banners
- Cards & Layouts
- Interactive (tabs, accordions, flip cards)
- Tables
- Media
- Custom (institution-specific templates)

### 3. Accessibility / Usability
Built-in checkers:
- **Contrast checker** — text/background color ratio (WCAG AA/AAA)
- **Heading structure** — detects skipped heading levels
- **Image alt text** — flags images missing alt text
- **Link text** — detects non-descriptive links ("click here")
- **Math content** — checks for accessible math notation
- **Table structure** — verifies table headers and structure

### 4. Help
Links to user guides, tutorials, and release notes directly within the sidebar.

### 5. More Options
Account-specific settings, template customization, and admin features.

---

## Key Toolbar Features

### Template Content
Pre-built page layouts ready to insert. Includes:
- Course home pages
- Module overview pages
- Assignment instructions pages
- Syllabus templates
- Banner / header variations

At Boise State, Emory, and other subscribing institutions: institution-specific templates appear under "Custom" or "Institutional" categories.

### Content Blocks
Reusable smaller components:
- Callout boxes (info, warning, tip, deadline)
- Card grids (2, 3, 4 columns)
- Navigation bars
- Icon rows
- Dividers and spacers
- Button links

### Interactive Elements
- **Accordions** — click to expand/collapse content
- **Tabs** — horizontal tab navigation with content panels
- **Flip cards** — front/back reveal on click/hover
- **Popovers** — tooltip-style overlays

These require the DesignPLUS JavaScript injection (account-level) to function. They appear as static content without it.

---

## Upgrading Legacy Sidebar Content

If your course was built with the Legacy DesignPLUS Sidebar (before 2026):

1. Open a page in edit mode
2. Launch the New Sidebar
3. If a yellow banner appears at the bottom saying "legacy content exists," click the **Upgrade** button
4. Review the upgrade result — some content may need manual adjustment
5. The upgrade tool handles most standard elements automatically

**Important:** Test upgraded pages in student view before publishing.

---

## Institution Customization

DesignPLUS allows institutions to create custom template libraries via a "customizations course" in Canvas. Instructional designers can:
- Build custom templates
- Set institution color themes
- Configure default settings for faculty
- Create tutorial content that appears inside the sidebar Help tab

---

## Keyboard Shortcuts Reference

| Action | Mac | Windows |
|---|---|---|
| Open/close sidebar | Option+Shift+D | Alt+Shift+D |
| Switch sidebar versions | Option+Shift+V | Alt+Shift+V |

---

## Troubleshooting

**Sidebar won't launch:**
- Ensure you're in edit mode (click "Edit" on the page first)
- Click inside the RCE text area before using the shortcut
- Try a different browser
- Clear cache and re-enable third-party cookies

**Can't find institution templates:**
- Check the "Custom" or "Institutional" category in Add New Elements
- Contact your instructional design team — they manage institutional template content

**Legacy content not upgrading cleanly:**
- Use the manual edit option in the sidebar
- Contact your Canvas admin or the Cidi Labs support portal

---

## See Also

- [[DesignPLUS-Overview]] — What DesignPLUS is and how it's installed
- [[DesignPLUS-Multi-Tool]] — Bulk course creation
- [[DesignPLUS-QuickStart-Wizard]] — Template-first design workflow
- [[../03-design-systems/Component-Library]] — Manual HTML equivalents for when DesignPLUS isn't available
- [[../07-resources/DesignPLUS-Links]] — All training resources
