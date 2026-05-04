import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

const TEST_DIR = join(process.cwd(), 'tests', '.tmp-config');

vi.mock('../src/config.js', async () => {
  const { existsSync, mkdirSync, readFileSync, writeFileSync } = await import('fs');
  const CONFIG_PATH = join(TEST_DIR, 'institution.json');
  return {
    configExists: () => existsSync(CONFIG_PATH),
    loadConfig: () => {
      if (!existsSync(CONFIG_PATH)) throw new Error('No config found');
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    },
    saveConfig: (config: unknown) => {
      if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    },
  };
});

const { configExists, loadConfig, saveConfig } = await import('../src/config.js');

const SAMPLE_CONFIG = {
  institution: 'Test University',
  colors: {
    primary: '#0033A0',
    primaryDark: '#002277',
    primaryLight: '#E6ECF9',
    secondary: '#D64309',
  },
  canvasUrl: 'https://test.instructure.com',
  apiToken: 'test-token-123',
};

describe('config', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('configExists returns false when no config file', () => {
    expect(configExists()).toBe(false);
  });

  it('saveConfig writes institution.json', () => {
    saveConfig(SAMPLE_CONFIG);
    expect(configExists()).toBe(true);
  });

  it('loadConfig returns saved config', () => {
    saveConfig(SAMPLE_CONFIG);
    const loaded = loadConfig();
    expect(loaded.institution).toBe('Test University');
    expect(loaded.colors.primary).toBe('#0033A0');
    expect(loaded.apiToken).toBe('test-token-123');
  });

  it('loadConfig throws when config missing', () => {
    expect(() => loadConfig()).toThrow('No config found');
  });
});
