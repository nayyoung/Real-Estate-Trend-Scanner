import { streamText } from "ai";
import { z } from "zod";
import { NextRequest } from "next/server";

const InputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  context: z.object({
    timeframe: z.string().optional(),
  }).optional()
});

export const POST = async (req: NextRequest) => {
  try {
    const json = await req.json();
    const result = InputSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid input format" }), { status: 400 });
    }

    const { messages, context } = result.data;
    const timeframe = context?.timeframe ?? "month";

    const response = await streamText({
      model: "claude-sonnet-4-20250514",
      messages,
      tools: ["search_web"],
      tool_choice: "auto",
      system: `You are a real estate research assistant. Search web communities and return structured, readable markdown insights from the past ${timeframe}.`,
    });

    return response.toAIStreamResponse();
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "AI API call failed" }), { status: 500 });
  }
};
