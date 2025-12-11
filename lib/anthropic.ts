import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "./system-prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callDigest(
  query: string,
  timeframe: string
): Promise<string> {
  const userPrompt = buildUserPrompt(query, timeframe);

  // Using Claude 3.5 Sonnet - the latest available model
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  // Extract text content from response
  const textBlocks = response.content.filter((block) => block.type === "text");
  const resultText = textBlocks
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  if (!resultText) {
    throw new Error("No text response received from Claude");
  }

  return resultText;
}
