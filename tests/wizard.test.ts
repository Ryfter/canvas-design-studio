import { describe, expect, it } from 'vitest';
import { formatSetupSummary } from '../src/wizard.js';
import type { InstitutionConfig } from '../src/types.js';

const baseConfig: InstitutionConfig = {
  institution: 'Boise State University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://boisestate.instructure.com',
  apiToken: 'test-token-abcdefg',
};

describe('formatSetupSummary', () => {
  it('includes the institution name in the heading', () => {
    expect(formatSetupSummary(baseConfig)).toContain('Boise State University');
  });

  it('shows API token as configured when present', () => {
    expect(formatSetupSummary(baseConfig)).toContain('✓ configured');
  });

  it('shows API token as not configured when empty', () => {
    const config = { ...baseConfig, apiToken: '' };
    expect(formatSetupSummary(config)).toContain('not configured');
  });

  it('shows Panopto as not configured when absent', () => {
    expect(formatSetupSummary(baseConfig)).toContain('⚪ Panopto');
  });

  it('shows Panopto domain when configured', () => {
    const config = {
      ...baseConfig,
      panopto: { domain: 'bsu.hosted.panopto.com', iframeWhitelisted: true as const },
    };
    expect(formatSetupSummary(config)).toContain('bsu.hosted.panopto.com');
  });

  it('includes the brand URL row when set', () => {
    const config = { ...baseConfig, brandUrl: 'https://www.boisestate.edu/brand/' };
    expect(formatSetupSummary(config)).toContain('https://www.boisestate.edu/brand/');
  });

  it('omits the brand URL row when not set', () => {
    expect(formatSetupSummary(baseConfig)).not.toContain('Brand URL');
  });

  it('includes the save-to-file tip', () => {
    expect(formatSetupSummary(baseConfig)).toContain('my-canvas-setup.md');
  });

  it('shows publish tool as active when API token is set', () => {
    expect(formatSetupSummary(baseConfig)).toContain('✓ Publish directly to Canvas');
  });

  it('shows publish tool as inactive when API token is absent', () => {
    const config = { ...baseConfig, apiToken: undefined };
    expect(formatSetupSummary(config)).toContain('⚪ Publish directly to Canvas');
  });
});
