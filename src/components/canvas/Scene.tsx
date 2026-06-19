// src/components/canvas/Scene.tsx
'use client'

/**
 * Scene.tsx — v11 (Flawless Cinematic Camera Holds for 3 Projects)
 *
 * Мы отодвинули камеру на дистанцию pz: 9.0, чтобы 3D-сетка выглядела объемно.
 * Теперь камера летит по 3 точкам (SAÉ -> Stage -> Réservation).
 * Мертвые зоны синхронизированы с прозрачностью карточек в NetworkCore.tsx.
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree }          from '@react-three/fiber'
import { Environment }                  from '@react-three/drei'
import { EffectComposer, Bloom }        from '@react-three/postprocessing'
import { BlendFunction, KernelSize }    from 'postprocessing'
import * as THREE                       from 'three'
import gsap                             from 'gsap'
import { ScrollTrigger }                from 'gsap/ScrollTrigger'
import { CompetencyMatrix }             from './NetworkCore'

gsap.registerPlugin(ScrollTrigger)

export const scrollProxy = { progress: 0 }

type Pose = { px: number; py: number; pz: number; lx: number; ly: number; lz: number; mouseScale?: number }

// Математика координат сетки из NetworkCore.tsx
const SAE_X    = -5.625
const SAE_Y    =  2.75
const STAGE_X  = -1.875
const STAGE_Y  =  0
const RESERV_X =  1.875   // Новые координаты для 3-го проекта
const RESERV_Y = -2.75    // Новые координаты для 3-го проекта

const POSES: Record<string, Pose> = {
  hero:   { px: -0.5,     py: 1.2,      pz: 12.5, lx: -0.5,     ly: 0.6,      lz: 0, mouseScale: 0.8 },
  sae:    { px: SAE_X,    py: SAE_Y,    pz: 9.0,  lx: SAE_X,    ly: SAE_Y,    lz: 0, mouseScale: 0.05 },
  stage:  { px: STAGE_X,  py: STAGE_Y,  pz: 9.0,  lx: STAGE_X,  ly: STAGE_Y,  lz: 0, mouseScale: 0.05 },
  reserv: { px: RESERV_X, py: RESERV_Y, pz: 9.0,  lx: RESERV_X, ly: RESERV_Y, lz: 0, mouseScale: 0.05 }, // Добавлен фокус на Réservation
  outro:  { px: 0,        py: 1.5,      pz: 14.0, lx: 0,        ly: 0.5,      lz: 0, mouseScale: 0.5 },
}

const camState: Pose = { ...POSES.hero }
const rawMouse = { x: 0, y: 0 }

if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    rawMouse.x =  (e.clientX / window.innerWidth  - 0.5) * 2
    rawMouse.y = -(e.clientY / window.innerHeight - 0.5) * 2
  }, { passive: true })
}

function CameraRig() {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const smoothMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: 'body',
        start:   'top top',
        end:     'bottom bottom',
        scrub:   1.1,
        // Блок snap удален! Больше никакого самоуправства скролла.
        onUpdate: (self) => { scrollProxy.progress = self.progress },
      },
    })

    // 1. Полет к SAÉ
    tl.to(camState, { ...POSES.sae, duration: 0.15, ease: "power2.inOut" }, 0.00)
    tl.to({}, { duration: 0.17 }, 0.15) // Остановка (Hold) для SAÉ
    
    // 2. Перелет к Stage
    tl.to(camState, { ...POSES.stage, duration: 0.11, ease: "power2.inOut" }, 0.32)
    tl.to({}, { duration: 0.17 }, 0.43) // Остановка (Hold) для Stage
    
    // 3. Перелет к Réservation
    tl.to(camState, { ...POSES.reserv, duration: 0.11, ease: "power2.inOut" }, 0.60)
    tl.to({}, { duration: 0.17 }, 0.71) // Остановка (Hold) для Réservation
    
    // 4. Отлет на финальный экран (Outro)
    tl.to(camState, { ...POSES.outro, duration: 0.12, ease: "power2.out" }, 0.88)

    return () => { tl.kill() }
  }, [])

  useFrame((_, delta) => {
    const k = 1 - Math.pow(0.012, delta)
    const mScale = camState.mouseScale ?? 1

    smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, rawMouse.x * mScale, k * 0.35)
    smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, rawMouse.y * mScale, k * 0.35)

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, camState.px + smoothMouse.current.x * 0.5, k)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, camState.py + smoothMouse.current.y * 0.3, k)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, camState.pz, k)

    target.set(
      THREE.MathUtils.lerp(target.x, camState.lx, k),
      THREE.MathUtils.lerp(target.y, camState.ly, k),
      THREE.MathUtils.lerp(target.z, camState.lz, k),
    )
    camera.lookAt(target)
  })
  return null
}

export function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 12, 8]}  intensity={1.5} color="#e8f4ff" />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} color="#c8e8ff" />
      <pointLight       position={[-5, 2,  6]} intensity={2.0} color="#4ade80" />
      <pointLight       position={[ 5, 2,  6]} intensity={1.8} color="#38bdf8" />

      <Environment preset="city" />
      <CameraRig />
      <CompetencyMatrix />

      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.8}
          intensity={0.4}
          blendFunction={BlendFunction.ADD}
          mipmapBlur
          radius={0.6}
          levels={4}
          kernelSize={KernelSize.SMALL}
        />
      </EffectComposer>
    </>
  )
}