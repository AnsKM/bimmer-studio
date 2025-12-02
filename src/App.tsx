/**
 * BMW M5 KI-Konfigurator
 *
 * Main Application Component
 *
 * Demo für BMW Interview - zeigt KI-gesteuerte Konfiguration
 * mit Constraint-Validierung (2^40 Kombinationen)
 */

import { Scene } from './components/3d/Scene';
import { ChatPanel } from './components/chat/ChatPanel';
import { Header } from './components/ui/Header';
import { ConfigSummary } from './components/ui/ConfigSummary';
import { ValidationBadge, ValidationOverlay } from './components/ui/ValidationOverlay';

function App() {
  return (
    <div className="relative w-full h-screen bg-obsidian-950 overflow-hidden">
      {/* 3D Scene (background) */}
      <div className="absolute inset-0 z-0">
        <Scene />
      </div>

      {/* Header - Top bar */}
      <Header />

      {/* Main Layout Container */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Left Side - Config Summary */}
        <div className="absolute left-6 top-20 bottom-28 w-64 pointer-events-auto">
          <ConfigSummary />
        </div>

        {/* Right Side - Chat Panel */}
        <div className="absolute right-0 top-0 bottom-0 w-[420px] pointer-events-auto">
          <ChatPanel />
        </div>
      </div>

      {/* Validation Status Badge - Fixed position */}
      <ValidationBadge />

      {/* Validation Overlay (modal) */}
      <ValidationOverlay />
    </div>
  );
}

export default App;
