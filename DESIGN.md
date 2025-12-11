# Digest — System Design Document

## Overview

**Digest** is a real estate market research tool that scans online communities to identify trends, pain points, and product opportunities. It uses Claude's API with web search to find and synthesize recent discussions from Reddit, BiggerPockets, LinkedIn, and real estate blogs.

---

## Problem Statement

Real estate professionals and product builders need to understand what practitioners are actually struggling with. Manually scanning forums is time-consuming and easy to do inconsistently. Existing tools either scrape without synthesizing or require expensive subscriptions.

**Digest solves this by:**
- Automating the "scan forums for pain points" workflow
- Synthesizing scattered discussions into structured insights
- Connecting complaints directly to product opportunities

---

## User Stories

1. **As a product builder**, I want to see what real estate agents are complaining about this month so I can identify gaps in the market.

2. **As a real estate professional**, I want to know what tools others in my field are frustrated with so I can avoid bad purchases.

3. **As a content creator**, I want to spot emerging topics in real estate communities so I can create timely content.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Next.js App                       │   │
│  │  ┌───────────┐    ┌───────────┐    ┌─────────────┐  │   │
│  │  │  page.tsx │───▶│  Form     │───▶│  Results    │  │   │
│  │  │           │    │  Input    │    │  Display    │  │   │
│  │  └───────────┘    └───────────┘    └─────────────┘  │   │
│  └─────────────────────────┬───────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 API Route                            │   │
│  │                /api/digest                           │   │
│  │  ┌───────────┐    ┌───────────┐    ┌─────────────┐  │   │
│  │  │  Validate │───▶│  Call     │───▶│  Return     │  │   │
│  │  │  Input    │    │  Claude   │    │  Response   │  │   │
│  │  └───────────┘    └───────────┘    └─────────────┘  │   │
│  └─────────────────────────┬───────────────────────────┘   │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Anthropic API                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Claude Sonnet + Web Search              │   │
│  │                                                      │   │
│  │  1. Receives query + system prompt                   │   │
│  │  2. Executes web searches                            │   │
│  │  3. Synthesizes findings                             │   │
│  │  4. Returns structured markdown                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 (App Router) | Native Vercel support, API routes built-in |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS | Fast iteration, utility-first |
| AI | Claude Sonnet (claude-sonnet-4-20250514) | Strong synthesis, web search tool, pay-per-use |
| Hosting | Vercel | Zero-config deploys, edge functions |
| Version Control | GitHub | Portfolio visibility, CI/CD integration |

---

## Data Flow

### Request Flow

1. User enters research query (e.g., "CRM complaints") and optional timeframe
2. Client sends POST to `/api/digest` with `{ query, timeframe }`
3. API route validates input
4. API route calls Anthropic API with:
   - System prompt (research assistant persona)
   - User query
   - Web search tool enabled
5. Claude executes multiple web searches as needed
6. Claude synthesizes results into structured format
7. API route returns response to client
8. Client renders markdown response

### Response Structure

```typescript
// API Response
{
  success: boolean;
  data?: string;      // Markdown-formatted results
  error?: string;     // Error message if failed
}
```

---

## Component Design

### `/app/page.tsx` — Main UI

**State:**
- `query: string` — User's research query
- `timeframe: string` — Selected time range
- `results: string | null` — API response
- `loading: boolean` — Request in progress
- `error: string | null` — Error message

**Behavior:**
- Form submission triggers API call
- Loading state disables input during request
- Results rendered as formatted markdown
- Errors displayed inline

### `/app/api/digest/route.ts` — API Handler

**Input validation:**
- Query required, non-empty
- Query max length: 500 characters
- Timeframe optional, defaults to "month"

**Error handling:**
- Missing API key → 500 with config error
- Invalid input → 400 with validation message
- Anthropic API error → 500 with generic message (no leak of internals)

### `/lib/anthropic.ts` — API Client

**Configuration:**
- Model: `claude-sonnet-4-20250514`
- Max tokens: 4096
- Tools: `web_search` enabled

**Function:** `callDigest(query: string, timeframe: string): Promise<string>`

### `/lib/system-prompt.ts` — Prompt Definition

Exports the system prompt as a constant. Separated for:
- Easy iteration on prompt without touching code
- Potential future A/B testing of prompts
- Clean separation of concerns

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| API key exposure | Key stored in env var, never sent to client |
| Input injection | Query sanitized, passed as user message not interpolated into prompt |
| XSS in results | Markdown renderer escapes HTML by default |
| Rate limiting | Not implemented in MVP; monitor usage, add if needed |
| Cost runaway | Max tokens capped; monitor Anthropic dashboard |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | API key from console.anthropic.com |

---

## File Structure

```
digest/
├── app/
│   ├── api/
│   │   └── digest/
│   │       └── route.ts      # API endpoint
│   ├── globals.css           # Tailwind imports
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main UI
├── lib/
│   ├── anthropic.ts          # Claude API client
│   └── system-prompt.ts      # Prompt definition
├── public/                   # Static assets (if needed)
├── .env.example              # Environment template
├── .gitignore
├── DESIGN.md                 # This document
├── TEST-PLAN.md              # Test plan
├── README.md                 # Setup instructions
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Future Enhancements (Out of Scope for MVP)

1. **Save/export results** — Download as markdown or CSV
2. **Query history** — See past searches (requires persistence)
3. **Scheduled digests** — Weekly email summaries (requires cron + email)
4. **Multiple verticals** — Mortgage, property management, STR presets
5. **Comparison view** — "What changed since last month?"
6. **Auth + usage limits** — For productization

---

## Success Criteria

MVP is complete when:
- [ ] User can enter query and receive structured results
- [ ] Results include actual web sources (not just training data)
- [ ] Deployed to Vercel with working production URL
- [ ] Code on GitHub with clear README
- [ ] Test plan executed, must-pass tests passing

---

## Open Questions

1. **Rate limiting strategy** — Implement in app or rely on Anthropic's limits?
2. **Caching** — Cache identical queries? For how long?
3. **Analytics** — Track what queries people run? (Privacy implications)

---

*Document version: 1.0*  
*Last updated: December 2024*
