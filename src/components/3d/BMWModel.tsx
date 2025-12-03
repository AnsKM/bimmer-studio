/**
 * BMW M5 3D Model Component
 *
 * Renders the car with configurable materials for color, wheels, etc.
 * Uses a GLB model loaded from the public folder.
 *
 * Mesh categorization is based on original material names from the GLB file:
 * - Paint_Material → Body panels (receive exterior color)
 * - Window_Material → Glass/windows (transparent dark)
 * - RED_GLASS → Tail lights (red transparent)
 * - LightA_Material → Headlights
 * - Wheel1A_Material, mat_wheels, esr_cs1_gloss_black → Wheel rims
 * - Tire_Shader → Tires (black rubber)
 * - calipers, Callipers → Brake calipers
 * - InteriorA_Material, InteriorTilling → Interior parts
 * - Grille*_Material → Kidney grille
 * - BadgeA_Material → BMW badges (keep original - has roundel texture)
 * - Carbon1M_Material → Carbon fiber parts
 * - SeatBelt_Material → Seat belts
 * - EngineA_Material → Engine bay
 * - SpecularTintA_Material → Chrome/metal trim (window trim, door handles, exhaust tips)
 * - TexturedA_Material → Textured parts (keep original materials)
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useConfigStore } from '../../stores/configStore';

// =============================================================================
// MESH CATEGORY DEFINITIONS
// =============================================================================

type MeshCategory = 'body' | 'glass' | 'taillight' | 'headlight' | 'wheel' | 'tire' | 'caliper' | 'interior' | 'grille' | 'badge' | 'carbon' | 'chrome' | 'other';

/**
 * Categorize a mesh based on its original material name
 */
function categorizeMesh(materialName: string): MeshCategory {
  const name = materialName.toLowerCase();

  // Body paint - only Paint_Material should get body color
  if (name.includes('paint_material')) return 'body';

  // Glass/Windows
  if (name.includes('window_material') || name === 'window') return 'glass';

  // Tail lights (red glass)
  if (name.includes('red_glass')) return 'taillight';

  // Headlights
  if (name.includes('lighta_material') || name.includes('light_material')) return 'headlight';

  // Wheels (rims)
  if (name.includes('wheel') || name.includes('mat_wheels') || name.includes('esr_cs1')) return 'wheel';

  // Tires
  if (name.includes('tire_shader') || name.includes('tire')) return 'tire';

  // Brake calipers
  if (name.includes('calliper') || name.includes('caliper')) return 'caliper';

  // Interior
  if (name.includes('interior') || name.includes('seatbelt')) return 'interior';

  // Grille (kidney grille)
  if (name.includes('grille')) return 'grille';

  // Badge
  if (name.includes('badge')) return 'badge';

  // Carbon fiber
  if (name.includes('carbon')) return 'carbon';

  // Chrome/metal trim (window trim, door handles, exhaust tips, mirror caps)
  if (name.includes('speculartint') || name.includes('chrome') ||
      name.includes('exhaust') || name.includes('tip') ||
      name.includes('trim') || name.includes('door_handle') ||
      name.includes('mirror_cap') || name.includes('window_trim')) return 'chrome';

  // Base material is usually body
  if (name.includes('base_material')) return 'body';

  // Engine, textured parts - keep original (these have baked textures/decals)
  if (name.includes('engine') || name.includes('textured')) return 'other';

  // TEX materials - usually misc parts with textures
  if (name.startsWith('tex')) return 'other';

  return 'other';
}

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

  // Store original material names before any modifications
  const originalMaterialNames = useMemo(() => {
    const names = new Map<string, string>();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        names.set(child.name, mat.name || 'unnamed');
      }
    });
    return names;
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

  // Apply materials to the model based on categories
  useEffect(() => {
    if (!clonedScene) return;

    console.log('🎨 Applying color:', config.color.name, config.color.hex);

    // Category counters for debugging
    const counts: Record<MeshCategory, number> = {
      body: 0,
      glass: 0,
      taillight: 0,
      headlight: 0,
      wheel: 0,
      tire: 0,
      caliper: 0,
      interior: 0,
      grille: 0,
      badge: 0,
      carbon: 0,
      chrome: 0,
      other: 0,
    };

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const meshName = child.name;
        const originalMatName = originalMaterialNames.get(meshName) || 'unnamed';
        const category = categorizeMesh(originalMatName);
        counts[category]++;

        // Store original material for potential preservation
        const originalMaterial = child.material as THREE.MeshStandardMaterial;

        // Apply appropriate material based on category
        switch (category) {
          case 'body':
            // Body panels - apply configured exterior color
            child.material = bodyMaterial;
            break;

          case 'glass':
            // Windows - dark transparent glass
            child.material = new THREE.MeshPhysicalMaterial({
              color: '#111111',
              metalness: 0,
              roughness: 0,
              transmission: 0.9,
              thickness: 0.5,
              transparent: true,
              opacity: 0.3,
            });
            break;

          case 'taillight':
            // Tail lights - red transparent
            child.material = new THREE.MeshPhysicalMaterial({
              color: '#cc0000',
              metalness: 0.2,
              roughness: 0.1,
              transmission: 0.7,
              thickness: 0.3,
              transparent: true,
              opacity: 0.8,
            });
            break;

          case 'headlight':
            // Headlights - clear with some reflection
            child.material = new THREE.MeshPhysicalMaterial({
              color: '#ffffff',
              metalness: 0.8,
              roughness: 0.1,
              transmission: 0.3,
              transparent: true,
              opacity: 0.9,
            });
            break;

          case 'wheel':
            // Wheel rims - metallic silver/dark
            child.material = new THREE.MeshStandardMaterial({
              color: '#2a2a2a',
              metalness: 0.9,
              roughness: 0.3,
              envMapIntensity: 1.5,
            });
            break;

          case 'tire':
            // Tires - matte black rubber
            child.material = new THREE.MeshStandardMaterial({
              color: '#1a1a1a',
              metalness: 0,
              roughness: 0.9,
            });
            break;

          case 'caliper':
            // Brake calipers - BMW M blue or red
            child.material = new THREE.MeshStandardMaterial({
              color: '#0066cc',
              metalness: 0.7,
              roughness: 0.3,
            });
            break;

          case 'interior':
            // Interior - dark leather/plastic
            child.material = new THREE.MeshStandardMaterial({
              color: '#1a1a1a',
              metalness: 0.1,
              roughness: 0.7,
            });
            break;

          case 'grille':
            // Kidney grille - use configured grill color
            child.material = new THREE.MeshStandardMaterial({
              color: config.grillColor?.hex || '#1a1a1a',
              metalness: 0.8,
              roughness: 0.2,
            });
            break;

          case 'badge':
            // BMW badge - PRESERVE ORIGINAL material (has roundel texture/decal)
            // The GLB model already has the BMW blue/white roundel texture baked in
            // Do not override this material - just enhance the properties if needed
            if (originalMaterial.map) {
              // If there's a texture map, preserve it and enhance
              const enhancedBadge = originalMaterial.clone();
              enhancedBadge.metalness = Math.max(enhancedBadge.metalness || 0, 0.9);
              enhancedBadge.roughness = Math.min(enhancedBadge.roughness || 0.5, 0.1);
              enhancedBadge.envMapIntensity = 2;
              child.material = enhancedBadge;
            }
            // If no texture, keep the original material entirely
            // The badge might be using vertex colors or other techniques
            break;

          case 'carbon':
            // Carbon fiber - dark with slight texture
            child.material = new THREE.MeshStandardMaterial({
              color: '#1a1a1a',
              metalness: 0.4,
              roughness: 0.4,
            });
            break;

          case 'chrome':
            // Chrome trim
            child.material = new THREE.MeshStandardMaterial({
              color: '#cccccc',
              metalness: 0.95,
              roughness: 0.05,
              envMapIntensity: 2,
            });
            break;

          case 'other':
          default:
            // Keep original material properties for other parts
            break;
        }

        // Enable shadows for all meshes
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Debug logging
    console.log('📊 Mesh categorization by material name:');
    console.log('  - Body (painted):', counts.body);
    console.log('  - Glass:', counts.glass);
    console.log('  - Tail lights:', counts.taillight);
    console.log('  - Headlights:', counts.headlight);
    console.log('  - Wheels:', counts.wheel);
    console.log('  - Tires:', counts.tire);
    console.log('  - Calipers:', counts.caliper);
    console.log('  - Interior:', counts.interior);
    console.log('  - Grille:', counts.grille);
    console.log('  - Badge:', counts.badge);
    console.log('  - Carbon:', counts.carbon);
    console.log('  - Chrome:', counts.chrome);
    console.log('  - Other:', counts.other);
    console.log('  - Total:', Object.values(counts).reduce((a, b) => a + b, 0));
  }, [clonedScene, bodyMaterial, config.color, config.grillColor, originalMaterialNames]);

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
