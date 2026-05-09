import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

// All four types are exported because src/index.ts needs them for type-casting args.
// Co-located here (not in src/types.ts) because they're only used by this file + index.ts.
export interface LoadCanvasPageInput { filename?: string }
export interface LoadCanvasPageResult { html: string; filename: string }
export interface SaveCanvasPageInput { html: string; filename: string }
export interface SaveCanvasPageResult { saved: string; backup: string | null }

// Resolves relative to wherever the professor runs the server — same convention as ingest/.
export const OUTPUT_DIR = join(process.cwd(), 'output');

// outputDir is a parameter (not hardcoded) so tests can pass tmpdir() instead of polluting
// the real output/ directory. Same testability pattern as personas.ts (personasPath param).
export function loadCanvasPage(input: LoadCanvasPageInput, outputDir = OUTPUT_DIR): LoadCanvasPageResult {
  if (!existsSync(outputDir)) {
    throw new Error('output/ directory not found. Generate a page first with generate_canvas_page.');
  }

  if (input.filename) {
    const filePath = join(outputDir, input.filename);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: output/${input.filename}`);
    }
    try {
      const html = readFileSync(filePath, 'utf-8');
      return { html, filename: input.filename };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Cannot read file: ${message}`);
    }
  }

  // Auto-select: scan for .html files, sort by mtime descending, pick first.
  const htmlFiles = readdirSync(outputDir).filter(f => f.endsWith('.html'));
  if (htmlFiles.length === 0) {
    throw new Error('No HTML files found in output/. Generate a page first with generate_canvas_page.');
  }

  const sorted = htmlFiles
    .map(f => ({ name: f, mtime: statSync(join(outputDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const filename = sorted[0].name;
  try {
    const html = readFileSync(join(outputDir, filename), 'utf-8');
    return { html, filename };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read file: ${message}`);
  }
}
