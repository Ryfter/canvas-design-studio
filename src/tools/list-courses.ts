import type { CanvasCourse, InstitutionConfig, SemesterFilter } from '../types.js';
import { courseCoordinatorGotcha } from './gotchas.js';

export interface ListCanvasCoursesInput {
  semester?: SemesterFilter;
  includeFavorites?: boolean;
}

export interface ListCanvasCoursesResult {
  courses: CanvasCourse[];
  text: string;
}

interface CourseApi {
  listCourses(enrollmentWorkflowStates?: string | string[]): Promise<CanvasCourse[]>;
}

type SaveConfig = (config: InstitutionConfig) => void;

const SEMESTER_TO_ENROLLMENT_WORKFLOW_STATE: Record<SemesterFilter, string | string[] | undefined> = {
  current: 'active',
  future: ['invited', 'pending', 'creation_pending'],
  past: 'completed',
  all: undefined,
};

function courseNickname(course: CanvasCourse): string | undefined {
  return course.nickname ?? course.friendly_name;
}

function teacherNames(course: CanvasCourse): string {
  const names = course.teachers?.map(teacher => teacher.display_name ?? teacher.name).filter(Boolean) ?? [];
  return names.length > 0 ? names.join(', ') : 'Not provided by Canvas';
}

function studentCount(course: CanvasCourse): string {
  if (typeof course.total_students === 'number') return `${course.total_students} enrolled`;
  return 'Not provided by Canvas';
}

function courseBlock(course: CanvasCourse, favorite: boolean): string {
  const nickname = courseNickname(course);
  const lines = [
    favorite ? 'Favorite: yes' : undefined,
    `Course ID: ${course.id}`,
    `Name: ${course.name}`,
    nickname ? `Nickname: ${nickname}` : undefined,
    `Students: ${studentCount(course)}`,
    `Teachers: ${teacherNames(course)}`,
    `Term: ${course.term?.name ?? 'Not provided by Canvas'}`,
  ].filter(Boolean) as string[];

  const gotcha = courseCoordinatorGotcha(course);
  if (gotcha) lines.push(`Warning: ${gotcha}`);

  return lines.join('\n');
}

function sortCourses(courses: CanvasCourse[], favoriteIds: number[], includeFavorites: boolean): CanvasCourse[] {
  if (!includeFavorites) return [...courses];
  return [...courses].sort((a, b) => {
    const aFavorite = favoriteIds.includes(a.id) ? 0 : 1;
    const bFavorite = favoriteIds.includes(b.id) ? 0 : 1;
    if (aFavorite !== bFavorite) return aFavorite - bFavorite;
    return a.name.localeCompare(b.name);
  });
}

function missingTokenText(canvasUrl: string): string {
  return [
    'No Canvas API token configured, so Canvas courses cannot be listed yet.',
    'You can still generate HTML and paste it into Canvas manually.',
    `To enable course listing and direct publishing later, create a Canvas API token at ${canvasUrl.replace(/\/+$/, '')}/profile/settings and run setup_institution.`,
  ].join('\n');
}

function namingConventionTip(): string {
  return [
    'Tip: Canvas lets you set a course nickname visible only to you.',
    'A format like Sp26 | ITM 310-002 Business Intelligence (RANK) makes it easy to filter courses at a glance, especially when you teach multiple sections or coordinate courses you do not teach.',
  ].join('\n');
}

export async function listCanvasCourses(
  input: ListCanvasCoursesInput,
  config: InstitutionConfig,
  api: CourseApi,
  saveConfig: SaveConfig
): Promise<ListCanvasCoursesResult> {
  if (!config.apiToken?.trim()) {
    return { courses: [], text: missingTokenText(config.canvasUrl) };
  }

  const semester = input.semester ?? 'current';
  const includeFavorites = input.includeFavorites ?? true;
  const enrollmentWorkflowStates = SEMESTER_TO_ENROLLMENT_WORKFLOW_STATE[semester];
  const favoriteIds = config.favoriteCourses ?? [];
  const courses = sortCourses(await api.listCourses(enrollmentWorkflowStates), favoriteIds, includeFavorites);
  const blocks = courses.map(course => courseBlock(course, includeFavorites && favoriteIds.includes(course.id)));

  if (!config.kbTipShown) {
    blocks.push(namingConventionTip());
    saveConfig({ ...config, kbTipShown: true });
  }

  return {
    courses,
    text: blocks.join('\n\n'),
  };
}
