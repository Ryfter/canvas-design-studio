import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  weightedSample,
  poolSample,
  RACE_TABLE,
  DISABILITY_TABLE,
  DIMENSION_POOLS,
} from '../src/tools/personas.js';

const TEST_PERSONAS = join(tmpdir(), 'canvas-design-test-personas.md');

beforeEach(() => { if (existsSync(TEST_PERSONAS)) unlinkSync(TEST_PERSONAS); });
afterEach(() => { if (existsSync(TEST_PERSONAS)) unlinkSync(TEST_PERSONAS); });

describe('weightedSample', () => {
  it('samples race according to weighted distribution', () => {
    // White is 57.8% of the population — over 1000 trials, expect ~578 ± 50
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const result = weightedSample(RACE_TABLE);
      counts[result] = (counts[result] ?? 0) + 1;
    }
    expect(counts['White']).toBeGreaterThan(528);
    expect(counts['White']).toBeLessThan(628);
  });

  it('samples disability status according to weighted distribution', () => {
    // None is 61% of the population — over 1000 trials, expect ~610 ± 50
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const result = weightedSample(DISABILITY_TABLE);
      counts[result] = (counts[result] ?? 0) + 1;
    }
    expect(counts['None']).toBeGreaterThan(560);
    expect(counts['None']).toBeLessThan(660);
  });
});

describe('poolSample', () => {
  it('returns all values from a small pool over many trials', () => {
    // A 5-item pool should have all 5 values appear in 200 draws
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(poolSample(pool));
    expect(seen.size).toBe(5);
  });
});
