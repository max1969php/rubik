import { colori } from '../constants/colori.ts'
import type { Colore } from '../modello/cubo.ts'

interface BarraCopiaProps {
  pennello: Colore
  conteggi: Record<Colore, number>
  onPennello: (colore: Colore) => void
}

// Tavolozza per ricopiare un cubo reale: si sceglie un colore e si clicca sulle caselle
export function BarraCopia({ pennello, conteggi, onPennello }: BarraCopiaProps) {
  return (
    <div className="barra">
      <p>Scegli un colore, poi clicca le caselle (sul cubo o sulle orbite) per ricopiare il tuo cubo.</p>
      <div className="tavolozza">
        {(Object.keys(colori) as Colore[]).map((colore) => (
          <button
            key={colore}
            type="button"
            className={`campione${colore === pennello ? ' scelto' : ''}`}
            aria-pressed={colore === pennello}
            aria-label={`Colore ${colore}, usato ${conteggi[colore]} volte su 9`}
            onClick={() => onPennello(colore)}
          >
            <span className="campione-colore" style={{ background: colori[colore] }} />
            <span className={conteggi[colore] === 9 ? undefined : 'conteggio-errato'}>{conteggi[colore]}/9</span>
          </button>
        ))}
      </div>
    </div>
  )
}
