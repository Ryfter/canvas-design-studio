#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CanvasApiClient } from './canvas-api.js';
import { configExists, loadConfig, saveConfig } from './config.js';
import { runWizard } from './wizard.js';
import { validateCanvasHtml } from './tools/validate.js';
import { generateCanvasPage } from './tools/generate.js';
import type { GenerateInput } from './tools/generate.js';
import { updateCanvasKb } from './tools/update-kb.js';
import { listCanvasCourses } from './tools/list-courses.js';
import type { ListCanvasCoursesInput } from './tools/list-courses.js';
import { publishToCanvas } from './tools/publish.js';
import type { PublishToCanvasInput } from './tools/publish.js';
import { auditAccessibility } from './tools/accessibility.js';
import { critiqueCanvasPage } from './tools/critique.js';
import type { CritiqueInput } from './tools/critique.js';
import { redesignCanvasPage } from './tools/redesign.js';
import type { RedesignInput } from './tools/redesign.js';

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
      {
        name: 'list_canvas_courses',
        description: 'List Canvas courses available to the configured professor, with semester filtering, favorite pinning, and course metadata to help choose the right course.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            semester: {
              type: 'string',
              enum: ['current', 'future', 'past', 'all'],
              description: 'Course filter: current active courses, future invited/pending courses, past completed courses, or all courses.',
            },
            includeFavorites: {
              type: 'boolean',
              description: 'Pin configured favorite course IDs to the top. Defaults to true.',
            },
          },
        },
      },
      {
        name: 'publish_to_canvas',
        description: 'Validate and publish Canvas-safe HTML to a Canvas course page. Detects FERPA risks, validation issues, and similar existing page titles before writing.',
        inputSchema: {
          type: 'object' as const,
          required: ['courseId', 'html', 'pageTitle'],
          properties: {
            courseId: { type: 'number', description: 'Canvas course ID from list_canvas_courses.' },
            html: { type: 'string', description: 'Canvas-safe HTML to publish.' },
            pageTitle: { type: 'string', description: 'Canvas page title.' },
            forcePublish: { type: 'boolean', description: 'Skip Canvas HTML validation gate. Defaults to false.' },
            skipFerpaCheck: { type: 'boolean', description: 'Skip FERPA/PII scan. Defaults to false.' },
            collisionAction: {
              type: 'string',
              enum: ['update', 'create', 'related', 'cancel'],
              description: 'Use only after a TITLE_COLLISION response to choose how to proceed.',
            },
            relatedPageTitle: {
              type: 'string',
              description: 'Required when collisionAction is related.',
            },
          },
        },
      },
      {
        name: 'critique_canvas_page',
        description: 'Evaluate a Canvas HTML page for visual design quality. Returns a score, strengths, and prioritized findings. Use quick mode for a fast structural check; comprehensive mode for a full design review with KB context for Claude to reason about.',
        inputSchema: {
          type: 'object' as const,
          required: ['html', 'pageType', 'primaryGoal'],
          properties: {
            html: { type: 'string', description: 'Canvas HTML to evaluate.' },
            pageType: {
              type: 'string',
              enum: ['assignment', 'week-overview', 'course-home', 'syllabus', 'other'],
              description: 'Type of Canvas page — informs which checks apply.',
            },
            primaryGoal: { type: 'string', description: 'What a student should do or understand from this page. e.g. "Submit the video project" or "Know what to read this week."' },
            audience: { type: 'string', description: 'Optional. e.g. "first-year undergrads" or "graduate students".' },
            mode: {
              type: 'string',
              enum: ['quick', 'comprehensive'],
              description: 'quick: fast code-based checks only. comprehensive: adds KB design principles to the response for deeper Claude analysis. Defaults to quick.',
            },
          },
        },
      },
      {
        name: 'redesign_canvas_page',
        description: 'Apply design fixes to Canvas HTML based on critique findings. Applies mechanical fixes automatically; returns remaining findings and KB context for Claude to address. Runs WCAG 2.1 AA accessibility check on output.',
        inputSchema: {
          type: 'object' as const,
          required: ['html', 'findings'],
          properties: {
            html: { type: 'string', description: 'Original Canvas HTML to fix.' },
            findings: { type: 'array', description: 'findings array from critique_canvas_page output.' },
            mode: {
              type: 'string',
              enum: ['quick', 'comprehensive'],
              description: 'quick: mechanical fixes only. comprehensive: mechanical fixes + KB context for Claude to complete the redesign. Defaults to quick.',
            },
            pageType: { type: 'string', description: 'Optional. Helps Claude in comprehensive mode.' },
            primaryGoal: { type: 'string', description: 'Optional. Helps Claude in comprehensive mode.' },
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
        const rce = validateCanvasHtml(html);
        const a11y = auditAccessibility(html);

        const rceSummary = rce.valid
          ? '✓ Canvas RCE: HTML is Canvas-compliant. No violations found.'
          : `✗ Canvas RCE: ${rce.violations.length} violation(s) found:\n\n` +
            rce.violations.map((v, i) => `${i + 1}. ${v.rule}\n   Context: ${v.context}`).join('\n\n');

        const a11ySummary = a11y.length === 0
          ? '✓ Accessibility (WCAG 2.1 AA): No issues found.'
          : `⚠ Accessibility (WCAG 2.1 AA — advisory): ${a11y.length} issue(s) found:\n\n` +
            a11y.map((w, i) => `${i + 1}. ${w.check}: ${w.message}${w.context ? `\n   Context: ${w.context}` : ''}`).join('\n\n');

        return {
          content: [{ type: 'text', text: `${rceSummary}\n\n${a11ySummary}` }],
          isError: !rce.valid,
        };
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

      if (name === 'list_canvas_courses') {
        const config = loadConfig();
        const api = new CanvasApiClient(config);
        const result = await listCanvasCourses((args ?? {}) as ListCanvasCoursesInput, config, api, saveConfig);
        return { content: [{ type: 'text', text: result.text }] };
      }

      if (name === 'publish_to_canvas') {
        const config = loadConfig();
        const api = new CanvasApiClient(config);
        const result = await publishToCanvas(args as unknown as PublishToCanvasInput, config, api);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: 'error' in result,
        };
      }

      if (name === 'critique_canvas_page') {
        const input = args as unknown as CritiqueInput;
        const result = critiqueCanvasPage(input);

        const lines: string[] = [];
        lines.push(`Design Score: ${result.score}/100 (${result.mode} mode${input.pageType ? ` — ${input.pageType}` : ''})`);

        if (result.strengths.length > 0) {
          lines.push(`\n\nStrengths:\n${result.strengths.map(s => `  ✓ ${s}`).join('\n')}`);
        }

        if (result.findings.length === 0) {
          lines.push('\n\n✓ No design issues found.');
        } else {
          for (const p of ['high', 'medium', 'low'] as const) {
            const group = result.findings.filter(f => f.priority === p);
            if (group.length === 0) continue;
            lines.push(`\n\n${p.toUpperCase()} priority:\n` +
              group.map(f => `  [${f.area}] ${f.issue}\n  → ${f.suggestion}`).join('\n'));
          }
        }

        if (result.kbContext) {
          lines.push(`\n\n---\nDesign KB (comprehensive mode):\n${result.kbContext}`);
        }

        return { content: [{ type: 'text', text: lines.join('') }] };
      }

      if (name === 'redesign_canvas_page') {
        const input = args as unknown as RedesignInput;
        const result = redesignCanvasPage(input);

        const lines: string[] = [];

        if (result.appliedFixes.length > 0) {
          lines.push(`✓ Applied ${result.appliedFixes.length} fix(es):\n${result.appliedFixes.map(f => `  • ${f}`).join('\n')}`);
        } else {
          lines.push('No mechanical fixes were applicable.');
        }

        if (result.skippedFindings.length > 0) {
          lines.push(`\n\n⚠ ${result.skippedFindings.length} finding(s) need manual attention:\n` +
            result.skippedFindings.map(s => `  • ${s}`).join('\n'));
        }

        if (result.accessibilityWarnings?.length) {
          lines.push(`\n\nAccessibility (WCAG 2.1 AA — advisory):\n` +
            result.accessibilityWarnings.map(w => `  ⚠ ${w.check}: ${w.message}`).join('\n'));
        }

        if (result.kbContext) {
          lines.push(`\n\n---\nDesign KB (use this to complete remaining fixes):\n${result.kbContext}`);
        }

        lines.push(`\n\n\`\`\`html\n${result.html}\n\`\`\``);

        return { content: [{ type: 'text', text: lines.join('') }] };
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
