import { describe, expect, it } from 'vitest';
import { parseCourseConfig, validateCourseInfo } from '../src/tools/ingest.js';
import type { CourseInfo } from '../src/tools/ingest.js';

describe('parseCourseConfig', () => {
  it('parses all six required fields', () => {
    const content = [
      'Institution: Boise State University',
      'Professor: Dr. Rank',
      'Course Number: ITM 370',
      'Course Name: AI Augmented Projects',
      'Assignment Number: 16.06',
      'Semester: Fall 2026',
    ].join('\n');
    const result = parseCourseConfig(content);
    expect(result.institution).toBe('Boise State University');
    expect(result.professor).toBe('Dr. Rank');
    expect(result.courseNumber).toBe('ITM 370');
    expect(result.courseName).toBe('AI Augmented Projects');
    expect(result.assignmentNumber).toBe('16.06');
    expect(result.semester).toBe('Fall 2026');
  });

  it('treats blank value as not set — does not include in result', () => {
    const content = 'Professor:\nCourse Name: AI Projects';
    const result = parseCourseConfig(content);
    expect(result.professor).toBeUndefined();
    expect(result.courseName).toBe('AI Projects');
  });

  it('ignores comment lines starting with #', () => {
    const content = '# This is a comment\nProfessor: Dr. Rank';
    const result = parseCourseConfig(content);
    expect(result.professor).toBe('Dr. Rank');
    expect(Object.keys(result)).toHaveLength(1);
  });
});

describe('validateCourseInfo', () => {
  const valid: CourseInfo = {
    institution: 'BSU',
    professor: 'Dr. Rank',
    courseNumber: 'ITM 370',
    courseName: 'AI Projects',
    assignmentNumber: '16.06',
    semester: 'Fall 2026',
  };

  it('returns empty array for fully-populated valid config', () => {
    expect(validateCourseInfo(valid)).toEqual([]);
  });

  it('returns error message for missing field', () => {
    const info = { ...valid, professor: '' } as unknown as Partial<CourseInfo>;
    const errors = validateCourseInfo(info as CourseInfo);
    expect(errors.some(e => e.includes('professor'))).toBe(true);
  });

  it('returns error message for placeholder value', () => {
    const info = { ...valid, professor: '[Your Name]' };
    const errors = validateCourseInfo(info);
    expect(errors.some(e => e.includes('professor'))).toBe(true);
    expect(errors.some(e => e.includes('[Your Name]'))).toBe(true);
  });
});
