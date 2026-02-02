# AI-Curated Daily Flow Implementation Plan

## Overview
Replace hardcoded routine selection with Claude Haiku API to dynamically curate flows based on check-in data. Each curated flow costs ~$0.0004 (~$24/month for 1000 users doing 2 flows/day).

## User Choices
- **AI Provider**: Claude API (Haiku model)
- **History**: No - just current check-in data
- **Knowledge Base**: System prompt only (baked in polyvagal expertise)
- **Explanations**: Yes - show reasoning for each block

---

## Implementation

### 1. Server: New AI Endpoint

**Create `/server/lib/claude.js`** - Claude API client wrapper
- Call Haiku model with 10-second timeout
- Return parsed response text

**Create `/server/lib/polyvagalPrompt.js`** - System prompt containing:
- Polyvagal Theory foundation (ventral/sympathetic/dorsal states)
- User state codes (0-5: SOS → Glowing) with descriptions
- Embodiment level interpretation (0-100)
- Time of day considerations (morning/afternoon/evening/night)
- All 15 blocks with state_target and when to use each
- Selection guidelines (match state, sequence toward regulation, respect duration)
- JSON response format requiring `canonical_name` + `reasoning` per block

**Create `/server/app/api/routines/generate-ai/route.js`**
- Accept: `polyvagalState`, `embodimentLevel`, `timeOfDay`, `blockCount`, `routineType`
- Call Claude with system prompt + user message
- Parse JSON response, validate block count
- Fetch block details from Supabase
- Return queue with reasoning attached
- **Fallback**: If AI fails, use existing `getRoutineConfig()` hardcoded routines

**Add env var**: `ANTHROPIC_API_KEY`

---

### 2. Mobile: API Integration

**Update `/mobile/services/api.js`**
- Add `generateAIRoutine()` method calling `/api/routines/generate-ai`

**Update `/mobile/components/SoMiCheckIn.js`**
- In `handleContinueToPreview`, pass AI params to navigation:
  - `useAI: true`
  - `polyvagalState`
  - `embodimentLevel` (sliderValue)
  - `timeOfDay` (calculated from hour)

---

### 3. Mobile: Queue Preview with Reasoning

**Update `/mobile/components/RoutineQueuePreview.js`**

Add state:
```javascript
const [isGenerating, setIsGenerating] = useState(false)
const [generationError, setGenerationError] = useState(null)
```

New data fetching logic:
1. Check if `route.params.useAI` is true
2. Call `api.generateAIRoutine()` with check-in data
3. Set queue from response (includes `reasoning` per block)
4. If AI fails, show error banner and fall back to standard fetch

UI additions:
- **Loading state**: "Creating your personalized routine..." with spinner
- **Reasoning display**: Under each block card, show AI's reasoning (italic, secondary color)
- **Fallback banner**: "AI unavailable, using curated routine" if fallback triggered

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `/server/lib/claude.js` | Create |
| `/server/lib/polyvagalPrompt.js` | Create |
| `/server/app/api/routines/generate-ai/route.js` | Create |
| `/mobile/services/api.js` | Add method |
| `/mobile/components/SoMiCheckIn.js` | Pass AI params |
| `/mobile/components/RoutineQueuePreview.js` | AI fetch + reasoning UI |

---

## Error Handling

- **Server**: 10s timeout on Claude API → fallback to hardcoded
- **Invalid JSON**: Parse error → fallback to hardcoded
- **Mobile**: 15s timeout → show error, offer retry or use standard
- **Response includes `usedFallback: true`** when hardcoded was used

---

## Verification

1. **Server endpoint**: Test with curl:
   ```bash
   curl -X POST http://localhost:3000/api/routines/generate-ai \
     -H "Content-Type: application/json" \
     -d '{"polyvagalState": 3, "embodimentLevel": 65, "timeOfDay": "morning", "blockCount": 6}'
   ```
   - Should return queue with `reasoning` on each block

2. **Mobile flow**:
   - Start Daily Flow
   - Complete check-in (select state + slider)
   - Proceed to queue preview
   - Verify loading spinner appears
   - Verify reasoning text under each block card

3. **Fallback test**:
   - Remove/invalidate API key
   - Repeat flow
   - Verify fallback banner appears
   - Verify standard routine still loads

4. **Cost verification**:
   - Check Anthropic dashboard usage after test runs
   - Confirm ~$0.0004 per request
