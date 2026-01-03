import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isConfigUIDisabled,
  getRefreshCooldownMs,
  getLastRefreshTime,
  setLastRefreshTime,
  checkRefreshCooldown,
  getEnvConfig,
  hasEnvConfig,
  getMergedConfig,
  migrateConfig,
} from './config';
import type { NotionConfig } from '../types';
import { REFRESH } from '../constants';

// Mock the logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Store original import.meta.env
const originalEnv = { ...import.meta.env };

// Helper to set mock environment variables
const mockEnv = (envVars: Record<string, string | undefined>) => {
  // Reset to original first
  Object.keys(import.meta.env).forEach(key => {
    if (key.startsWith('VITE_')) {
      delete (import.meta.env as Record<string, unknown>)[key];
    }
  });

  // Apply new env vars
  Object.entries(envVars).forEach(([key, value]) => {
    (import.meta.env as Record<string, unknown>)[key] = value;
  });
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get _store() {
      return store;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

describe('config utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset env to original
    mockEnv({});
  });

  afterEach(() => {
    // Restore original env
    Object.assign(import.meta.env, originalEnv);
  });

  describe('isConfigUIDisabled', () => {
    it('should return false when env var is not set', () => {
      mockEnv({});
      expect(isConfigUIDisabled()).toBe(false);
    });

    it('should return true when VITE_DISABLE_CONFIG_UI is "true"', () => {
      mockEnv({ VITE_DISABLE_CONFIG_UI: 'true' });
      expect(isConfigUIDisabled()).toBe(true);
    });

    it('should return true when VITE_DISABLE_CONFIG_UI is "TRUE" (case insensitive)', () => {
      mockEnv({ VITE_DISABLE_CONFIG_UI: 'TRUE' });
      expect(isConfigUIDisabled()).toBe(true);
    });

    it('should return false for other values', () => {
      mockEnv({ VITE_DISABLE_CONFIG_UI: 'false' });
      expect(isConfigUIDisabled()).toBe(false);

      mockEnv({ VITE_DISABLE_CONFIG_UI: '1' });
      expect(isConfigUIDisabled()).toBe(false);
    });
  });

  describe('getRefreshCooldownMs', () => {
    it('should return default cooldown when env var is not set', () => {
      mockEnv({});
      expect(getRefreshCooldownMs()).toBe(REFRESH.DEFAULT_COOLDOWN_MS);
    });

    it('should return configured minutes converted to ms', () => {
      mockEnv({ VITE_REFRESH_COOLDOWN_MINUTES: '5' });
      expect(getRefreshCooldownMs()).toBe(5 * 60 * 1000);
    });

    it('should handle decimal values', () => {
      mockEnv({ VITE_REFRESH_COOLDOWN_MINUTES: '0.5' });
      expect(getRefreshCooldownMs()).toBe(0.5 * 60 * 1000);
    });

    it('should return 0 for "0"', () => {
      mockEnv({ VITE_REFRESH_COOLDOWN_MINUTES: '0' });
      expect(getRefreshCooldownMs()).toBe(0);
    });

    it('should return default for invalid values', () => {
      mockEnv({ VITE_REFRESH_COOLDOWN_MINUTES: 'invalid' });
      expect(getRefreshCooldownMs()).toBe(REFRESH.DEFAULT_COOLDOWN_MS);
    });

    it('should return default for negative values', () => {
      mockEnv({ VITE_REFRESH_COOLDOWN_MINUTES: '-5' });
      expect(getRefreshCooldownMs()).toBe(REFRESH.DEFAULT_COOLDOWN_MS);
    });
  });

  describe('getLastRefreshTime', () => {
    it('should return null when not set', () => {
      expect(getLastRefreshTime()).toBeNull();
    });

    it('should return stored timestamp', () => {
      const timestamp = Date.now();
      localStorageMock.setItem(REFRESH.LAST_REFRESH_KEY, timestamp.toString());
      expect(getLastRefreshTime()).toBe(timestamp);
    });

    it('should return null for invalid value', () => {
      localStorageMock.setItem(REFRESH.LAST_REFRESH_KEY, 'invalid');
      expect(getLastRefreshTime()).toBeNull();
    });
  });

  describe('setLastRefreshTime', () => {
    it('should store timestamp in localStorage', () => {
      const timestamp = Date.now();
      setLastRefreshTime(timestamp);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        REFRESH.LAST_REFRESH_KEY,
        timestamp.toString()
      );
    });
  });

  describe('checkRefreshCooldown', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should allow refresh when no last refresh time exists', () => {
      const result = checkRefreshCooldown();
      expect(result.allowed).toBe(true);
      expect(result.remainingMs).toBe(0);
    });

    it('should allow refresh when cooldown has elapsed', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Set last refresh to 5 minutes ago
      localStorageMock.setItem(REFRESH.LAST_REFRESH_KEY, (now - 5 * 60 * 1000).toString());

      const result = checkRefreshCooldown();
      expect(result.allowed).toBe(true);
      expect(result.remainingMs).toBe(0);
    });

    it('should not allow refresh when within cooldown', () => {
      mockEnv({ VITE_REFRESH_COOLDOWN_MINUTES: '2' });
      const now = Date.now();
      vi.setSystemTime(now);

      // Set last refresh to 1 minute ago (within 2 min cooldown)
      localStorageMock.setItem(REFRESH.LAST_REFRESH_KEY, (now - 1 * 60 * 1000).toString());

      const result = checkRefreshCooldown();
      expect(result.allowed).toBe(false);
      expect(result.remainingMs).toBeGreaterThan(0);
      expect(result.remainingMs).toBeLessThanOrEqual(60 * 1000); // Should be ~1 min remaining
    });
  });

  describe('getEnvConfig', () => {
    it('should return null when no API key is set', () => {
      mockEnv({});
      expect(getEnvConfig()).toBeNull();
    });

    it('should return null when API key exists but no databases', () => {
      mockEnv({ VITE_NOTION_API_KEY: 'secret_test123' });
      expect(getEnvConfig()).toBeNull();
    });

    it('should return config with databases when properly configured', () => {
      mockEnv({
        VITE_NOTION_API_KEY: 'secret_test123',
        VITE_NOTION_DB_PROJECT: 'db-project-id',
        VITE_NOTION_DB_MISSION: 'db-mission-id',
      });

      const config = getEnvConfig();
      expect(config).not.toBeNull();
      expect(config!.apiKey).toBe('secret_test123');
      expect(config!.databases).toHaveLength(2);
      expect(config!.databases.some(d => d.type === 'project')).toBe(true);
      expect(config!.databases.some(d => d.type === 'mission')).toBe(true);
    });

    it('should use custom property mappings from env', () => {
      mockEnv({
        VITE_NOTION_API_KEY: 'secret_test123',
        VITE_NOTION_DB_PROJECT: 'db-id',
        VITE_MAPPING_TITLE: 'CustomTitle',
        VITE_MAPPING_STATUS: 'CustomStatus',
      });

      const config = getEnvConfig();
      expect(config!.defaultMappings.title).toBe('CustomTitle');
      expect(config!.defaultMappings.status).toBe('CustomStatus');
    });

    it('should use default mappings when not specified', () => {
      mockEnv({
        VITE_NOTION_API_KEY: 'secret_test123',
        VITE_NOTION_DB_PROJECT: 'db-id',
      });

      const config = getEnvConfig();
      expect(config!.defaultMappings.title).toBe('Name');
      expect(config!.defaultMappings.status).toBe('Status');
    });
  });

  describe('hasEnvConfig', () => {
    it('should return false when no API key', () => {
      mockEnv({});
      expect(hasEnvConfig()).toBe(false);
    });

    it('should return false when API key but no databases', () => {
      mockEnv({ VITE_NOTION_API_KEY: 'secret_test123' });
      expect(hasEnvConfig()).toBe(false);
    });

    it('should return true when API key and at least one database', () => {
      mockEnv({
        VITE_NOTION_API_KEY: 'secret_test123',
        VITE_NOTION_DB_PROJECT: 'db-id',
      });
      expect(hasEnvConfig()).toBe(true);
    });
  });

  describe('getMergedConfig', () => {
    it('should return env config when available', () => {
      mockEnv({
        VITE_NOTION_API_KEY: 'secret_env_key',
        VITE_NOTION_DB_PROJECT: 'env-db-id',
      });

      const storedConfig: NotionConfig = {
        apiKey: 'secret_stored_key',
        databases: [{ databaseId: 'stored-db-id', type: 'project' }],
        defaultMappings: {
          title: 'Name',
          status: 'Status',
          priority: 'Priority',
          owner: 'Owner',
          parent: 'Parent',
          progress: 'Progress',
          dueDate: 'Deadline',
          tags: 'Tags',
        },
      };

      const result = getMergedConfig(storedConfig);
      expect(result!.apiKey).toBe('secret_env_key');
    });

    it('should return stored config when no env config', () => {
      mockEnv({});

      const storedConfig: NotionConfig = {
        apiKey: 'secret_stored_key',
        databases: [{ databaseId: 'stored-db-id', type: 'project' }],
        defaultMappings: {
          title: 'Name',
          status: 'Status',
          priority: 'Priority',
          owner: 'Owner',
          parent: 'Parent',
          progress: 'Progress',
          dueDate: 'Deadline',
          tags: 'Tags',
        },
      };

      const result = getMergedConfig(storedConfig);
      expect(result!.apiKey).toBe('secret_stored_key');
    });

    it('should return null when no config available', () => {
      mockEnv({});
      expect(getMergedConfig(null)).toBeNull();
    });
  });

  describe('migrateConfig', () => {
    it('should return default config for null input', () => {
      const result = migrateConfig(null);
      expect(result.apiKey).toBe('');
      expect(result.databases.project).toBe('');
      expect(result.mappings.title).toBe('Name');
    });

    it('should return default config for invalid input', () => {
      const result = migrateConfig('invalid' as unknown as NotionConfig);
      expect(result.apiKey).toBe('');
    });

    it('should migrate new multi-database format', () => {
      const config: NotionConfig = {
        apiKey: 'secret_test',
        databases: [
          { databaseId: 'project-db', type: 'project' },
          { databaseId: 'mission-db', type: 'mission' },
        ],
        defaultMappings: {
          title: 'Title',
          status: 'Status',
          priority: 'Priority',
          owner: 'Owner',
          parent: 'Parent',
          progress: 'Progress',
          dueDate: 'Due Date',
          tags: 'Tags',
        },
      };

      const result = migrateConfig(config);
      expect(result.apiKey).toBe('secret_test');
      expect(result.databases.project).toBe('project-db');
      expect(result.databases.mission).toBe('mission-db');
      expect(result.mappings.title).toBe('Title');
    });

    it('should migrate legacy single-database format', () => {
      const config: NotionConfig = {
        apiKey: 'secret_legacy',
        databaseId: 'legacy-db-id',
        databases: [],
        defaultMappings: {
          title: 'Name',
          status: 'Status',
          priority: 'Priority',
          owner: 'Owner',
          parent: 'Parent',
          progress: 'Progress',
          dueDate: 'Deadline',
          tags: 'Tags',
        },
        mappings: {
          title: 'LegacyTitle',
          status: 'LegacyStatus',
          priority: 'Priority',
          owner: 'Owner',
          parent: 'Parent',
          progress: 'Progress',
          dueDate: 'Deadline',
          tags: 'Tags',
          type: 'Type',
        },
      };

      const result = migrateConfig(config);
      expect(result.apiKey).toBe('secret_legacy');
      expect(result.databases.project).toBe('legacy-db-id');
      expect(result.mappings.title).toBe('LegacyTitle');
    });

    it('should handle config with empty databases array', () => {
      const config: NotionConfig = {
        apiKey: 'secret_test',
        databases: [],
        databaseId: 'fallback-db',
        defaultMappings: {
          title: 'Name',
          status: 'Status',
          priority: 'Priority',
          owner: 'Owner',
          parent: 'Parent',
          progress: 'Progress',
          dueDate: 'Deadline',
          tags: 'Tags',
        },
      };

      const result = migrateConfig(config);
      expect(result.databases.project).toBe('fallback-db');
    });
  });
});
