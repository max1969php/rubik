import type { Orbita } from '../modello/cubo.ts'
import type { Passo } from '../risolutore/notazione.ts'

interface BarraSoluzioneProps {
  titolo?: string // nome della sequenza in esecuzione, assente per la soluzione calcolata
  passi: Passo[]
  fatti: number
  bloccato: boolean
  onProssimo: () => void
  onPunta: (orbita: Orbita | null) => void
}

export function BarraSoluzione({ titolo, passi, fatti, bloccato, onProssimo, onPunta }: BarraSoluzioneProps) {
  if (passi.length === 0)
    return (
      <div className="barra">
        <p>Il cubo è già ordinato.</p>
      </div>
    )
  const finita = fatti === passi.length
  return (
    <div className="barra">
      <div className="soluzione-testa">
        <p>
          {titolo && <strong>{titolo}: </strong>}
          {finita ? `Fatto: ${passi.length} passi.` : `Passo ${fatti + 1} di ${passi.length}`}
        </p>
        <button type="button" disabled={bloccato || finita} onClick={onProssimo}>
          Passo successivo
        </button>
      </div>
      <ol className="passi">
        {passi.map((passo, i) => (
          <li
            key={i}
            className={i < fatti ? 'fatto' : i === fatti ? 'corrente' : undefined}
            aria-current={i === fatti ? 'step' : undefined}
            onPointerEnter={() => onPunta(passo.mosse[0].orbita)}
            onPointerLeave={() => onPunta(null)}
          >
            {passo.testo}
          </li>
        ))}
      </ol>
    </div>
  )
}
