/**
 * Validation Overlay Component
 *
 * Shows validation status prominently - KEY for the BMW demo!
 * Displays blocked configurations with clear visual feedback.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useConfigStore } from '../../stores/configStore';

// =============================================================================
// ICONS
// =============================================================================

const CheckIcon = ({ size = 6 }: { size?: number }) => (
  <svg className={`w-${size} h-${size}`} style={{ width: size * 4, height: size * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ size = 6 }: { size?: number }) => (
  <svg className={`w-${size} h-${size}`} style={{ width: size * 4, height: size * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// =============================================================================
// VALIDATION STATUS BADGE (always visible)
// =============================================================================

export function ValidationBadge() {
  const validation = useConfigStore((state) => state.validationResult);
  const toggleOverlay = useConfigStore((state) => state.toggleValidationOverlay);

  return (
    <motion.button
      onClick={toggleOverlay}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        fixed bottom-6 left-6 z-40 px-4 py-2 rounded-full
        flex items-center gap-2.5 font-body text-xs font-medium
        transition-all duration-300 cursor-pointer
        ${validation.isValid
          ? 'bg-green-500/20 border border-green-500/40 text-green-400'
          : 'bg-red-500/20 border border-red-500/40 text-red-400'
        }
      `}
      style={{
        boxShadow: validation.isValid
          ? '0 0 20px rgba(34, 197, 94, 0.2)'
          : '0 0 20px rgba(239, 68, 68, 0.3)',
      }}
    >
      {validation.isValid ? (
        <>
          <CheckIcon size={3} />
          <span>Gültig</span>
        </>
      ) : (
        <>
          <XIcon size={3} />
          <span>{validation.blockers.length} Fehler</span>
        </>
      )}
    </motion.button>
  );
}

// =============================================================================
// VALIDATION OVERLAY (detailed view)
// =============================================================================

export function ValidationOverlay() {
  const validation = useConfigStore((state) => state.validationResult);
  const config = useConfigStore((state) => state.config);
  const showOverlay = useConfigStore((state) => state.ui.showValidationOverlay);
  const toggleOverlay = useConfigStore((state) => state.toggleValidationOverlay);

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={toggleOverlay}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg mx-4 glass rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div
              className={`
                px-6 py-4 flex items-center justify-between
                ${validation.isValid
                  ? 'bg-green-500/20 border-b border-green-500/30'
                  : 'bg-red-500/20 border-b border-red-500/30'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${validation.isValid ? 'bg-green-500' : 'bg-red-500'}
                  `}
                >
                  {validation.isValid ? <CheckIcon /> : <XIcon />}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-obsidian-100">
                    {validation.isValid ? 'Konfiguration gültig' : 'Konfiguration ungültig'}
                  </h3>
                  <p className="text-sm text-obsidian-400">
                    BMW M5 • {config.color.name}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleOverlay}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-obsidian-400 hover:text-obsidian-100"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Current Config Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <ConfigItem label="Felgen" value={config.wheels.name} />
                <ConfigItem label="Bremsen" value={config.brakes} />
                <ConfigItem label="Performance" value={config.performancePackage} />
                <ConfigItem label="Interieur" value={config.interior.leather} />
              </div>

              {/* Blockers */}
              {validation.blockers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-display font-medium text-red-400 flex items-center gap-2">
                    <XIcon />
                    Fehler - Bestellung nicht möglich
                  </h4>
                  {validation.blockers.map((blocker) => (
                    <div
                      key={blocker.id}
                      className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                    >
                      <p className="text-obsidian-100 font-body text-sm">
                        {blocker.message}
                      </p>
                      {blocker.suggestedAlternative && (
                        <p className="mt-2 text-xs text-obsidian-400">
                          Empfehlung: {blocker.suggestedAlternative}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-display font-medium text-yellow-400 flex items-center gap-2">
                    <WarningIcon />
                    Hinweise
                  </h4>
                  {validation.warnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                    >
                      <p className="text-obsidian-100 font-body text-sm">
                        {warning.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Valid message */}
              {validation.isValid && validation.warnings.length === 0 && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                  <p className="text-obsidian-100 font-body">
                    Ihre Konfiguration ist vollständig gültig und kann bestellt werden.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-obsidian-900/50 border-t border-white/5 flex justify-end">
              <button
                onClick={toggleOverlay}
                className="px-6 py-2 bg-bmw-blue text-white rounded-lg font-body text-sm
                           hover:bg-bmw-blue-dark transition-colors"
              >
                Verstanden
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-obsidian-800/50 px-3 py-2 rounded-lg">
      <span className="text-obsidian-500 text-xs">{label}</span>
      <p className="text-obsidian-200 font-medium capitalize">{value}</p>
    </div>
  );
}
