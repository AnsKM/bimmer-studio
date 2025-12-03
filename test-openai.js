#!/usr/bin/env node

/**
 * OpenAI Integration Test Script
 *
 * This script tests the OpenAI API connection and function calling
 * without needing to run the full React app.
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.VITE_OPENAI_API_KEY;

console.log('🔧 BMW M5 Configurator - OpenAI Integration Test\n');
console.log('='.repeat(60));

// Check API key
if (!API_KEY) {
  console.error('❌ ERROR: No API key found!');
  console.error('');
  console.error('Please set VITE_OPENAI_API_KEY in your .env file:');
  console.error('  VITE_OPENAI_API_KEY=sk-your-api-key-here');
  console.error('');
  console.error('Get your API key from: https://platform.openai.com/api-keys');
  process.exit(1);
}

console.log('✅ API key found:', API_KEY.substring(0, 10) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: API_KEY,
});

// Test configuration functions
const CONFIGURATION_FUNCTIONS = [
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
            enum: ['alpine-white', 'black', 'sapphire-black', 'brooklyn-grey', 'portimao-blue', 'isle-of-man-green', 'frozen-deep-grey', 'frozen-marina-bay-blue'],
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
            enum: ['m-double-spoke-20', 'm-star-spoke-21', 'm-y-spoke-21', 'm-performance-forge-21'],
          },
        },
        required: ['wheelId'],
      },
    },
  },
];

// Test prompts
const TEST_PROMPTS = [
  'change the color to Sapphire Black',
  'ändere die Farbe auf Blau',
  'show me blue colors',
  'change the wheels to M Performance',
  'zeig mir die Felgen',
];

async function testOpenAI() {
  console.log('📤 Testing OpenAI API connection...\n');

  for (const prompt of TEST_PROMPTS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📝 Test Prompt: "${prompt}"`);
    console.log('─'.repeat(60));

    try {
      // Using gpt-5.1 - newest flagship model
      // GPT-5 models don't support temperature/top_p, use reasoning.effort instead
      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [
          {
            role: 'system',
            content: `Du bist der BMW M5 KI-Konfigurator Assistent. Du hilfst Kunden dabei, ihren BMW M5 zu konfigurieren.

Nutze die verfügbaren Funktionen, um Konfigurationsänderungen durchzuführen.

VERFÜGBARE FARBEN: Alpinweiß, Schwarz, Saphirschwarz Metallic, Brooklyn Grau Metallic, Portimao Blau Metallic, Isle of Man Grün Metallic, Frozen Deep Grey, Frozen Marina Bay Blau

VERFÜGBARE FELGEN: M Doppelspeiche 20", M Sternspeiche 21", M Y-Speiche 21", M Performance Geschmiedet 21"`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        tools: CONFIGURATION_FUNCTIONS,
        tool_choice: 'auto',
        // GPT-5 specific parameters
        reasoning: { effort: 'low' },
        max_output_tokens: 500,
      });

      const message = response.choices[0]?.message;

      console.log('\n📥 Response:');
      if (message.content) {
        console.log(`   Message: ${message.content}`);
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`\n🔧 Function Calls (${message.tool_calls.length}):`);
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`   ✅ ${toolCall.function.name}(${JSON.stringify(args)})`);
          }
        }
      } else {
        console.log('   ℹ️  No function calls detected');
      }

      console.log('\n✅ Test successful');

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      if (error.status === 401) {
        console.error('   🔑 Authentication error - check your API key');
      } else if (error.status === 429) {
        console.error('   ⏱️  Rate limit exceeded - wait a moment and try again');
      } else if (error.status === 500) {
        console.error('   🔥 OpenAI server error - try again later');
      }
      console.error('\n   Full error:', error);
    }

    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All tests completed!');
  console.log('');
  console.log('If all tests passed, the OpenAI integration is working correctly.');
  console.log('You can now use the configurator with natural language prompts.');
  console.log('='.repeat(60));
}

// Run tests
testOpenAI().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
