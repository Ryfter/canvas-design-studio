import { confirm, input, password } from '@inquirer/prompts';
import Color from 'color';
import { saveConfig } from './config.js';
import type { InstitutionConfig } from './types.js';
import { wcagContrastRatio } from './tools/contrast.js';

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

  let primaryHex: string;
  while (true) {
    primaryHex = await input({
      message: 'Primary brand color (#hex):',
      default: '#0033A0',
      validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #0033A0)',
    });
    const primaryRatio = wcagContrastRatio(primaryHex, '#ffffff');
    if (primaryRatio >= 4.5) {
      console.log(`  Contrast on white: ${primaryRatio.toFixed(2)}:1 — passes WCAG AA`);
      break;
    }
    console.log(`  Contrast on white: ${primaryRatio.toFixed(2)}:1 — ${primaryRatio >= 3.0 ? 'marginal' : 'fails'} for body text (AA requires 4.5:1)`);
    console.log('  White text on this color may not be readable at small sizes. Consider darkening slightly.');
    const go = await confirm({ message: 'Proceed with this color?', default: true });
    if (go) break;
  }

  let secondaryHex: string;
  while (true) {
    secondaryHex = await input({
      message: 'Secondary / accent color (#hex):',
      default: '#D64309',
      validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Enter a valid hex color (e.g. #D64309)',
    });
    const secondaryRatio = wcagContrastRatio(secondaryHex, '#ffffff');
    if (secondaryRatio >= 4.5) {
      console.log(`  Contrast on white: ${secondaryRatio.toFixed(2)}:1 — passes WCAG AA`);
      break;
    }
    console.log(`  Contrast on white: ${secondaryRatio.toFixed(2)}:1 — ${secondaryRatio >= 3.0 ? 'marginal' : 'fails'} for body text (AA requires 4.5:1)`);
    console.log('  White text on this color may not be readable at small sizes. Consider darkening slightly.');
    const go = await confirm({ message: 'Proceed with this color?', default: true });
    if (go) break;
  }

  const canvasUrl = await input({
    message: 'Canvas base URL:',
    default: 'https://boisestate.instructure.com',
    validate: (v) => v.startsWith('https://') || 'URL must start with https://',
  });

  const apiToken = await password({
    message: 'Canvas API token (optional — leave blank to generate HTML and paste it manually):',
    mask: '*',
    validate: (v) => !v || v.length > 10 || 'Token looks too short — leave blank or paste the full token from Canvas Account Settings > Approved Integrations',
  });

  const professorEmail = await input({
    message: 'Professor email for FERPA scan allowlist (optional):',
    default: '',
  });

  const favoriteCoursesRaw = await input({
    message: 'Favorite Canvas course IDs, comma-separated (optional):',
    default: '',
    validate: (v) => {
      if (!v.trim()) return true;
      return v.split(',').every(id => /^\d+$/.test(id.trim())) || 'Use only numeric Canvas course IDs separated by commas.';
    },
  });

  const favoriteCourses = favoriteCoursesRaw
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(Number);

  const colors = deriveColors(primaryHex, secondaryHex);

  const config: InstitutionConfig = {
    institution,
    colors,
    canvasUrl,
    apiToken: apiToken || '',
    professorEmail: professorEmail.trim() || undefined,
    favoriteCourses: favoriteCourses.length > 0 ? favoriteCourses : undefined,
    kbTipShown: false,
  };

  saveConfig(config);

  // Optional Panopto section — always skippable
  const panoptoDomain = await input({
    message: 'Panopto domain (e.g. bsu.hosted.panopto.com, or leave blank to skip):',
    default: '',
  });

  if (panoptoDomain.trim()) {
    const whitelistAnswer = await input({
      message: 'Is Panopto whitelisted for iframes in Canvas? (yes / no / unsure):',
      default: 'unsure',
      validate: (v) => ['yes', 'no', 'unsure'].includes(v.toLowerCase()) || 'Enter yes, no, or unsure',
    });

    const iframeWhitelisted: boolean | null =
      whitelistAnswer.toLowerCase() === 'yes' ? true :
      whitelistAnswer.toLowerCase() === 'no' ? false :
      null;

    const panoptoClientId = await input({
      message: 'Panopto API client ID (leave blank to skip — enables video search and caption download):',
      default: '',
    });

    let panoptoClientSecret = '';
    if (panoptoClientId.trim()) {
      panoptoClientSecret = await password({
        message: 'Panopto API client secret:',
        mask: '*',
      });
    }

    config.panopto = {
      domain: panoptoDomain.trim(),
      iframeWhitelisted,
      ...(panoptoClientId.trim() ? { clientId: panoptoClientId.trim(), clientSecret: panoptoClientSecret } : {}),
    };

    saveConfig(config);
    console.log(`✓ Panopto domain: ${panoptoDomain.trim()}`);
    console.log(`  iFrame whitelisted: ${iframeWhitelisted === null ? 'unsure' : String(iframeWhitelisted)}`);
    if (panoptoClientId.trim()) console.log('✓ Panopto API credentials saved');
  }

  console.log('\n✓ Config saved to ~/.canvas-design-mcp/institution.json');
  console.log(`✓ Primary:   ${colors.primary}  →  dark: ${colors.primaryDark}  light: ${colors.primaryLight}`);
  console.log(`✓ Secondary: ${colors.secondary}`);
  if (!apiToken.trim()) {
    console.log('  Canvas API token skipped. You can still generate HTML and paste it into Canvas manually.');
  }
  if (professorEmail.trim()) {
    console.log(`✓ FERPA scan allowlist email: ${professorEmail.trim()}`);
  }
  if (favoriteCourses.length > 0) {
    console.log(`✓ Favorite Canvas courses: ${favoriteCourses.join(', ')}`);
  }
  console.log('✓ Canvas Design Studio is ready\n');

  printMcpConfig();

  return config;
}
