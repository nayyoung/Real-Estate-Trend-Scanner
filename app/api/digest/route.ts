import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Validate API Keys immediately
  if (!process.env.ANTHROPIC_API_KEY || !process.env.EXA_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing API Keys' }), { status: 500 });
  }

  const { messages, timeframe } = await req.json();
  const exa = new Exa(process.env.EXA_API_KEY);

  // 2. Calculate the date filter
  const startDate = new Date();
  if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === 'quarter') startDate.setDate(startDate.getDate() - 90);
  else startDate.setDate(startDate.getDate() - 30); // Default to month

  const startPublishedDate = startDate.toISOString().split('T')[0];

  // 3. Stream the text with the Tool Wrapper
  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: `You are Digest, a real estate trend scanner. 
             Use the search tool to find CURRENT discussions on Reddit, BiggerPockets, and forums.
             Focus on discussions from after ${startPublishedDate}.
             ... (Rest of your system prompt) ...`,
    messages,
    tools: {
      search_web: tool({ // <--- WRAPPER ADDED HERE
        description: 'Search for real estate discussions and trends',
        parameters: z.object({
          searchQuery: z.string().describe('The search query to execute'),
        }),
        execute: async ({ searchQuery }) => {
          const searchResponse = await exa.searchAndContents(searchQuery, {
            useAutoprompt: true,
            numResults: 5,
            text: true,
            includeDomains: ['reddit.com', 'biggerpockets.com', 'linkedin.com'],
            startPublishedDate, // <--- DATE FILTER ADDED HERE
          });
          return searchResponse.results;
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
