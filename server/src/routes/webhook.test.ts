import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock the services before importing the router
vi.mock('../services/dataStore.js', () => ({
  getDataStore: vi.fn(),
}));

vi.mock('../services/notion.js', () => ({
  getNotion: vi.fn(),
}));

// Import after mocking
import webhookRouter from './webhook.js';
import { getDataStore } from '../services/dataStore.js';
import { getNotion } from '../services/notion.js';

describe('Webhook Routes', () => {
  let app: Express;
  let mockStore: {
    get: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
  };
  let mockNotion: {
    fetchItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock store
    mockStore = {
      get: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        totalItems: 10,
        initialized: true,
        lastUpdated: '2024-01-01T00:00:00Z',
        itemsByType: { project: 5, problem: 3, solution: 2 },
      }),
    };

    // Create mock notion service
    mockNotion = {
      fetchItem: vi.fn().mockResolvedValue({
        id: 'test-id',
        title: 'Test Item',
        type: 'project',
        status: 'In Progress',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }),
    };

    // Setup mocks
    vi.mocked(getDataStore).mockReturnValue(mockStore as never);
    vi.mocked(getNotion).mockReturnValue(mockNotion as never);

    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/webhook', webhookRouter);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('POST /api/webhook (verification)', () => {
    it('should accept verification token', async () => {
      const response = await request(app)
        .post('/api/webhook')
        .send({ verification_token: 'secret_test_token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.received).toBe(true);
      expect(response.body.data.message).toContain('Verification token received');
    });

    it('should store verification token for subsequent requests', async () => {
      // First, send verification token
      await request(app)
        .post('/api/webhook')
        .send({ verification_token: 'secret_test_token' })
        .expect(200);

      // Now send an event with valid signature
      const event = {
        type: 'page.content_updated',
        entity: { id: 'page-123', type: 'page' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const body = JSON.stringify(event);
      const signature = `sha256=${createHmac('sha256', 'secret_test_token').update(body).digest('hex')}`;

      const response = await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/webhook (events)', () => {
    const verificationToken = 'secret_test_token';

    beforeEach(async () => {
      // Setup verification token first
      await request(app)
        .post('/api/webhook')
        .send({ verification_token: verificationToken })
        .expect(200);
    });

    function createSignedRequest(event: object) {
      const body = JSON.stringify(event);
      const signature = `sha256=${createHmac('sha256', verificationToken).update(body).digest('hex')}`;
      return { body, signature };
    }

    it('should reject request without signature', async () => {
      const event = {
        type: 'page.content_updated',
        entity: { id: 'page-123', type: 'page' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const response = await request(app).post('/api/webhook').send(event).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should reject request with invalid signature', async () => {
      const event = {
        type: 'page.content_updated',
        entity: { id: 'page-123', type: 'page' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const response = await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', 'sha256=invalid_signature')
        .send(event)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid payload structure', async () => {
      const { signature } = createSignedRequest({ invalid: 'payload' });

      const response = await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .send({ invalid: 'payload' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid payload');
    });

    it('should handle page.content_updated event', async () => {
      const event = {
        type: 'page.content_updated',
        entity: { id: 'page-123', type: 'page' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const { signature } = createSignedRequest(event);

      const response = await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.received).toBe(true);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockNotion.fetchItem).toHaveBeenCalled();
      expect(mockStore.upsert).toHaveBeenCalled();
    });

    it('should handle page.created event', async () => {
      const event = {
        type: 'page.created',
        entity: { id: 'new-page-123', type: 'page' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const { signature } = createSignedRequest(event);

      await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .send(event)
        .expect(200);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockNotion.fetchItem).toHaveBeenCalled();
      expect(mockStore.upsert).toHaveBeenCalled();
    });

    it('should handle page.deleted event', async () => {
      mockStore.delete.mockReturnValue(true);

      const event = {
        type: 'page.deleted',
        entity: { id: 'page-to-delete', type: 'page' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const { signature } = createSignedRequest(event);

      await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .send(event)
        .expect(200);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockStore.delete).toHaveBeenCalled();
      expect(mockNotion.fetchItem).not.toHaveBeenCalled();
    });

    it('should handle page.moved event', async () => {
      const event = {
        type: 'page.moved',
        entity: { id: 'moved-page', type: 'page' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const { signature } = createSignedRequest(event);

      await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .send(event)
        .expect(200);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockNotion.fetchItem).toHaveBeenCalled();
    });

    it('should ignore non-page entity types', async () => {
      const event = {
        type: 'page.content_updated',
        entity: { id: 'db-123', type: 'database' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const { signature } = createSignedRequest(event);

      await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .send(event)
        .expect(200);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockNotion.fetchItem).not.toHaveBeenCalled();
    });

    it('should handle database schema update event', async () => {
      const event = {
        type: 'database.schema_updated',
        entity: { id: 'db-123', type: 'database' },
        timestamp: new Date().toISOString(),
        workspace_id: 'ws-1',
        subscription_id: 'sub-1',
        integration_id: 'int-1',
        authors: [],
        attempt_number: 1,
      };

      const { signature } = createSignedRequest(event);

      const response = await request(app)
        .post('/api/webhook')
        .set('X-Notion-Signature', signature)
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/webhook/status', () => {
    it('should return webhook status', async () => {
      const response = await request(app).get('/api/webhook/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('configured');
      expect(response.body.data).toHaveProperty('hasVerificationToken');
      expect(response.body.data).toHaveProperty('storeStats');
      expect(response.body.data.storeStats.totalItems).toBe(10);
    });
  });

  describe('POST /api/webhook/set-token', () => {
    it('should set verification token manually', async () => {
      const response = await request(app)
        .post('/api/webhook/set-token')
        .send({ token: 'new_secret_token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.configured).toBe(true);
    });

    it('should reject missing token', async () => {
      const response = await request(app).post('/api/webhook/set-token').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token is required');
    });

    it('should reject non-string token', async () => {
      const response = await request(app)
        .post('/api/webhook/set-token')
        .send({ token: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('UUID Normalization', () => {
  // Test the UUID normalization through the webhook handler
  // The webhook should normalize UUIDs to consistent format

  let app: Express;
  let mockStore: ReturnType<typeof vi.fn> & {
    get: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockStore = Object.assign(vi.fn(), {
      get: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn().mockReturnValue(true),
      getStats: vi.fn().mockReturnValue({
        totalItems: 0,
        initialized: true,
        lastUpdated: null,
        itemsByType: {},
      }),
    });

    vi.mocked(getDataStore).mockReturnValue(mockStore as never);

    app = express();
    app.use(express.json());
    app.use('/api/webhook', webhookRouter);
  });

  it('should normalize UUID without dashes', async () => {
    // First set verification token
    await request(app).post('/api/webhook').send({ verification_token: 'test_token' });

    const event = {
      type: 'page.deleted',
      entity: { id: '12345678abcd1234abcd1234abcd1234', type: 'page' }, // UUID without dashes
      timestamp: new Date().toISOString(),
      workspace_id: 'ws-1',
      subscription_id: 'sub-1',
      integration_id: 'int-1',
      authors: [],
      attempt_number: 1,
    };

    const body = JSON.stringify(event);
    const signature = `sha256=${createHmac('sha256', 'test_token').update(body).digest('hex')}`;

    await request(app)
      .post('/api/webhook')
      .set('X-Notion-Signature', signature)
      .send(event)
      .expect(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should be called with normalized UUID (with dashes)
    expect(mockStore.delete).toHaveBeenCalledWith('12345678-abcd-1234-abcd-1234abcd1234');
  });
});
