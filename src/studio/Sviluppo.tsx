import { colori } from '../constants/colori.ts'
import type { Colore } from '../modello/cubo.ts'
import { CASELLE } from '../risolutore/notazione.ts'

// Posizione (colonna, riga) di ogni faccia nello sviluppo a croce, nell'ordine U R F D L B
const FACCE = [
  [3, 0],
  [6, 3],
  [3, 3],
  [3, 6],
  [0, 3],
  [9, 3],
]

interface SviluppoProps {
  cubo: Colore[]
  accesi?: ReadonlySet<number>
}

// Il cubo aperto in piano, per vedere tutte le facce in una volta
export function Sviluppo({ cubo, accesi }: SviluppoProps) {
  return (
    <svg className="sviluppo" viewBox="-0.1 -0.1 12.2 9.2" aria-hidden="true">
      {CASELLE.map((indice, k) => {
        const [colonna, riga] = FACCE[Math.floor(k / 9)]
        return (
          <rect
            key={k}
            x={colonna + (k % 3)}
            y={riga + Math.floor((k % 9) / 3)}
            width={0.92}
            height={0.92}
            rx={0.12}
            fill={colori[cubo[indice]]}
            opacity={accesi && !accesi.has(indice) ? 0.25 : 1}
          />
        )
      })}
    </svg>
  )
}
