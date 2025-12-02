/**
 * Header Component
 *
 * Displays BMW logo and price - clean minimal design
 */

import { motion } from 'framer-motion';
import { useConfigStore } from '../../stores/configStore';

// =============================================================================
// BMW LOGO SVG - Simplified
// =============================================================================

function BMWLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="50" cy="50" r="44" fill="#1a1a1a" />
      <path d="M50 6 L50 50 L94 50 A44 44 0 0 0 50 6" fill="#1c69d4" />
      <path d="M6 50 L50 50 L50 94 A44 44 0 0 1 6 50" fill="#1c69d4" />
      <path d="M50 94 L50 50 L94 50 A44 44 0 0 1 50 94" fill="#fff" />
      <path d="M6 50 L50 50 L50 6 A44 44 0 0 0 6 50" fill="#fff" />
    </svg>
  );
}

// =============================================================================
// HEADER
// =============================================================================

export function Header() {
  const config = useConfigStore((state) => state.config);

  // Calculate approximate price
  const basePrice = 135000;
  const colorPrice = config.color.price;
  const wheelPrice = config.wheels.price;
  const packagePrice =
    config.performancePackage === 'competition' ? 12000 :
    config.performancePackage === 'performance' ? 8000 : 0;
  const brakePrice = config.brakes === 'ceramic' ? 8500 : config.brakes === 'performance' ? 2500 : 0;
  const totalPrice = basePrice + colorPrice + wheelPrice + packagePrice + brakePrice;

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="absolute top-0 left-0 right-[420px] z-30 px-4 py-3 flex items-center justify-between"
    >
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-3">
        <BMWLogo />
        <div>
          <h1 className="font-display font-bold text-xl text-white">M5 Konfigurator</h1>
          <p className="text-xs text-obsidian-400">KI-gesteuert</p>
        </div>
      </div>

      {/* Right: Price */}
      <div className="glass px-4 py-2 rounded-lg">
        <p className="text-[10px] text-obsidian-400 uppercase">Preis</p>
        <p className="font-display font-bold text-lg text-white">
          {totalPrice.toLocaleString('de-DE')} €
        </p>
      </div>
    </motion.header>
  );
}
