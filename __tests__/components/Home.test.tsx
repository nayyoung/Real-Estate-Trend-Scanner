import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

// Store mock functions for testing
const mockSendMessage = vi.fn();
let mockMessages: Array<{ id: string; role: string; parts: Array<{ type: string; text?: string; toolCallId?: string; input?: Record<string, unknown> }> }> = [];
let mockStatus = 'ready';

// Mock the AI SDK hooks and classes
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: mockMessages,
    sendMessage: mockSendMessage,
    status: mockStatus,
  }),
}));

vi.mock('ai', () => ({
  DefaultChatTransport: class MockTransport {
    constructor() {}
  },
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

describe('Home Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
    mockStatus = 'ready';
    // Reset localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the header with title "Digest"', () => {
      render(<Home />);
      expect(screen.getByText('Digest')).toBeInTheDocument();
    });

    it('should render the description text', () => {
      render(<Home />);
      expect(
        screen.getByText(/Scan real estate communities for trends/i)
      ).toBeInTheDocument();
    });

    it('should render the query input field', () => {
      render(<Home />);
      expect(screen.getByLabelText(/Research Query/i)).toBeInTheDocument();
    });

    it('should render the timeframe select dropdown', () => {
      render(<Home />);
      expect(screen.getByLabelText(/Timeframe/i)).toBeInTheDocument();
    });

    it('should render the submit button with "Run Digest" text', () => {
      render(<Home />);
      expect(screen.getByRole('button', { name: /Run Digest/i })).toBeInTheDocument();
    });

    it('should render all three example queries', () => {
      render(<Home />);
      expect(screen.getByText('What are agents saying about CRMs?')).toBeInTheDocument();
      expect(screen.getByText('Pain points with property management software')).toBeInTheDocument();
      expect(screen.getByText('Trends in real estate marketing tools')).toBeInTheDocument();
    });

    it('should render the footer', () => {
      render(<Home />);
      expect(screen.getByText(/Powered by/i)).toBeInTheDocument();
      expect(screen.getByText(/Claude \+ Exa/i)).toBeInTheDocument();
    });
  });

  describe('Timeframe Selection', () => {
    it('should have "Past month" selected by default', () => {
      render(<Home />);
      const select = screen.getByLabelText(/Timeframe/i) as HTMLSelectElement;
      expect(select.value).toBe('month');
    });

    it('should have all three timeframe options', () => {
      render(<Home />);
      expect(screen.getByRole('option', { name: 'Past week' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Past month' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Past 3 months' })).toBeInTheDocument();
    });

    it('should update timeframe when changed', async () => {
      const user = userEvent.setup();
      render(<Home />);
      const select = screen.getByLabelText(/Timeframe/i);

      await user.selectOptions(select, 'week');
      expect((select as HTMLSelectElement).value).toBe('week');

      await user.selectOptions(select, 'quarter');
      expect((select as HTMLSelectElement).value).toBe('quarter');
    });
  });

  describe('Form Input', () => {
    it('should update input value when typing', async () => {
      const user = userEvent.setup();
      render(<Home />);
      const input = screen.getByLabelText(/Research Query/i);

      await user.type(input, 'test query');
      expect(input).toHaveValue('test query');
    });

    it('should have placeholder text', () => {
      render(<Home />);
      const input = screen.getByLabelText(/Research Query/i);
      expect(input).toHaveAttribute('placeholder', 'What are agents saying about CRMs?');
    });
  });

  describe('Form Submission', () => {
    it('should call sendMessage when form is submitted with valid input', async () => {
      const user = userEvent.setup();
      render(<Home />);
      const input = screen.getByLabelText(/Research Query/i);
      const form = screen.getByRole('button', { name: /Run Digest/i }).closest('form')!;

      await user.type(input, 'test query');
      fireEvent.submit(form);

      expect(mockSendMessage).toHaveBeenCalledWith({ text: 'test query' });
    });

    it('should clear input after submission', async () => {
      const user = userEvent.setup();
      render(<Home />);
      const input = screen.getByLabelText(/Research Query/i);
      const form = screen.getByRole('button', { name: /Run Digest/i }).closest('form')!;

      await user.type(input, 'test query');
      fireEvent.submit(form);

      expect(input).toHaveValue('');
    });

    it('should not call sendMessage when input is empty', () => {
      render(<Home />);
      const form = screen.getByRole('button', { name: /Run Digest/i }).closest('form')!;

      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should not call sendMessage when input is only whitespace', async () => {
      const user = userEvent.setup();
      render(<Home />);
      const input = screen.getByLabelText(/Research Query/i);
      const form = screen.getByRole('button', { name: /Run Digest/i }).closest('form')!;

      await user.type(input, '   ');
      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Example Queries', () => {
    it('should call sendMessage when clicking an example query', async () => {
      const user = userEvent.setup();
      render(<Home />);
      const exampleButton = screen.getByText('What are agents saying about CRMs?');

      await user.click(exampleButton);

      expect(mockSendMessage).toHaveBeenCalledWith({ text: 'What are agents saying about CRMs?' });
    });

    it('should save query to localStorage when example is clicked', async () => {
      const user = userEvent.setup();
      render(<Home />);
      const exampleButton = screen.getByText('Pain points with property management software');

      await user.click(exampleButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'digest-search-history',
        expect.stringContaining('Pain points with property management software')
      );
    });
  });

  describe('Search History', () => {
    it('should load history from localStorage on mount', () => {
      const savedHistory = JSON.stringify(['Query 1', 'Query 2']);
      vi.mocked(localStorage.getItem).mockReturnValue(savedHistory);

      render(<Home />);

      expect(localStorage.getItem).toHaveBeenCalledWith('digest-search-history');
    });

    it('should display recent searches when history exists', () => {
      const savedHistory = JSON.stringify(['Previous search']);
      vi.mocked(localStorage.getItem).mockReturnValue(savedHistory);

      render(<Home />);

      expect(screen.getByText('Recent searches')).toBeInTheDocument();
      expect(screen.getByText('Previous search')).toBeInTheDocument();
    });

    it('should not display recent searches section when history is empty', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      render(<Home />);

      expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json');

      expect(() => render(<Home />)).not.toThrow();
      expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
    });

    it('should truncate long history items in display', () => {
      const longQuery = 'This is a very long query that exceeds thirty-five characters';
      const savedHistory = JSON.stringify([longQuery]);
      vi.mocked(localStorage.getItem).mockReturnValue(savedHistory);

      render(<Home />);

      // Should show truncated version
      expect(screen.getByText(/This is a very long query that exc.../)).toBeInTheDocument();
    });

    it('should call sendMessage when clicking a history item', async () => {
      const user = userEvent.setup();
      const savedHistory = JSON.stringify(['History query']);
      vi.mocked(localStorage.getItem).mockReturnValue(savedHistory);

      render(<Home />);
      const historyButton = screen.getByText('History query');

      await user.click(historyButton);

      expect(mockSendMessage).toHaveBeenCalledWith({ text: 'History query' });
    });
  });

  describe('Loading State', () => {
    it('should show "Scanning..." text when loading', () => {
      mockStatus = 'streaming';
      render(<Home />);

      expect(screen.getByText('Scanning...')).toBeInTheDocument();
    });

    it('should disable input when loading', () => {
      mockStatus = 'streaming';
      render(<Home />);

      expect(screen.getByLabelText(/Research Query/i)).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      mockStatus = 'streaming';
      render(<Home />);

      expect(screen.getByRole('button', { name: /Scanning/i })).toBeDisabled();
    });

    it('should disable example query buttons when loading', () => {
      mockStatus = 'streaming';
      render(<Home />);

      const exampleButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('agents') ||
        btn.textContent?.includes('Pain points') ||
        btn.textContent?.includes('Trends')
      );

      exampleButtons.forEach(btn => {
        expect(btn).toBeDisabled();
      });
    });

    it('should disable timeframe select when loading', () => {
      mockStatus = 'streaming';
      render(<Home />);

      expect(screen.getByLabelText(/Timeframe/i)).toBeDisabled();
    });
  });

  describe('Messages Display', () => {
    it('should display user messages', () => {
      mockMessages = [
        { id: '1', role: 'user', parts: [{ type: 'text', text: 'Test user message' }] },
      ];

      render(<Home />);

      expect(screen.getByText(/You:/)).toBeInTheDocument();
      // The text may be split across elements, so use a regex or contain check
      expect(screen.getByText(/Test user message/)).toBeInTheDocument();
    });

    it('should display assistant messages with Analysis Complete header', () => {
      mockMessages = [
        { id: '1', role: 'assistant', parts: [{ type: 'text', text: '### Top Themes\nTest content' }] },
      ];
      mockStatus = 'ready';

      render(<Home />);

      expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
    });

    it('should show Analysis In Progress during streaming', () => {
      mockMessages = [
        { id: '1', role: 'assistant', parts: [{ type: 'text', text: 'Partial content...' }] },
      ];
      mockStatus = 'streaming';

      render(<Home />);

      expect(screen.getByText('Analysis In Progress')).toBeInTheDocument();
    });

    it('should display tool invocations', () => {
      mockMessages = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'tool-search_web', toolCallId: 'call1', input: { searchQuery: 'real estate trends' } },
            { type: 'text', text: 'Results here' },
          ],
        },
      ];
      mockStatus = 'ready';

      render(<Home />);

      expect(screen.getByText(/Scanning sources for: "real estate trends"/)).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should show copy button for completed assistant messages', () => {
      mockMessages = [
        { id: '1', role: 'assistant', parts: [{ type: 'text', text: 'Test response' }] },
      ];
      mockStatus = 'ready';

      render(<Home />);

      expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
    });

    it('should not show copy button while loading', () => {
      mockMessages = [
        { id: '1', role: 'assistant', parts: [{ type: 'text', text: 'Partial...' }] },
      ];
      mockStatus = 'streaming';

      render(<Home />);

      expect(screen.queryByRole('button', { name: /Copy/i })).not.toBeInTheDocument();
    });

    it('should copy content to clipboard when copy button is clicked', async () => {
      mockMessages = [
        { id: '1', role: 'assistant', parts: [{ type: 'text', text: 'Content to copy' }] },
      ];
      mockStatus = 'ready';

      const user = userEvent.setup();
      render(<Home />);
      const copyButton = screen.getByRole('button', { name: /Copy/i });

      await user.click(copyButton);

      // Verify copy was triggered by checking the "Copied!" feedback appears
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should show "Copied!" feedback after copying', async () => {
      mockMessages = [
        { id: '1', role: 'assistant', parts: [{ type: 'text', text: 'Content to copy' }] },
      ];
      mockStatus = 'ready';

      const user = userEvent.setup();
      render(<Home />);
      const copyButton = screen.getByRole('button', { name: /Copy/i });

      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });
});
