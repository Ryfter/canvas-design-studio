import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { importCourse } from '../src/tools/import-course.js';

const archiveDir = join(import.meta.dirname, 'fixtures/canvas-backup/ITM370');

describe('importCourse — full course', () => {
  it('creates course-config.md from archive', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(existsSync(join(outDir, 'course-config.md'))).toBe(true);
  });

  it('course-config.md contains course name from course.json', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    const config = readFileSync(join(outDir, 'course-config.md'), 'utf-8');
    expect(config).toContain('AI Augmented Projects');
    expect(config).toContain('ITM 370');
  });

  it('creates week folder for each module', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(existsSync(join(outDir, 'week-01'))).toBe(true);
    expect(existsSync(join(outDir, 'week-02'))).toBe(true);
  });

  it('creates overview.md for Page items', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(existsSync(join(outDir, 'week-01', 'overview.md'))).toBe(true);
  });

  it('overview.md contains extracted content from page HTML', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    const content = readFileSync(join(outDir, 'week-01', 'overview.md'), 'utf-8');
    expect(content).toContain('AI augmentation');
    expect(content).toContain('Learning Objectives');
  });

  it('creates resources.md for Resource-type pages', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(existsSync(join(outDir, 'week-01', 'resources.md'))).toBe(true);
  });

  it('creates assignment.md for Assignment items', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(existsSync(join(outDir, 'week-01', 'assignment.md'))).toBe(true);
  });

  it('assignment.md contains due date and points from assignment.json', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    const content = readFileSync(join(outDir, 'week-01', 'assignment.md'), 'utf-8');
    expect(content).toContain('50');
    expect(content).toContain('2026-09-05');
  });

  it('creates discussion-board.md for Discussion items', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(existsSync(join(outDir, 'week-01', 'discussion-board.md'))).toBe(true);
  });

  it('creates weekly-quiz.md for Quiz items', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(existsSync(join(outDir, 'week-02', 'weekly-quiz.md'))).toBe(true);
  });

  it('weekly-quiz.md contains [NEEDS REVIEW] for quiz question content', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir });
    const content = readFileSync(join(outDir, 'week-02', 'weekly-quiz.md'), 'utf-8');
    expect(content).toContain('[NEEDS REVIEW]');
  });

  it('returns import summary with file count', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    const result = importCourse({ archivePath: archiveDir, outputDir: outDir });
    expect(result.filesCreated).toBeGreaterThan(0);
    expect(result.weeksImported).toBe(2);
  });
});

describe('importCourse — single week', () => {
  it('creates only week-01 folder when weekNumber is 1', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir, weekNumber: 1 });
    expect(existsSync(join(outDir, 'week-01'))).toBe(true);
    expect(existsSync(join(outDir, 'week-02'))).toBe(false);
  });
});

describe('importCourse — single assignment', () => {
  it('creates assignment.md only when assignmentName is specified', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ic-'));
    importCourse({ archivePath: archiveDir, outputDir: outDir, assignmentName: 'Assignment 1.1' });
    expect(existsSync(join(outDir, 'week-01', 'assignment.md'))).toBe(true);
    // Should not create overview or resources
    expect(existsSync(join(outDir, 'week-01', 'overview.md'))).toBe(false);
  });
});
