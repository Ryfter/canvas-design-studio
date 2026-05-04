#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { configExists, loadConfig } from './config.js';
import { runWizard } from './wizard.js';
import { validateCanvasHtml } from './tools/validate.js';
import { generateCanvasPage } from './tools/generate.js';
import type { GenerateInput } from './tools/generate.js';
import { updateCanvasKb } from './tools/update-kb.js';

async function main() {
  if (!configExists()) {
    if (!process.stdin.isTTY) {
      process.stderr.write(
        'Error: No institution config found.\n' +
        'Run the setup wizard on your host machine first:\n\n' +
        '  npx canvas-design-mcp\n\n' +
        'Then mount the config when running Docker:\n\n' +
        '  docker run -i --rm \\\n' +
        '    -v ~/.canvas-design-mcp:/root/.canvas-design-mcp \\\n' +
        '    ghcr.io/ryfter/canvas-design-studio:latest\n'
      );
      process.exit(1);
    }
    await runWizard();
  }

  const server = new Server(
    { name: 'canvas-design-studio', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'setup_institution',
        description: 'Re-run the setup wizard to update institution config (brand colors, Canvas URL, API token). Run this to change institutions or rotate credentials.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'generate_canvas_page',
        description: 'Generate a beautiful, Canvas-safe HTML assignment page from a brief. Returns HTML ready to paste into Canvas, a hero image prompt for ChatGPT, and the suggested filename.',
        inputSchema: {
          type: 'object' as const,
          required: ['assignmentBrief', 'courseName', 'courseNumber', 'assignmentNumber', 'professorName', 'semester'],
          properties: {
            assignmentBrief: { type: 'string', description: 'Raw assignment instructions — paste from Word, email, or notes. Claude will rewrite into polished student-friendly copy.' },
            courseName: { type: 'string', description: 'e.g. AI Augmented Projects' },
            courseNumber: { type: 'string', description: 'e.g. ITM 370' },
            assignmentNumber: { type: 'string', description: 'e.g. 16.06' },
            professorName: { type: 'string', description: 'e.g. Dr. Rank' },
            semester: { type: 'string', description: 'e.g. Fall 2026' },
            styleNotes: { type: 'string', description: 'Optional layout or tone preferences. e.g. "two-column, energetic tone, include a resources sidebar"' },
          },
        },
      },
      {
        name: 'validate_canvas_html',
        description: 'Check any HTML string against Canvas RCE compliance rules. Returns a list of violations with the offending snippets. Use before pasting into Canvas.',
        inputSchema: {
          type: 'object' as const,
          required: ['html'],
          properties: {
            html: { type: 'string', description: 'HTML string to validate' },
          },
        },
      },
      {
        name: 'update_canvas_kb',
        description: 'Refresh the Canvas knowledge base from live Instructure documentation via Context7. Run periodically to keep validation rules and component references current.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            force: { type: 'boolean', description: 'Force update even if KB was recently refreshed' },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'setup_institution') {
        await runWizard();
        return {
          content: [{ type: 'text', text: 'Institution config updated. Canvas Design Studio is ready.' }],
        };
      }

      if (name === 'validate_canvas_html') {
        const { html } = args as { html: string };
        const result = validateCanvasHtml(html);
        const summary = result.valid
          ? '✓ HTML is Canvas-compliant. No violations found.'
          : `✗ ${result.violations.length} violation(s) found:\n\n` +
            result.violations.map((v, i) => `${i + 1}. ${v.rule}\n   Context: ${v.context}`).join('\n\n');
        return { content: [{ type: 'text', text: summary }] };
      }

      if (name === 'generate_canvas_page') {
        const config = loadConfig();
        const result = generateCanvasPage(args as unknown as GenerateInput, config);
        const response = [
          `✓ Page generated: ${result.filename}`,
          result.warnings.length > 0
            ? `\n⚠ Warnings:\n${result.warnings.map(w => `  • ${w}`).join('\n')}`
            : '',
          `\n📸 Hero image prompt (1200×400px):\n${result.heroImagePrompt}`,
          `\n\`\`\`html\n${result.html}\n\`\`\``,
        ].join('');
        return { content: [{ type: 'text', text: response }] };
      }

      if (name === 'update_canvas_kb') {
        const { force } = (args ?? {}) as { force?: boolean };
        const result = await updateCanvasKb(force ?? false);
        const lines: string[] = [];
        if (!result.updated && result.changes.length === 0) {
          lines.push(`✓ KB is current (last checked: ${result.lastChecked})`);
          lines.push(`  ${result.cssPropsCount} CSS properties · ${result.htmlTagsCount} HTML tags tracked`);
        } else if (result.parseWarning) {
          lines.push(`⚠ ${result.parseWarning}`);
        } else {
          lines.push(`✓ KB updated from Canvas LMS source (${result.lastChecked})`);
          lines.push(`  ${result.cssPropsCount} CSS properties · ${result.htmlTagsCount} HTML tags`);
          if (result.changes.length > 0) {
            lines.push(`\nChanges:\n${result.changes.map(c => `  ${c}`).join('\n')}`);
          } else {
            lines.push('  No changes detected — allowlist is unchanged.');
          }
        }
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }

      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
