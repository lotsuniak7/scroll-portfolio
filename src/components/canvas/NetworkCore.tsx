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

// ДОБАВЛЕНА 3-Я КАРТОЧКА (AMBER)
const ACTIVATIONS = [
  { col: 0, row: 2, color: EMERALD },
  { col: 1, row: 1, color: SKY },
  { col: 2, row: 0, color: AMBER },
]
const OUTRO_START = 0.90

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

        <div 
          onClick={() => setIsZoomed(true)}
          style={{
            position: 'relative', width: '100%', aspectRatio: '16/10',
            background: 'rgba(0,0,0,0.6)', border: `1px solid ${accent}33`,
            borderRadius: '10px', overflow: 'hidden', cursor: 'zoom-in'
          }}
        >
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

          {images.length > 1 && (
            <>
              <button onClick={prev} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.65)', border: `1px solid ${accent}44`, borderRadius: '6px', color: '#fff', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>‹</button>
              <button onClick={next} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.65)', border: `1px solid ${accent}44`, borderRadius: '6px', color: '#fff', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>›</button>
              
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
          {images.length > 1 && (
            <div style={{ position: 'absolute', top: '30px', left: '40px', fontFamily: MONO, fontSize: '14px', color: '#fff', background: 'rgba(0,0,0,0.7)', padding: '8px 16px', borderRadius: '8px', border: `1px solid ${accent}55`, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
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
            <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.9)', padding: '12px 24px', borderRadius: '8px', color: '#fff', fontFamily: DISPLAY, fontSize: '15px', border: `1px solid ${accent}55`, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              {current.caption}
            </div>
          )}

          <button onClick={() => setIsZoomed(false)} style={{ position: 'absolute', top: '30px', right: '40px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '32px', cursor: 'pointer', padding: '8px 20px', borderRadius: '8px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>✕</button>

          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(e); }} style={{ position: 'absolute', left: '40px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '40px', cursor: 'pointer', padding: '15px 25px', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); next(e); }} style={{ position: 'absolute', right: '40px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '40px', cursor: 'pointer', padding: '15px 25px', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>›</button>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ─── SAÉ Card (Preuve 1 — Développer) ────────────────────────────────────────
function SaeCard() {
  const saeImages: GalleryImage[] = [
    { src: '/medias/sae501/sae1.png', caption: 'Accueil — Sélection des mini-jeux' },
    { src: '/medias/sae501/sae2.png', caption: 'Gameplay du Sudoku' },
    { src: '/medias/sae501/sae3.png', caption: 'Classement' },
    { src: '/medias/sae501/sae4.png', caption: 'Gameplay du Mots Mêlés' },
  ]

  const acList: { code: string; label: string; mastery: MasteryLevel }[] = [
    { code: 'AC34.01', label: 'Framework client (React / Next.js)',      mastery: 'Maîtrisé'               },
    { code: 'AC34.02', label: 'Framework serveur (Laravel)',             mastery: 'En cours d\'acquisition'},
    { code: 'AC34.03', label: 'Développement de jeux interactifs',       mastery: 'Maîtrisé'               },
    { code: 'AC34.04', label: 'Création de composants réutilisables',    mastery: 'Maîtrisé'               },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <HoloLabel color={EMERALD}>Projet 01 — Compétence Développer</HoloLabel>
          <h2 style={{ fontFamily: DISPLAY, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 8px 0' }}>
            Plateforme de mini-jeux (SAÉ 5.01)
          </h2>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['Docker', 'Next.js', 'Laravel', 'Tailwind'].map(t => <TechBadge key={t} name={t} />)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <HoloField label="S — Contexte de départ" accent={EMERALD}>
            Projet de groupe visant à créer un site web regroupant des mini-jeux. Le défi n'était pas seulement de coder, mais de réussir à s'organiser et à choisir les bonnes technologies face aux disparités de niveaux dans l'équipe.
          </HoloField>

          <HoloField label="A — Mes choix et actions" accent={EMERALD}>
            Après de longues discussions, nous avons réalisé que l'équipe manquait d'expérience sur Laravel. Nous avons donc pris la décision de déporter un maximum de logique sur <strong>Next.js</strong> pour tenir les délais. De mon côté, j'ai d'abord aidé à la configuration de l'environnement <strong>Docker</strong> pour standardiser nos machines. Ensuite, j'ai développé entièrement le jeu "Mots Mêlés" et j'ai pris en charge l'intégration de plusieurs fonctionnalités de design.
          </HoloField>

          <HoloField label="R — Bilan et recul" accent={EMERALD}>
            Le projet a été livré dans les temps et fonctionnel. 
            <span style={{ display: 'block', marginTop: '8px', paddingLeft: '10px', borderLeft: `2px solid ${EMERALD}55`, color: '#a3e4b5', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>
              Posture réflexive : Si le projet est une réussite visuelle et fonctionnelle, j'ai conscience que ma maîtrise reste souvent empirique. Je sais "faire fonctionner" les choses, mais il me manque encore une connaissance profonde des mécaniques internes et de l'architecture pure (notamment sur le back-end). C'est la raison exacte pour laquelle je souhaite poursuivre mes études l'année prochaine.
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <a href="https://github.com/sae501" target="_blank" rel="noopener noreferrer" style={{ background: EMERALD, color: '#000000', fontFamily: MONO, fontSize: '11px', fontWeight: 700, padding: '9px 18px', borderRadius: '6px', textDecoration: 'none', letterSpacing: '0.05em' }}>
          VOIR LE CODE SOURCE →
        </a>
      </div>
    </div>
  )
}

// ─── Stage Card (Preuve 2 — Entreprendre) ─────────────────────────────────────
function StageCard() {
  const horsDoeuvreImages: GalleryImage[] = [
    { src: '/medias/horsdoeuvre/old/avant1.png', caption: 'Hors d\'œuvre (Avant)' },
    { src: '/medias/horsdoeuvre/old/avant2.png', caption: 'Hors d\'œuvre (Avant) : Plugins cassés' },
    { src: '/medias/horsdoeuvre/old/avant3.png', caption: 'Hors d\'œuvre (Avant)' },
    { src: '/medias/horsdoeuvre/old/avant4.png', caption: 'Hors d\'œuvre (Avant) : Pas d\'optimisation' },
    { src: '/medias/horsdoeuvre/old/avant5.png', caption: 'Hors d\'œuvre (Avant)' },
    { src: '/medias/horsdoeuvre/new/apres1.png', caption: 'Hors d\'œuvre (Après) : Site stabilisé' },
    { src: '/medias/horsdoeuvre/new/apres2.png', caption: 'Hors d\'œuvre (Après) : Navigation propre' },
    { src: '/medias/horsdoeuvre/new/apres3.png', caption: 'Hors d\'œuvre (Après)' },
    { src: '/medias/horsdoeuvre/new/apres4.png', caption: 'Hors d\'œuvre (Après)' },
  ]
  const galerieImages: GalleryImage[] = [
    { src: '/medias/interface/old/galerie-avant1.png',  caption: 'Le site Interface (Avant) : Ancien WordPress lent' },
    { src: '/medias/interface/old/galerie-avant2.png',  caption: 'Le site Interface (Avant)' },
    { src: '/medias/interface/old/galerie-avant3.png',  caption: 'Le site Interface (Avant)' },
    { src: '/medias/interface/old/galerie-avant4.png',  caption: 'Le site Interface (Avant)' },
    { src: '/medias/interface/old/galerie-avant5.png',  caption: 'Le site Interface (Avant)' },
    { src: '/medias/interface/new/galerie-apres2.png',  caption: 'Le site Interface (Après) : Refonte Next.js' },
    { src: '/medias/interface/new/galerie-apres3.png',  caption: 'Le site Interface (Après) : Navigation fluide' },
    { src: '/medias/interface/new/galerie-apres4.png',  caption: 'Le site Interface (Après)' },
    { src: '/medias/interface/new/galerie-apres5.png',  caption: 'Le site Interface (Après)' },
    { src: '/medias/interface/new/galerie-apres6.png',  caption: 'Le site Interface (Après) : Espace d\'administration' },
    { src: '/medias/interface/new/galerie-apres7.png',  caption: 'Le site Interface (Après) : Espace d\'administration' },
  ]

  const acList: { code: string; label: string; mastery: MasteryLevel }[] = [
    { code: 'AC34.05', label: 'Gestion des serveurs & déploiement',     mastery: 'Maîtrisé' },
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
          <HoloField label="S — Le challenge" accent={SKY}>
            On m'a confié deux sites diamétralement opposés. D'un côté, <strong>Hors d'œuvre</strong> : un vieux WordPress qui plantait sans arrêt à cause de plugins abandonnés. De l'autre, <strong>Interface</strong> : un site vitrine qui mettait parfois 8 secondes à s'afficher, ruinant l'expérience utilisateur.
          </HoloField>

          <HoloField label="A — Mes choix et actions" accent={SKY}>
            Sur le premier site, j'ai appliqué une maintenance corrective stricte pour nettoyer les erreurs PHP sans casser l'existant. 
            <br/><br/>
            Pour <strong>Interface</strong>, j'ai proposé une stratégie radicale : une refonte totale sous <strong>Next.js</strong>. Pour vaincre la réticence de la direction (qui craignait de perdre ses archives et son autonomie), j'ai codé des scripts de migration automatisés. Pour pallier leur manque de bagage technique, j'ai conçu un back-office sur-mesure ultra-simplifié, leur permettant de gérer le site sans toucher au code.
          </HoloField>

          <HoloField label="R — Bilan et recul" accent={SKY}>
            Le vieux site est stabilisé, et le nouveau charge instantanément.
            <span style={{ display: 'block', marginTop: '8px', paddingLeft: '10px', borderLeft: `2px solid ${SKY}55`, color: '#a3d4ea', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>
              Le vrai mur technique a été l'hébergement Infomaniak, incapable de compiler Next.js côté serveur. Au lieu de me retrouver bloqué, j'ai adapté mon workflow : build en local sur ma machine et déploiement manuel. C'était frustrant au début, mais cela m'a forcé à comprendre les rouages du déploiement web bien au-delà du simple clic sur Vercel.
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

// ─── NOUVEAU PROJET 3: MMI Réservation (Preuve 3) ─────────────────────────────
function ReservCard() {
  const reservImages: GalleryImage[] = [
    { src: '/medias/reserv/actuel1.png', caption: 'GLPI (Avant) : Complexe, aucune image' },
  ]

  const acList: { code: string; label: string; mastery: MasteryLevel }[] = [
    { code: 'AC34.01', label: 'Framework client (React / Next.js)',      mastery: 'Maîtrisé' },
    { code: 'AC34.03', label: 'Dispositifs interactifs complexes',       mastery: 'Maîtrisé' },
    { code: 'AC35.01', label: 'Pilotage technique d\'un produit',        mastery: 'Maîtrisé'         },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <HoloLabel color={AMBER}>Projet 03 — Compétence DWeb / Transverse</HoloLabel>
          <h2 style={{ fontFamily: DISPLAY, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 8px 0' }}>
            MMI Réservation : App de Gestion de Matériel
          </h2>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['Next.js 14', 'Supabase', 'TypeScript', 'Tailwind'].map(t => <TechBadge key={t} name={t} />)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <HoloField label="S — Le problème (Situation)" accent={AMBER}>
            Jusqu'à ce jour, le département MMI gérait le prêt de matériel audiovisuel via GLPI (un outil conçu pour l'informatique réseau). L'interface était dense, sans visuels, et surtout, les étudiants naviguaient à l'aveugle : impossible de savoir si une caméra était libre avant de la demander au secrétariat.
          </HoloField>

          <HoloField label="A — Mes choix et actions" accent={AMBER}>
            En totale autonomie, j'ai développé "MMI Réservation". J'ai utilisé <strong>Next.js 14</strong> pour l'interface utilisateur et <strong>Supabase</strong> pour gérer l'authentification sécurisée, la base de données relationnelle et le stockage des images. J'ai surtout codé un algorithme critique (Server Actions) de gestion de la concurrence : si deux étudiants cliquent sur "Réserver" en même temps pour un objet unique, le système recalcule le stock à la milliseconde près et bloque la transaction du second.
          </HoloField>

          <HoloField label="R — Bilan et recul" accent={AMBER}>
            L'application a été présentée au Secrétariat et aux étudiants avec un immense succès.
            <span style={{ display: 'block', marginTop: '8px', paddingLeft: '10px', borderLeft: `2px solid ${AMBER}55`, color: '#fcd34d', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>
              Posture réflexive : L'expérience de mener un produit logiciel de l'idée jusqu'à la production a été incroyablement formatrice. Gérer des cas limites comme la concurrence de requêtes m'a poussé à repenser ma façon de concevoir l'architecture back-end. Ce projet prouve ma capacité à résoudre un vrai besoin métier.
            </span>
          </HoloField>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <HoloGallery images={reservImages} accent={AMBER} label="Aperçu du projet (Cliquez pour zoomer)" />
        </div>
      </div>

      <HoloDivider />

      <div>
        <p style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: AMBER, marginBottom: '10px', fontWeight: 600 }}>
          Mon auto-évaluation sur les compétences (AC)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {acList.map(({ code, label, mastery }) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <HoloTag code={code} accent={AMBER} />
                <span style={{ fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
              </div>
              <MasteryBadge level={mastery} />
            </div>
          ))}
        </div>
      </div>

      <HoloDivider />

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <a href="https://www.youtube.com/watch?v=aU0JbOKR55s" target="_blank" rel="noopener noreferrer" style={{ background: AMBER, color: '#000000', fontFamily: MONO, fontSize: '11px', fontWeight: 700, padding: '9px 18px', borderRadius: '6px', textDecoration: 'none', letterSpacing: '0.05em' }}>
          VOIR LA DEMONSTARTION MMI RÉSERVATION →
        </a>
      </div>
    </div>
  )
}

// ─── Cell ─────────────────────────────────────────────────────────────────────
interface CellProps { col: number; row: number; accentColor: string; outroStart: number; projectCard?: 'sae' | 'stage' | 'reserv' }

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
      if (p >= 0.08 && p <= 0.38) {
        targetAlpha = p >= 0.12 && p <= 0.34 ? 1 : 0.4
        if (p >= 0.15 && p <= 0.32) exactOpacity = 1
        else if (p < 0.15) exactOpacity = THREE.MathUtils.smoothstep(p, 0.10, 0.15)
        else exactOpacity = 1 - THREE.MathUtils.smoothstep(p, 0.32, 0.38)
      }
    } else if (col === 1 && row === 1) {
      if (p >= 0.36 && p <= 0.66) {
        targetAlpha = p >= 0.40 && p <= 0.62 ? 1 : 0.4
        if (p >= 0.43 && p <= 0.60) exactOpacity = 1
        else if (p < 0.43) exactOpacity = THREE.MathUtils.smoothstep(p, 0.38, 0.43)
        else exactOpacity = 1 - THREE.MathUtils.smoothstep(p, 0.60, 0.66)
      }
    } else if (col === 2 && row === 0) {
      if (p >= 0.64 && p <= 0.94) {
        targetAlpha = p >= 0.68 && p <= 0.90 ? 1 : 0.4
        if (p >= 0.71 && p <= 0.88) exactOpacity = 1
        else if (p < 0.71) exactOpacity = THREE.MathUtils.smoothstep(p, 0.66, 0.71)
        else exactOpacity = 1 - THREE.MathUtils.smoothstep(p, 0.88, 0.94)
      }
    }

    if (p >= outroStart) {
      const outroFactor = THREE.MathUtils.smoothstep(p, outroStart, 0.98)
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
        <Html center style={{ opacity: cardOpacity, transition: 'opacity 0.1s linear', pointerEvents: cardOpacity < 0.1 ? 'none' : 'auto', width: 'min(1020px, 92vw)', fontFamily: DISPLAY, zIndex: 100 }}>
          
          {/* Стили для кастомного ползунка скролла */}
          <style>{`
            .project-card-scroll::-webkit-scrollbar { width: 6px; }
            .project-card-scroll::-webkit-scrollbar-track { background: transparent; }
            .project-card-scroll::-webkit-scrollbar-thumb { background: ${accentColor}88; border-radius: 10px; }
            .project-card-scroll::-webkit-scrollbar-thumb:hover { background: ${accentColor}; }
          `}</style>
          
          <div className="project-card-scroll" style={{ 
            background: 'rgba(4, 5, 10, 0.98)', 
            border: `1px solid ${accentColor}44`, 
            borderLeft: `5px solid ${accentColor}`, 
            borderRadius: '16px', 
            padding: '30px 40px', 
            boxShadow: '0 32px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)',
            
            /* ВОЗВРАЩАЕМ ВНУТРЕННИЙ СКРОЛЛ КАРТОЧКАМ */
            maxHeight: '85vh', 
            overflowY: 'auto',
            /* МАГИЯ: Это свойство не дает скроллить весь сайт, пока ты скроллишь внутри карточки! */
            overscrollBehavior: 'contain'
          }}>
            {projectCard === 'sae'    && <SaeCard   />}
            {projectCard === 'stage'  && <StageCard />}
            {projectCard === 'reserv' && <ReservCard />}
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
        return <Text key={`col-${i}`} position={[x, y, 0]} fontSize={0.24} color={i === 0 ? EMERALD : i === 1 ? SKY : i === 2 ? AMBER : '#64748b'} anchorX="center" anchorY="bottom" letterSpacing={0.05}>{text}</Text>
      })}
      {rowLabels.map((text, i) => {
        const x = OFFSET_X - CELL_W * 0.5 - 0.45; const y = OFFSET_Y + i * STEP_Y
        return <Text key={`row-${i}`} position={[x, y, 0]} fontSize={0.22} color={i === 2 ? EMERALD : i === 1 ? SKY : i === 0 ? AMBER : '#64748b'} anchorX="right" anchorY="middle" letterSpacing={0.08}>{text}</Text>
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
    const items: { col: number; row: number; accentColor: string; projectCard?: 'sae' | 'stage' | 'reserv' }[] = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const spec = ACTIVATIONS.find(a => a.col === col && a.row === row)
        let projectCard: 'sae' | 'stage' | 'reserv' | undefined
        if (col === 0 && row === 2) projectCard = 'sae'
        if (col === 1 && row === 1) projectCard = 'stage'
        if (col === 2 && row === 0) projectCard = 'reserv' // ПРИВЯЗКА ТРЕТЬЕГО ПРОЕКТА
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