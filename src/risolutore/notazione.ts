import {
  cuboOrdinato,
  freccia,
  indiceDi,
  orbite,
  ruota,
  type Asse,
  type Colore,
  type Famiglia,
  type Mossa,
  type Verso,
  type Vettore,
} from '../modello/cubo.ts'

// Ponte fra il modello a orbite e la notazione classica a facce (U R F D L B)
// usata dal risolutore.

interface Faccia {
  lettera: string
  asse: Asse
  strato: 1 | -1
  // Posizione della casella (riga, colonna) guardando la faccia come da convenzione
  casella: (riga: number, colonna: number) => Vettore
}

const FACCE: Faccia[] = [
  { lettera: 'U', asse: 1, strato: 1, casella: (r, c) => [c - 1, 1, r - 1] },
  { lettera: 'R', asse: 0, strato: 1, casella: (r, c) => [1, 1 - r, 1 - c] },
  { lettera: 'F', asse: 2, strato: 1, casella: (r, c) => [c - 1, 1 - r, 1] },
  { lettera: 'D', asse: 1, strato: -1, casella: (r, c) => [c - 1, -1, 1 - r] },
  { lettera: 'L', asse: 0, strato: -1, casella: (r, c) => [-1, 1 - r, c - 1] },
  { lettera: 'B', asse: 2, strato: -1, casella: (r, c) => [1 - c, 1 - r, -1] },
]

// Indice di adesivo per ognuna delle 54 caselle, nell'ordine del risolutore
const CASELLE: number[] = FACCE.flatMap((faccia) =>
  Array.from({ length: 9 }, (_, k) => indiceDi(faccia.casella(Math.floor(k / 3), k % 3), faccia.asse)),
)
const CENTRI = FACCE.map((_, f) => CASELLE[f * 9 + 4])

const letteraDelColore = Object.fromEntries(
  FACCE.map((faccia, f) => [cuboOrdinato[CENTRI[f]], faccia.lettera]),
) as Record<Colore, string>

export function inCaselle(cubo: Colore[]): string {
  return CASELLE.map((indice) => letteraDelColore[cubo[indice]]).join('')
}

export function contaColori(cubo: Colore[]): Record<Colore, number> {
  const conteggi = Object.fromEntries(Object.keys(letteraDelColore).map((c) => [c, 0])) as Record<Colore, number>
  for (const colore of cubo) conteggi[colore]++
  return conteggi
}

// Un'istruzione della soluzione: una o più mosse da eseguire di seguito
export interface Passo {
  testo: string
  mosse: Mossa[]
}

const FAMIGLIE: Famiglia[] = ['y', 'x', 'z']

// Le tre orbite di una famiglia insieme: gira tutto il cubo
function giroCompleto(famiglia: Famiglia, direzione: Verso): Mossa[] {
  return orbite.filter((o) => o.famiglia === famiglia).map((orbita) => ({ orbita, direzione }))
}

const centriAPosto = (cubo: Colore[]) => CENTRI.every((indice) => cubo[indice] === cuboOrdinato[indice])

// Giri dell'intero cubo che riportano i sei centri al loro posto.
// null se i centri non sono quelli di un cubo reale.
export function orienta(cubo: Colore[]): Passo[] | null {
  let frontiera: { cubo: Colore[]; passi: Passo[] }[] = [{ cubo, passi: [] }]
  for (let profondita = 0; profondita <= 3; profondita++) {
    const trovato = frontiera.find((stato) => centriAPosto(stato.cubo))
    if (trovato) return trovato.passi
    frontiera = frontiera.flatMap((stato) =>
      FAMIGLIE.flatMap((famiglia) =>
        ([1, -1] as const).map((direzione) => {
          const mosse = giroCompleto(famiglia, direzione)
          const passo = { testo: `tutto il cubo ${famiglia} ${freccia(mosse[0])}`, mosse }
          return { cubo: mosse.reduce(ruota, stato.cubo), passi: [...stato.passi, passo] }
        }),
      ),
    )
  }
  return null
}

// "R U2 F'" → passi sulle orbite esterne
export function daNotazione(testo: string): Passo[] {
  return testo
    .split(' ')
    .filter(Boolean)
    .map((sigla) => {
      const faccia = FACCE.find((f) => f.lettera === sigla[0])
      const orbita = orbite.find((o) => o.asse === faccia?.asse && o.strato === faccia.strato)
      if (!faccia || !orbita) throw new Error(`Mossa sconosciuta: ${sigla}`)
      // Senso orario guardando la faccia: rotazione negativa attorno alla sua normale uscente
      const orario = (-faccia.strato * orbita.verso) as Verso
      const direzione = sigla[1] === "'" ? ((-orario) as Verso) : orario
      const doppia = sigla[1] === '2'
      return {
        testo: `${orbita.famiglia} ${orbita.nome} ${freccia({ orbita, direzione })}${doppia ? ' ×2' : ''}`,
        mosse: Array.from({ length: doppia ? 2 : 1 }, (): Mossa => ({ orbita, direzione })),
      }
    })
}
