/**
 * Chat Panel Component
 *
 * Handles user input via text and voice, displays conversation
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfigStore } from '../../stores/configStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { sendMessageToOpenAI, executeConfigChanges } from '../../services/openai';
import { validateConfiguration, getValidationExplanation } from '../../config/constraints';

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

  // Conversation history for context
  const conversationHistory = useRef<Array<{ role: 'user' | 'model'; content: string }>>([]);

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
      const response = await sendMessageToOpenAI(
        text,
        config,
        conversationHistory.current
      );

      // Execute configuration changes
      if (response.configChanges && response.configChanges.length > 0) {
        const configUpdate = executeConfigChanges(response.configChanges, config);

        // Apply the changes
        if (Object.keys(configUpdate).length > 0) {
          updateConfig(configUpdate);

          // Validate the new configuration
          const newConfig = { ...config, ...configUpdate };
          const validation = validateConfiguration(newConfig);

          // If there are validation issues, append them to the message
          if (!validation.isValid) {
            const validationMsg = '\n\n⚠️ **Hinweis:** ' + getValidationExplanation(validation);
            response.message += validationMsg;
          }
        }
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
  }, [input, config, ui.isLoading, addMessage, setLoading, updateConfig]);

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
                  max-w-[85%] px-4 py-3 rounded-2xl font-body text-sm
                  ${message.role === 'user'
                    ? 'bg-bmw-blue text-white rounded-br-md'
                    : 'bg-obsidian-800 text-obsidian-100 rounded-bl-md border border-white/5'
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
            <div className="bg-obsidian-800 px-4 py-3 rounded-2xl rounded-bl-md border border-white/5">
              <div className="flex gap-1">
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
      <div className="px-6 py-3 flex gap-2 overflow-x-auto">
        {['Zeig mir die Farben', 'Felgen ändern', 'Standard Felgen'].map((action) => (
          <button
            key={action}
            onClick={() => handleSubmit(action)}
            disabled={ui.isLoading}
            className="px-3 py-1.5 text-xs font-body text-obsidian-300 bg-obsidian-800
                       rounded-full border border-white/10 hover:border-bmw-blue/50
                       hover:text-obsidian-100 transition-all whitespace-nowrap
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={onFormSubmit} className="p-6 border-t border-white/10">
        <div className="flex gap-2">
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
  // Simple markdown-like rendering for bold and line breaks
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        // Bold text with **
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={j} className="font-semibold text-bmw-blue-light">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              // Bullet points
              if (part.startsWith('•') || part.startsWith('-')) {
                return <span key={j} className="block pl-2">{part}</span>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}
