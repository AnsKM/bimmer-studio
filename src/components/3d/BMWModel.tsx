/**
 * BMW M5 3D Model Component
 *
 * Renders the car with configurable materials for color, wheels, etc.
 * Uses a GLB model loaded from the public folder.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useConfigStore } from '../../stores/configStore';

// =============================================================================
// CAR MODEL COMPONENT
// =============================================================================

export function BMWModel() {
  const config = useConfigStore((state) => state.config);
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLB model - BMW M5 from Get3DModels.com
  const { scene } = useGLTF('/models/bmw-m5.glb');

  // Clone the scene to avoid mutating the cached original
  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  // Create materials based on config
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: config.color.hex,
      metalness: config.color.type === 'frozen' ? 0.3 : 0.85,
      roughness: config.color.type === 'frozen' ? 0.6 : 0.15,
      envMapIntensity: 1.5,
    });
  }, [config.color]);

  // Apply materials to the model
  useEffect(() => {
    if (!clonedScene) return;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshName = child.name.toLowerCase();

        // Apply body color to main body parts
        if (
          meshName.includes('body') ||
          meshName.includes('hood') ||
          meshName.includes('door') ||
          meshName.includes('fender') ||
          meshName.includes('trunk') ||
          meshName.includes('roof') ||
          meshName.includes('bumper') ||
          meshName.includes('car') ||
          meshName.includes('paint') ||
          meshName.includes('exterior')
        ) {
          child.material = bodyMaterial;
        }

        // Make windows/glass transparent
        if (meshName.includes('glass') || meshName.includes('window') || meshName.includes('windshield')) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: '#111111',
            metalness: 0,
            roughness: 0,
            transmission: 0.9,
            thickness: 0.5,
            transparent: true,
            opacity: 0.3,
          });
        }

        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene, bodyMaterial]);

  // Subtle floating animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
      <primitive
        object={clonedScene}
        scale={1}
        position={[0, 0, 0]}
        rotation={[0, -Math.PI / 4, 0]}
      />
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/bmw-m5.glb');
