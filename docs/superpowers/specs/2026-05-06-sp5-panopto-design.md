# SP5 — Panopto Integration: Design Spec

**Date:** 2026-05-06
**Author:** Claude (claude-sonnet-4-6) via brainstorming skill
**Project:** Canvas Design Studio MCP Server
**Status:** Approved — ready for implementation planning

---

## Goal

Add Panopto video embed support to the Canvas Design Studio MCP server. Professors get Canvas-safe embed HTML for any Panopto video. Those with API credentials can also search their library and get caption status before embedding. The video captions accessibility check deferred from SP3 is added here.

---

## Scope

Two new MCP tools:

- `search_panopto_videos` — search the Panopto library (requires API; returns video list with captions status)
- `embed_panopto_video` — generate Canvas-safe embed HTML for a given video ID (works without API; API enhances with metadata and caption verification)

One new accessibility check:

- `video-no-captions` — added to `auditAccessibility` in `src/tools/accessibility.ts`; static HTML analysis, no API call

No new npm dependencies. Panopto API uses OAuth2 client credentials flow via native `fetch`.

---

## Architecture

### Pipeline

```
search_panopto_videos (optional — requires API)
  → returns video list with IDs, titles, durations, captions status
  → professor picks video
        ↓
embed_panopto_video
  → if API configured: fetch metadata + captions status
  → if no captions: return captionWarning (professor decides)
  → generate Canvas-safe HTML based on iframeWhitelisted config
        ↓
auditAccessibility (existing — now includes video-no-captions check)
  → fires on validate_canvas_html, publish_to_canvas, generate_canvas_page
```

### New / Modified Files

| File | Action | Responsibility |
|---|---|---|
| `src/tools/panopto.ts` | Create | Panopto API client, search, embed HTML generation |
| `src/config.ts` | Modify | Add optional `panopto?: PanoptoConfig` to config type |
| `src/wizard.ts` | Modify | Optional Panopto setup section (domain, whitelist, API credentials) |
| `src/tools/accessibility.ts` | Modify | Add `video-no-captions` check to `auditAccessibility` |
| `src/index.ts` | Modify | Register `search_panopto_videos` and `embed_panopto_video` |
| `tests/panopto.test.ts` | Create | ~12 tests: embed, search, placement, captions |
| `tests/accessibility.test.ts` | Modify | 2 new tests for `video-no-captions` check |

---

## Config

### `PanoptoConfig` type (added to `src/config.ts`)

```ts
interface PanoptoConfig {
  domain: string;                    // e.g. "bsu.hosted.panopto.com"
  iframeWhitelisted: boolean | null; // true = whitelisted; false = not; null = unsure
  clientId?: string;                 // OAuth2 client credentials — enables search + caption check
  clientSecret?: string;
}
```

The full config type gains an optional `panopto?: PanoptoConfig` field. All existing tools continue to work when this field is absent.

### Wizard Setup

`src/wizard.ts` gains an optional Panopto section, presented after the existing Canvas API section. It is always skippable. When entered:

1. **Panopto domain** — prompt: `"Panopto domain (e.g. bsu.hosted.panopto.com, or leave blank to skip):"`. Blank → skip entire Panopto section.
2. **Iframe whitelisted** — prompt: `"Is Panopto whitelisted for iframes in Canvas? (yes / no / unsure):"`. Stored as `true` / `false` / `null`.
3. **API credentials (optional)** — prompt: `"Panopto API client ID (leave blank to skip — enables video search and caption checking):"`. If provided, prompt for client secret.

---

## Input / Output Types

### `search_panopto_videos`

```ts
interface SearchPanoptoInput {
  query: string;
  limit?: number;  // default 10, max 25
}
```

Returns formatted text listing matched videos with ID, title, duration, and captions status. Requires API (`clientId` + `clientSecret`). Returns `API_NOT_CONFIGURED` error text if credentials are absent.

### `embed_panopto_video`

```ts
interface EmbedPanoptoInput {
  videoId: string;
  placement: 'inline' | 'full-page';
  title?: string;   // if omitted and API configured, fetched automatically
}

interface EmbedPanoptoResult {
  html: string;
  videoTitle: string;
  hasCaptions: boolean | null;  // null when API not configured
  captionWarning?: string;       // present when hasCaptions is false
  iframeUsed: boolean;           // true when iframe generated; false when fallback link
}
```

---

## Tool Implementations

### `search_panopto_videos`

1. Check config for `panopto.clientId` + `panopto.clientSecret` — return `API_NOT_CONFIGURED` if absent.
2. Fetch OAuth2 token: `POST https://{domain}/Panopto/oauth2/connect/token` with `grant_type=client_credentials`, `client_id`, `client_secret`, `scope=api`.
3. Search: `GET https://{domain}/Panopto/api/v1/sessions/search?searchQuery={query}&maxResults={limit}` with `Authorization: Bearer {token}`.
4. Format results:

```
Found 3 videos matching "data visualization":

1. Introduction to Tableau  [32:14]  ✓ captions
   ID: a1b2c3d4-0000-0000-0000-000000000001

2. Excel Charts Deep Dive  [18:45]  ⚠ no captions
   ID: e5f6g7h8-0000-0000-0000-000000000002

3. D3.js for Beginners  [44:02]  ✓ captions
   ID: i9j0k1l2-0000-0000-0000-000000000003

Use embed_panopto_video with the ID of the video you want to embed.
```

Caption status is derived from the session's `HasCaptions` field in the Panopto API response. Duration is derived from `Duration` (seconds → `mm:ss`).

### `embed_panopto_video`

1. If API configured: fetch video metadata (`GET /Panopto/api/v1/sessions/{videoId}`) to get title and `HasCaptions`.
2. If `hasCaptions === false`: set `captionWarning` in result — do not block embed generation.
3. Build embed URL: `https://{domain}/Panopto/Pages/Embed.aspx?id={videoId}&autoplay=false&captions=true`
4. Build viewer URL (for fallback): `https://{domain}/Panopto/Pages/Viewer.aspx?id={videoId}`
5. Generate HTML based on `iframeWhitelisted`:

**Whitelisted (`true`) → `<iframe>` embed:**
```html
<iframe
  src="https://{domain}/Panopto/Pages/Embed.aspx?id={videoId}&autoplay=false&captions=true"
  width="720"
  height="405"
  allowfullscreen
  aria-label="{title}"
  style="max-width:100%;border:0;display:block;">
</iframe>
```

Note: Canvas strips the `title` attribute from iframes — `aria-label` is used instead for accessibility.

**Not whitelisted or unsure (`false` / `null`) → accessible fallback link:**
```html
<a href="https://{domain}/Panopto/Pages/Viewer.aspx?id={videoId}"
   target="_blank"
   style="display:inline-block;padding:12px 20px;background:#0033A0;color:#ffffff;
          border-radius:8px;font-family:Lato,sans-serif;font-size:15px;text-decoration:none;">
  ▶ Watch: {title}
</a>
```

**Placement:**
- `inline` — embed returned as-is, for dropping into a card
- `full-page` — embed wrapped in a centered container:
```html
<div style="max-width:720px;margin:0 auto;">
  {embed}
</div>
```

---

## Accessibility Check — `video-no-captions`

Added to `auditAccessibility(html)` in `src/tools/accessibility.ts`.

**Detection:** Find any `<iframe` element whose `src` attribute contains `panopto` (case-insensitive). If found and the `src` does not include `captions=true`, flag it.

**Warning:**
```ts
{
  check: 'video-no-captions',
  message: 'Panopto embed found without captions enabled — add &captions=true to the embed URL.',
  context: '<iframe src="...">',  // first 100 chars of the tag
}
```

`embed_panopto_video` always inserts `captions=true` in the URL it generates, so its own output passes this check. The check catches Panopto iframes pasted manually by professors without using the tool.

---

## MCP Tool Registration

### `search_panopto_videos` description
> Search your Panopto video library. Returns a list of matching videos with IDs, titles, duration, and captions status. Requires Panopto API credentials configured during setup.

### `embed_panopto_video` description
> Generate Canvas-safe HTML to embed a Panopto video. Works without API credentials (provide the video ID manually). When API is configured, fetches the video title and verifies captions. Generates an iframe embed if Panopto is whitelisted in Canvas, or an accessible fallback link if not.

### Input schemas follow existing `type: 'object' as const` pattern in `src/index.ts`.

---

## Testing

### `tests/panopto.test.ts` — 12 tests

| Test | Verifies |
|---|---|
| `buildEmbedUrl` produces correct URL | domain + videoId + `captions=true` + `autoplay=false` |
| `buildViewerUrl` produces correct URL | domain + videoId, Viewer.aspx path |
| iframe HTML when `iframeWhitelisted: true` | output contains `<iframe`, `aria-label`, `allowfullscreen` |
| iframe HTML when `iframeWhitelisted: false` | output contains `<a href`, no `<iframe` |
| iframe HTML when `iframeWhitelisted: null` | same fallback as false |
| `inline` placement — no wrapper div | bare embed returned |
| `full-page` placement — centered wrapper | `max-width:720px;margin:0 auto` present |
| `formatSearchResults` with captions | `✓ captions` in output text |
| `formatSearchResults` without captions | `⚠ no captions` in output text |
| `formatDuration` — seconds to mm:ss | 1934 → `"32:14"` |
| search (mocked fetch) — returns formatted list | video titles and IDs present |
| search without API configured — returns error | `API_NOT_CONFIGURED` in output |

### `tests/accessibility.test.ts` — 2 new tests

| Test | Verifies |
|---|---|
| Panopto iframe without `captions=true` → `video-no-captions` warning | check present in result |
| Panopto iframe with `captions=true` → no warning | check absent from result |

**Target test count: 136 + 12 + 2 = 150 passing.**

---

## What SP5 Does Not Include

- Dedicated metadata fetch unit test — the embed test with mocked API covers this path sufficiently
- Token caching — OAuth2 token fetched fresh per request (acceptable for MVP; tokens are short-lived)
- Panopto folder/course filtering in search — future; query-based search covers BSU's use case
- Automatic caption upload or generation — out of scope; tool warns, professor acts
- `embed_panopto_video` integrated into `generate_canvas_page` — future; tool is composable standalone first
