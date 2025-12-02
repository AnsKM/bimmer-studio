# BMW M5 AI Configurator Demo

An intelligent BMW M5 configurator that uses OpenAI to understand natural language configuration requests and validates them against BMW M5 constraints in real-time.

## 🚀 Features

### Natural Language Configuration
- **Chat-based interface**: Users can describe what they want in natural language
- **Intelligent parsing**: OpenAI GPT-4o extracts configuration changes from user prompts
- **Contextual understanding**: Maintains conversation history for better context

### Smart Validation
- **Real-time constraint checking**: Validates all changes against BMW M5 specifications
- **Intelligent feedback**: Explains why certain configurations aren't possible
- **Alternative suggestions**: Automatically suggests valid alternatives
- **2^40 combinations**: Handles the complexity of BMW's configuration system

### Key Constraints Demonstrated
- **M5 requires M Sport wheels**: Standard wheels are blocked with explanation
- **Competition package**: Requires 21" wheels for optimal braking
- **Ceramic brakes**: Only available with Performance packages
- **Frozen colors**: Exclusive to M5 models

### Example Interactions

```
User: "I want blue wheels"
AI: "Blue wheels aren't available for the BMW M5. Would you like to see our M Sport options?"

User: "Change color to red"
AI: "Changing to Toronto Red Metallic ✓"

User: "Add ceramic brakes"
AI: "M Carbon Ceramic brakes are an excellent choice! Note: These require a Performance package."
```

## 🛠️ Technical Stack

- **Frontend**: React + TypeScript + Vite
- **3D Rendering**: Three.js + React Three Fiber
- **AI Service**: OpenAI GPT-4o (with structured JSON responses)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Voice Input**: Web Speech API

## 📦 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
Create a `.env` file from the example:
```bash
cp .env.example .env
```

Add your OpenAI API key:
```env
VITE_OPENAI_API_KEY=sk-...
```

Get your key from: https://platform.openai.com/api-keys

### 3. Run Development Server
```bash
npm run dev
```

Visit http://localhost:5173

## 🎯 How It Works

### 1. Natural Language Understanding
The OpenAI service parses user messages and extracts structured configuration changes:

```typescript
{
  "message": "Changing color to Sapphire Black Metallic",
  "configChanges": [
    {
      "field": "color",
      "value": "sapphire-black",
      "reason": "User requested color change"
    }
  ]
}
```

### 2. Configuration Validation
Every change is validated against BMW M5 constraints:

```typescript
// Example constraint
{
  id: 'M5_REQUIRES_M_WHEELS',
  condition: (config) =>
    config.model === 'M5' && !config.wheels.id.startsWith('m-'),
  message: 'BMW M5 requires M Sport wheels',
  severity: 'block'
}
```

### 3. Intelligent Feedback
If a configuration is invalid, the system:
- Explains **why** it's not possible
- Suggests valid alternatives
- Maintains conversation context

## 🎨 Available Configurations

### Colors
- Sapphire Black Metallic
- Alpine White
- Brooklyn Grey Metallic
- Marina Bay Blue Metallic
- Toronto Red Metallic
- Frozen Dark Silver (Individual)
- Frozen Marina Bay Blue (Individual)

### Wheels
- M Double Spoke 20" (Standard M Sport)
- M Star Spoke 21" (M Sport)
- M Y-Spoke 21" (M Performance)

### Performance Packages
- Standard
- M Performance Package
- M Competition Package

### Other Options
- Brakes: Standard / Performance / Ceramic
- Interior: Vernasca / Merino / Extended Merino
- Lights: LED / Laser
- Sound: Standard / Harman Kardon / Bowers & Wilkins
- Driving Assistant: None / Basic / Plus / Pro

## 🧪 Testing the Demo

### Try These Commands
```
"Show me the colors"
"Change to red"
"I want standard wheels" (❌ Will be blocked!)
"Add ceramic brakes"
"Show me the M Competition package"
"Check if my configuration is valid"
```

## 📁 Project Structure

```
src/
├── components/
│   ├── 3d/           # Three.js 3D model components
│   ├── chat/         # Chat interface
│   └── ui/           # UI components
├── config/
│   └── constraints.ts    # BMW M5 validation rules
├── services/
│   ├── openai.ts         # OpenAI integration (Primary)
│   └── gemini.ts         # Gemini fallback
├── stores/
│   └── configStore.ts    # Zustand state management
└── types/
    └── index.ts          # TypeScript types
```

## 🔑 Key Features

### 1. Structured JSON Responses
OpenAI is configured to return structured JSON with:
- Natural language message
- Configuration changes array
- Validation issues
- Suggested alternatives

### 2. Demo Mode
Works without API key using rule-based fallbacks for testing.

### 3. Real-time 3D Preview
See your configuration changes instantly in the 3D model.

### 4. Voice Input
Speak your configuration requests (German supported).

## 🎓 Learning Points

This demo showcases:
1. **Natural Language → Structured Data**: Using OpenAI for extraction
2. **Complex Validation**: Handling 2^40 possible combinations
3. **Conversational AI**: Maintaining context across interactions
4. **Error Handling**: Graceful degradation without API keys

## 🚀 Deployment

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 📝 Notes

- The OpenAI integration runs in the browser for demo purposes
- For production, implement a backend API to secure your API keys
- The 3D models are placeholders - replace with actual BMW assets
- German language prompts work best due to training data

## 🔒 Security

⚠️ **Important**: This demo uses `dangerouslyAllowBrowser: true` for OpenAI client.

For production:
1. Create a backend API endpoint
2. Never expose API keys in the frontend
3. Implement rate limiting and authentication

## 📄 License

MIT License - Feel free to use for your own projects!

## 🤝 Contributing

This is a demo project, but suggestions and improvements are welcome!

---

Built with ❤️ using React, OpenAI, and Three.js
