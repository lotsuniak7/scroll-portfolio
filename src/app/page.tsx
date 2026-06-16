// src/app/page.tsx
import { CanvasWrapper } from '@/components/canvas/CanvasWrapper'
import { Overlay }       from '@/components/dom/Overlay'

export default function Home() {
  return (
    /*
     * bg-[#0a0a0c] — near-black ground so the canvas edges are invisible.
     * min-h set by child sections (Overlay drives the page height).
     */
    <main className="relative w-full bg-[#0a0a0c]">

      {/* WebGL: fixed full-screen, below everything */}
      <div className="fixed inset-0 z-0">
        <CanvasWrapper />
      </div>

      {/* HTML: natural document flow, scrollable, above canvas */}
      <div className="relative z-10 w-full pointer-events-none">
        <Overlay />
      </div>

    </main>
  )
}