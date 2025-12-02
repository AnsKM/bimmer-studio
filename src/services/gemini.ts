/**
 * Gemini AI Service with Function Calling
 *
 * This service handles all AI interactions for the BMW M5 Configurator.
 * Uses Gemini 2.5 Flash for fast, intelligent responses.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CarConfig } from '../types';
import { validateConfiguration, getValidationExplanation, suggestFixes } from '../config/constraints';
import { AVAILABLE_COLORS, AVAILABLE_WHEELS } from '../types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);

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
2. Führe die passenden Funktionen aus
3. VALIDIERE IMMER die Konfiguration nach Änderungen
4. Erkläre dem Kunden, wenn eine Kombination nicht möglich ist
5. Schlage passende Alternativen vor

KOMMUNIKATIONSSTIL:
- Professionell aber freundlich
- Auf Deutsch antworten
- Kurz und präzise
- Bei ungültigen Konfigurationen: Erkläre WARUM es nicht geht

VERFÜGBARE FARBEN: ${AVAILABLE_COLORS.map(c => c.name).join(', ')}
VERFÜGBARE FELGEN: ${AVAILABLE_WHEELS.map(w => w.name).join(', ')}`;

// =============================================================================
// AI SERVICE CLASS
// =============================================================================

export interface GeminiResponse {
  message: string;
  functionCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
}

export async function sendMessage(
  userMessage: string,
  currentConfig: CarConfig,
  conversationHistory: Array<{ role: 'user' | 'model'; content: string }>
): Promise<GeminiResponse> {
  if (!API_KEY) {
    // Demo mode without API key
    return handleDemoMode(userMessage, currentConfig);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite-preview-06-17',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build context with current configuration
    const configContext = `
AKTUELLE KONFIGURATION:
- Farbe: ${currentConfig.color.name}
- Felgen: ${currentConfig.wheels.name}
- Performance-Paket: ${currentConfig.performancePackage}
- Bremsen: ${currentConfig.brakes}
- Interieur: ${currentConfig.interior.leather} Leder, ${currentConfig.interior.trim} Zierleisten

VALIDIERUNGSSTATUS: ${validateConfiguration(currentConfig).isValid ? 'GÜLTIG' : 'UNGÜLTIG - Es gibt Probleme!'}

Bitte antworte auf Deutsch und führe die gewünschten Änderungen durch. Wenn der Kunde etwas Ungültiges anfragt, erkläre warum es nicht möglich ist.
`;

    const chat = model.startChat({
      history: conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(configContext + '\n\nKunde: ' + userMessage);
    const response = result.response;

    // Parse the response for any configuration commands
    const functionCalls = parseResponseForCommands(response.text() || '');

    return {
      message: response.text() || 'Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten.',
      functionCalls,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return handleDemoMode(userMessage, currentConfig);
  }
}

/**
 * Parse AI response for implicit commands (backup to function calling)
 */
function parseResponseForCommands(text: string): GeminiResponse['functionCalls'] {
  const commands: GeminiResponse['functionCalls'] = [];
  const lowerText = text.toLowerCase();

  // Detect color changes mentioned in response
  for (const color of AVAILABLE_COLORS) {
    if (lowerText.includes(color.name.toLowerCase()) && lowerText.includes('änder')) {
      commands.push({ name: 'change_color', args: { colorId: color.id } });
      break;
    }
  }

  // Detect wheel changes
  for (const wheel of AVAILABLE_WHEELS) {
    if (lowerText.includes(wheel.name.toLowerCase()) && lowerText.includes('änder')) {
      commands.push({ name: 'change_wheels', args: { wheelId: wheel.id } });
      break;
    }
  }

  return commands;
}

// =============================================================================
// DEMO MODE (without API key)
// =============================================================================

function handleDemoMode(userMessage: string, currentConfig: CarConfig): GeminiResponse {
  const lowerMessage = userMessage.toLowerCase();

  // Detect intent and respond appropriately
  if (lowerMessage.includes('farbe') || lowerMessage.includes('color') || lowerMessage.includes('lackierung')) {
    if (lowerMessage.includes('zeig') || lowerMessage.includes('welche')) {
      return {
        message: `Hier sind die verfügbaren Farben für Ihren M5:\n\n${AVAILABLE_COLORS.map(c =>
          `• ${c.name} (${c.type === 'frozen' ? 'BMW Individual' : c.type})`
        ).join('\n')}\n\nWelche Farbe interessiert Sie?`,
        functionCalls: [{ name: 'show_colors', args: {} }],
      };
    }

    // Try to find the requested color
    const requestedColor = AVAILABLE_COLORS.find(c =>
      lowerMessage.includes(c.name.toLowerCase()) ||
      lowerMessage.includes(c.id.replace(/-/g, ' '))
    );

    if (requestedColor) {
      return {
        message: `Ich ändere die Farbe auf ${requestedColor.name}.`,
        functionCalls: [{ name: 'change_color', args: { colorId: requestedColor.id } }],
      };
    }
  }

  // DEMO: Detecting wheel changes - THIS IS THE KEY DEMO FEATURE
  if (lowerMessage.includes('felge') || lowerMessage.includes('räder') || lowerMessage.includes('wheel')) {
    // Check for standard wheels request - THIS SHOULD BE BLOCKED!
    if (lowerMessage.includes('standard') || lowerMessage.includes('normal')) {
      // Simulate the validation blocking
      const testConfig = { ...currentConfig, wheels: { ...AVAILABLE_WHEELS[0] } };
      const validation = validateConfiguration(testConfig);

      return {
        message: `⚠️ **Konfiguration nicht möglich!**\n\n${getValidationExplanation(validation)}\n\n**Empfohlene Alternativen:**\n${suggestFixes(validation, testConfig).join('\n')}\n\nSoll ich Ihnen die M Sport Felgen zeigen?`,
        functionCalls: [
          { name: 'change_wheels', args: { wheelId: 'standard-19' } },
          { name: 'validate_configuration', args: {} },
        ],
      };
    }

    if (lowerMessage.includes('zeig') || lowerMessage.includes('welche')) {
      return {
        message: `Für den BMW M5 sind folgende Felgen verfügbar:\n\n${AVAILABLE_WHEELS.filter(w => w.type !== 'standard').map(w =>
          `• ${w.name} - ${w.type === 'm-performance' ? 'Premium' : 'Serie'}`
        ).join('\n')}\n\n**Hinweis:** Standard-Alufelgen sind für den M5 nicht verfügbar.`,
        functionCalls: [{ name: 'show_wheels', args: {} }],
      };
    }

    // Try to match a specific wheel
    const requestedWheel = AVAILABLE_WHEELS.find(w =>
      lowerMessage.includes(w.name.toLowerCase()) ||
      lowerMessage.includes(w.id.replace(/-/g, ' '))
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

  if (lowerMessage.includes('heck') || lowerMessage.includes('hinten')) {
    return {
      message: 'Hier ist die Heckansicht Ihres M5.',
      functionCalls: [{ name: 'move_camera', args: { position: 'rear' } }],
    };
  }

  // Validation request
  if (lowerMessage.includes('valid') || lowerMessage.includes('prüf') || lowerMessage.includes('check')) {
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
• "Standard Felgen" - **wird blockiert** (Demo der Validierung!)

Was möchten Sie konfigurieren?`,
    functionCalls: [],
  };
}

// =============================================================================
// FUNCTION EXECUTION
// =============================================================================

export function executeFunctionCall(
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
