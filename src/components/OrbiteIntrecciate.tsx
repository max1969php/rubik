import { colori } from '../constants/colori.ts'
import { useAvanzamento } from '../hooks/useAvanzamento.ts'
import { nelloStrato, orbite, type Colore, type Mossa, type Orbita, type Verso } from '../modello/cubo.ts'
import {
  centroOrbita,
  etichetteFamiglie,
  punti,
  puntiInMossa,
  RAGGIO_ADESIVO,
  raggioOrbita,
  SEMILATO_DISEGNO,
} from '../modello/intreccio.ts'

interface OrbiteIntrecciateProps {
  cubo: Colore[]
  animazione: Mossa | null
  evidenziata: Orbita | null
  onMossa: (mossa: Mossa) => void
  onPunta: (orbita: Orbita | null) => void
  onDipingi?: (indice: number) => void // presente solo mentre si copia un cubo reale
}

export function OrbiteIntrecciate({
  cubo,
  animazione,
  evidenziata,
  onMossa,
  onPunta,
  onDipingi,
}: OrbiteIntrecciateProps) {
  const t = useAvanzamento(animazione)
  const correnti = animazione ? puntiInMossa(animazione, t) : punti
  const lato = SEMILATO_DISEGNO * 2

  return (
    <svg
      className={onDipingi ? 'intreccio in-copia' : 'intreccio'}
      viewBox={`${-SEMILATO_DISEGNO} ${-SEMILATO_DISEGNO} ${lato} ${lato}`}
      role="img"
      aria-label="Le 9 orbite intrecciate: ogni adesivo è l'incrocio di due orbite"
    >
      {orbite.map((orbita) => {
        const [cx, cy] = centroOrbita(orbita)
        return (
          <g
            key={orbita.id}
            className={evidenziata === orbita ? 'cerchio attivo' : 'cerchio'}
            onPointerEnter={() => onPunta(orbita)}
            onPointerLeave={() => onPunta(null)}
            onClick={(evento) => {
              if (!animazione && !onDipingi) onMossa({ orbita, direzione: evento.shiftKey ? (-orbita.orario as Verso) : orbita.orario })
            }}
          >
            <title>{`${orbita.famiglia} ${orbita.nome} — clic: ↻, Maiusc+clic: ↺`}</title>
            <circle className="cerchio-linea" cx={cx} cy={cy} r={raggioOrbita(orbita)} />
            <circle className="cerchio-presa" cx={cx} cy={cy} r={raggioOrbita(orbita)} />
          </g>
        )
      })}
      {etichetteFamiglie.map(({ famiglia, punto: [x, y] }) => (
        <text key={famiglia} className="intreccio-famiglia" x={x} y={y} textAnchor="middle" dominantBaseline="central">
          {famiglia}
        </text>
      ))}
      {correnti.map(([x, y], indice) => (
        <circle
          key={indice}
          className={evidenziata && !nelloStrato(indice, evidenziata) ? 'adesivo spento' : 'adesivo'}
          cx={x.toFixed(2)}
          cy={y.toFixed(2)}
          r={RAGGIO_ADESIVO}
          fill={colori[cubo[indice]]}
          onClick={() => onDipingi?.(indice)}
        />
      ))}
    </svg>
  )
}
