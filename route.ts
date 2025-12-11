import { NextRequest, NextResponse } from "next/server";
import { callDigest } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { query, timeframe = "month" } = body;

    // Validate input
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query cannot be empty" },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { success: false, error: "Query must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Validate timeframe
    const validTimeframes = ["week", "month", "quarter"];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { success: false, error: "Invalid timeframe" },
        { status: 400 }
      );
    }

    // Check API key configuration
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Call Claude
    const result = await callDigest(query.trim(), timeframe);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Digest API error:", error);

    // Handle specific Anthropic errors
    if (error instanceof Error) {
      if (error.message.includes("authentication")) {
        return NextResponse.json(
          { success: false, error: "Server configuration error" },
          { status: 500 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { success: false, error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
