/**
 * Chat Panel Component
 *
 * Handles user input via text and voice, displays conversation
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfigStore } from '../../stores/configStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { sendMessageToOpenAI, executeOpenAIFunctionCall, type OpenAIResponse } from '../../services/openai';

// =============================================================================
// ICONS
// =============================================================================

const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

// =============================================================================
// CHAT PANEL
// =============================================================================

export function ChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    addMessage,
    config,
    updateConfig,
    setLoading,
    setCameraPosition,
    toggleValidationOverlay,
    ui,
  } = useConfigStore();

  // Conversation history for context (OpenAI uses 'user' and 'assistant')
  const conversationHistory = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Voice input hook
  const {
    isListening,
    interimTranscript,
    toggleListening,
    isSupported: voiceSupported,
  } = useVoiceInput({
    language: 'de-DE',
    onResult: (transcript) => {
      setInput(transcript);
      // Auto-submit after voice input
      handleSubmit(transcript);
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission
  const handleSubmit = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || ui.isLoading) return;

    setInput('');
    setLoading(true);

    // Add user message
    addMessage({ role: 'user', content: text });
    conversationHistory.current.push({ role: 'user', content: text });

    try {
      // Get AI response from OpenAI
      const response: OpenAIResponse = await sendMessageToOpenAI(
        text,
        config,
        conversationHistory.current
      );

      // Execute any function calls
      let configUpdate: Partial<typeof config> = {};

      for (const fc of response.functionCalls) {
        const result = executeOpenAIFunctionCall(fc.name, fc.args, config);

        if (result.configUpdate) {
          configUpdate = { ...configUpdate, ...result.configUpdate };
        }
        if (result.cameraPosition) {
          setCameraPosition(result.cameraPosition as any);
        }
        if (result.showValidation) {
          toggleValidationOverlay();
        }
      }

      // Apply config updates
      if (Object.keys(configUpdate).length > 0) {
        updateConfig(configUpdate);
      }

      // Add assistant message
      addMessage({ role: 'assistant', content: response.message });
      conversationHistory.current.push({ role: 'assistant', content: response.message });

    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setLoading(false);
    }
  }, [input, config, ui.isLoading, addMessage, setLoading, updateConfig, setCameraPosition, toggleValidationOverlay]);

  // Handle form submit
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="w-[400px] h-full flex flex-col glass"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <h2 className="text-lg font-display font-semibold text-obsidian-100">
          KI-Assistent
        </h2>
        <p className="text-sm text-obsidian-400 font-body mt-1">
          Konfigurieren Sie Ihren BMW M5
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] px-5 py-4 rounded-2xl font-body text-sm leading-relaxed
                  ${message.role === 'user'
                    ? 'bg-bmw-blue text-white rounded-br-md shadow-lg shadow-bmw-blue/20'
                    : 'bg-obsidian-800 text-obsidian-100 rounded-bl-md border border-white/10 shadow-lg shadow-black/20'
                  }
                `}
              >
                <MessageContent content={message.content} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {ui.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-obsidian-800 px-5 py-4 rounded-2xl rounded-bl-md border border-white/10 shadow-lg shadow-black/20">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-bmw-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-bmw-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-bmw-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Interim voice transcript */}
        {isListening && interimTranscript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <div className="bg-obsidian-700 text-obsidian-300 px-4 py-2 rounded-2xl rounded-br-md text-sm italic">
              {interimTranscript}...
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4 flex gap-2.5 overflow-x-auto border-t border-white/5">
        {['Zeig mir die Farben', 'Felgen ändern', 'Standard Felgen'].map((action) => (
          <button
            key={action}
            onClick={() => handleSubmit(action)}
            disabled={ui.isLoading}
            className="px-4 py-2.5 text-xs font-medium font-body text-obsidian-300 bg-obsidian-800/50
                       rounded-lg border border-white/10 hover:border-bmw-blue/50 hover:bg-obsidian-700
                       hover:text-white transition-all whitespace-nowrap
                       disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={onFormSubmit} className="px-6 py-5 border-t border-white/10 bg-obsidian-900/30">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Sprechen Sie...' : 'Nachricht eingeben...'}
              disabled={ui.isLoading || isListening}
              className="w-full px-4 py-3 bg-obsidian-800 border border-white/10 rounded-xl
                         text-obsidian-100 placeholder-obsidian-500 font-body text-sm
                         focus:outline-none focus:border-bmw-blue/50 focus:ring-1 focus:ring-bmw-blue/30
                         disabled:opacity-50 transition-all"
            />
          </div>

          {/* Voice Button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={ui.isLoading}
              className={`
                p-3 rounded-xl transition-all
                ${isListening
                  ? 'bg-red-500 text-white voice-recording'
                  : 'bg-obsidian-800 text-obsidian-300 hover:text-white hover:bg-obsidian-700 border border-white/10'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isListening ? <StopIcon /> : <MicIcon />}
            </button>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || ui.isLoading}
            className="p-3 bg-bmw-blue text-white rounded-xl hover:bg-bmw-blue-dark
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all
                       glow-blue"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// =============================================================================
// MESSAGE CONTENT RENDERER
// =============================================================================

function MessageContent({ content }: { content: string }) {
  // Parse content into sections (paragraphs and lists)
  const lines = content.split('\n');
  const sections: Array<{ type: 'text' | 'list'; content: string[] }> = [];

  let currentSection: { type: 'text' | 'list'; content: string[] } | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || /^\d+\./.test(trimmed);

    if (!trimmed) {
      // Empty line - close current section
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
      return;
    }

    if (isBullet) {
      // Start or continue bullet list
      if (currentSection?.type !== 'list') {
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'list', content: [] };
      }
      currentSection.content.push(trimmed.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, ''));
    } else {
      // Regular text
      if (currentSection?.type !== 'text') {
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'text', content: [] };
      }
      currentSection.content.push(trimmed);
    }
  });

  if (currentSection) sections.push(currentSection);

  return (
    <div className="space-y-3 leading-relaxed">
      {sections.map((section, idx) => {
        if (section.type === 'list') {
          return (
            <ul key={idx} className="space-y-2 ml-1">
              {section.content.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-bmw-blue mt-1 flex-shrink-0">•</span>
                  <span className="flex-1">
                    <FormattedText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <div key={idx} className="space-y-2">
            {section.content.map((text, i) => (
              <p key={i} className="leading-relaxed">
                <FormattedText text={text} />
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Helper component for formatting bold text and emojis
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
