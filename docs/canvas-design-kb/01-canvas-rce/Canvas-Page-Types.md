# Canvas Page Types

> **Parent:** [[../README]] | **Related:** [[RCE-Overview]], [[../05-patterns/Course-Home-Page]]

---

## Pages

The most flexible content type. Pages can be:
- The course home page
- Module overview pages
- Lecture notes / reading pages
- Resource hubs
- Any free-form content

Full RCE access. HTML view available. Any allowed tag and CSS property can be used.

**Course Link pattern:** `/courses/COURSE_ID/pages/page-url-slug`

---

## Assignments

The instructions field uses the full RCE. Same HTML capabilities as Pages. Design tip: use a clear header, a summary callout, and a rubric preview for best student experience.

**Note:** The "Title," "Points," "Due Date," and submission settings are Canvas UI — not editable via HTML.

---

## Discussions

The discussion prompt uses the full RCE. Good for: setting context with a designed banner, structured prompt with callout boxes, embedded resources.

---

## Announcements

RCE available in the body field. Design tip: use a dated "update" style with a brief bold title and clear action items.

---

## Syllabus

The Syllabus Description field uses the RCE. The auto-generated assignment calendar below it is Canvas-controlled and cannot be styled. Useful for: a top-of-syllabus designed header, instructor info card, key policies in callout boxes.

---

## Module Text Headers

These are **plain text only** — no HTML, no rich formatting. They appear as simple headers inside module item lists. DesignPLUS adds some styling to these via its JS injection; without DesignPLUS they're plain text.

---

## See Also

- [[RCE-Overview]] — How the editor works
- [[HTML-Allowlist]] — What's allowed in any RCE area
- [[../05-patterns/]] — Page patterns for each content type
