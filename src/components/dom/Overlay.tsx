// src/components/dom/Overlay.tsx
'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap        from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const MONO    = "'JetBrains Mono', 'Fira Code', monospace"
const DISPLAY = "'Space Grotesk', sans-serif"
const EMERALD = '#4ade80'

export function Overlay() {
  const heroRef = useRef<HTMLDivElement>(null)
  const outroRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!heroRef.current) return
    gsap.from(heroRef.current.querySelectorAll('.hl'), {
      opacity: 0, y: 50, stagger: 0.1, duration: 1.2, ease: 'expo.out', delay: 0.2, clearProps: 'transform'
    })
  }, [])

  return (
    <div style={{ fontFamily: DISPLAY, color: 'rgba(255, 255, 255, 0.92)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes scrollTick { 0% { transform: translateY(-100%); } 100% { transform: translateY(260%); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* 1. HERO MAIN MANIFESTO */}
      <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 56px', pointerEvents: 'none', position: 'relative' }}>
        <div ref={heroRef} style={{ maxWidth: '900px' }}>
          <p className="hl" style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: EMERALD, marginBottom: '16px' }}>
            B.U.T. MMI — Promotion 2026
          </p>
          <h1 className="hl" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 0.95, margin: '0 0 4px 0' }}>
            Portfolio de
          </h1>
          <h1 className="hl" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 0.95, WebkitTextStroke: '1px rgba(255,255,255,0.3)', color: 'transparent', margin: '0 0 24px 0' }}>
            Compétences
          </h1>
          <p className="hl" style={{ fontFamily: DISPLAY, fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: '65ch', fontWeight: 400 }}>
            <strong style={{ color: '#fff', fontSize: '18px' }}>Ivan LOTSUNIAK — 3ème année MMI</strong><br /><br />
            Arrivé en première année avec les pires notes en développement, j'ai choisi de transformer ma plus grande difficulté en vocation. Découvrez la synthèse de mes compétences <strong>Développer</strong> et <strong>Entreprendre</strong> à travers cette matrice interactive.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="hl" style={{ position: 'absolute', bottom: '40px', right: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.4 }}>
          <span style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.3em', writingMode: 'vertical-rl', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: '1px', height: '48px', background: 'rgba(255,255,255,0.2)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '50%', background: 'white', animation: 'scrollTick 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* 2. RIGID SCROLL BLOCKS FOR THREE.JS HOLDS */}
      <section id="spacer-sae" style={{ height: '150vh', pointerEvents: 'none' }} />
      <section id="spacer-stage" style={{ height: '150vh', pointerEvents: 'none' }} />
      <section id="spacer-reserv" style={{ height: '150vh', pointerEvents: 'none' }} />
      
      {/* 3. OUTRO - FINAL SCREEN */}
      <section id="spacer-outro" style={{ height: '60vh', pointerEvents: 'none', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '10vh' }}>
        <div ref={outroRef} style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: 'white', margin: '0 0 12px 0' }}>
            Merci pour votre attention.
          </h2>
          <p style={{ fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.25em', margin: 0 }}>
            Ivan LOTSUNIAK — Soutenance 2026
          </p>
        </div>
      </section>
    </div>
  )
}