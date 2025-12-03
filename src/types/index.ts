/**
 * BMW M5 Configurator Type Definitions
 */

// =============================================================================
// CAR CONFIGURATION TYPES
// =============================================================================

export interface CarConfig {
  model: 'M5' | '5-series';
  performancePackage: 'none' | 'performance' | 'competition';

  color: ColorOption;
  wheels: WheelOption;
  brakes: 'standard' | 'performance' | 'ceramic';

  interior: InteriorConfig;

  lights: 'led' | 'laser';
  sound: 'standard' | 'harman-kardon' | 'bowers-wilkins';
  drivingAssistant: 'none' | 'plus' | 'pro';

  // Exterior Styling
  grillColor: GrillColorOption;
  hoodPattern: HoodPatternOption;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  type: 'solid' | 'metallic' | 'individual' | 'frozen';
  price: number;
}

export interface WheelOption {
  id: string;
  name: string;
  size: 19 | 20 | 21;
  type: 'standard' | 'm-sport' | 'm-performance';
  price: number;
}

export interface InteriorConfig {
  leather: 'vernasca' | 'merino' | 'extended-merino';
  color: string;
  trim: 'aluminum' | 'wood' | 'carbon';
}

export interface GrillColorOption {
  id: string;
  name: string;
  hex: string;
  price: number;
}

export interface HoodPatternOption {
  id: string;
  name: string;
  description: string;
  price: number;
}

// =============================================================================
// CONSTRAINT SYSTEM TYPES
// =============================================================================

export interface ConstraintRule {
  id: string;
  description: string;
  condition: (config: CarConfig) => boolean;
  message: string;
  severity: 'block' | 'warn';
  suggestedAlternative?: string;
  category: 'wheels' | 'brakes' | 'color' | 'interior' | 'tech';
}

export interface ValidationResult {
  isValid: boolean;
  blockers: ConstraintRule[];
  warnings: ConstraintRule[];
  totalViolations: number;
}

// =============================================================================
// CHAT TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  validationResult?: ValidationResult;
  configChange?: Partial<CarConfig>;
}

export interface ConversationContext {
  messages: ChatMessage[];
  currentConfig: CarConfig;
  lastValidation: ValidationResult | null;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface UIState {
  isLoading: boolean;
  isRecording: boolean;
  activePanel: 'chat' | 'config' | 'validation';
  showValidationOverlay: boolean;
  cameraPosition: CameraPosition;
}

export type CameraPosition = 'front' | 'side' | 'rear' | 'interior' | 'wheels';

// =============================================================================
// AI FUNCTION CALL TYPES
// =============================================================================

export type AIFunctionName =
  | 'change_color'
  | 'change_wheels'
  | 'change_interior'
  | 'change_brakes'
  | 'change_grill_color'
  | 'change_hood_pattern'
  | 'add_package'
  | 'remove_package'
  | 'get_price'
  | 'validate_config'
  | 'explain_constraint'
  | 'suggest_alternatives';

export interface AIFunctionCall {
  name: AIFunctionName;
  arguments: Record<string, unknown>;
}

export interface AIResponse {
  message: string;
  functionCalls?: AIFunctionCall[];
  configUpdates?: Partial<CarConfig>;
  validationTriggered?: boolean;
}

// =============================================================================
// AVAILABLE OPTIONS (for dropdowns/selections)
// =============================================================================

export const AVAILABLE_COLORS: ColorOption[] = [
  // Solid
  { id: 'alpine-white', name: 'Alpinweiß', hex: '#f5f5f5', type: 'solid', price: 0 },
  { id: 'black', name: 'Schwarz', hex: '#1a1a1a', type: 'solid', price: 0 },

  // Metallic
  { id: 'sapphire-black', name: 'Saphirschwarz Metallic', hex: '#0f0f14', type: 'metallic', price: 1200 },
  { id: 'brooklyn-grey', name: 'Brooklyn Grau Metallic', hex: '#4a4a4f', type: 'metallic', price: 1200 },
  { id: 'portimao-blue', name: 'Portimao Blau Metallic', hex: '#1c3d6e', type: 'metallic', price: 1200 },
  { id: 'isle-of-man-green', name: 'Isle of Man Grün Metallic', hex: '#1a3d2e', type: 'metallic', price: 1500 },

  // Individual / Frozen
  { id: 'frozen-deep-grey', name: 'Frozen Deep Grey', hex: '#3a3a3a', type: 'frozen', price: 4500 },
  { id: 'frozen-marina-bay-blue', name: 'Frozen Marina Bay Blau', hex: '#1c4d7a', type: 'frozen', price: 4500 },
];

export const AVAILABLE_WHEELS: WheelOption[] = [
  // Standard (NOT allowed for M5!)
  { id: 'standard-19', name: 'Standard Alufelgen 19"', size: 19, type: 'standard', price: 0 },

  // M Sport
  { id: 'm-double-spoke-20', name: 'M Doppelspeiche 20"', size: 20, type: 'm-sport', price: 1800 },
  { id: 'm-star-spoke-21', name: 'M Sternspeiche 21"', size: 21, type: 'm-sport', price: 2400 },
  { id: 'm-y-spoke-21', name: 'M Y-Speiche 21"', size: 21, type: 'm-sport', price: 2800 },

  // M Performance
  { id: 'm-performance-forge-21', name: 'M Performance Geschmiedet 21"', size: 21, type: 'm-performance', price: 4200 },
];

export const INTERIOR_COLORS = [
  { id: 'black', name: 'Schwarz' },
  { id: 'cognac', name: 'Cognac' },
  { id: 'silverstone', name: 'Silverstone' },
  { id: 'fiona-red', name: 'Fiona Rot' },
  { id: 'ivory-white', name: 'Elfenbeinweiß' },
  { id: 'alpine-white', name: 'Alpinweiß' },
];

export const TRIM_OPTIONS = [
  { id: 'aluminum', name: 'Aluminium Rhombicle' },
  { id: 'wood', name: 'Edelholz Eiche' },
  { id: 'carbon', name: 'M Carbon' },
];

export const AVAILABLE_GRILL_COLORS: GrillColorOption[] = [
  { id: 'chrome', name: 'Chrom', hex: '#C0C0C0', price: 0 },
  { id: 'black-high-gloss', name: 'Schwarz Hochglanz', hex: '#0a0a0a', price: 350 },
  { id: 'shadow-line', name: 'Shadow Line', hex: '#1a1a1a', price: 650 },
  { id: 'cerium-grey', name: 'Cerium Grau', hex: '#5a5a5a', price: 450 },
  { id: 'gold-bronze', name: 'Gold Bronze', hex: '#8B7355', price: 850 },
];

export const AVAILABLE_HOOD_PATTERNS: HoodPatternOption[] = [
  { id: 'standard', name: 'Standard', description: 'Unifarben ohne Muster', price: 0 },
  { id: 'carbon-fiber', name: 'Carbon Fiber', description: 'Sichtbare Carbonfaser-Optik', price: 2800 },
  { id: 'm-stripes', name: 'M Streifen', description: 'BMW M Farbstreifen (Blau/Violett/Rot)', price: 450 },
  { id: 'racing-stripes', name: 'Racing Stripes', description: 'Mittige Rennstreifen in Kontrastfarbe', price: 650 },
  { id: 'matte-finish', name: 'Matt Finish', description: 'Matte Lackierung für sportlichen Look', price: 1200 },
];
