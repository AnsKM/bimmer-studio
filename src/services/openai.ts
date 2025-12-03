/**
 * OpenAI Service for BMW M5 Configuration
 *
 * Uses GPT-5.1 with function calling to handle car configuration
 * and provide intelligent suggestions with validation
 */

import OpenAI from 'openai';
import type { CarConfig } from '../types';
import { validateConfiguration, getValidationExplanation } from '../config/constraints';
import { AVAILABLE_COLORS, AVAILABLE_WHEELS, AVAILABLE_GRILL_COLORS, AVAILABLE_HOOD_PATTERNS } from '../types';

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
  {
    type: 'function',
    function: {
      name: 'change_grill_color',
      description: 'Ändert die Farbe des Frontgrills (Niere)',
      parameters: {
        type: 'object',
        properties: {
          grillColorId: {
            type: 'string',
            description: 'Die ID der gewünschten Grill-Farbe',
            enum: AVAILABLE_GRILL_COLORS.map(g => g.id),
          },
        },
        required: ['grillColorId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_hood_pattern',
      description: 'Ändert das Muster/Design der Motorhaube',
      parameters: {
        type: 'object',
        properties: {
          hoodPatternId: {
            type: 'string',
            description: 'Die ID des gewünschten Hauben-Designs',
            enum: AVAILABLE_HOOD_PATTERNS.map(h => h.id),
          },
        },
        required: ['hoodPatternId'],
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

    console.log('📤 Sending request to OpenAI GPT-5.1 with function calling...');

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
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
  // Normalize German characters
  const normalizedMessage = lowerMessage
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue');

  console.log('🎮 Demo mode active - processing message:', userMessage);

  // ==========================================================================
  // DIRECT COLOR MATCHING (check FIRST, before keyword check)
  // ==========================================================================
  const matchedColor = AVAILABLE_COLORS.find(c => {
    const colorName = c.name.toLowerCase();
    const colorNameNormalized = colorName.replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
    const colorId = c.id.toLowerCase();

    return (
      lowerMessage.includes(colorName) ||
      normalizedMessage.includes(colorNameNormalized) ||
      lowerMessage.includes(colorId) ||
      normalizedMessage.includes(colorId.replace(/-/g, ' ')) ||
      // Partial matches for common color words
      (colorName.includes('weiß') && (lowerMessage.includes('weiß') || lowerMessage.includes('weiss') || lowerMessage.includes('white') || lowerMessage.includes('alpin'))) ||
      (colorName.includes('schwarz') && !colorName.includes('saphir') && (lowerMessage === 'schwarz' || lowerMessage === 'black')) ||
      (colorName.includes('saphir') && (lowerMessage.includes('saphir') || lowerMessage.includes('sapphire'))) ||
      (colorName.includes('brooklyn') && lowerMessage.includes('brooklyn')) ||
      (colorName.includes('portimao') && lowerMessage.includes('portimao')) ||
      (colorName.includes('isle') && (lowerMessage.includes('isle') || lowerMessage.includes('man grün') || lowerMessage.includes('man gruen'))) ||
      (colorName.includes('frozen deep') && (lowerMessage.includes('frozen deep') || lowerMessage.includes('frozen grey') || lowerMessage.includes('frozen grau'))) ||
      (colorName.includes('marina bay') && (lowerMessage.includes('marina') || lowerMessage.includes('bay blau')))
    );
  });

  if (matchedColor) {
    console.log('✅ Direct color match:', matchedColor.name);
    return {
      message: `Ausgezeichnete Wahl! Ich ändere die Farbe auf **${matchedColor.name}**. ${matchedColor.type === 'frozen' ? 'Dies ist eine exklusive BMW Individual Lackierung.' : ''}`,
      functionCalls: [{ name: 'change_color', args: { colorId: matchedColor.id } }],
    };
  }

  // ==========================================================================
  // DIRECT WHEEL MATCHING (check before keyword check)
  // ==========================================================================
  const matchedWheel = AVAILABLE_WHEELS.find(w => {
    const wheelName = w.name.toLowerCase();
    return (
      lowerMessage.includes(wheelName) ||
      lowerMessage.includes(w.id.toLowerCase()) ||
      (wheelName.includes('doppelspeiche') && lowerMessage.includes('doppelspeiche')) ||
      (wheelName.includes('sternspeiche') && lowerMessage.includes('sternspeiche')) ||
      (wheelName.includes('y-speiche') && (lowerMessage.includes('y-speiche') || lowerMessage.includes('y speiche'))) ||
      (wheelName.includes('geschmiedet') && lowerMessage.includes('geschmiedet'))
    );
  });

  if (matchedWheel && matchedWheel.type !== 'standard') {
    console.log('✅ Direct wheel match:', matchedWheel.name);
    return {
      message: `Perfekt! Ich ändere die Felgen auf **${matchedWheel.name}**. ${matchedWheel.type === 'm-performance' ? 'Eine exzellente Wahl für maximale Performance!' : 'Sportliches M Design für Ihren M5!'}`,
      functionCalls: [{ name: 'change_wheels', args: { wheelId: matchedWheel.id } }, { name: 'move_camera', args: { position: 'wheels' } }],
    };
  }

  // ==========================================================================
  // COLOR COMMANDS (show colors, etc.)
  // ==========================================================================
  if (lowerMessage.includes('farbe') || lowerMessage.includes('color') || lowerMessage.includes('lackierung')) {
    if (lowerMessage.includes('zeig') || lowerMessage.includes('welche') || lowerMessage.includes('verfügbar') || lowerMessage.includes('optionen')) {
      return {
        message: `Hier sind die verfügbaren Farben für Ihren M5:\n\n**Solid (ohne Aufpreis):**\n• Alpinweiß\n• Schwarz\n\n**Metallic:**\n• Saphirschwarz Metallic\n• Brooklyn Grau Metallic\n• Portimao Blau Metallic\n• Isle of Man Grün Metallic\n\n**BMW Individual:**\n• Frozen Deep Grey\n• Frozen Marina Bay Blau\n\nWelche Farbe interessiert Sie?`,
        functionCalls: [],
      };
    }
  }

  // ==========================================================================
  // WHEEL COMMANDS
  // ==========================================================================
  if (lowerMessage.includes('felge') || lowerMessage.includes('räder') || lowerMessage.includes('raeder') || lowerMessage.includes('wheel') || lowerMessage.includes('rim')) {
    // Check for standard wheels - DEMONSTRATE M5 BENEFITS
    if (lowerMessage.includes('standard') || lowerMessage.includes('normal') || lowerMessage.includes('basis')) {
      return {
        message: `⚠️ **Standard-Alufelgen sind für den BMW M5 nicht verfügbar.**

**Warum?** Der M5 ist ein Hochleistungsfahrzeug, das spezielle M-Komponenten erfordert.

**Die 4 Hauptvorteile Ihres BMW M5:**
1. 🏎️ **625 PS V8 Twin-Turbo Motor** - Außergewöhnliche Leistung
2. 🔧 **M xDrive Allradantrieb** - Optimale Traktion
3. 🎯 **Adaptive M Federung** - Perfekte Balance
4. ⚡ **Exklusive M Performance-Komponenten**

**Verfügbare Alternativen:**
• M Doppelspeiche 20" - Sportlich und elegant
• M Sternspeiche 21" - Premium M Sport Design
• M Y-Speiche 21" - Dynamisches Design
• M Performance Geschmiedet 21" - Leichtbau für maximale Performance

Welche M Felgen interessieren Sie?`,
        functionCalls: [{ name: 'validate_configuration', args: {} }],
      };
    }

    if (lowerMessage.includes('zeig') || lowerMessage.includes('welche') || lowerMessage.includes('änder') || lowerMessage.includes('aender')) {
      return {
        message: `Für Ihren BMW M5 sind folgende Premium-Felgen verfügbar:\n\n**M Sport:**\n• M Doppelspeiche 20" (€1.800)\n• M Sternspeiche 21" (€2.400)\n• M Y-Speiche 21" (€2.800)\n\n**M Performance:**\n• M Performance Geschmiedet 21" (€4.200)\n\nWelche Felgen möchten Sie?`,
        functionCalls: [{ name: 'move_camera', args: { position: 'wheels' } }],
      };
    }
  }

  // ==========================================================================
  // INTERIOR COMMANDS
  // ==========================================================================
  if (lowerMessage.includes('interieur') || lowerMessage.includes('interior') || lowerMessage.includes('innen') || lowerMessage.includes('sitz') || lowerMessage.includes('leder') || lowerMessage.includes('leather')) {
    // Interior color changes
    if (lowerMessage.includes('schwarz') || lowerMessage.includes('black')) {
      return {
        message: 'Ich ändere die Interieurfarbe auf **Schwarz**. Elegant und zeitlos!',
        functionCalls: [{ name: 'change_interior', args: { color: 'Schwarz' } }],
      };
    }
    if (lowerMessage.includes('cognac') || lowerMessage.includes('braun') || lowerMessage.includes('brown')) {
      return {
        message: 'Ich ändere die Interieurfarbe auf **Cognac**. Luxuriös und warm!',
        functionCalls: [{ name: 'change_interior', args: { color: 'Cognac' } }],
      };
    }
    if (lowerMessage.includes('silverstone') || lowerMessage.includes('silber') || lowerMessage.includes('grau') || lowerMessage.includes('grey')) {
      return {
        message: 'Ich ändere die Interieurfarbe auf **Silverstone**. Modern und elegant!',
        functionCalls: [{ name: 'change_interior', args: { color: 'Silverstone' } }],
      };
    }
    if (lowerMessage.includes('rot') || lowerMessage.includes('red') || lowerMessage.includes('fiona')) {
      return {
        message: 'Ich ändere die Interieurfarbe auf **Fiona Rot**. Sportlich und ausdrucksstark!',
        functionCalls: [{ name: 'change_interior', args: { color: 'Fiona Rot' } }],
      };
    }

    // Leather type changes
    if (lowerMessage.includes('merino')) {
      const leatherType = lowerMessage.includes('extended') ? 'extended-merino' : 'merino';
      return {
        message: `Ich ändere das Leder auf **${leatherType === 'extended-merino' ? 'Extended Merino' : 'Merino'}**. Höchste Qualität für Ihren M5!`,
        functionCalls: [{ name: 'change_interior', args: { leather: leatherType } }],
      };
    }
    if (lowerMessage.includes('vernasca')) {
      return {
        message: 'Ich ändere das Leder auf **Vernasca**. Strapazierfähig und elegant!',
        functionCalls: [{ name: 'change_interior', args: { leather: 'vernasca' } }],
      };
    }

    // Trim changes
    if (lowerMessage.includes('carbon')) {
      return {
        message: 'Ich ändere die Zierleisten auf **M Carbon**. Perfekt für den sportlichen Look!',
        functionCalls: [{ name: 'change_interior', args: { trim: 'carbon' } }],
      };
    }
    if (lowerMessage.includes('holz') || lowerMessage.includes('wood') || lowerMessage.includes('eiche')) {
      return {
        message: 'Ich ändere die Zierleisten auf **Edelholz Eiche**. Klassische Eleganz!',
        functionCalls: [{ name: 'change_interior', args: { trim: 'wood' } }],
      };
    }
    if (lowerMessage.includes('aluminium') || lowerMessage.includes('alu')) {
      return {
        message: 'Ich ändere die Zierleisten auf **Aluminium Rhombicle**. Modern und technisch!',
        functionCalls: [{ name: 'change_interior', args: { trim: 'aluminum' } }],
      };
    }

    // Show interior options
    return {
      message: `Hier sind die Interieur-Optionen für Ihren M5:\n\n**Lederarten:**\n• Vernasca Leder\n• Merino Leder\n• Extended Merino Leder (M5 exklusiv)\n\n**Farben:**\n• Schwarz\n• Cognac\n• Silverstone\n• Fiona Rot\n\n**Zierleisten:**\n• Aluminium Rhombicle\n• Edelholz Eiche\n• M Carbon\n\nWas möchten Sie ändern?`,
      functionCalls: [{ name: 'move_camera', args: { position: 'interior' } }],
    };
  }

  // ==========================================================================
  // BRAKES COMMANDS
  // ==========================================================================
  if (lowerMessage.includes('brems') || lowerMessage.includes('brake')) {
    if (lowerMessage.includes('keramik') || lowerMessage.includes('ceramic')) {
      return {
        message: 'Ich ändere die Bremsen auf **Keramik-Verbundbremsanlage**. Ultimative Bremsleistung für die Rennstrecke!',
        functionCalls: [{ name: 'change_brakes', args: { brakes: 'ceramic' } }],
      };
    }
    if (lowerMessage.includes('performance') || lowerMessage.includes('sport')) {
      return {
        message: 'Ich ändere die Bremsen auf **M Performance Bremsen**. Verbesserte Bremsleistung für sportliches Fahren!',
        functionCalls: [{ name: 'change_brakes', args: { brakes: 'performance' } }],
      };
    }
    if (lowerMessage.includes('standard') || lowerMessage.includes('normal')) {
      return {
        message: 'Ich ändere die Bremsen auf **Standard**.',
        functionCalls: [{ name: 'change_brakes', args: { brakes: 'standard' } }],
      };
    }

    return {
      message: `**Bremssystem-Optionen:**\n\n• **Standard** - Hochwertige M Bremsanlage\n• **M Performance** - Verbesserte Bremsleistung\n• **Keramik-Verbund** - Ultimative Performance (erfordert Performance-Paket)\n\nWelche Bremsen möchten Sie?`,
      functionCalls: [],
    };
  }

  // ==========================================================================
  // PERFORMANCE PACKAGE COMMANDS
  // ==========================================================================
  if (lowerMessage.includes('paket') || lowerMessage.includes('package') || lowerMessage.includes('competition')) {
    if (lowerMessage.includes('competition') || lowerMessage.includes('comp')) {
      return {
        message: 'Ich aktiviere das **M Competition Paket**. Maximale Performance mit 625 PS!',
        functionCalls: [{ name: 'set_performance_package', args: { package: 'competition' } }],
      };
    }
    if (lowerMessage.includes('performance') && !lowerMessage.includes('competition')) {
      return {
        message: 'Ich aktiviere das **M Performance Paket**. Sportliche Verbesserungen für Ihren M5!',
        functionCalls: [{ name: 'set_performance_package', args: { package: 'performance' } }],
      };
    }
    if (lowerMessage.includes('kein') || lowerMessage.includes('ohne') || lowerMessage.includes('standard') || lowerMessage.includes('none')) {
      return {
        message: 'Ich entferne das Performance-Paket.',
        functionCalls: [{ name: 'set_performance_package', args: { package: 'none' } }],
      };
    }

    return {
      message: `**Performance-Pakete:**\n\n• **Kein Paket** - Standard M5 Ausstattung\n• **M Performance** - Sportliche Verbesserungen\n• **M Competition** - Maximale Performance (625 PS)\n\nWelches Paket interessiert Sie?`,
      functionCalls: [],
    };
  }

  // ==========================================================================
  // GRILL COLOR COMMANDS
  // ==========================================================================
  if (lowerMessage.includes('grill') || lowerMessage.includes('niere') || lowerMessage.includes('kühlergrill') || lowerMessage.includes('kuehlergrill')) {
    // Direct grill color matching
    const matchedGrill = AVAILABLE_GRILL_COLORS.find(g => {
      const grillName = g.name.toLowerCase();
      return (
        lowerMessage.includes(grillName) ||
        lowerMessage.includes(g.id.toLowerCase()) ||
        (grillName.includes('chrom') && (lowerMessage.includes('chrom') || lowerMessage.includes('chrome') || lowerMessage.includes('silber'))) ||
        (grillName.includes('hochglanz') && (lowerMessage.includes('hochglanz') || lowerMessage.includes('glanz') || lowerMessage.includes('gloss'))) ||
        (grillName.includes('shadow') && (lowerMessage.includes('shadow') || lowerMessage.includes('schatten'))) ||
        (grillName.includes('cerium') && (lowerMessage.includes('cerium') || lowerMessage.includes('grau') && !lowerMessage.includes('brooklyn'))) ||
        (grillName.includes('gold') && (lowerMessage.includes('gold') || lowerMessage.includes('bronze')))
      );
    });

    if (matchedGrill) {
      console.log('✅ Direct grill color match:', matchedGrill.name);
      return {
        message: `Perfekt! Ich ändere die Nierenfarbe auf **${matchedGrill.name}**. ${matchedGrill.price > 0 ? `(+€${matchedGrill.price})` : ''}`,
        functionCalls: [{ name: 'change_grill_color', args: { grillColorId: matchedGrill.id } }, { name: 'move_camera', args: { position: 'front' } }],
      };
    }

    // Show grill options
    return {
      message: `**Nierenfarben für Ihren M5:**\n\n${AVAILABLE_GRILL_COLORS.map(g => `• **${g.name}** ${g.price > 0 ? `(+€${g.price})` : '(inkl.)'}`).join('\n')}\n\nWelche Nierenfarbe möchten Sie?`,
      functionCalls: [{ name: 'move_camera', args: { position: 'front' } }],
    };
  }

  // ==========================================================================
  // HOOD PATTERN COMMANDS
  // ==========================================================================
  if (lowerMessage.includes('haube') || lowerMessage.includes('hood') || lowerMessage.includes('motorhaube') || lowerMessage.includes('streifen') || lowerMessage.includes('muster')) {
    // Direct hood pattern matching
    const matchedHood = AVAILABLE_HOOD_PATTERNS.find(h => {
      const hoodName = h.name.toLowerCase();
      return (
        lowerMessage.includes(hoodName) ||
        lowerMessage.includes(h.id.toLowerCase()) ||
        (hoodName.includes('carbon') && (lowerMessage.includes('carbon') || lowerMessage.includes('karbon'))) ||
        (hoodName.includes('m streifen') && (lowerMessage.includes('m streifen') || lowerMessage.includes('m-streifen') || lowerMessage.includes('m stripe'))) ||
        (hoodName.includes('racing') && (lowerMessage.includes('racing') || lowerMessage.includes('rennstreifen') || lowerMessage.includes('rennen'))) ||
        (hoodName.includes('matt') && (lowerMessage.includes('matt') || lowerMessage.includes('matte'))) ||
        (hoodName.includes('standard') && (lowerMessage.includes('standard') || lowerMessage.includes('normal') || lowerMessage.includes('ohne')))
      );
    });

    if (matchedHood) {
      console.log('✅ Direct hood pattern match:', matchedHood.name);
      return {
        message: `Ausgezeichnet! Ich ändere das Haubendesign auf **${matchedHood.name}**. ${matchedHood.description} ${matchedHood.price > 0 ? `(+€${matchedHood.price})` : ''}`,
        functionCalls: [{ name: 'change_hood_pattern', args: { hoodPatternId: matchedHood.id } }, { name: 'move_camera', args: { position: 'front' } }],
      };
    }

    // Show hood options
    return {
      message: `**Haubendesigns für Ihren M5:**\n\n${AVAILABLE_HOOD_PATTERNS.map(h => `• **${h.name}** - ${h.description} ${h.price > 0 ? `(+€${h.price})` : '(inkl.)'}`).join('\n')}\n\nWelches Haubendesign möchten Sie?`,
      functionCalls: [{ name: 'move_camera', args: { position: 'front' } }],
    };
  }

  // ==========================================================================
  // CAMERA CONTROLS
  // ==========================================================================
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
  if (lowerMessage.includes('heck') || lowerMessage.includes('hinten') || lowerMessage.includes('rear')) {
    return {
      message: 'Hier ist die Heckansicht Ihres M5.',
      functionCalls: [{ name: 'move_camera', args: { position: 'rear' } }],
    };
  }
  if (lowerMessage.includes('innen') && lowerMessage.includes('zeig')) {
    return {
      message: 'Hier ist der Innenraum Ihres M5.',
      functionCalls: [{ name: 'move_camera', args: { position: 'interior' } }],
    };
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  if (lowerMessage.includes('valid') || lowerMessage.includes('prüf') || lowerMessage.includes('check') || lowerMessage.includes('gültig')) {
    const validation = validateConfiguration(currentConfig);
    return {
      message: validation.isValid
        ? '✅ Ihre Konfiguration ist gültig und kann so bestellt werden!'
        : `⚠️ Es gibt Probleme mit Ihrer Konfiguration:\n\n${getValidationExplanation(validation)}`,
      functionCalls: [{ name: 'validate_configuration', args: {} }],
    };
  }

  // ==========================================================================
  // HELP / DEFAULT RESPONSE
  // ==========================================================================
  return {
    message: `Ich kann Ihnen bei der Konfiguration Ihres BMW M5 helfen:\n
**Außen:**
• "Zeig mir die Farben" oder direkt "Alpinweiß", "Portimao Blau", etc.
• "Zeig mir die Felgen" oder direkt "M Doppelspeiche", "M Performance", etc.
• "Zeig mir die Nierenfarben" - Grill/Niere ändern
• "Zeig mir Haubendesigns" - Motorhaube ändern

**Innen:**
• "Zeig mir das Interieur"
• "Cognac Leder", "Carbon Zierleisten", "Merino Leder"

**Performance:**
• "M Competition Paket"
• "Keramik Bremsen"

**Ansichten:**
• "Zeig mir die Front/Seite/Heck"

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

    case 'change_grill_color': {
      const grillColor = AVAILABLE_GRILL_COLORS.find(g => g.id === args.grillColorId);
      if (grillColor) {
        return { configUpdate: { grillColor } };
      }
      break;
    }

    case 'change_hood_pattern': {
      const hoodPattern = AVAILABLE_HOOD_PATTERNS.find(h => h.id === args.hoodPatternId);
      if (hoodPattern) {
        return { configUpdate: { hoodPattern } };
      }
      break;
    }

    default:
      break;
  }

  return {};
}
