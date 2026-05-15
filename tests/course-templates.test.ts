import { describe, it, expect } from 'vitest';
import { parsePageContent, renderPage } from '../src/tools/course-templates.js';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { CourseConfig } from '../src/course-types.js';

function makeConfig(overrides: Partial<CourseConfig> = {}): CourseConfig {
  return {
    institution: 'Boise State University',
    courseName: 'AI Augmented Projects',
    courseNumber: 'ITM 370',
    professor: 'Dr. Rank',
    semester: 'Fall 2026',
    weeks: 4,
    pageTypes: ['overview'],
    layoutFixed: true,
    colors: { primary: '#0033A0', primaryDark: '#002277', primaryLight: '#E6ECF9', secondary: '#D64309' },
    heroImages: {},
    weekOutline: [],
    ...overrides,
  };
}

function writeTmp(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'tpl-'));
  const p = join(dir, 'page.md');
  writeFileSync(p, content, 'utf-8');
  return p;
}

describe('parsePageContent', () => {
  it('reads front matter fields', () => {
    const p = writeTmp(`---
week: 3
title: Week 3 Overview
hero_image: https://example.com/hero.jpg
---

## Learning Objectives
- Understand AI tools
`);
    const content = parsePageContent(p, 'overview');
    expect(content.frontMatter.week).toBe(3);
    expect(content.frontMatter.title).toBe('Week 3 Overview');
    expect(content.frontMatter.heroImage).toBe('https://example.com/hero.jpg');
  });

  it('reads section content', () => {
    const p = writeTmp(`---
week: 1
title: ""
hero_image: ""
---

## Learning Objectives
- Be awesome

## Introduction
Great intro text.

## Activities
- Do stuff
`);
    const content = parsePageContent(p, 'overview');
    expect(content.sections['Learning Objectives']).toContain('Be awesome');
    expect(content.sections['Introduction']).toContain('Great intro text');
    expect(content.sections['Activities']).toContain('Do stuff');
  });
});

describe('renderPage', () => {
  const config = makeConfig();

  it('renders without <style> blocks', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\n---\n\n## Learning Objectives\n- Learn stuff\n\n## Introduction\nHello.\n\n## Activities\n- Read\n`);
    const content = parsePageContent(p, 'overview');
    const html = renderPage(content, config);
    expect(html).not.toContain('<style');
  });

  it('renders without <script> tags', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\n---\n\n## Learning Objectives\n- Learn\n\n## Introduction\nHi.\n\n## Activities\n- Do\n`);
    const content = parsePageContent(p, 'overview');
    const html = renderPage(content, config);
    expect(html).not.toContain('<script');
  });

  it('renders without <h1> tags', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\n---\n\n## Learning Objectives\n- Learn\n\n## Introduction\nHi.\n\n## Activities\n- Do\n`);
    const content = parsePageContent(p, 'overview');
    const html = renderPage(content, config);
    expect(html).not.toContain('<h1');
  });

  it('renders without box-shadow', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\n---\n\n## Learning Objectives\n- Learn\n\n## Introduction\nHi.\n\n## Activities\n- Do\n`);
    const content = parsePageContent(p, 'overview');
    const html = renderPage(content, config);
    expect(html).not.toContain('box-shadow');
  });

  it('uses institution primary color in overview', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\n---\n\n## Learning Objectives\n- Learn\n\n## Introduction\nHi.\n\n## Activities\n- Do\n`);
    const content = parsePageContent(p, 'overview');
    const html = renderPage(content, config);
    expect(html).toContain('#0033A0');
  });

  it('renders course number in overview hero', () => {
    const p = writeTmp(`---\nweek: 2\ntitle: "Foundations"\nhero_image: ""\n---\n\n## Learning Objectives\n- Learn\n\n## Introduction\nHi.\n\n## Activities\n- Do\n`);
    const content = parsePageContent(p, 'overview');
    const html = renderPage(content, config);
    expect(html).toContain('ITM 370');
    expect(html).toContain('Week 02');
  });

  it('uses font-family Lato throughout', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\n---\n\n## Learning Objectives\n- Learn\n\n## Introduction\nHi.\n\n## Activities\n- Do\n`);
    const content = parsePageContent(p, 'overview');
    const html = renderPage(content, config);
    expect(html).toContain('Lato');
  });

  it('renders resources page with slides section', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\n---\n\n## Slides\n- [Week 1 Slides](https://slides.com)\n\n## Videos\n- Panopto ID: abc-123\n\n## Readings\n- [Article](https://article.com)\n\n## Other\n- Quiz opens Monday\n`);
    const content = parsePageContent(p, 'resources');
    const html = renderPage(content, config);
    expect(html).toContain('Slides');
    expect(html).toContain('Videos');
    expect(html).toContain('Readings');
  });

  it('renders assignment page with brief and rubric', () => {
    const p = writeTmp(`---\nweek: 1\ntitle: ""\nhero_image: ""\nassignment_number: "1.1"\ndue: "Friday"\npoints: 50\n---\n\n## Brief\nBuild something cool.\n\n## Rubric\n- Criteria 1: 25 pts\n\n## Submission Details\n- Submit to Canvas\n`);
    const content = parsePageContent(p, 'assignment');
    const html = renderPage(content, config);
    expect(html).toContain('Brief');
    expect(html).toContain('Rubric');
    expect(html).toContain('50');
  });

  it('renders all 13 page types without throwing', () => {
    const pageTypes = [
      'front-page', 'overview', 'resources', 'slides', 'videos',
      'assignment', 'engage-assignment', 'reading', 'reading-quiz',
      'weekly-quiz', 'lab', 'discussion-board', 'extra-credit', 'custom',
    ] as const;
    for (const pt of pageTypes) {
      const p = writeTmp(`---\nweek: 1\ntitle: "Test"\nhero_image: ""\n---\n\n## Section\nContent here.\n`);
      const content = parsePageContent(p, pt);
      expect(() => renderPage(content, config)).not.toThrow();
    }
  });
});
