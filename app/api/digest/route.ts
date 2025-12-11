import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, timeframe } = await req.json();

  const exa = new Exa(process.env.EXA_API_KEY);

  const startDate = new Date();
  if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === 'quarter') startDate.setDate(startDate.getDate() - 90);
  else startDate.setDate(startDate.getDate() - 30);

  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: `You are Digest, a real estate trend scanner. 
             Use the search tool to find CURRENT discussions on Reddit and BiggerPockets.
             Focus on discussions from after ${startDate.toISOString()}.`,
    messages, 
    tools: {
      search_web: tool({
        description: 'Search for real estate discussions',
        parameters: z.object({
          searchQuery: z.string().describe('The search query to execute'),
        }),
        execute: async ({ searchQuery }) => {
          const response = await exa.searchAndContents(searchQuery, {
            type: 'neural',
            useAutoprompt: true,
            numResults: 5,
            text: true,
            includeDomains: ['reddit.com', 'biggerpockets.com', 'linkedin.com'],
          });
          return response.results;
        },
      }),
    },
    maxSteps: 5, 
  });

  // THIS IS THE CRITICAL FIX
  return result.toDataStreamResponse();
}
