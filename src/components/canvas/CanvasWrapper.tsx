// src/components/canvas/CanvasWrapper.tsx
'use client'

import { Canvas }                          from '@react-three/fiber'
import { AdaptiveDpr, AdaptiveEvents }     from '@react-three/drei'
import * as THREE                          from 'three'
import { Scene }                           from './Scene'

export function CanvasWrapper() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ position: [0, 6, 14], fov: 52, near: 0.1, far: 120 }}
      performance={{ min: 0.5 }}
    >
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Scene />
    </Canvas>
  )
}