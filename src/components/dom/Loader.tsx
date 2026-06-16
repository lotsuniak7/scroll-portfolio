// src/components/dom/Loader.tsx
'use client'

/**
 * Loader.tsx — Institutional preloader with 3-year study timeline
 *
 * Phases:
 *   1. "Année 1 — Fondamentaux..." (0–33%)
 *   2. "Année 2 — Approfondissement..." (33–66%)
 *   3. "Année 3 — Spécialisation..." (66–99%)
 *   4. "Validation des compétences : 100%" (at 100%)
 *
 * Exit: counter scales up → scan-line sweeps → overlay slides off upward.
 */

import { useEffect, useRef, useState } from 'react'
import { useProgress }                  from '@react-three/drei'
import gsap                             from 'gsap'

// ─── Timeline phases ─────────────────────────────────────────────────────────
const PHASES = [
  { threshold: 0,   label: 'Année 1',  sub: 'Fondamentaux du Web & Design'       },
  { threshold: 33,  label: 'Année 2',  sub: 'Approfondissement & Projets Réels'   },
  { threshold: 66,  label: 'Année 3',  sub: 'Spécialisation DWeb-DI & Stage'      },
  { threshold: 99,  label: 'Validation', sub: 'des compétences B.U.T. MMI'        },
]

function getCurrentPhase(p: number) {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (p >= PHASES[i].threshold) return PHASES[i]
  }
  return PHASES[0]
}

// ─── Animated decimal counter ────────────────────────────────────────────────
function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const obj = useRef({ n: 0 })

  useEffect(() => {
    if (!ref.current) return
    gsap.to(obj.current, {
      n:        value,
      duration: 0.45,
      ease:     'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = String(Math.round(obj.current.n))
      },
    })
  }, [value])

  return <span ref={ref}>0</span>
}

// ─── Phase label with crossfade ───────────────────────────────────────────────
function PhaseLabel({ phase }: { phase: typeof PHASES[0] }) {
  const ref    = useRef<HTMLDivElement>(null)
  const prevId = useRef<string>('')

  useEffect(() => {
    const id = phase.label
    if (id === prevId.current || !ref.current) return
    prevId.current = id
    gsap.fromTo(ref.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
    )
  }, [phase])

  return (
    <div ref={ref} style={{ textAlign: 'center', minHeight: '52px' }}>
      <p style={{
        fontFamily:    "'Syne', sans-serif",
        fontSize:      'clamp(1.1rem, 3vw, 1.8rem)',
        fontWeight:    800,
        letterSpacing: '-0.02em',
        color:         '#ffffff',
        marginBottom:  '6px',
        lineHeight:    1,
      }}>
        {phase.label === 'Validation' ? 'Validation' : phase.label}
      </p>
      <p style={{
        fontFamily:    "'IBM Plex Mono', monospace",
        fontSize:      '11px',
        letterSpacing: '0.15em',
        color:         'rgba(74,222,128,0.6)',
        textTransform: 'uppercase',
      }}>
        {phase.sub}
      </p>
    </div>
  )
}

// ─── Timeline bar (3 segments) ────────────────────────────────────────────────
function TimelineBar({ progress }: { progress: number }) {
  const years = [
    { label: 'B1', start: 0,  end: 33  },
    { label: 'B2', start: 33, end: 66  },
    { label: 'B3', start: 66, end: 100 },
  ]
  return (
    <div style={{ width: '300px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
        {years.map((y) => {
          const fill = Math.min(1, Math.max(0, (progress - y.start) / (y.end - y.start)))
          const active = progress >= y.start
          return (
            <div key={y.label} style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{
                  fontFamily:    "'IBM Plex Mono', monospace",
                  fontSize:      '9px',
                  letterSpacing: '0.18em',
                  color:         active ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.18)',
                  textTransform: 'uppercase',
                  transition:    'color 0.4s',
                }}>
                  {y.label}
                </span>
              </div>
              <div style={{
                height:       '2px',
                background:   'rgba(255,255,255,0.07)',
                borderRadius: '2px',
                overflow:     'hidden',
              }}>
                <div style={{
                  height:     '100%',
                  width:      `${fill * 100}%`,
                  background: fill > 0.99
                    ? 'linear-gradient(to right, #4ade80, #22d3ee)'
                    : 'linear-gradient(to right, #4ade80, #86efac)',
                  borderRadius: '2px',
                  transition:  'width 0.3s ease-out',
                  boxShadow:   fill > 0 ? '0 0 6px rgba(74,222,128,0.5)' : 'none',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Corner decorations ───────────────────────────────────────────────────────
function CornerMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const edge = 28
  const style: React.CSSProperties = {
    position:    'absolute',
    width:       `${edge}px`,
    height:      `${edge}px`,
    top:    pos.startsWith('t') ? '28px' : undefined,
    bottom: pos.startsWith('b') ? '28px' : undefined,
    left:   pos.endsWith('l')   ? '28px' : undefined,
    right:  pos.endsWith('r')   ? '28px' : undefined,
    borderTop:    pos.startsWith('t') ? '1px solid rgba(74,222,128,0.22)' : undefined,
    borderBottom: pos.startsWith('b') ? '1px solid rgba(74,222,128,0.22)' : undefined,
    borderLeft:   pos.endsWith('l')   ? '1px solid rgba(74,222,128,0.22)' : undefined,
    borderRight:  pos.endsWith('r')   ? '1px solid rgba(74,222,128,0.22)' : undefined,
  }
  return <div aria-hidden style={style} />
}

// ─── Main Loader ──────────────────────────────────────────────────────────────
export function Loader() {
  const { progress, active }     = useProgress()
  const overlayRef               = useRef<HTMLDivElement>(null)
  const scanRef                  = useRef<HTMLDivElement>(null)
  const counterRef               = useRef<HTMLDivElement>(null)
  const [visible,   setVisible]  = useState(true)
  const [dismissed, setDismissed]= useState(false)

  const phase = getCurrentPhase(Math.round(progress))

  // ── Exit animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (dismissed || progress < 100 || active) return
    setDismissed(true)

    const tl = gsap.timeline({ delay: 0.6, onComplete: () => setVisible(false) })

    tl.to(counterRef.current, {
      opacity: 0, scale: 1.12,
      duration: 0.4, ease: 'power2.in',
    })
    tl.fromTo(scanRef.current,
      { scaleY: 0, transformOrigin: 'bottom center', opacity: 0.7 },
      { scaleY: 1, opacity: 0, duration: 0.55, ease: 'power3.in' },
      '-=0.1'
    )
    tl.to(overlayRef.current, {
      y: '-100%', opacity: 0,
      duration: 0.75, ease: 'expo.inOut',
    }, '-=0.18')
  }, [progress, active, dismissed])

  if (!visible) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap');

        @keyframes loaderPulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.9;  }
        }
        @keyframes gridDrift {
          0%   { background-position: 0 0; }
          100% { background-position: 48px 48px; }
        }
      `}</style>

      <div
        ref={overlayRef}
        aria-label="Chargement du portfolio en cours"
        role="status"
        style={{
          position:       'fixed',
          inset:          0,
          zIndex:         9999,
          background:     '#080808',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          fontFamily:     "'IBM Plex Mono', monospace",
          overflow:       'hidden',
        }}
      >

        {/* Grid texture */}
        <div aria-hidden style={{
          position:   'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(74,222,128,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,222,128,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          animation: 'gridDrift 8s linear infinite',
          pointerEvents: 'none',
        }} />

        {/* Radial centre glow */}
        <div aria-hidden style={{
          position:   'absolute',
          inset:      0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74,222,128,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Corner marks */}
        {(['tl','tr','bl','br'] as const).map(pos => <CornerMark key={pos} pos={pos} />)}

        {/* Centre content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '380px', padding: '0 24px' }}>

          {/* Institution */}
          <div style={{ marginBottom: '40px' }}>
            <p style={{
              fontSize: '10px', letterSpacing: '0.5em',
              color: 'rgba(74,222,128,0.5)', textTransform: 'uppercase', marginBottom: '8px',
            }}>IUT de Dijon</p>
            <p style={{
              fontSize: '10px', letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase',
            }}>Département MMI</p>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px', height: '36px',
            background: 'linear-gradient(to bottom, transparent, rgba(74,222,128,0.35), transparent)',
            margin: '0 auto 40px',
          }} />

          {/* Dynamic phase label */}
          <div style={{ marginBottom: '36px' }}>
            <PhaseLabel phase={phase} />
          </div>

          {/* 3-segment year bar */}
          <div style={{ marginBottom: '28px' }}>
            <TimelineBar progress={progress} />
          </div>

          {/* Master progress bar */}
          <div style={{ width: '300px', margin: '0 auto 20px', position: 'relative' }}>
            <div style={{
              width: '100%', height: '1px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '999px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width:  `${progress}%`,
                background: 'linear-gradient(to right, #4ade80, #22d3ee)',
                borderRadius: '999px',
                transition:  'width 0.3s ease-out',
                boxShadow:   '0 0 8px rgba(74,222,128,0.6)',
              }} />
            </div>
            {/* Glow dot */}
            <div style={{
              position: 'absolute', top: '50%',
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              width: '5px', height: '5px',
              borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 10px 3px rgba(74,222,128,0.5)',
              transition: 'left 0.3s ease-out',
            }} />
          </div>

          {/* Counter */}
          <div ref={counterRef}>
            <p style={{
              fontSize: '11px', letterSpacing: '0.25em',
              color: 'rgba(74,222,128,0.45)', textTransform: 'uppercase',
            }}>
              <AnimatedCounter value={Math.round(progress)} />
              <span style={{ marginLeft: '4px', opacity: 0.5 }}>/ 100</span>
            </p>
          </div>

        </div>

        {/* Bottom diploma line */}
        <p style={{
          position: 'absolute', bottom: '28px', left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '9px', letterSpacing: '0.28em',
          color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          fontFamily: "'IBM Plex Mono', monospace",
          animation: 'loaderPulse 3s ease-in-out infinite',
        }}>
          B.U.T. Métiers du Multimédia et de l'Internet · Promotion 2025
        </p>

        {/* Scan-line sweep */}
        <div ref={scanRef} aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(74,222,128,0.07) 0%, rgba(74,222,128,0.02) 100%)',
          opacity: 0, pointerEvents: 'none',
        }} />

      </div>
    </>
  )
}