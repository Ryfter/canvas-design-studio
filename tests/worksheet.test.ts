import { describe, expect, it } from 'vitest';
import { parseWorksheet } from '../src/utils/worksheet.js';
import type { WizardDefaults } from '../src/utils/worksheet.js';

const FILLED_WORKSHEET = `
## Brand Standards (Fill this first — it can save you the color lookup)

Your answer: https://www.boisestate.edu/brand/
Example:     https://www.boisestate.edu/brand/

## Institution Name

Your answer: Boise State University
Example:     Boise State University

## Primary Brand Color

Your answer (6-digit hex): #0033A0
Example:                   #0033A0

## Secondary / Accent Color

Your answer (6-digit hex): #D64309
Example:                   #D64309

## Canvas Base URL

Your answer: https://boisestate.instructure.com
Example:     https://boisestate.instructure.com

## Canvas API Token (Optional)

Your answer: mysecrettoken12345678901234567890
(leave blank to skip)

## Professor Email (Optional)

Your answer: kevin@boisestate.edu
Example:     you@university.edu

## Favorite Canvas Course IDs (Optional)

Your answer (comma-separated): 12345, 67890
Example:                       12345, 67890

## Panopto Domain (Optional)

Your answer: bsu.hosted.panopto.com
Example:     bsu.hosted.panopto.com

## Panopto API Client ID and Secret (Optional)

Client ID:     myclientid123
Client Secret: myclientsecret456

## Teaching Philosophy (Optional — answered interactively in the wizard)

1. What's one thing you always tell students...
Your answer: Learn by doing

2. What does a student who truly gets it...
Your answer: They ask questions

3. What's the biggest mistake...
Your answer: ___________________________________

4. What separates an A from a B...
Your answer: Attention to detail

5. Are there teaching frameworks...
Your answer: ___________________________________

6. Any quotes or sayings...
Your answer: ___________________________________
`;

describe('parseWorksheet', () => {
  it('extracts institution from a filled worksheet', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).institution).toBe('Boise State University');
  });

  it('extracts brandUrl from the brand standards section', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).brandUrl).toBe('https://www.boisestate.edu/brand/');
  });

  it('extracts primaryColor', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).primaryColor).toBe('#0033A0');
  });

  it('extracts secondaryColor', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).secondaryColor).toBe('#D64309');
  });

  it('extracts canvasUrl', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).canvasUrl).toBe('https://boisestate.instructure.com');
  });

  it('extracts apiToken', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).apiToken).toBe('mysecrettoken12345678901234567890');
  });

  it('extracts professorEmail', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).professorEmail).toBe('kevin@boisestate.edu');
  });

  it('extracts favoriteCourses as raw comma string', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).favoriteCourses).toBe('12345, 67890');
  });

  it('extracts panoptoDomain', () => {
    expect(parseWorksheet(FILLED_WORKSHEET).panoptoDomain).toBe('bsu.hosted.panopto.com');
  });

  it('extracts panoptoClientId and panoptoClientSecret', () => {
    const result = parseWorksheet(FILLED_WORKSHEET);
    expect(result.panoptoClientId).toBe('myclientid123');
    expect(result.panoptoClientSecret).toBe('myclientsecret456');
  });

  it('extracts filled philosophy answers at correct indices', () => {
    const result = parseWorksheet(FILLED_WORKSHEET);
    expect(result.philosophyAnswers?.[0]).toBe('Learn by doing');
    expect(result.philosophyAnswers?.[1]).toBe('They ask questions');
    expect(result.philosophyAnswers?.[3]).toBe('Attention to detail');
  });

  it('leaves blank philosophy answers as empty string', () => {
    const result = parseWorksheet(FILLED_WORKSHEET);
    expect(result.philosophyAnswers?.[2]).toBe('');
    expect(result.philosophyAnswers?.[4]).toBe('');
  });

  it('excludes blank ___ values from result', () => {
    const ws = '## Institution Name\n\nYour answer: ___________________________________\nExample: Boise State\n';
    expect(parseWorksheet(ws).institution).toBeUndefined();
  });

  it('trims whitespace from extracted values', () => {
    const ws = '## Institution Name\n\nYour answer:   Boise State University   \n';
    expect(parseWorksheet(ws).institution).toBe('Boise State University');
  });

  it('returns empty object for empty input', () => {
    expect(parseWorksheet('')).toEqual({});
  });
});
