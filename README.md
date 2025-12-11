# Digest

A real estate trend scanner that uses Claude AI with web search to analyze online discussions and surface product opportunities.

## What It Does

Digest scans real estate communities (Reddit, BiggerPockets, LinkedIn, blogs) to identify:

- **Pain points** — What are practitioners frustrated with?
- **Patterns** — Which complaints appear across multiple sources?
- **Opportunities** — What products could solve these problems?

Enter a research query like "What are agents saying about CRMs?" and get a structured digest with themes, signal strength, example quotes, and actionable product ideas.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Claude Sonnet** with web search (Anthropic API)
- **Vercel** (deployment)

## Setup

### Prerequisites

- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com/))

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

4. Add your Anthropic API key to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

5. Start the dev server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` to Environment Variables in Vercel project settings
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
│   ├── api/digest/route.ts   # API endpoint
│   ├── globals.css           # Styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main UI
├── lib/
│   ├── anthropic.ts          # Claude API client
│   └── system-prompt.ts      # Prompt definition
├── DESIGN.md                 # System design doc
├── TEST-PLAN.md              # Test plan
└── README.md                 # This file
```

## How It Works

1. User enters a research query and timeframe
2. Request goes to `/api/digest` endpoint
3. Claude is called with web search enabled
4. Claude searches Reddit, BiggerPockets, LinkedIn, and blogs
5. Results are synthesized into a structured digest
6. Markdown response is rendered in the UI

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
