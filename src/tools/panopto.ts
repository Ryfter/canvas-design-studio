import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { PanoptoConfig } from '../types.js';

// mkdirSync, writeFileSync, homedir, join will be used in Task 5 (fetchPanoptoCaptions)

export interface PanoptoSearchResult {
  id: string;
  title: string;
  duration: number;  // seconds
  hasCaptions: boolean;
}

export interface EmbedPanoptoResult {
  html: string;
  videoTitle: string;
  hasCaptions: boolean | null;  // null when API not configured
  captionWarning?: string;
  iframeUsed: boolean;
}

export function buildEmbedUrl(domain: string, videoId: string): string {
  return `https://${domain}/Panopto/Pages/Embed.aspx?id=${videoId}&autoplay=false&captions=true`;
}

export function buildViewerUrl(domain: string, videoId: string): string {
  return `https://${domain}/Panopto/Pages/Viewer.aspx?id=${videoId}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatSearchResults(results: PanoptoSearchResult[], query: string): string {
  if (results.length === 0) {
    return query ? `No videos found matching "${query}".` : 'No videos found in your library.';
  }
  const header = query
    ? `Found ${results.length} video(s) matching "${query}":`
    : `Found ${results.length} video(s) in your library:`;
  const lines = [header, ''];
  results.forEach((v, i) => {
    const cap = v.hasCaptions ? '✓ captions' : '⚠ no captions';
    lines.push(`${i + 1}. ${v.title}  [${formatDuration(v.duration)}]  ${cap}`);
    lines.push(`   ID: ${v.id}`);
    lines.push('');
  });
  lines.push('Use embed_panopto_video with the ID of the video you want to embed.');
  return lines.join('\n');
}

export function buildEmbedHtml(
  config: PanoptoConfig,
  videoId: string,
  title: string,
  placement: 'inline' | 'full-page',
): string {
  const embedUrl = buildEmbedUrl(config.domain, videoId);
  const viewerUrl = buildViewerUrl(config.domain, videoId);

  let embed: string;
  if (config.iframeWhitelisted === true) {
    embed = [
      `<iframe`,
      `  src="${embedUrl}"`,
      `  width="720"`,
      `  height="405"`,
      `  allowfullscreen`,
      `  aria-label="${title}"`,
      `  style="max-width:100%;border:0;display:block;">`,
      `</iframe>`,
    ].join('\n');
  } else {
    embed = [
      `<a href="${viewerUrl}"`,
      `   target="_blank"`,
      `   style="display:inline-block;padding:12px 20px;background:#0033A0;color:#ffffff;`,
      `          border-radius:8px;font-family:Lato,sans-serif;font-size:15px;text-decoration:none;">`,
      `  ▶ Watch: ${title}`,
      `</a>`,
    ].join('\n');
  }

  if (placement === 'full-page') {
    return `<div style="max-width:720px;margin:0 auto;">\n  ${embed}\n</div>`;
  }
  return embed;
}

export function parseVttToText(vtt: string): string {
  const timestampRe = /^\d+:\d+:\d+\.\d+ --> \d+:\d+:\d+\.\d+/;
  const textLines: string[] = [];
  for (const line of vtt.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'WEBVTT' || timestampRe.test(trimmed)) continue;
    textLines.push(trimmed);
  }
  return textLines.join(' ');
}

export function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
