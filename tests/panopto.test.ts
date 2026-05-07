import { describe, expect, it } from 'vitest';
import {
  buildEmbedUrl,
  buildViewerUrl,
  buildEmbedHtml,
  formatDuration,
  formatSearchResults,
  parseVttToText,
  sanitizeFilename,
} from '../src/tools/panopto.js';
import type { PanoptoConfig } from '../src/types.js';

const DOMAIN = 'bsu.hosted.panopto.com';
const VIDEO_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const TITLE = 'Introduction to Tableau';

const CFG_TRUE: PanoptoConfig = { domain: DOMAIN, iframeWhitelisted: true };
const CFG_FALSE: PanoptoConfig = { domain: DOMAIN, iframeWhitelisted: false };
const CFG_NULL: PanoptoConfig = { domain: DOMAIN, iframeWhitelisted: null };

describe('buildEmbedUrl', () => {
  it('produces correct URL with captions=true and autoplay=false', () => {
    expect(buildEmbedUrl(DOMAIN, VIDEO_ID)).toBe(
      `https://${DOMAIN}/Panopto/Pages/Embed.aspx?id=${VIDEO_ID}&autoplay=false&captions=true`,
    );
  });
});

describe('buildViewerUrl', () => {
  it('produces correct viewer URL', () => {
    expect(buildViewerUrl(DOMAIN, VIDEO_ID)).toBe(
      `https://${DOMAIN}/Panopto/Pages/Viewer.aspx?id=${VIDEO_ID}`,
    );
  });
});

describe('buildEmbedHtml', () => {
  it('returns iframe when iframeWhitelisted is true', () => {
    const html = buildEmbedHtml(CFG_TRUE, VIDEO_ID, TITLE, 'inline');
    expect(html).toContain('<iframe');
    expect(html).toContain(`aria-label="${TITLE}"`);
    expect(html).toContain('allowfullscreen');
    expect(html).not.toContain('<a href');
  });

  it('returns fallback link when iframeWhitelisted is false', () => {
    const html = buildEmbedHtml(CFG_FALSE, VIDEO_ID, TITLE, 'inline');
    expect(html).toContain('<a href');
    expect(html).toContain('Watch:');
    expect(html).not.toContain('<iframe');
  });

  it('returns fallback link when iframeWhitelisted is null', () => {
    const html = buildEmbedHtml(CFG_NULL, VIDEO_ID, TITLE, 'inline');
    expect(html).toContain('<a href');
    expect(html).not.toContain('<iframe');
  });

  it('inline placement — no wrapper div', () => {
    const html = buildEmbedHtml(CFG_TRUE, VIDEO_ID, TITLE, 'inline');
    expect(html).not.toContain('max-width:720px;margin:0 auto');
  });

  it('full-page placement — centered wrapper present', () => {
    const html = buildEmbedHtml(CFG_TRUE, VIDEO_ID, TITLE, 'full-page');
    expect(html).toContain('max-width:720px;margin:0 auto');
  });
});

describe('formatDuration', () => {
  it('converts seconds to mm:ss', () => {
    expect(formatDuration(1934)).toBe('32:14');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3600)).toBe('60:00');
  });
});

describe('formatSearchResults', () => {
  it('includes ✓ captions for videos with captions', () => {
    const results = [{ id: VIDEO_ID, title: TITLE, duration: 1934, hasCaptions: true }];
    const text = formatSearchResults(results, 'tableau');
    expect(text).toContain('✓ captions');
    expect(text).toContain(VIDEO_ID);
    expect(text).toContain(TITLE);
    expect(text).toContain('32:14');
  });

  it('includes ⚠ no captions for videos without captions', () => {
    const results = [{ id: VIDEO_ID, title: TITLE, duration: 1125, hasCaptions: false }];
    const text = formatSearchResults(results, 'tableau');
    expect(text).toContain('⚠ no captions');
  });
});

describe('parseVttToText', () => {
  it('strips WEBVTT header, timestamps, cue IDs, and NOTE blocks', () => {
    const vtt = [
      'WEBVTT',
      '',
      'NOTE This is a comment',
      '',
      '1',
      '00:00:01.000 --> 00:00:04.000',
      'Hello students.',
      '',
      '2',
      '00:00:05.000 --> 00:00:08.000',
      'Welcome to Tableau.',
      '',
    ].join('\n');
    const text = parseVttToText(vtt);
    expect(text).not.toContain('WEBVTT');
    expect(text).not.toContain('-->');
    expect(text).not.toContain('NOTE');
    expect(text).toContain('Hello students.');
    expect(text).toContain('Welcome to Tableau.');
    expect(text).not.toMatch(/\b1\b.*Hello/);  // cue ID "1" should not appear before text
  });
});

describe('sanitizeFilename', () => {
  it('replaces special characters with hyphens and lowercases', () => {
    expect(sanitizeFilename('Week 3: Data & Viz!')).toBe('week-3-data-viz');
  });
});
