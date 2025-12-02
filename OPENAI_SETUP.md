# OpenAI Integration Setup Guide

## Problem Summary
The BMW M5 configurator's OpenAI integration wasn't working because the API key was not configured. The system was falling back to demo mode instead of using GPT-4o's function calling capabilities.

## What Was Fixed

### 1. Environment Configuration
- Created `.env` file for API key storage
- Added proper environment variable handling
- Added detailed logging to track API calls and function execution

### 2. Enhanced Function Calling
- Improved logging to show when functions are being called
- Added fallback response generation when GPT-4o returns function calls without message content
- Enhanced error handling with specific error type detection (401, 429, 500)

### 3. Improved Demo Mode
- Enhanced color matching with multiple language support (German/English)
- Better pattern matching for user intents
- Added console logging to track demo mode operations

## Setup Instructions

### Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)

### Step 2: Configure the API Key

Edit the `.env` file in the project root:

```bash
# OpenAI API Key for AI-powered configuration
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

**IMPORTANT:**
- Replace `sk-your-actual-api-key-here` with your actual API key
- Never commit the `.env` file to Git (it's already in `.gitignore`)
- Keep your API key secure

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Development Server

```bash
npm run dev
```

The app should now be running at `http://localhost:5173`

## Testing the Integration

### Console Logging
When the OpenAI integration is working, you'll see these logs in the browser console:

```
📤 Sending request to OpenAI GPT-4o with function calling...
📥 Received response from OpenAI
🔧 Processing 1 function call(s)...
  ✅ Function: change_color { colorId: 'sapphire-black' }
```

### Demo Mode
If you see this log, the API key is not configured:
```
⚠️ No OpenAI API key found - falling back to demo mode
🎮 Demo mode active - processing message: change the color to blue
```

### Test Prompts

Try these prompts to verify the integration:

**Color Changes:**
- "change the color to Sapphire Black"
- "zeig mir die Farben" (show me the colors)
- "make it blue"
- "ändere die Farbe auf Portimao Blau"

**Wheel Changes:**
- "change the wheels"
- "show me the M Performance wheels"
- "standard Felgen" (should trigger M5 benefits explanation)

**Camera Controls:**
- "show me the side view"
- "zeig mir die Front"
- "rotate to rear view"

**Validation:**
- "validate my configuration"
- "is this valid?"

## How Function Calling Works

### 1. User Input
User types: "change the color to blue"

### 2. OpenAI Processing
The message is sent to GPT-4o with:
- System prompt (explaining the M5 configurator role)
- Current configuration context
- Available functions (change_color, change_wheels, etc.)
- Conversation history

### 3. Function Call Response
GPT-4o responds with:
```json
{
  "message": "Ich ändere die Farbe auf Portimao Blau Metallic.",
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "change_color",
        "arguments": "{\"colorId\":\"portimao-blue\"}"
      }
    }
  ]
}
```

### 4. Function Execution
The app executes the function call:
```typescript
executeOpenAIFunctionCall('change_color', { colorId: 'portimao-blue' }, currentConfig)
```

### 5. Configuration Update
The car configuration is updated with the new color, and the 3D model reflects the change.

## Available Functions

The following functions are available to GPT-4o:

1. **change_color** - Changes the car color
   - Parameters: `colorId` (string)
   - Example: `{ colorId: 'sapphire-black' }`

2. **change_wheels** - Changes the wheels
   - Parameters: `wheelId` (string)
   - Example: `{ wheelId: 'm-star-spoke-21' }`

3. **change_interior** - Changes interior options
   - Parameters: `leather`, `color`, `trim` (optional)
   - Example: `{ leather: 'merino', color: 'black', trim: 'carbon' }`

4. **change_brakes** - Changes brake system
   - Parameters: `brakes` (standard | performance | ceramic)
   - Example: `{ brakes: 'ceramic' }`

5. **set_performance_package** - Sets performance package
   - Parameters: `package` (none | performance | competition)
   - Example: `{ package: 'competition' }`

6. **move_camera** - Moves the camera view
   - Parameters: `position` (front | side | rear | interior | wheels)
   - Example: `{ position: 'side' }`

7. **validate_configuration** - Validates the current configuration
   - No parameters

## Validation Rules

The M5 has specific constraints:
- ❌ Standard wheels are NOT allowed (only M Sport or M Performance)
- ✅ M Competition package requires 21" wheels
- ✅ Ceramic brakes require a performance package
- ✅ Frozen paint colors are M5-exclusive

When users request invalid configurations, GPT-4o will:
1. Explain WHY it's not possible
2. List the 4 main M5 benefits
3. Suggest valid alternatives

## Troubleshooting

### Issue: "No function calls in response"
**Cause:** GPT-4o didn't recognize the intent as requiring a configuration change.
**Solution:** Be more specific in your prompt (e.g., "change the color to blue" instead of "I like blue")

### Issue: "Authentication error - check your API key"
**Cause:** Invalid or missing API key.
**Solution:**
1. Verify your API key in `.env`
2. Make sure it starts with `sk-`
3. Check that you have sufficient credits in your OpenAI account

### Issue: "Rate limit exceeded"
**Cause:** Too many API requests.
**Solution:** Wait a moment before trying again, or upgrade your OpenAI plan.

### Issue: Changes not reflected in 3D model
**Cause:** The configuration update might not be triggering a re-render.
**Solution:** Check the browser console for errors in the ChatPanel component.

## Cost Estimation

GPT-4o pricing (as of 2024):
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

Average cost per conversation turn: ~$0.01-0.02

## API Key Security

✅ **DO:**
- Store API key in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables in production

❌ **DON'T:**
- Commit API keys to Git
- Share API keys publicly
- Hardcode API keys in source code

## Support

If you encounter issues:
1. Check the browser console for error logs
2. Verify your API key is correct
3. Ensure you have OpenAI credits available
4. Check the OpenAI status page: https://status.openai.com/

## Alternative: Demo Mode

If you don't want to use the OpenAI API, the demo mode still works with basic pattern matching:
- Simple keyword detection for colors and wheels
- M5 benefits explanation for invalid configurations
- No API costs

To use demo mode, simply leave `VITE_OPENAI_API_KEY` empty in `.env`.
