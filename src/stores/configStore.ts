/**
 * BMW M5 Configuration Store (Zustand)
 */

import { create } from 'zustand';
import type { CarConfig, ChatMessage, ValidationResult, UIState, CameraPosition } from '../types';
import { validateConfiguration } from '../config/constraints';
import { AVAILABLE_COLORS, AVAILABLE_WHEELS } from '../types';

// =============================================================================
// DEFAULT CONFIGURATION (Valid M5 setup)
// =============================================================================

const DEFAULT_CONFIG: CarConfig = {
  model: 'M5',
  performancePackage: 'performance',

  color: AVAILABLE_COLORS.find(c => c.id === 'sapphire-black')!,
  wheels: AVAILABLE_WHEELS.find(w => w.id === 'm-double-spoke-20')!,
  brakes: 'performance',

  interior: {
    leather: 'merino',
    color: 'black',
    trim: 'aluminum',
  },

  lights: 'laser',
  sound: 'harman-kardon',
  drivingAssistant: 'plus',
};

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface ConfigStore {
  // State
  config: CarConfig;
  validationResult: ValidationResult;
  messages: ChatMessage[];
  ui: UIState;

  // Config Actions
  updateConfig: (updates: Partial<CarConfig>) => void;
  setColor: (colorId: string) => void;
  setWheels: (wheelId: string) => void;
  setInterior: (interior: Partial<CarConfig['interior']>) => void;
  setPerformancePackage: (pkg: CarConfig['performancePackage']) => void;
  setBrakes: (brakes: CarConfig['brakes']) => void;
  resetConfig: () => void;

  // Chat Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // UI Actions
  setLoading: (loading: boolean) => void;
  setRecording: (recording: boolean) => void;
  setActivePanel: (panel: UIState['activePanel']) => void;
  setCameraPosition: (position: CameraPosition) => void;
  toggleValidationOverlay: () => void;

  // Validation
  revalidate: () => void;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useConfigStore = create<ConfigStore>((set) => ({
  // Initial State
  config: DEFAULT_CONFIG,
  validationResult: validateConfiguration(DEFAULT_CONFIG),
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Willkommen beim BMW M5 KI-Konfigurator! Ich helfe Ihnen, Ihren perfekten M5 zu konfigurieren. Sie können mir einfach sagen, was Sie ändern möchten - zum Beispiel: "Zeig mir die Farben" oder "Ich möchte andere Felgen". Wie kann ich Ihnen helfen?',
      timestamp: new Date(),
    },
  ],
  ui: {
    isLoading: false,
    isRecording: false,
    activePanel: 'chat',
    showValidationOverlay: false,
    cameraPosition: 'front',
  },

  // Config Actions
  updateConfig: (updates) => {
    set((state) => {
      const newConfig = { ...state.config, ...updates };
      return {
        config: newConfig,
        validationResult: validateConfiguration(newConfig),
      };
    });
  },

  setColor: (colorId) => {
    const color = AVAILABLE_COLORS.find(c => c.id === colorId);
    if (color) {
      set((state) => {
        const newConfig = { ...state.config, color };
        return {
          config: newConfig,
          validationResult: validateConfiguration(newConfig),
        };
      });
    }
  },

  setWheels: (wheelId) => {
    const wheels = AVAILABLE_WHEELS.find(w => w.id === wheelId);
    if (wheels) {
      set((state) => {
        const newConfig = { ...state.config, wheels };
        return {
          config: newConfig,
          validationResult: validateConfiguration(newConfig),
        };
      });
    }
  },

  setInterior: (interiorUpdates) => {
    set((state) => {
      const newConfig = {
        ...state.config,
        interior: { ...state.config.interior, ...interiorUpdates },
      };
      return {
        config: newConfig,
        validationResult: validateConfiguration(newConfig),
      };
    });
  },

  setPerformancePackage: (pkg) => {
    set((state) => {
      const newConfig = { ...state.config, performancePackage: pkg };
      return {
        config: newConfig,
        validationResult: validateConfiguration(newConfig),
      };
    });
  },

  setBrakes: (brakes) => {
    set((state) => {
      const newConfig = { ...state.config, brakes };
      return {
        config: newConfig,
        validationResult: validateConfiguration(newConfig),
      };
    });
  },

  resetConfig: () => {
    set({
      config: DEFAULT_CONFIG,
      validationResult: validateConfiguration(DEFAULT_CONFIG),
    });
  },

  // Chat Actions
  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  clearMessages: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Willkommen beim BMW M5 KI-Konfigurator! Wie kann ich Ihnen helfen?',
          timestamp: new Date(),
        },
      ],
    });
  },

  // UI Actions
  setLoading: (loading) => {
    set((state) => ({
      ui: { ...state.ui, isLoading: loading },
    }));
  },

  setRecording: (recording) => {
    set((state) => ({
      ui: { ...state.ui, isRecording: recording },
    }));
  },

  setActivePanel: (panel) => {
    set((state) => ({
      ui: { ...state.ui, activePanel: panel },
    }));
  },

  setCameraPosition: (position) => {
    set((state) => ({
      ui: { ...state.ui, cameraPosition: position },
    }));
  },

  toggleValidationOverlay: () => {
    set((state) => ({
      ui: { ...state.ui, showValidationOverlay: !state.ui.showValidationOverlay },
    }));
  },

  // Validation
  revalidate: () => {
    set((state) => ({
      validationResult: validateConfiguration(state.config),
    }));
  },
}));

// =============================================================================
// SELECTORS (for performance)
// =============================================================================

export const selectConfig = (state: ConfigStore) => state.config;
export const selectValidation = (state: ConfigStore) => state.validationResult;
export const selectMessages = (state: ConfigStore) => state.messages;
export const selectUI = (state: ConfigStore) => state.ui;
export const selectIsValid = (state: ConfigStore) => state.validationResult.isValid;
