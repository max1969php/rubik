import { useEffect, useState } from 'react'
import { DURATA_MOSSA, type Mossa } from '../modello/cubo.ts'

// Avanzamento (0-1, già addolcito) della mossa in corso, aggiornato a ogni fotogramma
export function useAvanzamento(animazione: Mossa | null): number {
  const [stato, setStato] = useState<{ mossa: Mossa; t: number } | null>(null)

  useEffect(() => {
    if (!animazione) return
    const inizio = performance.now()
    let richiesta = requestAnimationFrame(function passo() {
      const t = Math.min(1, (performance.now() - inizio) / DURATA_MOSSA)
      setStato({ mossa: animazione, t })
      if (t < 1) richiesta = requestAnimationFrame(passo)
    })
    return () => cancelAnimationFrame(richiesta)
  }, [animazione])

  const t = stato?.mossa === animazione ? stato.t : 0
  return t * t * (3 - 2 * t)
}
