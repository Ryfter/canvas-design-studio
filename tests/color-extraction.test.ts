import { describe, it, expect } from 'vitest';
import { extractColors } from '../src/utils/color-extraction.js';

describe('extractColors', () => {
  it('extracts 6-digit hex colors from CSS text', () => {
    const result = extractColors('color: #0033A0; background: #D64309;');
    const hexes = result.map(c => c.hex);
    expect(hexes).toContain('#0033A0');
    expect(hexes).toContain('#D64309');
  });

  it('expands 3-digit hex to 6-digit (#03A → #0033AA)', () => {
    const result = extractColors('color: #03A;');
    expect(result[0].hex).toBe('#0033AA');
  });

  it('finds CSS variable values and records variable name', () => {
    const result = extractColors('--color-primary: #0033A0;');
    const entry = result.find(c => c.hex === '#0033A0');
    expect(entry?.cssVar).toBe('--color-primary');
  });

  it('frequency ranking: most-used color appears first', () => {
    const result = extractColors('color: #0033A0; background: #0033A0; border: #D64309;');
    expect(result[0].hex).toBe('#0033A0');
    expect(result[0].count).toBe(2);
  });

  it('does not create duplicate entries for the same hex', () => {
    const result = extractColors('color: #0033A0; color: #0033A0;');
    const entries = result.filter(c => c.hex === '#0033A0');
    expect(entries).toHaveLength(1);
    expect(entries[0].count).toBe(2);
  });

  it('marks near-black (#111111) as structural', () => {
    const result = extractColors('color: #111111;');
    expect(result[0].structural).toBe(true);
  });

  it('marks near-white (#f5f5f5) as structural', () => {
    const result = extractColors('color: #f5f5f5;');
    expect(result[0].structural).toBe(true);
  });

  it('marks mid-gray (#888888) as structural', () => {
    const result = extractColors('color: #888888;');
    expect(result[0].structural).toBe(true);
  });

  it('does not mark branded blue (#0033A0) as structural', () => {
    const result = extractColors('color: #0033A0;');
    expect(result[0].structural).toBe(false);
  });

  it('returns empty array for empty CSS text', () => {
    expect(extractColors('')).toEqual([]);
  });
});
