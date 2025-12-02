/**
 * Configuration Summary Component
 *
 * Shows current configuration in a clean compact sidebar
 */

import { motion } from 'framer-motion';
import { useConfigStore } from '../../stores/configStore';

// =============================================================================
// COLOR SWATCH
// =============================================================================

function ColorSwatch({ hex, name }: { hex: string; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <span className="text-obsidian-200 text-xs truncate">{name}</span>
    </div>
  );
}

// =============================================================================
// CONFIG SUMMARY
// =============================================================================

export function ConfigSummary() {
  const config = useConfigStore((state) => state.config);

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col glass rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10 bg-obsidian-900/50">
        <h3 className="font-display font-semibold text-sm text-obsidian-100">
          Ihre Konfiguration
        </h3>
        <p className="text-xs text-obsidian-500 mt-1">BMW M5 Limousine</p>
      </div>

      {/* Config Items */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <ConfigItem label="Farbe">
          <ColorSwatch hex={config.color.hex} name={config.color.name} />
        </ConfigItem>

        <ConfigItem label="Felgen">
          <span className="text-xs text-obsidian-200">{config.wheels.name}</span>
        </ConfigItem>

        <ConfigItem label="Bremsen">
          <span className="text-xs text-obsidian-200">{getBrakesLabel(config.brakes)}</span>
        </ConfigItem>

        <ConfigItem label="Performance">
          <span className="text-xs text-obsidian-200">{getPackageLabel(config.performancePackage)}</span>
        </ConfigItem>

        <ConfigItem label="Interieur">
          <span className="text-xs text-obsidian-200">
            {getLeatherLabel(config.interior.leather)} / {getTrimLabel(config.interior.trim)}
          </span>
        </ConfigItem>

        <ConfigItem label="Licht">
          <span className="text-xs text-obsidian-200">
            {config.lights === 'laser' ? 'BMW Laserlicht' : 'LED'}
          </span>
        </ConfigItem>

        <ConfigItem label="Sound">
          <span className="text-xs text-obsidian-200">{getSoundLabel(config.sound)}</span>
        </ConfigItem>
      </div>

    </motion.div>
  );
}

// =============================================================================
// CONFIG ITEM COMPONENT
// =============================================================================

function ConfigItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-obsidian-500 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

// =============================================================================
// LABEL HELPERS
// =============================================================================

function getBrakesLabel(brakes: string): string {
  const labels: Record<string, string> = {
    standard: 'M Compound',
    performance: 'M Performance',
    ceramic: 'M Carbon Keramik',
  };
  return labels[brakes] || brakes;
}

function getPackageLabel(pkg: string): string {
  const labels: Record<string, string> = {
    none: 'Basis',
    performance: 'M Performance',
    competition: 'M Competition',
  };
  return labels[pkg] || pkg;
}

function getLeatherLabel(leather: string): string {
  const labels: Record<string, string> = {
    vernasca: 'Vernasca',
    merino: 'Merino',
    'extended-merino': 'Extended Merino',
  };
  return labels[leather] || leather;
}

function getTrimLabel(trim: string): string {
  const labels: Record<string, string> = {
    aluminum: 'Alu',
    wood: 'Holz',
    carbon: 'Carbon',
  };
  return labels[trim] || trim;
}

function getSoundLabel(sound: string): string {
  const labels: Record<string, string> = {
    standard: 'HiFi',
    'harman-kardon': 'Harman Kardon',
    'bowers-wilkins': 'B&W Diamond',
  };
  return labels[sound] || sound;
}
