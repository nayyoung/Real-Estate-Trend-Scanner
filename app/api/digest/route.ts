import { anthropic } from '@ai-sdk/anthropic';
import { streamText, stepCountIs } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

export const maxDuration = 60;

const MAX_QUERY_LENGTH = 500;

export async function POST(req: Request) {
  // Validate environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing Anthropic API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!process.env.EXA_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing Exa API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse and validate request body
  let body: { messages?: unknown; timeframe?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages, timeframe } = body;

  // Validate messages array
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Messages array is required and must not be empty' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate query length
  const lastMessage = messages[messages.length - 1];
  if (typeof lastMessage?.content === 'string' && lastMessage.content.length > MAX_QUERY_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const exa = new Exa(process.env.EXA_API_KEY);

  // Calculate date based on timeframe for filtering search results
  const startDate = new Date();
  if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === 'quarter') startDate.setDate(startDate.getDate() - 90);
  else startDate.setDate(startDate.getDate() - 30);

  const startPublishedDate = startDate.toISOString().split('T')[0];

  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: `You are Digest, a real estate trend scanner.
             Use the search tool to find CURRENT discussions on Reddit, BiggerPockets, and forums.
             Do not make up information. If you can't find specific recent complaints, admit it.

             ## Analysis Strategy
             - Use web search to find real discussions from multiple sources
             - Search Reddit posts, BiggerPockets forum threads, and industry blogs for relevant content
             - Focus on practitioner discussions, not news articles or marketing content
             - Prioritize content from the specified timeframe
             - Perform multiple searches if needed to get comprehensive coverage

             ## Output Format
             Return your findings in this exact structure:

             ### Top Themes
             List 3-5 recurring topics. For each: 2-3 sentence summary of what people are saying.

             ### Signal Strength
             Note which themes appear multiple times across different sources vs. one-off mentions. Use indicators like:
             - 🔥 Strong signal (5+ mentions across sources)
             - 📈 Moderate signal (2-4 mentions)
             - 💡 Emerging (single source but detailed discussion)

             ### Example Quotes
             Paraphrase 3-5 representative quotes that illustrate the themes. Summarize the sentiment in your own words.

             ### Product Opportunities
             Based on the pain points, suggest 2-4 potential digital products (templates, tools, guides, courses) that could address them. Be specific about format and price range.

             ### Trend Velocity
             Note whether these complaints are:
             - 🆕 New/emerging (started appearing recently)
             - 📊 Ongoing (consistent over time)
             - 📉 Declining (less frequent than before)

             ### Recommended First Move
             Pick one low-effort product idea to validate first. Explain why it's the best starting point.

             ## Rules
             - Only report what you find from actual web searches. Never invent patterns or pad the output.
             - If search results are limited for a topic, say so honestly and suggest alternative queries.
             - No financial, legal, or tax advice — only summarize market sentiment and patterns.
             - Keep it skimmable: short paragraphs, clear headers.
             - Respect privacy — never include usernames or personal details from posts.
             - Cite your sources when referencing specific discussions.`,
    messages, // Pass the messages array directly
    tools: {
      search_web: {
        description: 'Search for real estate discussions and trends',
        inputSchema: z.object({
          searchQuery: z.string().describe('The search query to execute'),
        }),
        execute: async ({ searchQuery }: { searchQuery: string }) => {
          const searchResponse = await exa.searchAndContents(searchQuery, {
            type: 'neural',
            useAutoprompt: true,
            numResults: 5,
            text: true,
            includeDomains: ['reddit.com', 'biggerpockets.com', 'linkedin.com'],
            startPublishedDate,
          });
          return searchResponse.results;
        },
      },
    },
    stopWhen: stepCountIs(5), // Allow up to 5 tool call rounds
  });

  return result.toUIMessageStreamResponse();
}
