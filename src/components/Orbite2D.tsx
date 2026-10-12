import { colori } from '../constants/colori.ts'
import { useAvanzamento } from '../hooks/useAvanzamento.ts'
import {
  coloriOrbita,
  nelloStrato,
  orbite,
  type Colore,
  type Famiglia,
  type Mossa,
  type Orbita,
  type Verso,
} from '../modello/cubo.ts'

const RAGGIO_ESTERNO = 47
const RAGGIO_INTERNO = 29
const GRADI_CASELLA = 30
const STACCO_CASELLE = 1.5 // gradi
const STACCO_FACCE = 4 // gradi, ogni 3 caselle

// Angoli in gradi, in senso orario a partire dall'alto
function punto(angolo: number, raggio: number): string {
  const radianti = (angolo * Math.PI) / 180
  return `${(raggio * Math.sin(radianti)).toFixed(2)} ${(-raggio * Math.cos(radianti)).toFixed(2)}`
}

// Le caselle 1-3 stanno in alto, poi si prosegue in senso orario
const SAGOME_CASELLE = Array.from({ length: 12 }, (_, k) => {
  const da = -45 + GRADI_CASELLA * k + (k % 3 === 0 ? STACCO_FACCE : STACCO_CASELLE)
  const a = -45 + GRADI_CASELLA * (k + 1) - (k % 3 === 2 ? STACCO_FACCE : STACCO_CASELLE)
  return [
    `M ${punto(da, RAGGIO_ESTERNO)}`,
    `A ${RAGGIO_ESTERNO} ${RAGGIO_ESTERNO} 0 0 1 ${punto(a, RAGGIO_ESTERNO)}`,
    `L ${punto(a, RAGGIO_INTERNO)}`,
    `A ${RAGGIO_INTERNO} ${RAGGIO_INTERNO} 0 0 0 ${punto(da, RAGGIO_INTERNO)}`,
    'Z',
  ].join(' ')
})

interface AnelloProps {
  orbita: Orbita
  caselle: Colore[]
  animazione: Mossa | null // mossa in corso, solo se riguarda questa orbita
  bloccato: boolean
  evidenziata: Orbita | null
  onMossa: (mossa: Mossa) => void
  onPunta: (orbita: Orbita | null) => void
  onDipingi?: (indice: number) => void
}

function Anello({
  orbita,
  caselle,
  animazione,
  bloccato,
  evidenziata,
  onMossa,
  onPunta,
  onDipingi,
}: AnelloProps) {
  const t = useAvanzamento(animazione)
  return (
    <div
      className={`anello${evidenziata === orbita ? ' puntato' : ''}`}
      onPointerEnter={() => onPunta(orbita)}
      onPointerLeave={() => onPunta(null)}
    >
      <svg viewBox="-50 -50 100 100" role="img" aria-label={`Orbita ${orbita.famiglia} ${orbita.nome}`}>
        {/* Dove ↻ fa arretrare le caselle l'anello è disegnato specchiato, così gira nel verso della freccia */}
        <g transform={orbita.orario === -1 ? 'scale(-1 1)' : undefined}>
          <g
            className={onDipingi ? 'in-copia' : undefined}
            transform={animazione ? `rotate(${90 * animazione.direzione * t})` : undefined}
          >
            {caselle.map((colore, k) => (
              <path
                key={k}
                className={evidenziata && !nelloStrato(orbita.caselle[k], evidenziata) ? 'spento' : undefined}
                d={SAGOME_CASELLE[k]}
                fill={colori[colore]}
                onClick={() => onDipingi?.(orbita.caselle[k])}
              />
            ))}
          </g>
        </g>
        <text className="anello-nome" textAnchor="middle" dominantBaseline="central">
          {orbita.nome}
        </text>
      </svg>
      <div className="anello-comandi">
        <button
          type="button"
          disabled={bloccato}
          aria-label={`Ruota ${orbita.famiglia} ${orbita.nome} in senso antiorario`}
          onClick={() => onMossa({ orbita, direzione: -orbita.orario as Verso })}
        >
          ↺
        </button>
        <button
          type="button"
          disabled={bloccato}
          aria-label={`Ruota ${orbita.famiglia} ${orbita.nome} in senso orario`}
          onClick={() => onMossa({ orbita, direzione: orbita.orario })}
        >
          ↻
        </button>
      </div>
    </div>
  )
}

interface Orbite2DProps {
  famiglia: Famiglia
  cubo: Colore[]
  animazione: Mossa | null
  bloccato: boolean
  evidenziata: Orbita | null
  onMossa: (mossa: Mossa) => void
  onPunta: (orbita: Orbita | null) => void
  onDipingi?: (indice: number) => void
}

// I tre anelli di una famiglia, con il suo nome
export function Orbite2D({
  famiglia,
  cubo,
  animazione,
  bloccato,
  evidenziata,
  onMossa,
  onPunta,
  onDipingi,
}: Orbite2DProps) {
  return (
    <div className={`gruppo gruppo-${famiglia}`}>
      <h2>{famiglia}</h2>
      <div className="anelli">
        {orbite
          .filter((orbita) => orbita.famiglia === famiglia)
          .map((orbita) => (
            <Anello
              key={orbita.id}
              orbita={orbita}
              caselle={coloriOrbita(cubo, orbita)}
              animazione={animazione?.orbita === orbita ? animazione : null}
              bloccato={bloccato}
              evidenziata={evidenziata}
              onMossa={onMossa}
              onPunta={onPunta}
              onDipingi={onDipingi}
            />
          ))}
      </div>
    </div>
  )
}
