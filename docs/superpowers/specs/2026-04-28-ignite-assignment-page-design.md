# Design Spec — 16.06 Ignite Talk Assignment Page

**Date:** 2026-04-28  
**Status:** Approved  
**Output:** `src/templates/ignite-assignment-page.html`

---

## What We're Building

A Canvas LMS HTML assignment page for **ITM 370 Assignment 16.06 — The Final Spark: Your Passion Project in 5 Minutes**. The page replaces the plain-text brief with a polished, two-column dashboard layout using BSU brand colors and Canvas-compatible inline CSS.

---

## Layout: Two-Column Dashboard

```
┌─────────────────────────────────────────────────────┐
│              HERO BANNER (full width)               │
│    Hero image (1200×400px) + title overlay          │
├──────────────────────────────┬──────────────────────┤
│  LEFT COLUMN (flex: 3)       │  RIGHT SIDEBAR (1.4) │
│  · Overview                  │  · What to Submit    │
│  · What is an Ignite Talk?   │  · Graded On         │
│  · Slide Structure           │  · Extra Credit      │
│  · AI Tools (Google Vids ★)  │  · After You Submit  │
│  · Tips for Success          │                      │
└──────────────────────────────┴──────────────────────┘
```

Implemented using Canvas built-in `content-box` + `grid-row` + `col-xs-12 col-md-*` classes for mobile responsiveness. No `gap` — use `margin` on children.

---

## Design Tokens

| Token | Value |
|---|---|
| Primary | `#0033A0` (BSU blue) |
| Primary-dark | `#002277` |
| Primary-light | `#E6ECF9` |
| Secondary | `#D64309` (BSU orange) |
| Neutral bg | `#F4F3EF` |
| Card bg | `#ffffff` |
| Card border | `#e0e0d8` |
| Border-radius (card) | `10px` |
| Border-radius (btn/pill) | `8px / 20px` |
| Font | `Lato, sans-serif` |

---

## Sections & Content

### Hero Banner
- Background: `linear-gradient(135deg, #002277 0%, #0033A0 60%, #1A5BCC 100%)`
- Hero image (1200×400px) layered under a dark overlay (`rgba(0,0,0,0.18)`)
- Orange pill badge: `ITM 370 · Assignment 16.06`
- Title: "The Final Spark"
- Subtitle: "Your Passion Project in 5 Minutes · Ignite Talk Video"
- Four stat badges (white/translucent): 20 Slides · 15s Per Slide · 5 min Total · Pre-Recorded

**ChatGPT image prompt (1200×400px):**
> "A cinematic wide-format banner image for a university course assignment about creating a 5-minute Ignite Talk video presentation. Show a dynamic, modern workspace scene: a glowing laptop screen displaying a presentation slide, a ring light, a microphone, and soft blue accent lighting. Color palette dominated by deep navy blue (#0033A0) with warm orange highlights. Clean, professional, slightly cinematic mood. No text. No people. Horizontal format, 3:1 aspect ratio, high resolution."

### Left Column

**Overview card**
- Section label: "OVERVIEW" (uppercase, BSU blue)
- Body: Moderate rewrite of original — positions this as the capstone, emphasizes portfolio value

**What is an Ignite Talk? card**
- Pull quote: *"Enlighten us, but make it quick."* (orange left-border callout)
- Three stat tiles (light blue bg): 20 slides / 15s per slide / 5 min total
- Brief explanation of the auto-advance format

**Slide Structure card**
- Visual three-block layout:
  - Slide 1 (BSU blue): Title + Name
  - Slides 2–17 (light blue): Story + 2 strategy slides anywhere
  - Slide 20 (orange): Close + Inspire
- Footer note about slides 18–19 as flex slides

**AI Tools card**
- Google Vids featured block (blue border + "RECOMMENDED" badge) with description emphasizing it's all-in-one (slides + narration + voiceover + export)
- Supporting tools grid (5 cards): Script · Voice · Images · Music · Audio Mix

**Tips for Success card**
- Four tips with orange arrow bullets
- Tone: direct, encouraging, student-friendly

### Right Sidebar

**What to Submit** (BSU blue bg, white text)
- Three cards: YouTube Video · Reflection (2–3 paragraphs) · Tools & Prompts Log (1–2 prompts per category)

**Graded On** (white card, orange left-border)
- "Story quality and effort — not which software you used."

**Extra Credit** (white card)
- Train an ElevenLabs voice clone, include in tools log

**After You Submit** (light blue card)
- Watch classmates' videos, leave a comment

---

## Content Changes (vs. Original)

| Area | Change |
|---|---|
| Tone | Freshened — more direct, student-facing |
| Tools section | Google Vids added as primary recommended tool |
| Slide structure | Visual card layout instead of plain table |
| Submission section | Split into 3 clear deliverable cards |
| Tips | Condensed and rewritten from bullet list |
| Optional section | Moved to "Extra Credit" sidebar card |
| CustomGPT note | Removed (superseded by Google Vids recommendation) |

---

## Canvas Constraints Applied

- No `<style>` blocks — all CSS inline
- No `<script>` tags
- No `box-shadow`, `gap`, `filter`, `transform`, `transition`, `animation`, `opacity`
- No `<h1>` — headings start at `<h2>`
- All `<img>` tags will have `alt=""` attributes
- `display:flex` used (allowed); `gap` replaced with `margin`
- Font: `Lato, sans-serif` throughout
- Multi-column layout via Canvas `content-box` + `grid-row` + `col-*` classes

---

## Output

- File: `src/templates/ignite-assignment-page.html`
- Self-contained HTML fragment (no `<html>` or `<head>` wrapper) ready to paste into Canvas RCE
