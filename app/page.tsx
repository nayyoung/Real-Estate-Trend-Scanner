"use client";

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// Example queries for users to try
const EXAMPLE_QUERIES = [
  "What are agents saying about CRMs?",
  "Pain points with property management software",
  "Trends in real estate marketing tools",
];

const MAX_HISTORY = 5;
const HISTORY_KEY = "digest-search-history";

export default function Home() {
  const [timeframe, setTimeframe] = useState("month");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Initialize the chat hook with AI SDK v5 API
  const { messages, append, status } = useChat({
    api: '/api/digest',
    body: { timeframe },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Load search history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save query to history
  function addToHistory(query: string) {
    const trimmed = query.trim();
    const updated = [trimmed, ...searchHistory.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
    setSearchHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }

  // Get text content from a message (handles both content string and parts array)
  function getMessageText(m: typeof messages[0]): string {
    if (typeof m.content === 'string' && m.content) {
      return m.content;
    }
    // For v5, check parts array
    if ('parts' in m && Array.isArray(m.parts)) {
      return m.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map(part => part.text)
        .join('\n');
    }
    return '';
  }

  // Copy results to clipboard
  async function copyResults() {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return;
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    try {
      await navigator.clipboard.writeText(getMessageText(lastMessage));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed
    }
  }

  // Clear a single history item
  function removeFromHistory(q: string) {
    const updated = searchHistory.filter((h) => h !== q);
    setSearchHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }

  // Handle example/history clicks - use append to send message
  function handleExampleClick(query: string) {
    addToHistory(query);
    append({ role: 'user', content: query });
  }

  // Handle form submission
  function onFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inputValue.trim()) {
      addToHistory(inputValue.trim());
      append({ role: 'user', content: inputValue.trim() });
      setInputValue("");
    }
  }

  // Get tool invocations from message (handles v5 parts-based structure)
  function getToolInvocations(m: typeof messages[0]) {
    if ('toolInvocations' in m && Array.isArray(m.toolInvocations)) {
      return m.toolInvocations;
    }
    if ('parts' in m && Array.isArray(m.parts)) {
      return m.parts
        .filter((part): part is { type: 'tool-invocation'; toolInvocation: { toolCallId: string; toolName: string; args: Record<string, unknown> } } =>
          part.type === 'tool-invocation'
        )
        .map(part => part.toolInvocation);
    }
    return [];
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Digest</h1>
        </div>
        <p className="text-gray-600">
          Scan real estate communities for trends, pain points, and product
          opportunities.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onFormSubmit} className="mb-6">
        <div className="space-y-4">
          {/* Query Input */}
          <div>
            <label
              htmlFor="query"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Research Query
            </label>
            <input
              type="text"
              id="query"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What are agents saying about CRMs?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
              disabled={isLoading}
            />
          </div>

          {/* Example Queries */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleExampleClick(example)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Recent searches</p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item) => (
                  <div
                    key={item}
                    className="group flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleExampleClick(item)}
                      disabled={isLoading}
                      className="disabled:opacity-50"
                    >
                      {item.length > 35 ? item.slice(0, 35) + "..." : item}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(item)}
                      className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-gray-600 transition-opacity"
                      aria-label="Remove from history"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeframe Select */}
          <div>
            <label
              htmlFor="timeframe"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Timeframe
            </label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
              disabled={isLoading}
            >
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="quarter">Past 3 months</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Scanning...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run Digest
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Messages Display */}
      <div className="space-y-6">
        {messages.map((m) => {
          const textContent = getMessageText(m);
          const toolInvocations = getToolInvocations(m);

          return (
            <div key={m.id}>
              {m.role === 'user' ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="font-semibold">You: {textContent}</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  {/* Tool Invocations (Searching...) */}
                  {toolInvocations.length > 0 && (
                    <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 space-y-2">
                      {toolInvocations.map((toolCall) => (
                        <div key={toolCall.toolCallId} className="flex items-center gap-2 text-sm text-blue-700">
                          <span className="animate-pulse">●</span>
                          {toolCall.toolName === 'search_web'
                            ? `Scanning sources for: "${(toolCall.args as { searchQuery?: string })?.searchQuery || 'content'}"...`
                            : 'Processing...'}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Results Header and Content */}
                  {textContent && (
                    <>
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-gray-900">
                            Analysis {isLoading && m === messages[messages.length - 1] ? 'In Progress' : 'Complete'}
                          </span>
                        </div>
                        {!isLoading && m === messages[messages.length - 1] && (
                          <button
                            onClick={copyResults}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                          >
                            {copied ? (
                              <>
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {/* Results Content */}
                      <div className="p-6">
                        <div className="prose max-w-none">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {textContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span>Powered by</span>
          <span className="font-medium text-gray-700">Claude + Exa</span>
        </div>
        <p>Only summarizes public discussions · Not financial or legal advice</p>
      </footer>
    </main>
  );
}
