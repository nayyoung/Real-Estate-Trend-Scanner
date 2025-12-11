import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

export const maxDuration = 60; // Allow longer timeouts for research

export async function POST(req: Request) {
  const { messages, timeframe } = await req.json();

  // Validate input
  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: 'Messages array is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Extract query from the last user message
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
  if (!lastUserMessage) {
    return new Response(
      JSON.stringify({ error: 'No user message found' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Extract text from message parts
  let query = '';
  if (lastUserMessage.parts) {
    const textParts = lastUserMessage.parts.filter((p: any) => p.type === 'text');
    query = textParts.map((p: any) => p.text).join(' ');
  } else if (lastUserMessage.content) {
    query = lastUserMessage.content;
  }

  if (!query || typeof query !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Query is required and must be a string' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (query.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Query cannot be empty' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (query.length > 500) {
    return new Response(
      JSON.stringify({ error: 'Query must be 500 characters or less' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate timeframe
  const validTimeframes = ['week', 'month', 'quarter'];
  if (timeframe && !validTimeframes.includes(timeframe)) {
    return new Response(
      JSON.stringify({ error: 'Invalid timeframe. Must be week, month, or quarter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!process.env.EXA_API_KEY) {
    console.error('EXA_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Initialize Exa with validated API key
  const exa = new Exa(process.env.EXA_API_KEY);

  // Calculate start date based on timeframe for better filtering
  const startDate = new Date();
  if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === 'quarter') startDate.setDate(startDate.getDate() - 90);
  else startDate.setDate(startDate.getDate() - 30); // month default

  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'), // Use the REAL model name
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
    messages: [
      {
        role: 'user',
        content: `Research query: ${query}. Focus on discussions after ${startDate.toISOString()}.`,
      },
    ],
    tools: {
      search_web: tool({
        description: 'Search for real estate discussions and trends',
        inputSchema: z.object({
          searchQuery: z.string().describe('The search query to execute'),
        }),
        execute: async ({ searchQuery }) => {
          // This actually searches the web using Exa
          const searchResponse = await exa.searchAndContents(searchQuery, {
            type: 'neural',
            useAutoprompt: true,
            numResults: 5,
            text: true,
            includeDomains: ['reddit.com', 'biggerpockets.com', 'linkedin.com'], // Targeted search
          });
          return searchResponse.results;
        },
      }),
    },
    stopWhen: stepCountIs(5), // Allow the AI to search, read, then search again if needed
  });

  return result.toUIMessageStreamResponse();
}
