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

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const LightningIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// =============================================================================
// CHAT PANEL
// =============================================================================

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [scrollToUserMessage, setScrollToUserMessage] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Scroll to the last user message when triggered
  useEffect(() => {
    if (scrollToUserMessage > 0 && messagesContainerRef.current) {
      // Find the last user message
      const userMessages = messages.filter(m => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          const userMessageElement = document.getElementById(`message-${lastUserMessage.id}`);
          if (userMessageElement) {
            userMessageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [scrollToUserMessage, messages]);

  // Handle message submission
  const handleSubmit = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || ui.isLoading) return;

    setInput('');
    setLoading(true);

    // Add user message
    addMessage({ role: 'user', content: text });
    conversationHistory.current.push({ role: 'user', content: text });

    // Trigger scroll to user message (at top of view)
    setScrollToUserMessage(prev => prev + 1);

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
      className="w-[420px] h-full flex flex-col glass shadow-2xl"
    >
      {/* Premium Header with Gradient Accent */}
      <div className="relative px-6 py-6 border-b border-white/10">
        {/* Subtle gradient top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bmw-blue to-transparent opacity-60" />

        <div className="flex items-start gap-3">
          {/* AI Icon with glow effect */}
          <motion.div
            className="mt-0.5 p-2.5 bg-gradient-to-br from-bmw-blue to-bmw-blue-dark rounded-xl shadow-lg shadow-bmw-blue/30"
            animate={{
              boxShadow: [
                '0 4px 20px rgba(28, 105, 212, 0.3)',
                '0 4px 30px rgba(28, 105, 212, 0.5)',
                '0 4px 20px rgba(28, 105, 212, 0.3)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SparklesIcon />
          </motion.div>

          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              KI-Assistent
            </h2>
            <p className="text-xs text-obsidian-400 font-body mt-1.5 leading-relaxed">
              Konfigurieren Sie Ihren BMW M5 mit intelligenter Unterstützung
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <motion.div
          className="absolute top-6 right-6 flex items-center gap-1.5 text-[10px] font-medium text-obsidian-500"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          Online
        </motion.div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-5">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              id={`message-${message.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} scroll-mt-6`}
            >
              {message.role === 'assistant' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex-shrink-0 w-8 h-8 mr-3 mt-1 bg-gradient-to-br from-bmw-blue/20 to-bmw-blue-dark/20 rounded-lg flex items-center justify-center border border-bmw-blue/30"
                >
                  <SparklesIcon />
                </motion.div>
              )}

              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className={`
                  max-w-[80%] px-5 py-4 rounded-2xl font-body text-sm leading-relaxed
                  ${message.role === 'user'
                    ? 'bg-gradient-to-br from-bmw-blue to-bmw-blue-dark text-white rounded-br-md shadow-lg shadow-bmw-blue/20 border border-bmw-blue-light/20'
                    : 'bg-obsidian-800/80 text-obsidian-100 rounded-bl-md border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm'
                  }
                `}
              >
                <MessageContent content={message.content} />
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator with premium styling */}
        {ui.isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex-shrink-0 w-8 h-8 mr-3 mt-1 bg-gradient-to-br from-bmw-blue/20 to-bmw-blue-dark/20 rounded-lg flex items-center justify-center border border-bmw-blue/30">
              <SparklesIcon />
            </div>
            <div className="bg-obsidian-800/80 px-5 py-4 rounded-2xl rounded-bl-md border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
              <div className="flex gap-2 items-center">
                <motion.span
                  className="w-2 h-2 bg-gradient-to-r from-bmw-blue to-bmw-blue-light rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0,
                  }}
                />
                <motion.span
                  className="w-2 h-2 bg-gradient-to-r from-bmw-blue to-bmw-blue-light rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.2,
                  }}
                />
                <motion.span
                  className="w-2 h-2 bg-gradient-to-r from-bmw-blue to-bmw-blue-light rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.4,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Interim voice transcript with premium styling */}
        {isListening && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-gradient-to-br from-obsidian-700 to-obsidian-800 text-obsidian-300 px-5 py-3 rounded-2xl rounded-br-md text-sm italic border border-white/5 shadow-lg"
            >
              {interimTranscript}...
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions with Premium Polish */}
      <div className="px-6 py-4 border-t border-white/5 bg-obsidian-900/20">
        <div className="flex items-center gap-3 mb-3">
          <LightningIcon />
          <span className="text-[10px] font-semibold text-obsidian-500 uppercase tracking-wider">
            Schnellaktionen
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {['Zeig mir die Farben', 'Felgen ändern', 'Standard Felgen'].map((action) => (
            <motion.button
              key={action}
              onClick={() => handleSubmit(action)}
              disabled={ui.isLoading}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-4 py-3 text-xs font-medium font-body text-obsidian-300
                         bg-obsidian-800/60 rounded-xl border border-white/10
                         hover:bg-gradient-to-br hover:from-bmw-blue/10 hover:to-bmw-blue-dark/10
                         hover:border-bmw-blue/40 hover:text-white hover:shadow-lg hover:shadow-bmw-blue/10
                         transition-all duration-300 whitespace-nowrap
                         disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm
                         overflow-hidden"
            >
              {/* Shine effect on hover */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <span className="relative">{action}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Premium Input Section */}
      <form onSubmit={onFormSubmit} className="relative px-6 py-5 border-t border-white/10 bg-gradient-to-b from-obsidian-900/40 to-obsidian-950/60">
        {/* Subtle top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex gap-4 items-end">
          <div className="flex-1 relative group">
            {/* Input field with enhanced styling */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Sprechen Sie...' : 'Nachricht eingeben...'}
              disabled={ui.isLoading || isListening}
              className="w-full px-5 py-4 bg-obsidian-800/60 border border-white/10 rounded-2xl
                         text-obsidian-100 placeholder-obsidian-500 font-body text-sm
                         focus:outline-none focus:border-bmw-blue/50 focus:ring-2 focus:ring-bmw-blue/20
                         focus:bg-obsidian-800/80 focus:shadow-lg focus:shadow-bmw-blue/10
                         disabled:opacity-50 transition-all duration-300 backdrop-blur-sm
                         group-hover:border-white/20"
            />

            {/* Character counter or status indicator */}
            {input.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-obsidian-500 font-medium"
              >
                {input.length}
              </motion.div>
            )}
          </div>

          {/* Voice Button with Premium Styling */}
          {voiceSupported && (
            <motion.button
              type="button"
              onClick={toggleListening}
              disabled={ui.isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative p-3.5 rounded-2xl transition-all duration-300 shadow-lg overflow-hidden
                ${isListening
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30 voice-recording'
                  : 'bg-obsidian-800/80 text-obsidian-300 hover:text-white hover:bg-obsidian-700 border border-white/10 hover:border-white/20 hover:shadow-xl backdrop-blur-sm'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isListening ? <StopIcon /> : <MicIcon />}

              {/* Pulsing ring when listening */}
              {isListening && (
                <motion.span
                  className="absolute inset-0 rounded-2xl border-2 border-red-400"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.button>
          )}

          {/* Send Button with Enhanced Glow */}
          <motion.button
            type="submit"
            disabled={!input.trim() || ui.isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-3.5 bg-gradient-to-br from-bmw-blue to-bmw-blue-dark text-white rounded-2xl
                       hover:from-bmw-blue-light hover:to-bmw-blue
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300 shadow-lg shadow-bmw-blue/30
                       hover:shadow-xl hover:shadow-bmw-blue/50
                       overflow-hidden group"
          >
            {/* Animated gradient overlay on hover */}
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/10 to-transparent" />

            <motion.div
              animate={ui.isLoading ? {
                rotate: 360,
              } : {}}
              transition={{
                duration: 1,
                repeat: ui.isLoading ? Infinity : 0,
                ease: 'linear',
              }}
            >
              <SendIcon />
            </motion.div>
          </motion.button>
        </div>

        {/* Input hint text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-[10px] text-obsidian-600 text-center font-medium"
        >
          Drücken Sie Enter zum Senden {voiceSupported && '• Klicken Sie auf das Mikrofon für Spracheingabe'}
        </motion.p>
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
            <ul key={idx} className="space-y-2.5 ml-0.5">
              {section.content.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 group"
                >
                  <span className="text-bmw-blue mt-1 flex-shrink-0 text-xs group-hover:scale-125 transition-transform duration-200">•</span>
                  <span className="flex-1">
                    <FormattedText text={item} />
                  </span>
                </motion.li>
              ))}
            </ul>
          );
        }

        return (
          <div key={idx} className="space-y-2.5">
            {section.content.map((text, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="leading-relaxed"
              >
                <FormattedText text={text} />
              </motion.p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Helper component for formatting bold text with premium styling
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-white bg-bmw-blue/10 px-1 py-0.5 rounded">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
