"use client";

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

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
  const [inputValue, setInputValue] = useState("");
  
  // FIX: Standard useChat hook
  const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat({
    api: '/api/digest',
    body: { timeframe },
    initialInput: inputValue,
    onFinish: () => setInputValue(""), 
  });

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) setSearchHistory(JSON.parse(saved));
  }, []);

  const addToHistory = (query: string) => {
    const updated = [query, ...searchHistory.filter(h => h !== query)].slice(0, MAX_HISTORY);
    setSearchHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleExampleClick = (query: string) => {
    addToHistory(query);
    // FIX: Use 'append' instead of 'sendMessage'
    append({ role: 'user', content: query });
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      addToHistory(input);
      handleSubmit(e);
    }
  };

  const removeFromHistory = (q: string) => {
    const updated = searchHistory.filter((h) => h !== q);
    setSearchHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Digest</h1>
        <p className="text-gray-600">Scan real estate communities for trends.</p>
      </div>

      <form onSubmit={onFormSubmit} className="mb-6 space-y-4">
        <div>
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="What are agents saying about CRMs?"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleExampleClick(q)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {searchHistory.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item) => (
              <div key={item} className="group flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <button type="button" onClick={() => handleExampleClick(item)} disabled={isLoading}>
                  {item.length > 35 ? item.slice(0, 35) + "..." : item}
                </button>
                <button type="button" onClick={() => removeFromHistory(item)} className="ml-1 text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900"
            disabled={isLoading}
          >
            <option value="week">Past week</option>
            <option value="month">Past month</option>
            <option value="quarter">Past 3 months</option>
          </select>

          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-all"
          >
            {isLoading ? 'Scanning...' : 'Run Digest'}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {messages.map((m) => (
          <div key={m.id}>
            {m.role === 'user' ? (
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">You: {m.content}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-6">
                {m.toolInvocations?.map((toolCall) => (
                  <div key={toolCall.toolCallId} className="flex items-center gap-2 text-sm text-blue-600 mb-4 bg-blue-50 p-2 rounded w-fit">
                    <span className="animate-pulse">●</span>
                    {toolCall.toolName === 'search_web' 
                      ? 'Scanning Reddit & BiggerPockets...' 
                      : 'Processing...'}
                  </div>
                ))}
                
                <div className="prose max-w-none text-gray-800">
                  <ReactMarkdown components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {children}
                      </a>
                    )
                  }}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
