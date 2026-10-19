import type { Orbita } from '../modello/cubo.ts'
import type { Passo } from '../risolutore/notazione.ts'

interface BarraSoluzioneProps {
  titolo?: string // nome della sequenza in esecuzione, assente per la soluzione calcolata
  nota?: string
  inRicerca: boolean
  secondiRicerca: number
  onPiuCorta?: () => void // presente solo per una soluzione calcolata e non ancora iniziata
  onInterrompi: () => void
  passi: Passo[]
  fatti: number
  bloccato: boolean
  onProssimo: () => void
  onPunta: (orbita: Orbita | null) => void
  giaUguali?: string // messaggio quando non serve nessun passo
}

export function BarraSoluzione({
  titolo,
  nota,
  inRicerca,
  secondiRicerca,
  onPiuCorta,
  onInterrompi,
  passi,
  fatti,
  bloccato,
  onProssimo,
  onPunta,
  giaUguali = 'Il cubo è già ordinato.',
}: BarraSoluzioneProps) {
  if (passi.length === 0)
    return (
      <div className="barra">
        <p>{giaUguali}</p>
      </div>
    )
  const finita = fatti === passi.length
  // Ogni passo è uno o più quarti di giro di un'orbita: si confrontano con le mosse registrate
  const quarti = passi.reduce((totale, passo) => totale + passo.mosse.length, 0)
  return (
    <div className="barra">
      <div className="soluzione-testa">
        <p>
          {titolo && <strong>{titolo}: </strong>}
          {finita ? `Fatto: ${passi.length} passi.` : `Passo ${fatti + 1} di ${passi.length}`}
        </p>
        <div className="azioni">
          {inRicerca ? (
            <>
              <span role="status">Cerco una soluzione più corta (fino a {secondiRicerca} s)…</span>
              <button type="button" onClick={onInterrompi}>
                Interrompi
              </button>
            </>
          ) : (
            onPiuCorta && (
              <button type="button" disabled={bloccato} onClick={onPiuCorta}>
                Cerca più corta
              </button>
            )
          )}
          <button type="button" disabled={bloccato || finita} onClick={onProssimo}>
            Passo successivo
          </button>
        </div>
      </div>
      <p className="nota">
        {passi.length} passi, {quarti} quarti di giro sulle orbite.{nota && ` ${nota}`}
      </p>
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
