import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCanvasPage } from '../src/tools/page-io.js';

// Use tmpdir() so tests never touch the real output/ directory.
// Same pattern as personas.test.ts which uses tmpdir() for the personas file path.
const TEST_OUTPUT = join(tmpdir(), 'canvas-design-test-output');

function cleanup() {
  if (existsSync(TEST_OUTPUT)) {
    rmSync(TEST_OUTPUT, { recursive: true, force: true });
  }
}

beforeEach(cleanup);
afterEach(cleanup);

describe('loadCanvasPage', () => {
  it('reads a named file and returns html + filename', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    writeFileSync(join(TEST_OUTPUT, 'test.html'), '<p>Hello</p>', 'utf-8');
    const result = loadCanvasPage({ filename: 'test.html' }, TEST_OUTPUT);
    expect(result.html).toBe('<p>Hello</p>');
    expect(result.filename).toBe('test.html');
  });

  it('auto-selects the most recently modified file when no filename given', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    const olderPath = join(TEST_OUTPUT, 'old.html');
    const newerPath = join(TEST_OUTPUT, 'new.html');
    writeFileSync(olderPath, '<p>old</p>', 'utf-8');
    writeFileSync(newerPath, '<p>new</p>', 'utf-8');
    // utimesSync forces an explicit mtime difference regardless of filesystem resolution.
    // Without this, both files can get the same mtime on fast machines.
    const now = new Date();
    const past = new Date(Date.now() - 5000);
    utimesSync(olderPath, past, past);
    utimesSync(newerPath, now, now);
    const result = loadCanvasPage({}, TEST_OUTPUT);
    expect(result.html).toBe('<p>new</p>');
    expect(result.filename).toBe('new.html');
  });

  it('throws when output/ directory does not exist', () => {
    expect(() => loadCanvasPage({}, TEST_OUTPUT)).toThrow('output/ directory not found');
  });

  it('throws when output/ exists but contains no .html files', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    writeFileSync(join(TEST_OUTPUT, 'readme.txt'), 'not html', 'utf-8');
    expect(() => loadCanvasPage({}, TEST_OUTPUT)).toThrow('No HTML files found');
  });

  it('throws when named file does not exist', () => {
    mkdirSync(TEST_OUTPUT, { recursive: true });
    expect(() => loadCanvasPage({ filename: 'missing.html' }, TEST_OUTPUT)).toThrow('File not found');
  });
});
