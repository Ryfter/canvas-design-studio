import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname, relative, sep } from 'node:path';
import { generateCanvasPage, type GenerateInput } from './generate.js';
import type { InstitutionConfig } from '../types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CourseInfo {
  institution: string;
  professor: string;
  courseNumber: string;
  courseName: string;
  assignmentNumber: string;
  semester: string;
}

export interface IngestAssignmentFolderInput {
  folderPath?: string;   // relative to CWD; defaults to "ingest"
}

export interface IngestAssignmentFolderResult {
  html: string;
  filename: string;
  heroImagePrompt?: string;
  courseInfo: CourseInfo;
  sources: {
    brief: string;
    rubric?: string;
    shell?: string;
    styleNotes?: string;
    sourceMap: {
      courseConfig: string;
      brief: string;
      rubric?: string;
      shell?: string;
      styleNotes?: string;
    };
  };
  warnings: string[];
}

// ─── Course config field mapping ─────────────────────────────────────────────

const FIELD_MAP: Record<string, keyof CourseInfo> = {
  'institution': 'institution',
  'professor': 'professor',
  'course number': 'courseNumber',
  'course name': 'courseName',
  'assignment number': 'assignmentNumber',
  'semester': 'semester',
};

const REQUIRED_FIELDS: (keyof CourseInfo)[] = [
  'institution', 'professor', 'courseNumber', 'courseName', 'assignmentNumber', 'semester',
];

// ─── Pure functions: parsing and validation ───────────────────────────────────

export function parseCourseConfig(content: string): Partial<CourseInfo> {
  const result: Partial<CourseInfo> = {};
  for (const line of content.split('\n')) {
    if (line.trimStart().startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    if (!value) continue;
    const field = FIELD_MAP[key];
    if (field) result[field] = value;
  }
  return result;
}

export function validateCourseInfo(info: CourseInfo): string[] {
  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = (info as Record<string, string>)[field];
    if (!value) {
      errors.push(`Missing required field: ${field}`);
    } else if (/^\[.+\]$/.test(value)) {
      errors.push(`Placeholder not filled in: ${field} = "${value}"`);
    }
  }
  return errors;
}
