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

// ─── Image Gallery / Slider ───────────────────────────────────────────────────
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

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex(i => (i - 1 + images.length) % images.length)
  }, [images.length])

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex(i => (i + 1) % images.length)
  }, [images.length])

  const current = images[index]

  if (images.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && (
        <p style={{
          fontFamily: MONO, fontSize: '10px', color: accent,
          margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>
          {label}
        </p>
      )}

      {/* Main image frame */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '16/10',
        background: 'rgba(0,0,0,0.6)', border: `1px solid ${accent}33`,
        borderRadius: '10px', overflow: 'hidden',
      }}>
        {/* Corner marks */}
        {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
          <span key={c} style={{
            position: 'absolute', zIndex: 4,
            top: c.startsWith('t') ? '8px' : 'auto',
            bottom: c.startsWith('b') ? '8px' : 'auto',
            left: c.endsWith('l') ? '8px' : 'auto',
            right: c.endsWith('r') ? '8px' : 'auto',
            width: '8px', height: '8px',
            borderTop: c.startsWith('t') ? `1px solid ${accent}66` : 'none',
            borderBottom: c.startsWith('b') ? `1px solid ${accent}66` : 'none',
            borderLeft: c.endsWith('l') ? `1px solid ${accent}66` : 'none',
            borderRight: c.endsWith('r') ? `1px solid ${accent}66` : 'none',
          }} />
        ))}

        {/* Image or placeholder */}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="3" stroke={`${accent}66`} strokeWidth="1.5"/>
              <circle cx="8" cy="8" r="2" fill={`${accent}66`}/>
              <path d="M2 15L7 10L11 14L15 10L22 17" stroke={`${accent}66`} strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <p style={{
              fontFamily: MONO, fontSize: '10px',
              color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textAlign: 'center',
            }}>
              {current.caption ?? 'Aperçu à venir'}
            </p>
          </div>
        )}

        {/* Navigation overlay — only show when multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute', left: '8px', top: '50%',
                transform: 'translateY(-50%)', zIndex: 10,
                background: 'rgba(0,0,0,0.65)', border: `1px solid ${accent}44`,
                borderRadius: '6px', color: '#fff', cursor: 'pointer',
                width: '28px', height: '28px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 0,
                fontSize: '14px', lineHeight: 1,
              }}
            >
              ‹
            </button>
            <button
              onClick={next}
              style={{
                position: 'absolute', right: '8px', top: '50%',
                transform: 'translateY(-50%)', zIndex: 10,
                background: 'rgba(0,0,0,0.65)', border: `1px solid ${accent}44`,
                borderRadius: '6px', color: '#fff', cursor: 'pointer',
                width: '28px', height: '28px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 0,
                fontSize: '14px', lineHeight: 1,
              }}
            >
              ›
            </button>

            {/* Counter pill */}
            <div style={{
              position: 'absolute', bottom: '10px', left: '50%',
              transform: 'translateX(-50%)', zIndex: 10,
              background: 'rgba(0,0,0,0.7)', borderRadius: '999px',
              padding: '3px 10px', display: 'flex', gap: '6px',
              alignItems: 'center',
            }}>
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setIndex(i) }}
                  style={{
                    width: i === index ? '16px' : '6px',
                    height: '6px',
                    borderRadius: '999px',
                    background: i === index ? accent : 'rgba(255,255,255,0.3)',
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Caption */}
      {current.caption && current.src && (
        <p style={{
          fontFamily: MONO, fontSize: '10px',
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em',
          margin: 0, textAlign: 'center',
        }}>
          {current.caption}
        </p>
      )}
    </div>
  )
}

// ─── SAÉ Card (Preuve 1 — Développer) ────────────────────────────────────────
function SaeCard() {
  const saeImages: GalleryImage[] = [
    { src: '/medias/sae-photo1.jpg', caption: 'Page d\'accueil — liste des mini-jeux' },
    { src: '/medias/sae-photo2.jpg', caption: 'Interface en jeu — exemple Snake' },
    { src: '/medias/sae-docker.jpg', caption: 'Architecture Docker Compose (dev vs prod)' },
  ]

  const acList: { code: string; label: string; mastery: MasteryLevel }[] = [
    { code: 'AC34.01', label: 'Framework client (React / Next.js)',      mastery: 'Maîtrise avancée'       },
    { code: 'AC34.02', label: 'Framework serveur (Laravel API REST)',    mastery: 'Maîtrisé'               },
    { code: 'AC34.03', label: 'Dispositif interactif sophistiqué',       mastery: 'Maîtrisé'               },
    { code: 'AC34.04', label: 'Composants logiciels réutilisables',      mastery: "En cours d'acquisition" },
    { code: 'AC35.02', label: 'Qualité & bonnes pratiques Web',          mastery: 'Maîtrisé'               },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <HoloLabel color={EMERALD}>Élément de preuve 01 — Compétence Développer × SAÉ</HoloLabel>
          <h2 style={{
            fontFamily: DISPLAY, fontSize: '24px', fontWeight: 700,
            letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 8px 0',
          }}>
            Plateforme de mini-jeux &amp; Architecture Docker
          </h2>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['Docker', 'Next.js', 'Laravel API', 'TailwindCSS'].map(t => (
              <TechBadge key={t} name={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Body: STAR + Gallery */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <HoloField label="S — Situation" accent={EMERALD}>
            En 3ème année, nous devions concevoir une plateforme web regroupant plusieurs mini-jeux en équipe de 5.
            Le vrai défi n'était pas technique — c'était d'éviter le chaos classique quand tout le monde touche au même code
            et que ça marche sur un poste mais pas sur l'autre.
          </HoloField>

          <HoloField label="T — Tâche attendue" accent={EMERALD}>
            Livrer une application fonctionnelle, dockerisée, avec au moins 3 jeux jouables et une API Laravel pour les scores.
            Ma responsabilité : la mise en place de l'infra Docker <em>et</em> le développement front-end des jeux.
          </HoloField>

          <HoloField label="A — Actions" accent={EMERALD}>
            J'ai commencé par construire le <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>docker-compose.yml</code> qui orchestre
            le front Next.js, l'API Laravel et la base MySQL — zéro friction d'environnement pour l'équipe.
            Ensuite j'ai basculé côté front pour coder la logique complète de Snake, Morpion et Mémory,
            avec la gestion des scores envoyés à l'API en temps réel.
          </HoloField>

          <HoloField label="R — Résultats &amp; recul" accent={EMERALD}>
            Projet livré, fonctionnel, validé par le jury.
            <span style={{
              display: 'block', marginTop: '8px', paddingLeft: '10px',
              borderLeft: `2px solid ${EMERALD}55`,
              color: '#a3e4b5', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6,
            }}>
              Ce que j'aurais fait différemment : on a utilisé Next.js pour toute la logique serveur
              par manque de temps pour monter en compétence sur Laravel. Ça fonctionnait, mais c'est
              un compromis dicté par les contraintes du groupe — pas un vrai choix d'architecture.
              Si c'était à refaire, j'aurais mis une session de pair-programming sur Laravel dès le début.
            </span>
          </HoloField>
        </div>

        {/* Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <HoloGallery images={saeImages} accent={EMERALD} label="Captures du projet" />
        </div>
      </div>

      <HoloDivider />

      {/* AC Table with mastery self-assessment */}
      <div>
        <p style={{
          fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em',
          textTransform: 'uppercase', color: EMERALD, marginBottom: '10px', fontWeight: 600,
        }}>
          Auto-évaluation par apprentissage critique
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {acList.map(({ code, label, mastery }) => (
            <div key={code} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '12px', padding: '6px 10px',
              background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <HoloTag code={code} accent={EMERALD} />
                <span style={{ fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  {label}
                </span>
              </div>
              <MasteryBadge level={mastery} />
            </div>
          ))}
        </div>
        <p style={{
          fontFamily: MONO, fontSize: '10px', color: 'rgba(255,255,255,0.3)',
          marginTop: '8px', fontStyle: 'italic',
        }}>
          AC34.04 en cours : les composants sont réutilisables en interne au projet,
          mais pas encore publiés / documentés comme une vraie librairie. Objectif pour le prochain projet.
        </p>
      </div>

      <HoloDivider />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: EMERALD, color: '#000000', fontFamily: MONO,
            fontSize: '11px', fontWeight: 700, padding: '9px 18px',
            borderRadius: '6px', textDecoration: 'none', letterSpacing: '0.05em',
          }}
        >
          CODE SOURCE →
        </a>
      </div>
    </div>
  )
}

// ─── Stage Card (Preuve 2 — Entreprendre) ─────────────────────────────────────
function StageCard() {
  const horsDoeuvreImages: GalleryImage[] = [
    { src: '/medias/horsdoeuvre-avant.jpg', caption: 'Avant — plugins obsolètes, erreurs PHP visibles' },
    { src: '/medias/horsdoeuvre-apres.jpg', caption: 'Après — maintenance corrective appliquée' },
  ]
  const galerieImages: GalleryImage[] = [
    { src: '/medias/galerie-avant.jpg',  caption: 'Avant — WordPress, 8s de chargement' },
    { src: '/medias/galerie-apres.jpg',  caption: 'Après — Next.js, < 1s au premier octet' },
    { src: '/medias/galerie-admin.jpg',  caption: 'Admin sur-mesure livré avec le site' },
  ]

  const acList: { code: string; label: string; mastery: MasteryLevel }[] = [
    { code: 'AC34.05', label: 'Hébergement & déploiement',              mastery: 'Maîtrise avancée' },
    { code: 'AC35.01', label: 'Pilotage d\'un produit / d\'une équipe', mastery: 'Maîtrisé'         },
    { code: 'AC35.03', label: 'Projet d\'entreprise — identité marque', mastery: 'Maîtrisé'         },
    { code: 'AC35.04', label: 'Défense convaincante du projet',         mastery: 'Maîtrisé'         },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <HoloLabel color={SKY}>Élément de preuve 02 — Compétence Entreprendre × Stage</HoloLabel>
          <h2 style={{
            fontFamily: DISPLAY, fontSize: '24px', fontWeight: 700,
            letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 8px 0',
          }}>
            Stage — Maintenance &amp; refonte de deux sites en production
          </h2>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['Next.js', 'WordPress', 'Infomaniak', 'OVH'].map(t => (
              <TechBadge key={t} name={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <HoloField label="S — Situation" accent={SKY}>
            Deux sites clients bien différents : <strong>Hors d'œuvre</strong>, un site événementiel sous WordPress
            avec des plugins abandonnés et des erreurs PHP qui remontaient en prod,
            et <strong>la Galerie</strong>, un site vitrine qui mettait 8 secondes à charger la homepage.
          </HoloField>

          <HoloField label="T — Tâche attendue" accent={SKY}>
            Stabiliser Hors d'œuvre sans tout casser, et proposer une solution durable pour la Galerie.
            Le tout en autonomie, avec un seul référent disponible deux heures par semaine.
          </HoloField>

          <HoloField label="A — Actions" accent={SKY}>
            Pour <strong>Hors d'œuvre</strong> : j'ai audité les plugins, corrigé directement les erreurs PHP
            via SSH et mis en place un workflow de mise à jour progressive pour éviter les régressions.
            <br /><br />
            Pour <strong>la Galerie</strong> : j'ai présenté à la direction un diagnostic comparatif WordPress vs Next.js.
            Pour lever leurs réticences sur la migration des archives, j'ai écrit des scripts d'export automatisés,
            puis conçu une interface d'administration volontairement minimaliste — adaptée à quelqu'un qui n'est pas développeur.
          </HoloField>

          <HoloField label="R — Résultats &amp; recul" accent={SKY}>
            Hors d'œuvre stabilisé. Galerie migrée, temps de chargement divisé par 8, client satisfait.
            <span style={{
              display: 'block', marginTop: '8px', paddingLeft: '10px',
              borderLeft: `2px solid ${SKY}55`,
              color: '#a3d4ea', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6,
            }}>
              Le vrai apprentissage : Infomaniak ne permet pas de compiler Next.js côté serveur.
              J'ai dû revoir toute la chaîne de déploiement — build local, upload des fichiers statiques,
              config Nginx manuelle. Frustrant sur le moment, mais ça m'a obligé à comprendre
              ce qui se passe réellement derrière un simple <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>npm run build</code>.
            </span>
          </HoloField>
        </div>

        {/* Galleries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-start' }}>
          <HoloGallery images={horsDoeuvreImages} accent={SKY} label="Hors d'œuvre (WordPress)" />
          <HoloGallery images={galerieImages} accent={SKY} label="La Galerie (Next.js)" />
        </div>
      </div>

      <HoloDivider />

      {/* AC Table */}
      <div>
        <p style={{
          fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em',
          textTransform: 'uppercase', color: SKY, marginBottom: '10px', fontWeight: 600,
        }}>
          Auto-évaluation par apprentissage critique
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {acList.map(({ code, label, mastery }) => (
            <div key={code} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '12px', padding: '6px 10px',
              background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <HoloTag code={code} accent={SKY} />
                <span style={{ fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  {label}
                </span>
              </div>
              <MasteryBadge level={mastery} />
            </div>
          ))}
        </div>
      </div>

      <HoloDivider />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        <a
          href="https://votre-site-hors-doeuvre.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'rgba(56,189,248,0.1)', border: `1px solid ${SKY}55`,
            color: SKY, fontFamily: MONO, fontSize: '10px',
            fontWeight: 600, padding: '8px 14px', borderRadius: '6px',
            textDecoration: 'none', letterSpacing: '0.05em',
          }}
        >
          HORS D'ŒUVRE ↗
        </a>
        <a
          href="https://votre-site-galerie.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: SKY, color: '#000000', fontFamily: MONO,
            fontSize: '10px', fontWeight: 700, padding: '8px 14px',
            borderRadius: '6px', textDecoration: 'none', letterSpacing: '0.05em',
          }}
        >
          LA GALERIE ↗
        </a>
      </div>
    </div>
  )
}

// ─── Cell ─────────────────────────────────────────────────────────────────────
interface CellProps {
  col: number
  row: number
  accentColor: string
  outroStart: number
  projectCard?: 'sae' | 'stage'
}

function Cell({ col, row, accentColor, outroStart, projectCard }: CellProps) {
  const innerRef = useRef<THREE.Mesh>(null)
  const frameRef = useRef<THREE.LineSegments>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const [cardOpacity, setCardOpacity] = useState(0)
  const lastEmitted = useRef(0)
  const [wx, wy, wz] = cellPos(col, row)
  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL_W, CELL_H, 0.02)),
    []
  )
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

    if (innerRef.current) {
      innerRef.current.position.z = zOffset
      ;(innerRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.04 + activation.current * 0.16
    }
    if (frameRef.current) {
      frameRef.current.position.z = zOffset
      ;(frameRef.current.material as THREE.LineBasicMaterial).opacity =
        0.22 + activation.current * 0.78
    }
    if (glowRef.current) {
      glowRef.current.position.z = zOffset - 0.04
      ;(glowRef.current.material as THREE.MeshStandardMaterial).opacity =
        activation.current * 0.14
    }

    if (projectCard) {
      if (Math.abs(exactOpacity - lastEmitted.current) >= 0.01) {
        lastEmitted.current = exactOpacity
        setCardOpacity(exactOpacity)
      }
    }
  })

  return (
    <group position={[wx, wy, wz]}>
      <mesh ref={innerRef}>
        <planeGeometry args={[CELL_W - 0.06, CELL_H - 0.06]} />
        <meshStandardMaterial
          color="#b0d0ff"
          transparent
          opacity={0.04}
          roughness={0.05}
          metalness={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <lineSegments ref={frameRef} geometry={edgesGeo}>
        <lineBasicMaterial color={accentColor} transparent opacity={0.22} toneMapped={false} />
      </lineSegments>

      <mesh ref={glowRef} position={[0, 0, -0.04]}>
        <planeGeometry args={[CELL_W + 0.4, CELL_H + 0.4]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.5}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {projectCard && cardOpacity > 0.01 && (
        <Html
          center
          style={{
            opacity: cardOpacity,
            transition: 'opacity 0.1s linear',
            pointerEvents: cardOpacity < 0.1 ? 'none' : 'auto',
            width: 'min(1020px, 92vw)',
            fontFamily: DISPLAY,
          }}
        >
          <div
            style={{
              background: 'rgba(4, 5, 10, 0.98)',
              border: `1px solid ${accentColor}44`,
              borderLeft: `5px solid ${accentColor}`,
              borderRadius: '16px',
              padding: '22px 30px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
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
        const x = OFFSET_X + i * STEP_X
        const y = OFFSET_Y + (ROWS - 1) * STEP_Y + CELL_H * 0.5 + 0.45
        return (
          <Text
            key={`col-${i}`}
            position={[x, y, 0]}
            fontSize={0.24}
            color={i === 0 ? EMERALD : i === 1 ? SKY : '#64748b'}
            anchorX="center"
            anchorY="bottom"
            letterSpacing={0.05}
          >
            {text}
          </Text>
        )
      })}
      {rowLabels.map((text, i) => {
        const x = OFFSET_X - CELL_W * 0.5 - 0.45
        const y = OFFSET_Y + i * STEP_Y
        return (
          <Text
            key={`row-${i}`}
            position={[x, y, 0]}
            fontSize={0.22}
            color={i === 2 ? EMERALD : i === 1 ? SKY : '#64748b'}
            anchorX="right"
            anchorY="middle"
            letterSpacing={0.08}
          >
            {text}
          </Text>
        )
      })}
    </group>
  )
}

function AxisRules() {
  const hGeo = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(OFFSET_X - STEP_X * 0.4, OFFSET_Y - STEP_Y * 0.55, 0),
        new THREE.Vector3(OFFSET_X + (COLS - 1) * STEP_X + STEP_X * 0.4, OFFSET_Y - STEP_Y * 0.55, 0),
      ]),
    []
  )
  const vGeo = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(OFFSET_X - STEP_X * 0.5, OFFSET_Y - STEP_Y * 0.5, 0),
        new THREE.Vector3(OFFSET_X - STEP_X * 0.5, OFFSET_Y + (ROWS - 1) * STEP_Y + STEP_Y * 0.4, 0),
      ]),
    []
  )
  return (
    <group>
      <line geometry={hGeo}>
        <lineBasicMaterial color="#334155" transparent opacity={0.4} />
      </line>
      <line geometry={vGeo}>
        <lineBasicMaterial color="#334155" transparent opacity={0.4} />
      </line>
    </group>
  )
}

function GroundGrid() {
  return (
    <gridHelper
      args={[40, 40, '#161e29', '#161e29']}
      position={[0, OFFSET_Y - STEP_Y * 0.8, -1]}
      rotation={[Math.PI / 2, 0, 0]}
    />
  )
}

// ─── CompetencyMatrix ─────────────────────────────────────────────────────────
export function CompetencyMatrix() {
  const groupRef = useRef<THREE.Group>(null)
  const time     = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(time.current * 0.15) * 0.012
      groupRef.current.rotation.y = Math.sin(time.current * 0.10) * 0.015
    }
  })

  const cells = useMemo(() => {
    const items: {
      col: number
      row: number
      accentColor: string
      projectCard?: 'sae' | 'stage'
    }[] = []

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
        <Cell
          key={`${col}-${row}`}
          col={col}
          row={row}
          accentColor={accentColor}
          outroStart={OUTRO_START}
          projectCard={projectCard}
        />
      ))}
    </group>
  )
}