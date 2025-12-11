"use client";

import { useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [query, setQuery] = useState("");
  const [timeframe, setTimeframe] = useState("month");
  const [results, setResults] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a research query");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim(), timeframe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setResults(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Digest</h1>
        <p className="text-gray-600">
          Scan real estate communities for trends, pain points, and product
          opportunities.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="space-y-4">
          {/* Query Input */}
          <div>
            <label
              htmlFor="query"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Research Query
            </label>
            <input
              type="text"
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are agents saying about CRMs?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              disabled={loading}
            />
          </div>

          {/* Timeframe Select */}
          <div>
            <label
              htmlFor="timeframe"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Timeframe
            </label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
              disabled={loading}
            >
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="quarter">Past 3 months</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
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
                Scanning communities...
              </span>
            ) : (
              "Run Digest"
            )}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
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
              {results}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        Powered by Claude · Only summarizes public discussions · Not financial
        or legal advice
      </footer>
    </main>
  );
}
