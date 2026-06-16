// src/components/canvas/NetworkCore.tsx
'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import * as THREE                                   from 'three'
import { useFrame }                                 from '@react-three/fiber'
import { Html, Text }                               from '@react-three/drei'
import { scrollProxy }                              from './Scene'

// ─── Design tokens ────────────────────────────────────────────────────────────
const MONO    = "'JetBrains Mono', 'Fira Code', monospace"
const DISPLAY = "'Space Grotesk', sans-serif"
const EMERALD = '#4ade80'
const SKY     = '#38bdf8'
const AMBER   = '#fbbf24'

// ─── Grid constants ───────────────────────────────────────────────────────────
const COLS     = 4
const ROWS     = 3
const CELL_W   = 3.2
const CELL_H   = 2.2
const GAP_X    = 0.55
const GAP_Y    = 0.55
const STEP_X   = CELL_W + GAP_X
const STEP_Y   = CELL_H + GAP_Y
const OFFSET_X = -(COLS - 1) * STEP_X * 0.5
const OFFSET_Y = -(ROWS - 1) * STEP_Y * 0.5

function cellPos(col: number, row: number): [number, number, number] {
  return [OFFSET_X + col * STEP_X, OFFSET_Y + row * STEP_Y, 0]
}

const ACTIVATIONS = [
  { col: 0, row: 2, color: EMERALD },
  { col: 1, row: 1, color: SKY },
]
const OUTRO_START = 0.80

// ─── Mastery badge levels ─────────────────────────────────────────────────────
type MasteryLevel = 'Non maîtrisé' | 'En cours d\'acquisition' | 'Maîtrisé' | 'Maîtrise avancée'

const MASTERY_COLORS: Record<MasteryLevel, string> = {
  'Non maîtrisé':           '#ef4444',
  "En cours d'acquisition": AMBER,
  'Maîtrisé':               '#86efac',
  'Maîtrise avancée':       EMERALD,
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function HoloLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p style={{
      fontFamily: MONO, fontSize: '11px', letterSpacing: '0.28em',
      textTransform: 'uppercase', color, marginBottom: '12px', fontWeight: 600,
    }}>
      {children}
    </p>
  )
}

function HoloField({
  label, accent = EMERALD, children,
}: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{
        fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em',
        textTransform: 'uppercase', color: accent, marginBottom: '5px', fontWeight: 600,
      }}>
        {label}
      </p>
      <div style={{ color: '#e2e8f0', fontSize: '13.5px', lineHeight: 1.65, fontWeight: 400 }}>
        {children}
      </div>
    </div>
  )
}

function HoloDivider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />
}

function HoloTag({ code, accent = EMERALD }: { code: string; accent?: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px',
      border: `1px solid ${accent}55`, borderRadius: '6px',
      fontFamily: MONO, fontSize: '10px', color: '#ffffff',
      letterSpacing: '0.05em', background: `${accent}18`,
      marginRight: '6px', marginBottom: '6px',
    }}>
      {code}
    </span>
  )
}

function TechBadge({ name }: { name: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: '4px',
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
      fontFamily: MONO, fontSize: '11px', color: '#a1a1aa', marginRight: '6px',
    }}>
      {name}
    </span>
  )
}

function MasteryBadge({ level }: { level: MasteryLevel }) {
  const color = MASTERY_COLORS[level]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '5px 12px', borderRadius: '6px',
      background: `${color}14`, border: `1px solid ${color}55`,
    }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: color, boxShadow: `0 0 6px ${color}`,
      }} />
      <span style={{
        fontFamily: MONO, fontSize: '10px', color: '#ffffff',
        letterSpacing: '0.05em', fontWeight: 600,
      }}>
        {level}
      </span>
    </div>
  )
}

// ─── Image Gallery / Slider with Infinite Scaling & Lightbox (Zoom) ───────────
interface GalleryImage {
  src: string
  caption?: string
}

interface HoloGalleryProps {
  images: GalleryImage[]
  accent?: string
  label?: string
}

function HoloGallery({ images, accent = EMERALD, label }: HoloGalleryProps) {
  const [index, setIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex(i => (i - 1 + images.length) % images.length)
  }, [images.length])

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex(i => (i + 1) % images.length)
  }, [images.length])

  if (images.length === 0) return null
  const current = images[index]

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {label && (
          <p style={{
            fontFamily: MONO, fontSize: '10px', color: accent,
            margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {label}
          </p>
        )}

        {/* Main image frame (Click to Zoom) */}
        <div 
          onClick={() => setIsZoomed(true)}
          style={{
            position: 'relative', width: '100%', aspectRatio: '16/10',
            background: 'rgba(0,0,0,0.6)', border: `1px solid ${accent}33`,
            borderRadius: '10px', overflow: 'hidden', cursor: 'zoom-in'
          }}
        >
          {/* Corner marks */}
          {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
            <span key={c} style={{
              position: 'absolute', zIndex: 4,
              top: c.startsWith('t') ? '8px' : 'auto', bottom: c.startsWith('b') ? '8px' : 'auto',
              left: c.endsWith('l') ? '8px' : 'auto', right: c.endsWith('r') ? '8px' : 'auto',
              width: '8px', height: '8px',
              borderTop: c.startsWith('t') ? `1px solid ${accent}66` : 'none',
              borderBottom: c.startsWith('b') ? `1px solid ${accent}66` : 'none',
              borderLeft: c.endsWith('l') ? `1px solid ${accent}66` : 'none',
              borderRight: c.endsWith('r') ? `1px solid ${accent}66` : 'none',
            }} />
          ))}

          {/* Image Display */}
          {current.src ? (
            <img
              src={current.src}
              alt={current.caption ?? `Image ${index + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <p style={{ fontFamily: MONO, fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
                {current.caption ?? 'Aperçu à venir'}
              </p>
            </div>
          )}

          {/* Infinite Numeric Navigation overlay */}
          {images.length > 1 && (
            <>
              <button onClick={prev} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.65)', border: `1px solid ${accent}44`, borderRadius: '6px', color: '#fff', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>‹</button>
              <button onClick={next} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.65)', border: `1px solid ${accent}44`, borderRadius: '6px', color: '#fff', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>›</button>
              
              {/* COMPACT COUNTER (1 / 25) - Allows infinite images without breaking UI */}
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.85)', borderRadius: '6px', padding: '4px 10px', border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: MONO, fontSize: '10px', color: '#ffffff', letterSpacing: '0.1em' }}>
                  {index + 1} / {images.length}
                </span>
              </div>
            </>
          )}
        </div>
        {current.caption && current.src && (
          <p style={{ fontFamily: MONO, fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', margin: 0, textAlign: 'center' }}>
            {current.caption}
          </p>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX WITH NAVIGATION */}
      {isZoomed && current.src && (
        <div 
          onClick={() => setIsZoomed(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(5, 5, 8, 0.98)', backdropFilter: 'blur(15px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: '40px'
          }}
        >
          {/* Lightbox Counter */}
          {images.length > 1 && (
            <div style={{ position: 'absolute', top: '30px', left: '40px', fontFamily: MONO, fontSize: '14px', color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: '8px', border: `1px solid ${accent}44` }}>
              {index + 1} / {images.length}
            </div>
          )}

          <img 
            src={current.src} 
            alt="Zoom" 
            style={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
              borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
            }} 
          />
          
          {current.caption && (
            <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.9)', padding: '12px 24px', borderRadius: '8px', color: '#fff', fontFamily: DISPLAY, fontSize: '15px', border: `1px solid ${accent}55` }}>
              {current.caption}
            </div>
          )}

          <button onClick={() => setIsZoomed(false)} style={{ position: 'absolute', top: '30px', right: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '32px', cursor: 'pointer', padding: '10px 20px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>✕</button>

          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(e); }} style={{ position: 'absolute', left: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '40px', cursor: 'pointer', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); next(e); }} style={{ position: 'absolute', right: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '40px', cursor: 'pointer', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>›</button>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ─── SAÉ Card (Preuve 1 — Développer) ────────────────────────────────────────
function SaeCard() {
  // ТЫ МОЖЕШЬ ДОБАВИТЬ СЮДА СКОЛЬКО УГОДНО ФОТОГРАФИЙ, ХОТЬ 50 ШТУК!
  const saeImages: GalleryImage[] = [
    { src: '/medias/sae501/sae1.png', caption: 'Accueil — Sélection des mini-jeux' },
    { src: '/medias/sae501/sae2.png', caption: 'Gameplay du Sudoku' },
    { src: '/medias/sae501/sae3.png', caption: 'Classement' },
    { src: '/medias/sae501/sae4.png', caption: 'Gameplay du Mots Méles' },
  ]

  const acList: { code: string; label: string; mastery: MasteryLevel }[] = [
    { code: 'AC34.01', label: 'Framework client (React / Next.js)',      mastery: 'Maîtrise avancée'       },
    { code: 'AC34.02', label: 'Framework serveur (Laravel)',             mastery: 'Maîtrisé'               },
    { code: 'AC34.03', label: 'Développement de jeux interactifs',       mastery: 'Maîtrisé'               },
    { code: 'AC34.04', label: 'Création de composants réutilisables',    mastery: "En cours d'acquisition" },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <HoloLabel color={EMERALD}>Projet 01 — Compétence Développer</HoloLabel>
          <h2 style={{ fontFamily: DISPLAY, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 8px 0' }}>
            Plateforme de mini-jeux &amp; Infra Docker (SAÉ 5.01)
          </h2>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['Docker', 'Next.js', 'Laravel', 'Tailwind'].map(t => <TechBadge key={t} name={t} />)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <HoloField label="Contexte de départ" accent={EMERALD}>
            En 3ème année, on devait créer un site de mini-jeux à 5. Le plus gros risque avec une équipe aussi grande, 
            c'était le fameux "ça marche chez moi mais pas chez toi". Il fallait absolument éviter le chaos sur Git et les problèmes d'environnement.
          </HoloField>

          <HoloField label="Ce que j'ai fait" accent={EMERALD}>
            J'ai pris le lead sur l'architecture. J'ai monté tout un environnement <strong>Docker</strong> (Next.js, Laravel, MySQL) pour que tout le groupe ait exactement la même base de travail. 
            Une fois ça stabilisé, je suis passé sur le code pur : j'ai développé la logique front-end du Snake, du Morpion et du Mémory.
          </HoloField>

          <HoloField label="Bilan et recul" accent={EMERALD}>
            Le projet est jouable et l'équipe a pu bosser sans friction. 
            <span style={{ display: 'block', marginTop: '8px', paddingLeft: '10px', borderLeft: `2px solid ${EMERALD}55`, color: '#a3e4b5', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>
              Avec le recul, on a mis trop de logique serveur directement dans Next.js. On l'a fait parce que l'équipe bloquait sur Laravel, donc c'était un compromis pour avancer. Si c'était à refaire, j'imposerais du pair-programming sur Laravel dès le début au lieu de choisir la facilité.
            </span>
          </HoloField>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <HoloGallery images={saeImages} accent={EMERALD} label="Aperçu du projet (Cliquez pour zoomer)" />
        </div>
      </div>

      <HoloDivider />

      <div>
        <p style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: EMERALD, marginBottom: '10px', fontWeight: 600 }}>
          Mon auto-évaluation sur les compétences (AC)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {acList.map(({ code, label, mastery }) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <HoloTag code={code} accent={EMERALD} />
                <span style={{ fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
              </div>
              <MasteryBadge level={mastery} />
            </div>
          ))}
        </div>
      </div>

      <HoloDivider />
    </div>
  )
}

// ─── Stage Card (Preuve 2 — Entreprendre) ─────────────────────────────────────
function StageCard() {
  // ТЫ МОЖЕШЬ ДОБАВИТЬ СЮДА СКОЛЬКО УГОДНО ФОТОГРАФИЙ!
  const horsDoeuvreImages: GalleryImage[] = [
    { src: '/medias/horsdoeuvre/old/avant1.png', caption: 'Hors d\'œuvre (Avant)' },
    { src: '/medias/horsdoeuvre/old/avant2.png', caption: 'Hors d\'œuvre (Avant) : Plugins cassés' },
    { src: '/medias/horsdoeuvre/old/avant3.png', caption: 'Hors d\'œuvre (Avant)' },
    { src: '/medias/horsdoeuvre/old/avant4.png', caption: 'Hors d\'œuvre (Avant) : Pas de optimisation' },
    { src: '/medias/horsdoeuvre/old/avant5.png', caption: 'Hors d\'œuvre (Avant) : Navigation propre' },
    { src: '/medias/horsdoeuvre/new/apres1.png', caption: 'Hors d\'œuvre (Après) : Navigation propre' },
    { src: '/medias/horsdoeuvre/new/apres2.png', caption: 'Hors d\'œuvre (Après) : Navigation propre' },
    { src: '/medias/horsdoeuvre/new/apres3.png', caption: 'Hors d\'œuvre (Après) : Navigation propre' },
    { src: '/medias/horsdoeuvre/new/apres4.png', caption: 'Hors d\'œuvre (Après) : Navigation propre' },
    
  ]
  const galerieImages: GalleryImage[] = [
    { src: '/medias/interface/old/galerie-avant1.png',  caption: 'Le site Interface (Avant) : Ancien WordPress lent' },
    { src: '/medias/interface/old/galerie-avant2.png',  caption: 'Le site Interface (Avant) : Ancien WordPress lent' },
    { src: '/medias/interface/old/galerie-avant3.png',  caption: 'Le site Interface (Avant) : Ancien WordPress lent' },
    { src: '/medias/interface/old/galerie-avant4.png',  caption: 'Le site Interface (Avant) : Ancien WordPress lent' },
    { src: '/medias/interface/old/galerie-avant5.png',  caption: 'Le site Interface (Avant) : Ancien WordPress lent' },
    { src: '/medias/interface/new/galerie-apres2.png',  caption: 'Le site Interface (Après) : Navigation fluide' },
    { src: '/medias/interface/new/galerie-apres3.png',  caption: 'Le site Interface (Après) : Navigation fluide' },
    { src: '/medias/interface/new/galerie-apres4.png',  caption: 'Le site Interface (Après) : Navigation fluide' },
    { src: '/medias/interface/new/galerie-apres5.png',  caption: 'Le site Interface (Après) : Navigation fluide' },
    { src: '/medias/interface/new/galerie-apres6.png',  caption: 'Le site Interface (Après) : Espace d\'administration' },
    { src: '/medias/interface/new/galerie-apres7.png',  caption: 'Le site Interface (Après) : Espace d\'administration' },
  ]

  const acList: { code: string; label: string; mastery: MasteryLevel }[] = [
    { code: 'AC34.05', label: 'Gestion des serveurs & déploiement',     mastery: 'Maîtrise avancée' },
    { code: 'AC35.01', label: 'Gérer un projet de bout en bout',        mastery: 'Maîtrisé'         },
    { code: 'AC35.04', label: 'Argumenter et défendre ses choix',       mastery: 'Maîtrisé'         },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <HoloLabel color={SKY}>Projet 02 — Compétence Entreprendre</HoloLabel>
          <h2 style={{ fontFamily: DISPLAY, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 8px 0' }}>
            Stage — Refonte, Déploiement &amp; Gestion de Client
          </h2>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['Next.js', 'WordPress', 'Infomaniak', 'OVH'].map(t => <TechBadge key={t} name={t} />)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <HoloField label="Le challenge" accent={SKY}>
            On m'a confié deux sites diamétralement opposés. D'un côté, <strong>Hors d'œuvre</strong> : un vieux WordPress qui plantait sans arrêt à cause de plugins abandonnés. De l'autre, <strong>La Galerie</strong> : un site vitrine qui mettait parfois 8 secondes à s'afficher.
          </HoloField>

          <HoloField label="Mes choix et actions" accent={SKY}>
            Sur le premier site, j'ai mis les mains dans le cambouis pour debug le PHP en direct et nettoyer le serveur. 
            <br/><br/>
            Pour <strong>l'Interface</strong>, j'ai pris un risque : j'ai pitché à mon boss une refonte totale sous <strong>Next.js</strong>. Ils avaient peur de perdre leurs articles, alors j'ai codé des scripts de migration automatisés. Et pour qu'ils ne soient pas perdus sans WordPress, je leur ai créé un back-office sur-mesure ultra simple.
          </HoloField>

          <HoloField label="Bilan et recul" accent={SKY}>
            Le vieux site tient la route, et le nouveau charge en moins d'une seconde. 
            <span style={{ display: 'block', marginTop: '8px', paddingLeft: '10px', borderLeft: `2px solid ${SKY}55`, color: '#a3d4ea', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>
              Ma plus grosse galère ? Découvrir que l'hébergeur (Infomaniak) bloquait la compilation Next.js côté serveur. J'ai dû apprendre à tout compiler sur mon propre PC et configurer l'upload manuellement. C'était stressant, mais c'est honnêtement là que j'ai le plus appris sur le déploiement.
            </span>
          </HoloField>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-start' }}>
          <HoloGallery images={horsDoeuvreImages} accent={SKY} label="Site 1 : Hors d'œuvre (Cliquez pour zoomer)" />
          <HoloGallery images={galerieImages} accent={SKY} label="Site 2 : Interface (Cliquez pour zoomer)" />
        </div>
      </div>

      <HoloDivider />

      <div>
        <p style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: SKY, marginBottom: '10px', fontWeight: 600 }}>
          Mon auto-évaluation sur les compétences (AC)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {acList.map(({ code, label, mastery }) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <HoloTag code={code} accent={SKY} />
                <span style={{ fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
              </div>
              <MasteryBadge level={mastery} />
            </div>
          ))}
        </div>
      </div>

      <HoloDivider />

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        <a href="https://www.interface-horsdoeuvre.com/new-accueil/" target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(56,189,248,0.1)', border: `1px solid ${SKY}55`, color: SKY, fontFamily: MONO, fontSize: '10px', fontWeight: 600, padding: '8px 14px', borderRadius: '6px', textDecoration: 'none' }}>
          VOIR LE SITE "HORS D'ŒUVRE" ↗
        </a>
        <a href="https://ivandev.nppln.fr" target="_blank" rel="noopener noreferrer" style={{ background: SKY, color: '#000000', fontFamily: MONO, fontSize: '10px', fontWeight: 700, padding: '8px 14px', borderRadius: '6px', textDecoration: 'none' }}>
          VOIR LE SITE "Interface" ↗
        </a>
      </div>
    </div>
  )
}

// ─── Cell ─────────────────────────────────────────────────────────────────────
interface CellProps { col: number; row: number; accentColor: string; outroStart: number; projectCard?: 'sae' | 'stage' }

function Cell({ col, row, accentColor, outroStart, projectCard }: CellProps) {
  const innerRef = useRef<THREE.Mesh>(null)
  const frameRef = useRef<THREE.LineSegments>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const [cardOpacity, setCardOpacity] = useState(0)
  const lastEmitted = useRef(0)
  const [wx, wy, wz] = cellPos(col, row)
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL_W, CELL_H, 0.02)), [])
  const activation = useRef(0)

  useFrame(() => {
    const p = scrollProxy.progress
    let targetAlpha = 0
    let exactOpacity = 0

    if (col === 0 && row === 2) {
      if (p >= 0.12 && p <= 0.52) {
        targetAlpha = p >= 0.18 && p <= 0.48 ? 1 : 0.4
        if (p >= 0.22 && p <= 0.45) exactOpacity = 1
        else if (p < 0.22) exactOpacity = THREE.MathUtils.smoothstep(p, 0.14, 0.22)
        else exactOpacity = 1 - THREE.MathUtils.smoothstep(p, 0.45, 0.52)
      }
    } else if (col === 1 && row === 1) {
      if (p >= 0.48 && p <= 0.86) {
        targetAlpha = p >= 0.54 && p <= 0.82 ? 1 : 0.4
        if (p >= 0.58 && p <= 0.80) exactOpacity = 1
        else if (p < 0.58) exactOpacity = THREE.MathUtils.smoothstep(p, 0.49, 0.58)
        else exactOpacity = 1 - THREE.MathUtils.smoothstep(p, 0.80, 0.86)
      }
    }

    if (p >= outroStart) {
      const outroFactor = THREE.MathUtils.smoothstep(p, outroStart, 0.95)
      targetAlpha = Math.max(targetAlpha, outroFactor * 0.45)
    }

    activation.current += (targetAlpha - activation.current) * 0.095
    const zOffset = activation.current * 0.45

    if (innerRef.current) { innerRef.current.position.z = zOffset; (innerRef.current.material as THREE.MeshStandardMaterial).opacity = 0.04 + activation.current * 0.16 }
    if (frameRef.current) { frameRef.current.position.z = zOffset; (frameRef.current.material as THREE.LineBasicMaterial).opacity = 0.22 + activation.current * 0.78 }
    if (glowRef.current) { glowRef.current.position.z = zOffset - 0.04; (glowRef.current.material as THREE.MeshStandardMaterial).opacity = activation.current * 0.14 }

    if (projectCard) {
      if (Math.abs(exactOpacity - lastEmitted.current) >= 0.01) {
        lastEmitted.current = exactOpacity
        setCardOpacity(exactOpacity)
      }
    }
  })

  return (
    <group position={[wx, wy, wz]}>
      <mesh ref={innerRef}><planeGeometry args={[CELL_W - 0.06, CELL_H - 0.06]} /><meshStandardMaterial color="#b0d0ff" transparent opacity={0.04} roughness={0.05} metalness={0.4} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
      <lineSegments ref={frameRef} geometry={edgesGeo}><lineBasicMaterial color={accentColor} transparent opacity={0.22} toneMapped={false} /></lineSegments>
      <mesh ref={glowRef} position={[0, 0, -0.04]}><planeGeometry args={[CELL_W + 0.4, CELL_H + 0.4]} /><meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>

      {projectCard && cardOpacity > 0.01 && (
        <Html center style={{ opacity: cardOpacity, transition: 'opacity 0.1s linear', pointerEvents: cardOpacity < 0.1 ? 'none' : 'auto', width: 'min(1020px, 92vw)', fontFamily: DISPLAY }}>
          <div style={{ background: 'rgba(4, 5, 10, 0.98)', border: `1px solid ${accentColor}44`, borderLeft: `5px solid ${accentColor}`, borderRadius: '16px', padding: '22px 30px', boxShadow: '0 32px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', maxHeight: '85vh', overflowY: 'auto' }}>
            {projectCard === 'sae'   && <SaeCard   />}
            {projectCard === 'stage' && <StageCard />}
          </div>
        </Html>
      )}
    </group>
  )
}

// ─── Matrix labels & guides ───────────────────────────────────────────────────
function MatrixLabels() {
  const colLabels = ['SAÉ 5.01', 'STAGE MMI', 'SAÉ PROJET', 'MATRICE']
  const rowLabels = ['TRANSVERSE', 'ENTREPRENDRE', 'DÉVELOPPER']
  return (
    <group>
      {colLabels.map((text, i) => {
        const x = OFFSET_X + i * STEP_X; const y = OFFSET_Y + (ROWS - 1) * STEP_Y + CELL_H * 0.5 + 0.45
        return <Text key={`col-${i}`} position={[x, y, 0]} fontSize={0.24} color={i === 0 ? EMERALD : i === 1 ? SKY : '#64748b'} anchorX="center" anchorY="bottom" letterSpacing={0.05}>{text}</Text>
      })}
      {rowLabels.map((text, i) => {
        const x = OFFSET_X - CELL_W * 0.5 - 0.45; const y = OFFSET_Y + i * STEP_Y
        return <Text key={`row-${i}`} position={[x, y, 0]} fontSize={0.22} color={i === 2 ? EMERALD : i === 1 ? SKY : '#64748b'} anchorX="right" anchorY="middle" letterSpacing={0.08}>{text}</Text>
      })}
    </group>
  )
}

function AxisRules() {
  const hGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(OFFSET_X - STEP_X * 0.4, OFFSET_Y - STEP_Y * 0.55, 0), new THREE.Vector3(OFFSET_X + (COLS - 1) * STEP_X + STEP_X * 0.4, OFFSET_Y - STEP_Y * 0.55, 0)]), [])
  const vGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(OFFSET_X - STEP_X * 0.5, OFFSET_Y - STEP_Y * 0.5, 0), new THREE.Vector3(OFFSET_X - STEP_X * 0.5, OFFSET_Y + (ROWS - 1) * STEP_Y + STEP_Y * 0.4, 0)]), [])
  return (
    <group>
      <lineSegments geometry={hGeo}><lineBasicMaterial color="#334155" transparent opacity={0.4} /></lineSegments>
      <lineSegments geometry={vGeo}><lineBasicMaterial color="#334155" transparent opacity={0.4} /></lineSegments>
    </group>
  )
  
}

function GroundGrid() {
  return <gridHelper args={[40, 40, '#161e29', '#161e29']} position={[0, OFFSET_Y - STEP_Y * 0.8, -1]} rotation={[Math.PI / 2, 0, 0]} />
}

export function CompetencyMatrix() {
  const groupRef = useRef<THREE.Group>(null)
  const time     = useRef(0)
  useFrame((_, delta) => {
    time.current += delta
    if (groupRef.current) { groupRef.current.rotation.x = Math.sin(time.current * 0.15) * 0.012; groupRef.current.rotation.y = Math.sin(time.current * 0.10) * 0.015 }
  })
  const cells = useMemo(() => {
    const items: { col: number; row: number; accentColor: string; projectCard?: 'sae' | 'stage' }[] = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const spec = ACTIVATIONS.find(a => a.col === col && a.row === row)
        let projectCard: 'sae' | 'stage' | undefined
        if (col === 0 && row === 2) projectCard = 'sae'
        if (col === 1 && row === 1) projectCard = 'stage'
        items.push({ col, row, accentColor: spec?.color ?? '#475569', projectCard })
      }
    }
    return items
  }, [])
  return (
    <group ref={groupRef}>
      <GroundGrid />
      <AxisRules />
      <MatrixLabels />
      {cells.map(({ col, row, accentColor, projectCard }) => (
        <Cell key={`${col}-${row}`} col={col} row={row} accentColor={accentColor} outroStart={OUTRO_START} projectCard={projectCard} />
      ))}
    </group>
  )
}