# Digest

A real estate trend scanner that uses Claude AI with Exa search to analyze online discussions and surface product opportunities in real-time.

## What It Does

Digest scans real estate communities (Reddit, BiggerPockets, LinkedIn, blogs) to identify:

- **Pain points** — What are practitioners frustrated with?
- **Patterns** — Which complaints appear across multiple sources?
- **Opportunities** — What products could solve these problems?

Enter a research query like "What are agents saying about CRMs?" and watch as the AI streams results in real-time, showing you exactly what it's searching for and finding.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Vercel AI SDK** - Streaming AI responses
- **Claude 3.5 Sonnet** (via @ai-sdk/anthropic)
- **Exa AI** - Real-time web search
- **React Markdown** - Rich text rendering

## Setup

### Prerequisites

- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com/))
- Exa API key ([get one here](https://exa.ai/))

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/yourusername/digest.git
cd digest
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file:

```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
EXA_API_KEY=your-exa-api-key
```

5. Start the dev server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add both `ANTHROPIC_API_KEY` and `EXA_API_KEY` to Environment Variables in Vercel project settings
4. Deploy

## Example Queries

Try these to see Digest in action:

- "What are agents complaining about with CRMs?"
- "Property management software frustrations"
- "Lead generation tools real estate agents hate"
- "What do landlords wish existed?"
- "Real estate transaction coordinator pain points"

## Project Structure

```
digest/
├── app/
│   ├── api/digest/route.ts   # Streaming API endpoint with Exa search
│   ├── globals.css           # Styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main UI with streaming support
├── DESIGN.md                 # System design doc
├── TEST-PLAN.md              # Test plan
└── README.md                 # This file
```

## How It Works

1. User enters a research query and timeframe
2. Request goes to `/api/digest` endpoint with streaming enabled
3. Claude uses Exa API to search real-time web content
4. Search progress is streamed to the frontend (e.g., "Scanning Reddit...")
5. Results are analyzed and synthesized by Claude
6. Markdown response streams in real-time to the UI
7. Tool invocations and final results are displayed with rich formatting

## Limitations

- Results depend on what's publicly accessible
- Some forums may block automated access
- Not a substitute for primary research
- No financial or legal advice — sentiment only

## Future Ideas

- Save/export results as markdown or CSV
- Query history
- Scheduled weekly digests
- Multiple vertical presets (mortgage, STR, property management)
- Comparison view ("what changed since last month")

## License

MIT

---

Built by [Your Name] · Powered by Claude
