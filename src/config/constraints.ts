/**
 * BMW M5 Configuration Constraint System
 *
 * This is the CORE differentiator of the demo - showing how AI can
 * intelligently validate configurations from 2^40 possible combinations.
 *
 * Key insight from BMW: "Die Auswahl der Möglichkeiten bei der BMW
 * ein Modell zu konfigurieren ist bei 2^40 (2 hoch 40)"
 */

import type { CarConfig, ConstraintRule, ValidationResult } from '../types';

// =============================================================================
// BMW M5 CONSTRAINT RULES
// =============================================================================

export const BMW_M5_CONSTRAINTS: ConstraintRule[] = [
  // --------------------------------------------------------------------------
  // WHEEL CONSTRAINTS - The example from the interview!
  // --------------------------------------------------------------------------
  {
    id: 'M5_REQUIRES_M_WHEELS',
    description: 'M5 Sportwagen erfordert M Sport Felgen',
    condition: (config) =>
      config.model === 'M5' &&
      !config.wheels.id.startsWith('m-'),
    message: 'Der BMW M5 Sportwagen erfordert M Sport Felgen. Standard-Alufelgen sind für dieses Hochleistungsfahrzeug nicht verfügbar.',
    severity: 'block',
    suggestedAlternative: 'm-double-spoke-20',
    category: 'wheels'
  },
  {
    id: 'M_COMPETITION_21_INCH',
    description: 'M Competition Package erfordert 21 Zoll Felgen',
    condition: (config) =>
      config.performancePackage === 'competition' &&
      !config.wheels.id.includes('21'),
    message: 'Das M Competition Paket ist nur mit 21 Zoll Felgen kompatibel für optimale Bremsleistung.',
    severity: 'block',
    suggestedAlternative: 'm-star-spoke-21',
    category: 'wheels'
  },

  // --------------------------------------------------------------------------
  // BRAKE CONSTRAINTS
  // --------------------------------------------------------------------------
  {
    id: 'CERAMIC_BRAKES_PERFORMANCE',
    description: 'Keramikbremsen erfordern Performance-Paket',
    condition: (config) =>
      config.brakes === 'ceramic' &&
      config.performancePackage === 'none',
    message: 'Die M Carbon Keramikbremsen sind nur in Kombination mit einem M Performance Paket verfügbar.',
    severity: 'block',
    suggestedAlternative: 'performance',
    category: 'brakes'
  },

  // --------------------------------------------------------------------------
  // COLOR CONSTRAINTS
  // --------------------------------------------------------------------------
  {
    id: 'FROZEN_COLOR_M5',
    description: 'Frozen Lackierungen nur für M5',
    condition: (config) =>
      config.color.id.startsWith('frozen-') &&
      config.model !== 'M5',
    message: 'Frozen Individual Lackierungen sind exklusiv für den BMW M5 verfügbar.',
    severity: 'block',
    suggestedAlternative: 'sapphire-black',
    category: 'color'
  },

  // --------------------------------------------------------------------------
  // INTERIOR CONSTRAINTS
  // --------------------------------------------------------------------------
  {
    id: 'MERINO_LEATHER_M5',
    description: 'Extended Merino Leder erfordert M5 oder höher',
    condition: (config) =>
      config.interior.leather === 'extended-merino' &&
      config.model !== 'M5',
    message: 'Das Extended Merino Leder ist ein exklusives Feature für den BMW M5.',
    severity: 'block',
    suggestedAlternative: 'vernasca',
    category: 'interior'
  },
  {
    id: 'CARBON_TRIM_PERFORMANCE',
    description: 'Carbon Interieur erfordert Performance-Paket',
    condition: (config) =>
      config.interior.trim === 'carbon' &&
      config.performancePackage === 'none',
    message: 'Das M Carbon Interieurpaket ist nur mit einem Performance-Paket erhältlich.',
    severity: 'warn',
    suggestedAlternative: 'aluminum',
    category: 'interior'
  },

  // --------------------------------------------------------------------------
  // DRIVING ASSISTANCE CONSTRAINTS
  // --------------------------------------------------------------------------
  {
    id: 'DRIVING_ASSIST_PRO_LASER',
    description: 'Driving Assistant Pro erfordert Laserlicht',
    condition: (config) =>
      config.drivingAssistant === 'pro' &&
      config.lights !== 'laser',
    message: 'Der Driving Assistant Professional nutzt das Laserlicht-System für optimale Funktionalität.',
    severity: 'warn',
    suggestedAlternative: 'laser',
    category: 'tech'
  },

  // --------------------------------------------------------------------------
  // SOUND CONSTRAINTS
  // --------------------------------------------------------------------------
  {
    id: 'HARMAN_KARDON_MIN',
    description: 'M5 inkludiert mindestens Harman Kardon',
    condition: (config) =>
      config.model === 'M5' &&
      config.sound === 'standard',
    message: 'Der BMW M5 wird serienmäßig mit dem Harman Kardon Surround Sound System ausgestattet.',
    severity: 'warn',
    suggestedAlternative: 'harman-kardon',
    category: 'tech'
  },
];

// =============================================================================
// VALIDATION ENGINE
// =============================================================================

/**
 * Validates a car configuration against all constraint rules
 */
export function validateConfiguration(config: CarConfig): ValidationResult {
  const violations: Array<{
    rule: ConstraintRule;
    triggered: boolean;
  }> = [];

  for (const rule of BMW_M5_CONSTRAINTS) {
    if (rule.condition(config)) {
      violations.push({ rule, triggered: true });
    }
  }

  const blockers = violations.filter(v => v.rule.severity === 'block');
  const warnings = violations.filter(v => v.rule.severity === 'warn');

  return {
    isValid: blockers.length === 0,
    blockers: blockers.map(v => v.rule),
    warnings: warnings.map(v => v.rule),
    totalViolations: violations.length,
  };
}

/**
 * Gets a human-readable explanation of why a configuration is invalid
 * (for the AI to use in responses)
 */
export function getValidationExplanation(result: ValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return 'Die Konfiguration ist gültig und kann so bestellt werden.';
  }

  const parts: string[] = [];

  if (result.blockers.length > 0) {
    parts.push('Diese Konfiguration kann nicht bestellt werden:');
    result.blockers.forEach(rule => {
      parts.push(`- ${rule.message}`);
    });
  }

  if (result.warnings.length > 0) {
    parts.push('\nHinweise:');
    result.warnings.forEach(rule => {
      parts.push(`- ${rule.message}`);
    });
  }

  return parts.join('\n');
}

/**
 * Suggests fixes for invalid configurations
 */
export function suggestFixes(result: ValidationResult, _config: CarConfig): string[] {
  const suggestions: string[] = [];

  for (const rule of [...result.blockers, ...result.warnings]) {
    if (rule.suggestedAlternative) {
      switch (rule.category) {
        case 'wheels':
          suggestions.push(`Felgen ändern zu: ${getWheelName(rule.suggestedAlternative)}`);
          break;
        case 'brakes':
          suggestions.push(`Performance-Paket hinzufügen für Keramikbremsen`);
          break;
        case 'color':
          suggestions.push(`Farbe ändern zu: ${getColorName(rule.suggestedAlternative)}`);
          break;
        case 'interior':
          suggestions.push(`Interieur ändern zu: ${rule.suggestedAlternative}`);
          break;
        case 'tech':
          suggestions.push(`Ausstattung hinzufügen: ${rule.suggestedAlternative}`);
          break;
      }
    }
  }

  return suggestions;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getWheelName(id: string): string {
  const wheels: Record<string, string> = {
    'm-double-spoke-20': 'M Doppelspeiche 20"',
    'm-star-spoke-21': 'M Sternspeiche 21"',
    'm-y-spoke-21': 'M Y-Speiche 21"',
  };
  return wheels[id] || id;
}

function getColorName(id: string): string {
  const colors: Record<string, string> = {
    'sapphire-black': 'Saphirschwarz Metallic',
    'alpine-white': 'Alpinweiß',
    'brooklyn-grey': 'Brooklyn Grau Metallic',
  };
  return colors[id] || id;
}
