/**
 * OpenAI Service for Natural Language Configuration Changes
 *
 * This service uses OpenAI to parse user prompts and extract configuration changes
 * for the BMW M5, then validates them against the M5 constraints.
 */

import OpenAI from 'openai';
import type { CarConfig } from '../types';
import { validateConfiguration, getValidationExplanation, suggestFixes, BMW_M5_CONSTRAINTS } from '../config/constraints';
import { AVAILABLE_COLORS, AVAILABLE_WHEELS } from '../types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

const openai = new OpenAI({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true, // For demo purposes - in production, use a backend
});

// =============================================================================
// TYPES
// =============================================================================

interface ConfigurationChange {
  field: string;
  value: string | object;
  reason: string;
}

interface OpenAIResponse {
  message: string;
  configChanges: ConfigurationChange[];
  validationIssues?: string[];
  suggestions?: string[];
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `Du bist ein BMW M5 Konfigurations-Assistent. Deine Aufgabe ist es, Kundenwünsche zu verstehen und die Fahrzeugkonfiguration entsprechend anzupassen.

VERFÜGBARE KONFIGURATIONSOPTIONEN:

FARBEN:
${AVAILABLE_COLORS.map(c => `- ${c.id}: ${c.name} (${c.type})`).join('\n')}

FELGEN:
${AVAILABLE_WHEELS.map(w => `- ${w.id}: ${w.name} (${w.size}, ${w.type})`).join('\n')}

PERFORMANCE-PAKETE:
- none: Kein Performance-Paket
- performance: M Performance-Paket
- competition: M Competition-Paket

BREMSEN:
- standard: Standard M Sportbremsen
- performance: M Performance Bremsen
- ceramic: M Carbon Keramikbremsen

INTERIEUR LEDER:
- vernasca: Vernasca Leder
- merino: Merino Leder
- extended-merino: Extended Merino Leder

INTERIEUR FARBEN:
- black: Schwarz
- cognac: Cognac
- ivory: Elfenbein

INTERIEUR ZIERLEISTEN:
- aluminum: Aluminium
- wood: Holz
- carbon: Carbon

LICHTER:
- led: LED Scheinwerfer
- laser: BMW Laserlicht

SOUND:
- standard: Standard Audio
- harman-kardon: Harman Kardon
- bowers-wilkins: Bowers & Wilkins

FAHRASSISTENZ:
- none: Keine Assistenz
- basic: Driving Assistant
- plus: Driving Assistant Plus
- pro: Driving Assistant Professional

WICHTIGE CONSTRAINTS (BMW M5 spezifisch):
${BMW_M5_CONSTRAINTS.map(c => `- ${c.description}: ${c.message}`).join('\n')}

DEINE AUFGABE:
1. Verstehe die Konfigurationswünsche des Kunden aus seinem Text
2. Extrahiere die gewünschten Änderungen als JSON
3. Erkläre, welche Änderungen du vornimmst
4. Weise auf Validierungsprobleme hin (z.B. "Standard-Felgen sind für M5 nicht verfügbar")
5. Schlage Alternativen vor, wenn eine Konfiguration nicht möglich ist

ANTWORTE IMMER IM FOLGENDEN JSON-FORMAT:
{
  "message": "Deine Antwort an den Kunden auf Deutsch",
  "configChanges": [
    {
      "field": "color|wheels|performancePackage|brakes|interior|lights|sound|drivingAssistant",
      "value": "der entsprechende ID-Wert",
      "reason": "Warum diese Änderung vorgenommen wird"
    }
  ],
  "validationIssues": ["Liste von Problemen, falls vorhanden"],
  "suggestions": ["Alternative Vorschläge"]
}

BEISPIELE:

Kunde: "Ich möchte blaue Felgen"
{
  "message": "Entschuldigung, blaue Felgen sind für den BMW M5 nicht verfügbar. Der M5 benötigt M Sport oder M Performance Felgen. Möchten Sie stattdessen die M Doppelspeiche 20\\" oder M Sternspeiche 21\\" Felgen sehen?",
  "configChanges": [],
  "validationIssues": ["Blaue Felgen nicht verfügbar"],
  "suggestions": ["m-double-spoke-20", "m-star-spoke-21"]
}

Kunde: "Ändere die Farbe auf Rot"
{
  "message": "Ich ändere die Farbe auf Toronto Rot Metallic.",
  "configChanges": [
    {
      "field": "color",
      "value": "toronto-red",
      "reason": "Kunde wünscht rote Lackierung"
    }
  ]
}

Kunde: "Ich möchte Carbon Bremsen"
{
  "message": "Die M Carbon Keramikbremsen sind eine ausgezeichnete Wahl für maximale Bremsleistung. Bitte beachten Sie, dass diese nur in Kombination mit einem M Performance oder Competition Paket verfügbar sind.",
  "configChanges": [
    {
      "field": "brakes",
      "value": "ceramic",
      "reason": "Kunde wünscht Carbon Keramikbremsen"
    }
  ],
  "validationIssues": ["Keramikbremsen erfordern Performance-Paket"],
  "suggestions": ["Fügen Sie ein Performance-Paket hinzu"]
}`;

// =============================================================================
// AI SERVICE
// =============================================================================

export async function sendMessageToOpenAI(
  userMessage: string,
  currentConfig: CarConfig,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<OpenAIResponse> {
  if (!API_KEY) {
    return handleDemoMode(userMessage, currentConfig);
  }

  try {
    // Build context
    const configContext = `
AKTUELLE KONFIGURATION:
- Modell: ${currentConfig.model}
- Farbe: ${currentConfig.color.name} (${currentConfig.color.id})
- Felgen: ${currentConfig.wheels.name} (${currentConfig.wheels.id})
- Performance-Paket: ${currentConfig.performancePackage}
- Bremsen: ${currentConfig.brakes}
- Interieur Leder: ${currentConfig.interior.leather}
- Interieur Farbe: ${currentConfig.interior.color}
- Interieur Trim: ${currentConfig.interior.trim}
- Lichter: ${currentConfig.lights}
- Sound: ${currentConfig.sound}
- Fahrassistenz: ${currentConfig.drivingAssistant}

VALIDIERUNGSSTATUS:
${validateConfiguration(currentConfig).isValid ? '✅ GÜLTIG' : '⚠️ UNGÜLTIG'}
${!validateConfiguration(currentConfig).isValid ? '\nProbleme:\n' + getValidationExplanation(validateConfiguration(currentConfig)) : ''}
`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: 'user', content: configContext + '\n\nKunde: ' + userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed: OpenAIResponse = JSON.parse(content);

    // Validate the response structure
    if (!parsed.message) {
      throw new Error('Invalid response format from OpenAI');
    }

    return parsed;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return handleDemoMode(userMessage, currentConfig);
  }
}

// =============================================================================
// EXECUTE CONFIGURATION CHANGES
// =============================================================================

export function executeConfigChanges(
  changes: ConfigurationChange[],
  currentConfig: CarConfig
): Partial<CarConfig> {
  const updates: Partial<CarConfig> = {};

  for (const change of changes) {
    switch (change.field) {
      case 'color': {
        const color = AVAILABLE_COLORS.find(c => c.id === change.value);
        if (color) updates.color = color;
        break;
      }

      case 'wheels': {
        const wheels = AVAILABLE_WHEELS.find(w => w.id === change.value);
        if (wheels) updates.wheels = wheels;
        break;
      }

      case 'performancePackage':
        updates.performancePackage = change.value as CarConfig['performancePackage'];
        break;

      case 'brakes':
        updates.brakes = change.value as CarConfig['brakes'];
        break;

      case 'interior': {
        if (typeof change.value === 'object') {
          updates.interior = {
            ...currentConfig.interior,
            ...(change.value as Partial<CarConfig['interior']>),
          };
        }
        break;
      }

      case 'lights':
        updates.lights = change.value as CarConfig['lights'];
        break;

      case 'sound':
        updates.sound = change.value as CarConfig['sound'];
        break;

      case 'drivingAssistant':
        updates.drivingAssistant = change.value as CarConfig['drivingAssistant'];
        break;
    }
  }

  return updates;
}

// =============================================================================
// DEMO MODE (without API key)
// =============================================================================

function handleDemoMode(userMessage: string, currentConfig: CarConfig): OpenAIResponse {
  const lowerMessage = userMessage.toLowerCase();

  // Color changes
  if (lowerMessage.includes('farbe') || lowerMessage.includes('lackierung')) {
    const requestedColor = AVAILABLE_COLORS.find(c =>
      lowerMessage.includes(c.name.toLowerCase()) ||
      lowerMessage.includes(c.id.replace(/-/g, ' '))
    );

    if (requestedColor) {
      return {
        message: `Ich ändere die Farbe auf ${requestedColor.name}.`,
        configChanges: [
          {
            field: 'color',
            value: requestedColor.id,
            reason: 'Kunde wünscht Farbänderung',
          },
        ],
      };
    }

    return {
      message: `Hier sind die verfügbaren Farben für Ihren M5:\n\n${AVAILABLE_COLORS.map(c =>
        `• ${c.name} (${c.type === 'frozen' ? 'BMW Individual' : c.type})`
      ).join('\n')}\n\nWelche Farbe möchten Sie?`,
      configChanges: [],
    };
  }

  // Wheel changes - with validation demo
  if (lowerMessage.includes('felge') || lowerMessage.includes('räder')) {
    // Block standard wheels
    if (lowerMessage.includes('standard')) {
      return {
        message: '⚠️ **Konfiguration nicht möglich!**\n\nDer BMW M5 Sportwagen erfordert M Sport Felgen. Standard-Alufelgen sind für dieses Hochleistungsfahrzeug nicht verfügbar.\n\n**Empfohlene Alternativen:**\n• M Doppelspeiche 20"\n• M Sternspeiche 21"\n• M Y-Speiche 21"\n\nMöchten Sie eine dieser Optionen?',
        configChanges: [],
        validationIssues: ['Standard-Felgen nicht verfügbar für M5'],
        suggestions: ['m-double-spoke-20', 'm-star-spoke-21', 'm-y-spoke-21'],
      };
    }

    const requestedWheel = AVAILABLE_WHEELS.find(w =>
      lowerMessage.includes(w.name.toLowerCase()) ||
      lowerMessage.includes(w.id.replace(/-/g, ' '))
    );

    if (requestedWheel) {
      return {
        message: `Ich ändere die Felgen auf ${requestedWheel.name}.`,
        configChanges: [
          {
            field: 'wheels',
            value: requestedWheel.id,
            reason: 'Kunde wünscht Felgenänderung',
          },
        ],
      };
    }

    return {
      message: `Für den BMW M5 sind folgende Felgen verfügbar:\n\n${AVAILABLE_WHEELS.filter(w => w.type !== 'standard').map(w =>
        `• ${w.name} - ${w.type === 'm-performance' ? 'Premium' : 'Serie'}`
      ).join('\n')}\n\n**Hinweis:** Standard-Alufelgen sind für den M5 nicht verfügbar.`,
      configChanges: [],
    };
  }

  // Ceramic brakes
  if (lowerMessage.includes('keramik') || lowerMessage.includes('carbon bremse')) {
    const needsPerformancePackage = currentConfig.performancePackage === 'none';

    if (needsPerformancePackage) {
      return {
        message: 'Die M Carbon Keramikbremsen sind eine ausgezeichnete Wahl! Diese sind nur in Kombination mit einem M Performance oder Competition Paket verfügbar. Soll ich beides hinzufügen?',
        configChanges: [
          {
            field: 'brakes',
            value: 'ceramic',
            reason: 'Kunde wünscht Keramikbremsen',
          },
          {
            field: 'performancePackage',
            value: 'performance',
            reason: 'Erforderlich für Keramikbremsen',
          },
        ],
        validationIssues: ['Keramikbremsen erfordern Performance-Paket'],
        suggestions: ['Performance-Paket hinzufügen'],
      };
    }

    return {
      message: 'Ich ändere auf M Carbon Keramikbremsen - perfekt für maximale Bremsleistung!',
      configChanges: [
        {
          field: 'brakes',
          value: 'ceramic',
          reason: 'Kunde wünscht Keramikbremsen',
        },
      ],
    };
  }

  // Validation check
  if (lowerMessage.includes('valid') || lowerMessage.includes('prüf') || lowerMessage.includes('check')) {
    const validation = validateConfiguration(currentConfig);
    return {
      message: validation.isValid
        ? '✅ Ihre Konfiguration ist gültig und kann so bestellt werden!'
        : `⚠️ Es gibt Probleme mit Ihrer Konfiguration:\n\n${getValidationExplanation(validation)}`,
      configChanges: [],
      validationIssues: validation.isValid ? [] : validation.blockers.map(b => b.message),
      suggestions: validation.isValid ? [] : suggestFixes(validation, currentConfig),
    };
  }

  // Default response
  return {
    message: `Ich kann Ihnen bei der Konfiguration Ihres BMW M5 helfen. Versuchen Sie:\n
• "Ändere die Farbe auf [Name]"
• "Zeig mir die Felgen"
• "Ich möchte Keramikbremsen"
• "Standard Felgen" (Demo: wird blockiert!)
• "Prüfe die Konfiguration"

Was möchten Sie ändern?`,
    configChanges: [],
  };
}
