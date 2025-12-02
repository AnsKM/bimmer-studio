# BMW M5 AI Configurator 🏎️

An intelligent 3D car configurator for the BMW M5, powered by OpenAI GPT-5.1 and React Three Fiber.

## Features ✨

- **AI-Powered Configuration** - Chat with GPT-5.1 to configure your BMW M5
- **3D Visualization** - Real-time 3D rendering with React Three Fiber
- **Voice Input** - Configure your car using voice commands
- **Intelligent Validation** - Automatic validation with M5-specific constraints
- **Smart Suggestions** - AI provides alternatives when configurations aren't compatible

## AI Capabilities 🤖

The configurator uses **OpenAI GPT-5.1** with function calling to:
- Change colors, wheels, interior, and performance packages
- Validate configurations against M5 requirements
- Explain why certain configurations aren't available
- **Highlight 4 key M5 benefits** when suggesting alternatives
- Provide camera controls for different views

### M5 Benefits Highlighted by AI

When you request something not compatible with the M5 (e.g., standard wheels), the AI explains:
1. **625 PS V8 Twin-Turbo Motor** - Exceptional performance
2. **M xDrive All-Wheel Drive** - Optimal traction and handling
3. **Adaptive M Suspension** - Perfect balance between comfort and sport
4. **Exclusive M Performance Components** - Race-track tested technology

## Setup 🚀

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd bmw-configurator-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Keys**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Add your OpenAI API key to `.env`:
   ```env
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```

   Get your API key from: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Technology Stack 🛠️

- **Frontend Framework**: React 19 + TypeScript
- **3D Graphics**: Three.js + React Three Fiber
- **AI Integration**: OpenAI GPT-5.1 (gpt-5.1 model)
- **State Management**: Zustand
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## How It Works 🔧

### AI Service Architecture

The app uses OpenAI's function calling to handle user requests:

```typescript
// User: "Show me the wheels"
// AI calls: show_wheels()

// User: "Change to Sapphire Black"
// AI calls: change_color({ colorId: 'sapphire-black' })

// User: "I want standard wheels"
// AI: Explains why not possible + shows 4 M5 benefits + suggests alternatives
```

### Configuration Flow

1. User sends a message via chat or voice
2. OpenAI GPT-5.1 processes the request
3. AI executes function calls to update configuration
4. Validation system checks if configuration is valid for M5
5. If invalid, AI explains why and suggests alternatives
6. 3D model updates in real-time

## Key Components 📦

- **`src/services/openai.ts`** - OpenAI integration with function calling
- **`src/components/chat/ChatPanel.tsx`** - Chat interface
- **`src/stores/configStore.ts`** - Zustand state management
- **`src/config/constraints.ts`** - M5 validation rules
- **`src/types/index.ts`** - TypeScript definitions

## Available Commands 💬

Try these in the chat:
- "Zeig mir die Farben" (Show me the colors)
- "Zeig mir die Felgen" (Show me the wheels)
- "Ändere die Farbe auf Saphirschwarz" (Change color to Sapphire Black)
- "Ich möchte Standard Felgen" (I want standard wheels - AI explains M5 benefits!)
- "Zeig mir die Frontansicht" (Show me the front view)
- "Prüfe die Konfiguration" (Validate configuration)

## M5 Constraints 🚫

The AI enforces these M5-specific rules:
- ❌ No standard wheels (only M Sport or M Performance)
- ❌ Competition package requires 21" wheels
- ❌ Ceramic brakes require a performance package
- ✅ Frozen paint is exclusive to M5

## Building for Production 🏗️

```bash
npm run build
npm run preview
```

## License 📄

MIT

## Credits 👏

Built with ❤️ using OpenAI GPT-5.1, React, and Three.js
