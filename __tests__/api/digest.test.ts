import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/digest/route';

// Mock the external dependencies
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({ name: 'mock-anthropic-model' })),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(() => ({
    toUIMessageStreamResponse: vi.fn(() => new Response('mock stream', { status: 200 })),
  })),
  stepCountIs: vi.fn(() => ({})),
}));

vi.mock('exa-js', () => {
  return {
    default: class MockExa {
      searchAndContents = vi.fn().mockResolvedValue({
        results: [
          { title: 'Test Result', url: 'https://example.com', text: 'Test content' },
        ],
      });
    },
  };
});

describe('POST /api/digest', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.EXA_API_KEY = 'test-exa-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Environment Variable Validation', () => {
    it('should return 500 when ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test query' }],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Missing Anthropic API key');
    });

    it('should return 500 when EXA_API_KEY is missing', async () => {
      delete process.env.EXA_API_KEY;

      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test query' }],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Missing Exa API key');
    });
  });

  describe('Request Body Validation', () => {
    it('should return 400 for invalid JSON body', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 when messages is missing', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: 'month' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Messages array is required');
    });

    it('should return 400 when messages is not an array', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: 'not an array',
          timeframe: 'month',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Messages array is required');
    });

    it('should return 400 when messages array is empty', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('must not be empty');
    });

    it('should return 400 when query exceeds max length', async () => {
      const longQuery = 'a'.repeat(501);

      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: longQuery }],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('exceeds maximum length');
    });

    it('should accept query at exactly max length (500 characters)', async () => {
      const maxLengthQuery = 'a'.repeat(500);

      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: maxLengthQuery }],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Successful Requests', () => {
    it('should return 200 for valid request with default timeframe', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'What are agents saying about CRMs?' }],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should return 200 for valid request with week timeframe', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test query' }],
          timeframe: 'week',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should return 200 for valid request with month timeframe', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test query' }],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should return 200 for valid request with quarter timeframe', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test query' }],
          timeframe: 'quarter',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle multiple messages in array', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'first message' },
            { role: 'assistant', content: 'response' },
            { role: 'user', content: 'second message' },
          ],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle message with non-string content gracefully', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: { parts: ['test'] } }],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);

      // Should succeed because the validation only checks string content length
      expect(response.status).toBe(200);
    });

    it('should handle missing content field in message', async () => {
      const request = new Request('http://localhost:3000/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user' }],
          timeframe: 'month',
        }),
      });

      const response = await POST(request);

      // Should succeed because the validation handles undefined content
      expect(response.status).toBe(200);
    });
  });
});
