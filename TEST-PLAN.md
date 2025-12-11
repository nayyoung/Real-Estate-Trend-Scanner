# Digest — Test Plan

## Overview
**Application:** Digest — Real estate trend scanner using Claude API with web search  
**Stack:** Next.js 14, TypeScript, Anthropic API, Vercel  
**Test approach:** Manual testing for MVP, structured to convert to automated tests later if needed

---

## 1. API Route Tests (`/api/digest`)

### 1.1 Happy Path
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| API-01 | Valid query, default timeframe | `{ "query": "What are agents saying about CRMs?" }` | 200 response with all six output sections populated |
| API-02 | Valid query with timeframe | `{ "query": "lead generation complaints", "timeframe": "week" }` | 200 response, search results biased toward past week |
| API-03 | Niche query with results | `{ "query": "property management software frustrations" }` | 200 response with relevant themes |

### 1.2 Edge Cases
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| API-04 | Very broad query | `{ "query": "real estate" }` | 200 response, returns general themes without hallucinating specifics |
| API-05 | Very narrow/obscure query | `{ "query": "AI-powered septic tank inspection tools" }` | 200 response, honest "limited results found" messaging |
| API-06 | Empty query string | `{ "query": "" }` | 400 error with clear message |
| API-07 | Missing query field | `{ }` | 400 error with clear message |
| API-08 | Query with special characters | `{ "query": "CRM <script>alert('xss')</script>" }` | Handled safely, no injection |
| API-09 | Very long query (500+ chars) | Long string | Either 400 with length error OR truncates gracefully |

### 1.3 Error Handling
| ID | Scenario | Setup | Expected Result |
|----|----------|-------|-----------------|
| API-10 | Invalid API key | Use malformed key in env | 500 error with user-friendly message (not raw error) |
| API-11 | Missing API key | Remove key from env | 500 error with clear "configuration error" message |
| API-12 | Anthropic API timeout | Hard to simulate — note for monitoring | Timeout error handled, doesn't hang indefinitely |
| API-13 | Anthropic rate limit | Rapid repeated requests | 429 or graceful error message |

---

## 2. UI Tests (`app/page.tsx`)

### 2.1 Initial State
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| UI-01 | Page load | Header, input field, timeframe dropdown, submit button all visible |
| UI-02 | Input placeholder | Shows example query text |
| UI-03 | Submit button default state | Enabled but visually indicates "ready" |
| UI-04 | Results area empty | No results section shown before first query |

### 2.2 Interaction States
| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| UI-05 | Submit with valid query | Enter query, click submit | Loading state appears, button disabled during request |
| UI-06 | Loading state | During API call | Clear loading indicator (spinner or text) |
| UI-07 | Results render | API returns successfully | Markdown rendered with proper headers, bullets, links |
| UI-08 | Links in results | Click source link | Opens in new tab |
| UI-09 | Submit new query | Enter different query after first results | Previous results replaced with loading, then new results |
| UI-10 | Timeframe selection | Select "Past week" then submit | Request includes timeframe parameter |

### 2.3 Error States
| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| UI-11 | Empty query submit | Click submit with empty input | Validation message, no API call |
| UI-12 | API error | API returns 500 | User-friendly error message displayed, not raw error |
| UI-13 | Network failure | Disconnect network, submit | Error message about connection |

### 2.4 Responsive/Accessibility
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| UI-14 | Mobile viewport (375px) | All elements visible and usable |
| UI-15 | Tablet viewport (768px) | Layout adapts appropriately |
| UI-16 | Keyboard navigation | Can tab through input, dropdown, button and submit with Enter |
| UI-17 | Screen reader basics | Input has label, button has accessible name |

---

## 3. Integration Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| INT-01 | End-to-end happy path | Query submitted → API called → Claude responds → Results displayed |
| INT-02 | Web search actually fires | Results contain recent/dated information, not just Claude's training data |
| INT-03 | Source links valid | At least some returned links resolve to real pages |

---

## 4. Output Quality Tests

These validate Claude's response quality — manual review:

| ID | Check | Pass Criteria |
|----|-------|---------------|
| OUT-01 | All sections present | Response includes all 6 sections from output format |
| OUT-02 | No hallucinated sources | Linked URLs actually exist and contain relevant content |
| OUT-03 | Themes match query intent | If asking about CRMs, themes are about CRMs not random topics |
| OUT-04 | Honest about thin results | When query has few matches, response says so vs. padding |
| OUT-05 | No prohibited content | No financial/legal advice, no personal info from posts |
| OUT-06 | Actionable product ideas | Suggested products logically connect to identified pain points |

---

## 5. Deployment/Environment Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| DEP-01 | Local dev runs | `npm run dev` starts without errors |
| DEP-02 | Build succeeds | `npm run build` completes |
| DEP-03 | Vercel preview deploy | Push to branch, preview URL works |
| DEP-04 | Vercel production deploy | Merge to main, production URL works |
| DEP-05 | Environment variables | API key correctly read from Vercel env settings |

---

## 6. Security Considerations

| ID | Check | Pass Criteria |
|----|-------|---------------|
| SEC-01 | API key not exposed | Key not visible in client-side code or network requests |
| SEC-02 | Input sanitization | Special characters in query don't cause unexpected behavior |
| SEC-03 | Rate limiting consideration | Note: MVP may not have this, flag for future |

---

## Test Priority for MVP

**Must pass before "shipped":**
- API-01, API-06, API-07, API-10, API-11
- UI-01, UI-05, UI-06, UI-07, UI-11, UI-12
- INT-01, INT-02
- OUT-01, OUT-03, OUT-04
- DEP-01, DEP-02, DEP-04, DEP-05
- SEC-01

**Nice to verify but non-blocking:**
- Everything else

---

## Notes for Future Iterations

- Add automated tests (Vitest for API routes, Playwright for E2E) if this becomes a real product
- Consider logging/monitoring for API errors in production
- Usage analytics to see what queries people actually run
