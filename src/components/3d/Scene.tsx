/**
 * Main 3D Scene Component
 *
 * Contains the BMW M5 model with configurable materials
 */

import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  PerspectiveCamera,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { useConfigStore } from '../../stores/configStore';
import { BMWModel } from './BMWModel';

// =============================================================================
// CAMERA POSITIONS
// =============================================================================

const CAMERA_POSITIONS = {
  front: { position: [0, 2, 8], target: [0, 0, 0] },
  side: { position: [8, 2, 0], target: [0, 0, 0] },
  rear: { position: [0, 2, -8], target: [0, 0, 0] },
  interior: { position: [0.5, 1.5, 1], target: [0, 1, 3] },
  wheels: { position: [4, 1, 4], target: [0, 0, 0] },
};

// =============================================================================
// CAMERA CONTROLLER
// =============================================================================

function CameraController() {
  const { cameraPosition } = useConfigStore((state) => state.ui);
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const pos = CAMERA_POSITIONS[cameraPosition];
    if (pos && controlsRef.current) {
      // Animate camera to new position
      const startPos = camera.position.clone();
      const endPos = new THREE.Vector3(...pos.position);
      const startTarget = controlsRef.current.target.clone();
      const endTarget = new THREE.Vector3(...pos.target);

      let t = 0;
      const animate = () => {
        t += 0.02;
        if (t <= 1) {
          camera.position.lerpVectors(startPos, endPos, easeInOutCubic(t));
          controlsRef.current.target.lerpVectors(startTarget, endTarget, easeInOutCubic(t));
          controlsRef.current.update();
          requestAnimationFrame(animate);
        }
      };
      animate();
    }
  }, [cameraPosition, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      minDistance={2}
      maxDistance={30}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2}
      target={[0, 0, 0]}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// =============================================================================
// LOADING COMPONENT
// =============================================================================

function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-bmw-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-obsidian-300 font-body text-sm">BMW M5 wird geladen...</p>
      </div>
    </Html>
  );
}

// =============================================================================
// MAIN SCENE
// =============================================================================

export function Scene() {
  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[6, 3, 8]} fov={50} />

        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={0.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <spotLight
          position={[-10, 10, -10]}
          angle={0.15}
          penumbra={1}
          intensity={0.5}
        />

        {/* Environment */}
        <Environment
          files="/hdri/showroom.hdr"
          background
          backgroundBlurriness={0.3}
          backgroundIntensity={0.8}
        />

        {/* Car Model */}
        <Suspense fallback={<LoadingIndicator />}>
          <BMWModel />
        </Suspense>

        {/* Ground Shadow */}
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.5}
          scale={10}
          blur={2}
          far={4}
        />

        {/* Reflective Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <circleGeometry args={[15, 64]} />
          <meshStandardMaterial
            color="#0a0a0a"
            roughness={0.3}
            metalness={0.6}
            envMapIntensity={0.5}
          />
        </mesh>

        {/* Camera Controls */}
        <CameraController />
      </Canvas>

      {/* Camera Position Buttons */}
      <CameraButtons />
    </div>
  );
}

// =============================================================================
// CAMERA POSITION BUTTONS
// =============================================================================

function CameraButtons() {
  const setCameraPosition = useConfigStore((state) => state.setCameraPosition);
  const currentPosition = useConfigStore((state) => state.ui.cameraPosition);

  const buttons = [
    { id: 'front', label: 'Front', icon: '⬆️' },
    { id: 'side', label: 'Seite', icon: '➡️' },
    { id: 'rear', label: 'Heck', icon: '⬇️' },
    { id: 'wheels', label: 'Felgen', icon: '⭕' },
  ] as const;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => setCameraPosition(btn.id)}
          className={`
            px-4 py-2 rounded-lg font-body text-sm transition-all duration-200
            ${currentPosition === btn.id
              ? 'bg-bmw-blue text-white glow-blue'
              : 'glass text-obsidian-200 hover:bg-obsidian-700'
            }
          `}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
