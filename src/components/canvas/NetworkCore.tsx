// src/components/canvas/NetworkCore.tsx
'use client'

import { useRef, useMemo, useState } from 'react'
import * as THREE                     from 'three'
import { useFrame }                   from '@react-three/fiber'
import { Html, Text }                 from '@react-three/drei'
import { scrollProxy }                from './Scene'

const MONO    = "'JetBrains Mono', 'Fira Code', monospace"
const DISPLAY = "'Space Grotesk', sans-serif"
const EMERALD = '#4ade80'
const SKY     = '#38bdf8'

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

function HoloLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color, marginBottom: '12px', fontWeight: 600 }}>
      {children}
    </p>
  )
}

function HoloField({ label, accent = EMERALD, children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, marginBottom: '4px', fontWeight: 600 }}>
        {label}
      </p>
      <div style={{ color: '#ffffff', fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
        {children}
      </div>
    </div>
  )
}

function HoloDivider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '14px 0' }} />
}

function HoloTag({ code, accent = EMERALD }: { code: string; accent?: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', border: `1px solid ${accent}55`, borderRadius: '6px', fontFamily: MONO, fontSize: '10px', color: '#ffffff', letterSpacing: '0.05em', background: `${accent}18`, marginRight: '6px', marginBottom: '6px' }}>
      {code}
    </span>
  )
}

function TechBadge({ name }: { name: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: MONO, fontSize: '11px', color: '#a1a1aa', marginRight: '6px' }}>
      {name}
    </span>
  )
}

function HoloMedia({ type = 'image', hint, src }: { type?: 'image' | 'video'; hint?: string; src?: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', background: 'rgba(0, 0, 0, 0.7)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', overflow: 'hidden' }}>
      {(['tl','tr','bl','br'] as const).map(c => (
        <span key={c} style={{ position: 'absolute', top: c.startsWith('t') ? '8px' : 'auto', bottom: c.startsWith('b') ? '8px' : 'auto', left: c.endsWith('l') ? '8px' : 'auto', right: c.endsWith('r') ? '8px' : 'auto', width: '8px', height: '8px', borderTop: c.startsWith('t') ? '1px solid rgba(255,255,255,0.4)' : 'none', borderBottom: c.startsWith('b') ? '1px solid rgba(255,255,255,0.4)' : 'none', borderLeft: c.endsWith('l') ? '1px solid rgba(255,255,255,0.4)' : 'none', borderRight: c.endsWith('r') ? '1px solid rgba(255,255,255,0.4)' : 'none', zIndex: 10 }} />
      ))}
      {src ? (
        type === 'video' ? (
          <video src={src} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
        ) : (
          <img src={src} alt={hint} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
        )
      ) : (
        <>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="#ffffff" strokeWidth="1.5"/>
              <circle cx="5.5" cy="5.5" r="1.5" fill="#ffffff"/>
              <path d="M1.5 10.5L5 7.5L8.5 10.5L11 8L14.5 11.5" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontFamily: MONO, fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', textAlign: 'center', padding: '0 16px', lineHeight: 1.4 }}>{hint}</p>
        </>
      )}
    </div>
  )
}

function SaeCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <HoloLabel color={EMERALD}>Élément de preuve 01 — [Développer × SAÉ]</HoloLabel>
          <h2 style={{ fontFamily: DISPLAY, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 6px 0' }}>
            SAÉ 5.01 — Application Web de Mini-Jeux &amp; Architecture Docker
          </h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['Docker', 'Next.js', 'Laravel API', 'TailwindCSS'].map(t => <TechBadge key={t} name={t} />)}
          </div>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(74,222,128,0.08)', border: `1px solid ${EMERALD}44`, padding: '6px 12px', borderRadius: '6px' }}>
          <p style={{ fontFamily: MONO, fontSize: '9px', color: EMERALD, margin: 0, letterSpacing: '0.1em' }}>AUTO-ÉVALUATION</p>
          <p style={{ fontFamily: DISPLAY, fontSize: '13px', fontWeight: 600, color: '#ffffff', margin: 0 }}>Niveau : Maîtrise Avancée</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <HoloField label="S - Situation &amp; Tâche (Le Contexte)" accent={EMERALD}>
            Projet de groupe visant à concevoir une plateforme web regroupant des mini-jeux. Face à la taille de l'équipe et à la diversité des compétences, le défi majeur était d'harmoniser l'environnement de travail pour éviter tout conflit de code.
          </HoloField>
          <HoloField label="A - Actions (Techniques &amp; Équipe)" accent={EMERALD}>
            Collectivement, nous avons opté pour l'utilisation de <strong>Docker</strong> afin de conteneuriser l'application. J'ai d'abord apporté mon aide sur la mise en place de cette architecture serveur. Ensuite, j'ai basculé sur le front-end pour développer la logique complète des jeux et intégrer la partie visuelle.
          </HoloField>
          <HoloField label="R - Résultats &amp; Analyse Critique" accent={EMERALD}>
            Plateforme livrée fonctionnelle et validée en équipe. 
            <span style={{ color: 'rgba(74,222,128,0.85)', display: 'block', marginTop: '6px', fontStyle: 'italic', fontSize: '13px' }}>
              Posture réflexive : L'utilisation de Next.js pour la logique métier back-end était un compromis dicté par les compétences du groupe. Utiliser Laravel aurait été plus rigoureux, mais l'équipe ne le maîtrisait pas assez. Nous l'avons donc réduit à une simple API.
            </span>
          </HoloField>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
          {/* ПРОСТО ГАЛЕРЕЯ ДЛЯ ПЕРВОГО ПРОЕКТА */}
          <HoloMedia type="image" hint="Galerie : Aperçu du projet 1" src="/medias/sae-photo1.jpg" />
          <HoloMedia type="image" hint="Galerie : Aperçu du projet 2" src="/medias/sae-photo2.jpg" />
        </div>
      </div>

      <HoloDivider />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <HoloField label="Apprentissages Critiques (AC) validés" accent={EMERALD}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '4px' }}>
            {['AC34.01 (Client)', 'AC34.02 (Serveur)', 'AC34.03 (Interactif)', 'AC34.04 (Composants)', 'AC35.02 (Qualité Web)'].map(c => (
              <HoloTag key={c} code={c} accent={EMERALD} />
            ))}
          </div>
        </HoloField>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ background: EMERALD, color: '#000000', fontFamily: MONO, fontSize: '11px', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', textDecoration: 'none' }}>
          VOIR LE CODE GITHUB →
        </a>
      </div>
    </div>
  )
}

function StageCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <HoloLabel color={SKY}>Élément de preuve 02 — [Entreprendre × Stage]</HoloLabel>
          <h2 style={{ fontFamily: DISPLAY, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 6px 0' }}>
            Stage en Entreprise — Maintenance &amp; Refonte Totale
          </h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['Next.js', 'WordPress', 'Infomaniak', 'OVH'].map(t => <TechBadge key={t} name={t} />)}
          </div>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(56,189,248,0.08)', border: `1px solid ${SKY}44`, padding: '6px 12px', borderRadius: '6px' }}>
          <p style={{ fontFamily: MONO, fontSize: '9px', color: SKY, margin: 0, letterSpacing: '0.1em' }}>AUTO-ÉVALUATION</p>
          <p style={{ fontFamily: DISPLAY, fontSize: '13px', fontWeight: 600, color: '#ffffff', margin: 0 }}>Niveau : Maîtrise Excellente</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <HoloField label="S - Situation &amp; Tâche (La Problématique)" accent={SKY}>
            Mission sur deux sites distincts. Le premier (Hors d'œuvre) devait rester sous WordPress malgré des plugins obsolètes. Le second (Galerie) nécessitait une refonte complète face à d'importantes lenteurs.
          </HoloField>
          <HoloField label="A - Actions (Développeur &amp; Entrepreneur)" accent={SKY}>
            Pour le premier site, j'ai assuré la maintenance complexe du PHP directement sur le serveur. Pour la Galerie, j'ai convaincu la direction de basculer vers <strong>Next.js</strong>. J'ai rassuré la direction en développant des scripts pour sauvegarder leurs archives, et conçu une administration sur-mesure très simple d'utilisation.
          </HoloField>
          <HoloField label="R - Résultats &amp; Analyse Critique" accent={SKY}>
            Performances optimisées pour la Galerie et maintenance assurée pour Hors d'œuvre.
            <span style={{ color: 'rgba(56,189,248,0.85)', display: 'block', marginTop: '4px', fontStyle: 'italic', fontSize: '13px' }}>
              Posture réflexive : L'hébergement Infomaniak était trop faible pour la compilation Next.js. J'ai dû faire preuve d'adaptabilité en effectuant le "build" localement sur ma machine avant le déploiement.
            </span>
          </HoloField>
        </div>

        {/* ГАЛЕРЕЯ ДО / ПОСЛЕ ДЛЯ ДВУХ САЙТОВ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
            <p style={{ fontFamily: MONO, fontSize: '10px', color: SKY, margin: '0 0 8px 0', textTransform: 'uppercase' }}>Comparatif : Hors d'œuvre (WordPress)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <HoloMedia type="image" hint="AVANT" src="/medias/horsdoeuvre-avant.jpg" />
              <HoloMedia type="image" hint="APRÈS" src="/medias/horsdoeuvre-apres.jpg" />
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
            <p style={{ fontFamily: MONO, fontSize: '10px', color: SKY, margin: '0 0 8px 0', textTransform: 'uppercase' }}>Comparatif : Galerie (Next.js)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <HoloMedia type="image" hint="AVANT" src="/medias/galerie-avant.jpg" />
              <HoloMedia type="image" hint="APRÈS" src="/medias/galerie-apres.jpg" />
            </div>
          </div>

        </div>
      </div>

      <HoloDivider />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <HoloField label="Apprentissages Critiques (AC) validés" accent={SKY}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '4px' }}>
            {['AC34.05 (Déploiement)', 'AC35.01 (Pilotage)', 'AC35.03 (Innovation)', 'AC35.04 (Défense Projet)'].map(c => (
              <HoloTag key={c} code={c} accent={SKY} />
            ))}
          </div>
        </HoloField>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="https://votre-site-hors-doeuvre.com" target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(56,189,248,0.1)', border: `1px solid ${SKY}55`, color: SKY, fontFamily: MONO, fontSize: '10px', fontWeight: 600, padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}>
            SITE 1 : HORS D'ŒUVRE ↗
          </a>
          <a href="https://votre-site-galerie.com" target="_blank" rel="noopener noreferrer" style={{ background: SKY, color: '#000000', fontFamily: MONO, fontSize: '10px', fontWeight: 600, padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}>
            SITE 2 : GALERIE ↗
          </a>
        </div>
      </div>
    </div>
  )
}

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
        targetAlpha = (p >= 0.18 && p <= 0.48) ? 1 : 0.4
        if (p >= 0.22 && p <= 0.45) exactOpacity = 1
        else if (p < 0.22) exactOpacity = THREE.MathUtils.smoothstep(p, 0.14, 0.22)
        else exactOpacity = 1 - THREE.MathUtils.smoothstep(p, 0.45, 0.52)
      }
    } else if (col === 1 && row === 1) { 
      if (p >= 0.48 && p <= 0.86) {
        targetAlpha = (p >= 0.54 && p <= 0.82) ? 1 : 0.4
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

    if (innerRef.current) { innerRef.current.position.z = zOffset; innerRef.current.material.opacity = 0.04 + activation.current * 0.16 }
    if (frameRef.current) { frameRef.current.position.z = zOffset; frameRef.current.material.opacity = 0.22 + activation.current * 0.78 }
    if (glowRef.current)  { glowRef.current.position.z = zOffset - 0.04; glowRef.current.material.opacity = activation.current * 0.14 }

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
        <meshStandardMaterial color="#b0d0ff" transparent opacity={0.04} roughness={0.05} metalness={0.4} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineSegments ref={frameRef} geometry={edgesGeo}>
        <lineBasicMaterial color={accentColor} transparent opacity={0.22} toneMapped={false} />
      </lineSegments>
      <mesh ref={glowRef} position={[0, 0, -0.04]}>
        <planeGeometry args={[CELL_W + 0.4, CELL_H + 0.4]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      {projectCard && cardOpacity > 0.01 && (
        <Html center style={{ opacity: cardOpacity, transition: 'opacity 0.1s linear', pointerEvents: cardOpacity < 0.1 ? 'none' : 'auto', width: 'min(980px, 90vw)', fontFamily: DISPLAY }}>
          <div style={{ background: 'rgba(5, 6, 10, 0.98)', border: `1px solid ${accentColor}55`, borderLeft: `6px solid ${accentColor}`, borderRadius: '16px', padding: '24px 32px', boxShadow: '0 30px 60px rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            {projectCard === 'sae'   && <SaeCard   />}
            {projectCard === 'stage' && <StageCard />}
          </div>
        </Html>
      )}
    </group>
  )
}

function MatrixLabels() {
  const colLabels = ["SAÉ 5.01", "STAGE MMI", "SAÉ PROJET", "MATRICE"]
  const rowLabels = ["TRANSVERSE", "ENTREPRENDRE", "DÉVELOPPER"]
  return (
    <group>
      {colLabels.map((text, i) => {
        const x = OFFSET_X + i * STEP_X; const y = OFFSET_Y + (ROWS - 1) * STEP_Y + (CELL_H * 0.5) + 0.45
        return <Text key={`col-${i}`} position={[x, y, 0]} fontSize={0.24} color={i === 0 ? EMERALD : i === 1 ? SKY : "#64748b"} anchorX="center" anchorY="bottom" letterSpacing={0.05}>{text}</Text>
      })}
      {rowLabels.map((text, i) => {
        const x = OFFSET_X - (CELL_W * 0.5) - 0.45; const y = OFFSET_Y + i * STEP_Y
        return <Text key={`row-${i}`} position={[x, y, 0]} fontSize={0.22} color={i === 2 ? EMERALD : i === 1 ? SKY : "#64748b"} anchorX="right" anchorY="middle" letterSpacing={0.08}>{text}</Text>
      })}
    </group>
  )
}

function AxisRules() {
  const hGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(OFFSET_X - STEP_X * 0.4, OFFSET_Y - STEP_Y * 0.55, 0), new THREE.Vector3(OFFSET_X + (COLS - 1) * STEP_X + STEP_X * 0.4, OFFSET_Y - STEP_Y * 0.55, 0)]), [])
  const vGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(OFFSET_X - STEP_X * 0.5, OFFSET_Y - STEP_Y * 0.5, 0), new THREE.Vector3(OFFSET_X - STEP_X * 0.5, OFFSET_Y + (ROWS - 1) * STEP_Y + STEP_Y * 0.4, 0)]), [])
  return (
    <group>
      <line geometry={hGeo}><lineBasicMaterial color="#334155" transparent opacity={0.4} /></line>
      <line geometry={vGeo}><lineBasicMaterial color="#334155" transparent opacity={0.4} /></line>
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