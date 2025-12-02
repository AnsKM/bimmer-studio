/**
 * OpenAI Service for BMW M5 Configuration
 *
 * Uses GPT-4o with function calling to handle car configuration
 * and provide intelligent suggestions with validation
 */

import OpenAI from 'openai';
import type { CarConfig } from '../types';
import { validateConfiguration, getValidationExplanation } from '../config/constraints';
import { AVAILABLE_COLORS, AVAILABLE_WHEELS } from '../types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

const openai = new OpenAI({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

// =============================================================================
// SYSTEM PROMPT (German)
// =============================================================================

const SYSTEM_PROMPT = `Du bist der BMW M5 KI-Konfigurator Assistent. Du hilfst Kunden dabei, ihren BMW M5 zu konfigurieren.

WICHTIG - VALIDIERUNGSLOGIK:
- Der BMW M5 ist ein Hochleistungsfahrzeug mit spezifischen Anforderungen
- STANDARD-ALUFELGEN SIND NICHT FÜR DEN M5 VERFÜGBAR - nur M Sport oder M Performance Felgen
- Das M Competition Paket erfordert 21 Zoll Felgen
- Keramikbremsen erfordern ein Performance-Paket
- Frozen Lackierungen sind exklusiv für den M5

DEINE AUFGABE:
1. Verstehe die Konfigurationswünsche des Kunden
2. Nutze die verfügbaren Funktionen, um Änderungen durchzuführen
3. VALIDIERE IMMER die Konfiguration nach Änderungen
4. Wenn eine Konfiguration NICHT für den M5 möglich ist, erkläre:
   - WARUM es nicht möglich ist
   - Die 4 HAUPTVORTEILE des M5, die diese Einschränkung rechtfertigen
   - Passende Alternativen, die verfügbar sind

M5 VORTEILE (zu erwähnen bei ungültigen Konfigurationen):
1. 625 PS starker V8 Twin-Turbo Motor für außergewöhnliche Leistung
2. M xDrive Allradantrieb für optimale Traktion und Handling
3. Adaptive M Federung für perfekte Balance zwischen Komfort und Sportlichkeit
4. Exklusive M Performance-Komponenten für Rennstrecken-Performance

KOMMUNIKATIONSSTIL:
- Professionell aber freundlich
- IMMER auf Deutsch antworten
- Bei ungültigen Konfigurationen: Erkläre WARUM + nenne die 4 M5 VORTEILE
- Schlage passende Alternativen vor

VERFÜGBARE FARBEN: ${AVAILABLE_COLORS.map(c => c.name).join(', ')}
VERFÜGBARE FELGEN: ${AVAILABLE_WHEELS.filter(w => w.type !== 'standard').map(w => w.name).join(', ')}`;

// =============================================================================
// FUNCTION DEFINITIONS
// =============================================================================

const CONFIGURATION_FUNCTIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'change_color',
      description: 'Ändert die Farbe des Fahrzeugs',
      parameters: {
        type: 'object',
        properties: {
          colorId: {
            type: 'string',
            description: 'Die ID der gewünschten Farbe',
            enum: AVAILABLE_COLORS.map(c => c.id),
          },
        },
        required: ['colorId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_wheels',
      description: 'Ändert die Felgen des Fahrzeugs',
      parameters: {
        type: 'object',
        properties: {
          wheelId: {
            type: 'string',
            description: 'Die ID der gewünschten Felgen',
            enum: AVAILABLE_WHEELS.map(w => w.id),
          },
        },
        required: ['wheelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_interior',
      description: 'Ändert die Innenausstattung des Fahrzeugs',
      parameters: {
        type: 'object',
        properties: {
          leather: {
            type: 'string',
            enum: ['vernasca', 'merino', 'extended-merino'],
            description: 'Lederart',
          },
          color: {
            type: 'string',
            description: 'Farbe des Interieurs',
          },
          trim: {
            type: 'string',
            enum: ['aluminum', 'wood', 'carbon'],
            description: 'Zierleisten-Material',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_brakes',
      description: 'Ändert das Bremssystem',
      parameters: {
        type: 'object',
        properties: {
          brakes: {
            type: 'string',
            enum: ['standard', 'performance', 'ceramic'],
            description: 'Bremssystem-Typ',
          },
        },
        required: ['brakes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_performance_package',
      description: 'Setzt das Performance-Paket',
      parameters: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            enum: ['none', 'performance', 'competition'],
            description: 'Performance-Paket',
          },
        },
        required: ['package'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_camera',
      description: 'Bewegt die Kamera zu einer bestimmten Ansicht',
      parameters: {
        type: 'object',
        properties: {
          position: {
            type: 'string',
            enum: ['front', 'side', 'rear', 'interior', 'wheels'],
            description: 'Kamera-Position',
          },
        },
        required: ['position'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_configuration',
      description: 'Validiert die aktuelle Konfiguration',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// =============================================================================
// AI SERVICE
// =============================================================================

export interface OpenAIResponse {
  message: string;
  functionCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
}

export async function sendMessageToOpenAI(
  userMessage: string,
  currentConfig: CarConfig,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<OpenAIResponse> {
  if (!API_KEY) {
    console.warn('⚠️ No OpenAI API key found - falling back to demo mode');
    return handleDemoMode(userMessage, currentConfig);
  }

  try {
    // Build context with current configuration
    const configContext = `
AKTUELLE KONFIGURATION:
- Modell: BMW M5
- Farbe: ${currentConfig.color.name}
- Felgen: ${currentConfig.wheels.name}
- Performance-Paket: ${currentConfig.performancePackage}
- Bremsen: ${currentConfig.brakes}
- Interieur: ${currentConfig.interior.leather} Leder, ${currentConfig.interior.trim} Zierleisten

VALIDIERUNGSSTATUS: ${validateConfiguration(currentConfig).isValid ? 'GÜLTIG ✅' : 'UNGÜLTIG ⚠️'}

Wenn der Kunde etwas anfragt, das nicht für den M5 verfügbar ist, erkläre:
1. WARUM es nicht möglich ist
2. Die 4 HAUPTVORTEILE des M5
3. Passende Alternativen
`;

    // Prepare messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: configContext + '\n\nKunde: ' + userMessage },
    ];

    console.log('📤 Sending request to OpenAI GPT-4o with function calling...');

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: CONFIGURATION_FUNCTIONS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 800,
    });

    const message = response.choices[0]?.message;
    const functionCalls: OpenAIResponse['functionCalls'] = [];

    console.log('📥 Received response from OpenAI');

    // Extract function calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`🔧 Processing ${message.tool_calls.length} function call(s)...`);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`  ✅ Function: ${toolCall.function.name}`, args);
            functionCalls.push({
              name: toolCall.function.name,
              args,
            });
          } catch (e) {
            console.error('❌ Error parsing function arguments:', e);
          }
        }
      }
    } else {
      console.log('ℹ️ No function calls in response');
    }

    // If we need a response but got function calls without text, generate a response
    let responseText = message.content || '';

    // If there are function calls but no message content, provide default acknowledgment
    if (!responseText && functionCalls.length > 0) {
      const functionName = functionCalls[0].name;
      if (functionName === 'change_color') {
        const colorId = functionCalls[0].args.colorId;
        const color = AVAILABLE_COLORS.find(c => c.id === colorId);
        responseText = color ? `Ich ändere die Farbe auf ${color.name}.` : 'Farbe wird geändert.';
      } else if (functionName === 'change_wheels') {
        const wheelId = functionCalls[0].args.wheelId;
        const wheel = AVAILABLE_WHEELS.find(w => w.id === wheelId);
        responseText = wheel ? `Ich ändere die Felgen auf ${wheel.name}.` : 'Felgen werden geändert.';
      } else if (functionName === 'move_camera') {
        responseText = 'Die Ansicht wird geändert.';
      } else {
        responseText = 'Konfiguration wird aktualisiert.';
      }
    }

    return {
      message: responseText || 'Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten.',
      functionCalls,
    };
  } catch (error: any) {
    console.error('❌ OpenAI API error:', error);
    console.error('Error details:', error?.message || 'Unknown error');

    // Check for specific error types
    if (error?.status === 401) {
      console.error('🔑 Authentication error - check your API key');
    } else if (error?.status === 429) {
      console.error('⏱️ Rate limit exceeded');
    } else if (error?.status === 500) {
      console.error('🔥 OpenAI server error');
    }

    return handleDemoMode(userMessage, currentConfig);
  }
}

// =============================================================================
// DEMO MODE (without API key)
// =============================================================================

function handleDemoMode(userMessage: string, currentConfig: CarConfig): OpenAIResponse {
  const lowerMessage = userMessage.toLowerCase();

  console.log('🎮 Demo mode active - processing message:', userMessage);

  // Color changes
  if (lowerMessage.includes('farbe') || lowerMessage.includes('color')) {
    if (lowerMessage.includes('zeig') || lowerMessage.includes('welche')) {
      return {
        message: `Hier sind die verfügbaren Farben für Ihren M5:\n\n${AVAILABLE_COLORS.map(c =>
          `• ${c.name} (${c.type === 'frozen' ? 'BMW Individual' : c.type})`
        ).join('\n')}\n\nWelche Farbe interessiert Sie?`,
        functionCalls: [],
      };
    }

    // Try to match color by name
    const requestedColor = AVAILABLE_COLORS.find(c =>
      lowerMessage.includes(c.name.toLowerCase()) ||
      lowerMessage.includes(c.id.toLowerCase()) ||
      (c.name.includes('Blau') && (lowerMessage.includes('blau') || lowerMessage.includes('blue'))) ||
      (c.name.includes('Schwarz') && (lowerMessage.includes('schwarz') || lowerMessage.includes('black'))) ||
      (c.name.includes('Grau') && (lowerMessage.includes('grau') || lowerMessage.includes('grey') || lowerMessage.includes('gray'))) ||
      (c.name.includes('Grün') && (lowerMessage.includes('grün') || lowerMessage.includes('green'))) ||
      (c.name.includes('Weiß') && (lowerMessage.includes('weiß') || lowerMessage.includes('white')))
    );

    if (requestedColor) {
      console.log('✅ Color change detected:', requestedColor.name);
      return {
        message: `Ich ändere die Farbe auf ${requestedColor.name}.`,
        functionCalls: [{ name: 'change_color', args: { colorId: requestedColor.id } }],
      };
    }
  }

  // Wheel changes - WITH M5 BENEFITS
  if (lowerMessage.includes('felge') || lowerMessage.includes('räder')) {
    // Check for standard wheels - DEMONSTRATE M5 BENEFITS
    if (lowerMessage.includes('standard') || lowerMessage.includes('normal')) {
      return {
        message: `⚠️ **Standard-Alufelgen sind für den BMW M5 nicht verfügbar.**

**Warum?** Der M5 ist ein Hochleistungsfahrzeug, das spezielle M-Komponenten erfordert.

**Die 4 Hauptvorteile Ihres BMW M5:**
1. 🏎️ **625 PS V8 Twin-Turbo Motor** - Außergewöhnliche Leistung für sportliche Fahrfreude
2. 🔧 **M xDrive Allradantrieb** - Optimale Traktion und präzises Handling in jeder Situation
3. 🎯 **Adaptive M Federung** - Perfekte Balance zwischen Rennstrecken-Performance und Alltagskomfort
4. ⚡ **Exklusive M Performance-Komponenten** - Rennstrecken-erprobte Technologie für maximale Fahrdynamik

**Verfügbare Alternativen:**
• M Doppelspeiche 20" - Sportlich und elegant
• M Sternspeiche 21" - Premium M Sport Design
• M Performance Geschmiedet 21" - Leichtbau für maximale Performance

Welche M Felgen interessieren Sie?`,
        functionCalls: [{ name: 'validate_configuration', args: {} }],
      };
    }

    if (lowerMessage.includes('zeig') || lowerMessage.includes('welche')) {
      return {
        message: `Für Ihren BMW M5 sind folgende Premium-Felgen verfügbar:\n\n${AVAILABLE_WHEELS
          .filter(w => w.type !== 'standard')
          .map(w => `• ${w.name} - ${w.type === 'm-performance' ? 'Premium Leichtbau' : 'M Sport Serie'}`)
          .join('\n')}`,
        functionCalls: [],
      };
    }

    const requestedWheel = AVAILABLE_WHEELS.find(w =>
      lowerMessage.includes(w.name.toLowerCase())
    );

    if (requestedWheel) {
      return {
        message: `Ich ändere die Felgen auf ${requestedWheel.name}.`,
        functionCalls: [{ name: 'change_wheels', args: { wheelId: requestedWheel.id } }],
      };
    }
  }

  // Camera controls
  if (lowerMessage.includes('zeig') && lowerMessage.includes('seite')) {
    return {
      message: 'Ich drehe das Fahrzeug zur Seitenansicht.',
      functionCalls: [{ name: 'move_camera', args: { position: 'side' } }],
    };
  }

  if (lowerMessage.includes('vorne') || lowerMessage.includes('front')) {
    return {
      message: 'Hier ist die Frontansicht Ihres M5.',
      functionCalls: [{ name: 'move_camera', args: { position: 'front' } }],
    };
  }

  // Validation
  if (lowerMessage.includes('valid') || lowerMessage.includes('prüf')) {
    const validation = validateConfiguration(currentConfig);
    return {
      message: validation.isValid
        ? '✅ Ihre Konfiguration ist gültig und kann so bestellt werden!'
        : `⚠️ Es gibt Probleme mit Ihrer Konfiguration:\n\n${getValidationExplanation(validation)}`,
      functionCalls: [{ name: 'validate_configuration', args: {} }],
    };
  }

  // Default response
  return {
    message: `Ich kann Ihnen bei der Konfiguration Ihres BMW M5 helfen. Sie können mir sagen:\n
• "Zeig mir die Farben" - alle verfügbaren Lackierungen
• "Zeig mir die Felgen" - M Sport und M Performance Optionen
• "Ändere die Farbe auf [Name]" - direkte Farbänderung
• "Standard Felgen" - sehen Sie die M5 Vorteile!

Was möchten Sie konfigurieren?`,
    functionCalls: [],
  };
}

// =============================================================================
// FUNCTION EXECUTION
// =============================================================================

export function executeOpenAIFunctionCall(
  name: string,
  args: Record<string, unknown>,
  currentConfig: CarConfig
): {
  configUpdate?: Partial<CarConfig>;
  cameraPosition?: string;
  showValidation?: boolean;
} {
  switch (name) {
    case 'change_color': {
      const color = AVAILABLE_COLORS.find(c => c.id === args.colorId);
      if (color) {
        return { configUpdate: { color } };
      }
      break;
    }

    case 'change_wheels': {
      const wheels = AVAILABLE_WHEELS.find(w => w.id === args.wheelId);
      if (wheels) {
        return { configUpdate: { wheels } };
      }
      break;
    }

    case 'change_interior': {
      const interiorUpdate: Partial<CarConfig['interior']> = {};
      if (args.leather) interiorUpdate.leather = args.leather as CarConfig['interior']['leather'];
      if (args.color) interiorUpdate.color = args.color as string;
      if (args.trim) interiorUpdate.trim = args.trim as CarConfig['interior']['trim'];
      return {
        configUpdate: {
          interior: { ...currentConfig.interior, ...interiorUpdate },
        },
      };
    }

    case 'change_brakes':
      return {
        configUpdate: { brakes: args.brakes as CarConfig['brakes'] },
      };

    case 'set_performance_package':
      return {
        configUpdate: { performancePackage: args.package as CarConfig['performancePackage'] },
      };

    case 'move_camera':
      return { cameraPosition: args.position as string };

    case 'validate_configuration':
      return { showValidation: true };

    default:
      break;
  }

  return {};
}
