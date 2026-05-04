import { input, password } from '@inquirer/prompts';
import Color from 'color';
import { saveConfig } from './config.js';
import type { InstitutionConfig } from './types.js';

function deriveColors(primary: string, secondary: string): InstitutionConfig['colors'] {
  const c = Color(primary);
  return {
    primary,
    primaryDark: c.darken(0.25).hex(),
    primaryLight: c.lightness(93).hex(),
    secondary,
  };
}

function printMcpConfig(): void {
  const config = {
    mcpServers: {
      'canvas-design': {
        command: 'npx',
        args: ['canvas-design-mcp'],
      },
    },
  };

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Add this to your Claude Code MCP settings:             │');
  console.log('└─────────────────────────────────────────────────────────┘\n');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nRestart Claude Code (or your MCP host) to activate.\n');
  console.log('Works in: Claude Code · VS Code · ChatGPT Codex · any MCP host\n');
}

export async function runWizard(): Promise<InstitutionConfig> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          Canvas Design Studio — First Run Setup           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log('This wizard saves your institution config once.');
  console.log('All fields except Canvas URL and API token can be changed later.\n');

  const institution = await input({
    message: 'Institution name:',
    default: 'Boise State University',
  });

  const primaryHex = await input({
    message: 'Primary brand color (#hex):',
    default: '#0033A0',
    validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #0033A0)',
  });

  const secondaryHex = await input({
    message: 'Secondary / accent color (#hex):',
    default: '#D64309',
    validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #D64309)',
  });

  const canvasUrl = await input({
    message: 'Canvas base URL:',
    default: 'https://boisestate.instructure.com',
    validate: (v) => v.startsWith('https://') || 'URL must start with https://',
  });

  const apiToken = await password({
    message: 'Canvas API token (optional — press Enter to skip for now):',
    mask: '*',
  });

  const colors = deriveColors(primaryHex, secondaryHex);

  const config: InstitutionConfig = {
    institution,
    colors,
    canvasUrl,
    apiToken: apiToken || '',
  };

  saveConfig(config);

  console.log('\n✓ Config saved to ~/.canvas-design-mcp/institution.json');
  console.log(`✓ Primary:   ${colors.primary}  →  dark: ${colors.primaryDark}  light: ${colors.primaryLight}`);
  console.log(`✓ Secondary: ${colors.secondary}`);
  if (!apiToken) {
    console.log('  (Canvas API token not set — publish_to_canvas will not be available)');
  }
  console.log('✓ Canvas Design Studio is ready\n');

  printMcpConfig();

  return config;
}
