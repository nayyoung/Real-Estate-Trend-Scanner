import { describe, it, expect, vi, beforeEach } from 'vitest';

// Extract and test the helper functions used in the application
// These functions are inline in page.tsx but we test their logic here

describe('Helper Functions', () => {
  describe('getMessageText', () => {
    // This function extracts text content from AI SDK v5 message format
    function getMessageText(m: { parts?: Array<{ type: string; text?: string }> }): string {
      if ('parts' in m && Array.isArray(m.parts)) {
        return m.parts
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .map(part => part.text)
          .join('\n');
      }
      return '';
    }

    it('should extract text from message with single text part', () => {
      const message = {
        parts: [{ type: 'text', text: 'Hello world' }],
      };

      expect(getMessageText(message)).toBe('Hello world');
    });

    it('should extract and join text from multiple text parts', () => {
      const message = {
        parts: [
          { type: 'text', text: 'First line' },
          { type: 'text', text: 'Second line' },
        ],
      };

      expect(getMessageText(message)).toBe('First line\nSecond line');
    });

    it('should ignore non-text parts', () => {
      const message = {
        parts: [
          { type: 'text', text: 'Text content' },
          { type: 'tool-call', toolCallId: '123' },
          { type: 'text', text: 'More text' },
        ],
      };

      expect(getMessageText(message)).toBe('Text content\nMore text');
    });

    it('should return empty string for message without parts', () => {
      const message = {};

      expect(getMessageText(message)).toBe('');
    });

    it('should return empty string for message with empty parts array', () => {
      const message = { parts: [] };

      expect(getMessageText(message)).toBe('');
    });

    it('should return empty string for message with only non-text parts', () => {
      const message = {
        parts: [
          { type: 'tool-call', toolCallId: '123' },
          { type: 'tool-result', toolCallId: '123' },
        ],
      };

      expect(getMessageText(message)).toBe('');
    });
  });

  describe('getToolInvocations', () => {
    // This function extracts tool invocations from AI SDK v5 message format
    function getToolInvocations(m: { parts?: Array<{ type: string; toolCallId?: string; input?: Record<string, unknown> }> }) {
      if ('parts' in m && Array.isArray(m.parts)) {
        return m.parts
          .filter((part) => typeof part.type === 'string' && part.type.startsWith('tool-'))
          .map(part => ({
            toolCallId: part.toolCallId || '',
            toolName: part.type.replace('tool-', ''),
            args: part.input || {},
          }));
      }
      return [];
    }

    it('should extract tool invocations from message', () => {
      const message = {
        parts: [
          { type: 'tool-search_web', toolCallId: 'call1', input: { searchQuery: 'test query' } },
        ],
      };

      const result = getToolInvocations(message);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        toolCallId: 'call1',
        toolName: 'search_web',
        args: { searchQuery: 'test query' },
      });
    });

    it('should extract multiple tool invocations', () => {
      const message = {
        parts: [
          { type: 'tool-search_web', toolCallId: 'call1', input: { searchQuery: 'first query' } },
          { type: 'tool-search_web', toolCallId: 'call2', input: { searchQuery: 'second query' } },
        ],
      };

      const result = getToolInvocations(message);

      expect(result).toHaveLength(2);
      expect(result[0].args).toEqual({ searchQuery: 'first query' });
      expect(result[1].args).toEqual({ searchQuery: 'second query' });
    });

    it('should ignore non-tool parts', () => {
      const message = {
        parts: [
          { type: 'text', text: 'Hello' },
          { type: 'tool-search_web', toolCallId: 'call1', input: { searchQuery: 'test' } },
        ],
      };

      const result = getToolInvocations(message);

      expect(result).toHaveLength(1);
      expect(result[0].toolName).toBe('search_web');
    });

    it('should return empty array for message without parts', () => {
      const message = {};

      expect(getToolInvocations(message)).toEqual([]);
    });

    it('should return empty array for message with no tool parts', () => {
      const message = {
        parts: [
          { type: 'text', text: 'Hello' },
        ],
      };

      expect(getToolInvocations(message)).toEqual([]);
    });

    it('should handle missing toolCallId', () => {
      const message = {
        parts: [
          { type: 'tool-search_web', input: { searchQuery: 'test' } },
        ],
      };

      const result = getToolInvocations(message);

      expect(result[0].toolCallId).toBe('');
    });

    it('should handle missing input', () => {
      const message = {
        parts: [
          { type: 'tool-search_web', toolCallId: 'call1' },
        ],
      };

      const result = getToolInvocations(message);

      expect(result[0].args).toEqual({});
    });
  });

  describe('addToHistory', () => {
    // Simulates the addToHistory function logic
    function addToHistory(query: string, searchHistory: string[], maxHistory: number = 5): string[] {
      const trimmed = query.trim();
      return [trimmed, ...searchHistory.filter((h) => h !== trimmed)].slice(0, maxHistory);
    }

    it('should add new query to the beginning of history', () => {
      const result = addToHistory('new query', ['old query']);

      expect(result).toEqual(['new query', 'old query']);
    });

    it('should trim whitespace from query', () => {
      const result = addToHistory('  spaced query  ', []);

      expect(result).toEqual(['spaced query']);
    });

    it('should not duplicate queries', () => {
      const result = addToHistory('existing', ['other', 'existing']);

      expect(result).toEqual(['existing', 'other']);
    });

    it('should limit history to max items', () => {
      const history = ['one', 'two', 'three', 'four', 'five'];
      const result = addToHistory('new', history);

      expect(result).toHaveLength(5);
      expect(result).toEqual(['new', 'one', 'two', 'three', 'four']);
    });

    it('should handle empty history', () => {
      const result = addToHistory('first query', []);

      expect(result).toEqual(['first query']);
    });

    it('should move existing query to front when re-searched', () => {
      const result = addToHistory('middle', ['first', 'middle', 'last']);

      expect(result).toEqual(['middle', 'first', 'last']);
    });
  });

  describe('removeFromHistory', () => {
    // Simulates the removeFromHistory function logic
    function removeFromHistory(query: string, searchHistory: string[]): string[] {
      return searchHistory.filter((h) => h !== query);
    }

    it('should remove query from history', () => {
      const result = removeFromHistory('remove me', ['keep', 'remove me', 'also keep']);

      expect(result).toEqual(['keep', 'also keep']);
    });

    it('should return same array if query not found', () => {
      const result = removeFromHistory('not found', ['one', 'two']);

      expect(result).toEqual(['one', 'two']);
    });

    it('should handle empty history', () => {
      const result = removeFromHistory('query', []);

      expect(result).toEqual([]);
    });
  });

  describe('Date Calculation for Timeframe', () => {
    // Tests the date calculation logic from the API route
    function calculateStartDate(timeframe: string): Date {
      const startDate = new Date();
      if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
      else if (timeframe === 'quarter') startDate.setDate(startDate.getDate() - 90);
      else startDate.setDate(startDate.getDate() - 30); // default: month
      return startDate;
    }

    it('should calculate week timeframe (7 days ago)', () => {
      const now = new Date();
      const result = calculateStartDate('week');

      const diffInDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(7);
    });

    it('should calculate month timeframe (30 days ago)', () => {
      const now = new Date();
      const result = calculateStartDate('month');

      const diffInDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(30);
    });

    it('should calculate quarter timeframe (90 days ago)', () => {
      const now = new Date();
      const result = calculateStartDate('quarter');

      const diffInDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(90);
    });

    it('should default to month for unknown timeframe', () => {
      const now = new Date();
      const result = calculateStartDate('unknown');

      const diffInDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(30);
    });
  });

  describe('Query Length Validation', () => {
    const MAX_QUERY_LENGTH = 500;

    function isQueryTooLong(query: string): boolean {
      return query.length > MAX_QUERY_LENGTH;
    }

    it('should return false for query under max length', () => {
      expect(isQueryTooLong('short query')).toBe(false);
    });

    it('should return false for query at exactly max length', () => {
      const exactLengthQuery = 'a'.repeat(500);
      expect(isQueryTooLong(exactLengthQuery)).toBe(false);
    });

    it('should return true for query over max length', () => {
      const longQuery = 'a'.repeat(501);
      expect(isQueryTooLong(longQuery)).toBe(true);
    });

    it('should return false for empty query', () => {
      expect(isQueryTooLong('')).toBe(false);
    });
  });

  describe('History Display Truncation', () => {
    function truncateForDisplay(query: string, maxLength: number = 35): string {
      return query.length > maxLength ? query.slice(0, maxLength) + '...' : query;
    }

    it('should not truncate short strings', () => {
      expect(truncateForDisplay('short')).toBe('short');
    });

    it('should truncate strings over 35 characters', () => {
      const longString = 'This is a very long string that exceeds thirty-five characters';
      const result = truncateForDisplay(longString);

      expect(result).toBe('This is a very long string that exc...');
      expect(result.length).toBe(38); // 35 + 3 for "..."
    });

    it('should not truncate string at exactly 35 characters', () => {
      const exact = 'a'.repeat(35);
      expect(truncateForDisplay(exact)).toBe(exact);
    });

    it('should handle empty string', () => {
      expect(truncateForDisplay('')).toBe('');
    });
  });
});
