import { colori } from '../constants/colori.ts'

export type Colore = keyof typeof colori
export type Asse = 0 | 1 | 2 // x, y, z
export type Verso = 1 | -1
export type Vettore = [number, number, number]
export type Famiglia = 'y' | 'x' | 'z'

// Un adesivo sta sul cubetto in `posizione` e guarda lungo `asse`
// (dal lato in cui posizione[asse] vale +1 o -1).
export interface Adesivo {
  posizione: Vettore
  asse: Asse
}

export interface Orbita {
  id: string
  famiglia: Famiglia
  nome: string
  asse: Asse // asse attorno a cui gira lo strato
  strato: number // coordinata dello strato lungo `asse`
  verso: Verso // verso della rotazione 3D che fa avanzare le caselle
  orario: Verso // direzione della mossa che a schermo è indicata con ↻
  caselle: number[] // 12 indici di adesivo, nell'ordine dell'orbita
}

export interface Mossa {
  orbita: Orbita
  direzione: Verso // +1: ogni casella avanza di 3 posti
}

export const DURATA_MOSSA = 300 // ms

const COORDINATE = [-1, 0, 1]
const ASSI: Asse[] = [0, 1, 2]

export const adesivi: Adesivo[] = []
for (const x of COORDINATE)
  for (const y of COORDINATE)
    for (const z of COORDINATE)
      for (const asse of ASSI) {
        const posizione: Vettore = [x, y, z]
        if (posizione[asse] !== 0) adesivi.push({ posizione, asse })
      }

const chiave = (posizione: Vettore, asse: Asse) => `${posizione}|${asse}`
const indici = new Map(adesivi.map((a, i) => [chiave(a.posizione, a.asse), i]))

export function indiceDi(posizione: Vettore, asse: Asse): number {
  const indice = indici.get(chiave(posizione, asse))
  if (indice === undefined) throw new Error(`Adesivo inesistente: ${chiave(posizione, asse)}`)
  return indice
}

// Colore di ogni faccia a cubo ordinato: [asse][lato negativo, lato positivo]
const COLORI_FACCE: [Colore, Colore][] = [
  ['r', 'a'], // sinistra, destra
  ['b', 'm'], // sotto, sopra
  ['v', 't'], // dietro, davanti
]

export const cuboOrdinato: Colore[] = adesivi.map(
  ({ posizione, asse }) => COLORI_FACCE[asse][posizione[asse] > 0 ? 1 : 0],
)

// Quarto di giro attorno a `asse` (regola della mano destra per verso = +1)
function ruotaAdesivo({ posizione, asse: asseAdesivo }: Adesivo, asse: Asse, verso: Verso): Adesivo {
  const b = ((asse + 1) % 3) as Asse
  const c = ((asse + 2) % 3) as Asse
  const ruotata: Vettore = [...posizione]
  ruotata[b] = -verso * posizione[c]
  ruotata[c] = verso * posizione[b]
  return {
    posizione: ruotata,
    asse: asseAdesivo === b ? c : asseAdesivo === c ? b : asseAdesivo,
  }
}

interface DefinizioneFamiglia {
  famiglia: Famiglia
  asse: Asse
  verso: Verso
  facciaPartenza: Asse // le caselle 1-3 stanno sul lato positivo di questo asse
  scorrimento: Asse // asse lungo cui si susseguono le caselle 1-3
  versoScorrimento: Verso // +1: le caselle 1-3 vanno da -1 a +1 lungo `scorrimento`
  orario: Verso
  strati: [nome: string, strato: number][]
}

// Stesso ordine di caselle di constants/orbite.ts:
//   y: sopra → davanti → sotto → dietro
//   x: davanti → sinistra → dietro → destra
//   z: sopra → sinistra → sotto → destra (left = strato davanti)
const FAMIGLIE: DefinizioneFamiglia[] = [
  {
    famiglia: 'y',
    asse: 0,
    verso: 1,
    facciaPartenza: 1,
    scorrimento: 2,
    versoScorrimento: 1,
    orario: -1,
    strati: [['left', -1], ['center', 0], ['right', 1]],
  },
  {
    famiglia: 'x',
    asse: 1,
    verso: -1,
    facciaPartenza: 2,
    scorrimento: 0,
    versoScorrimento: -1,
    orario: 1,
    strati: [['top', 1], ['center', 0], ['bottom', -1]],
  },
  {
    famiglia: 'z',
    asse: 2,
    verso: 1,
    facciaPartenza: 1,
    scorrimento: 0,
    versoScorrimento: -1,
    orario: -1,
    strati: [['left', 1], ['center', 0], ['right', -1]],
  },
]

function creaOrbita(def: DefinizioneFamiglia, nome: string, strato: number): Orbita {
  let terna: Adesivo[] = COORDINATE.map((k) => {
    const posizione: Vettore = [0, 0, 0]
    posizione[def.asse] = strato
    posizione[def.facciaPartenza] = 1
    posizione[def.scorrimento] = k * def.versoScorrimento
    return { posizione, asse: def.facciaPartenza }
  })
  const caselle: number[] = []
  for (let quarto = 0; quarto < 4; quarto++) {
    caselle.push(...terna.map((a) => indiceDi(a.posizione, a.asse)))
    terna = terna.map((a) => ruotaAdesivo(a, def.asse, def.verso))
  }
  return {
    id: `${def.famiglia}-${nome}`,
    famiglia: def.famiglia,
    nome,
    asse: def.asse,
    strato,
    verso: def.verso,
    orario: def.orario,
    caselle,
  }
}

export const orbite: Orbita[] = FAMIGLIE.flatMap((def) =>
  def.strati.map(([nome, strato]) => creaOrbita(def, nome, strato)),
)

// Vero se l'adesivo sta nello strato che l'orbita fa girare
export function nelloStrato(indice: number, orbita: Orbita): boolean {
  return adesivi[indice].posizione[orbita.asse] === orbita.strato
}

// Freccia con cui la mossa è indicata a schermo
export function freccia({ orbita, direzione }: Mossa): string {
  return direzione === orbita.orario ? '↻' : '↺'
}

export function coloriOrbita(cubo: Colore[], orbita: Orbita): Colore[] {
  return orbita.caselle.map((indice) => cubo[indice])
}

// Per ogni adesivo dello strato dell'orbita: [indice di partenza, indice di arrivo]
export function spostamenti({ orbita, direzione }: Mossa): [da: number, a: number][] {
  const verso = (orbita.verso * direzione) as Verso
  const coppie: [number, number][] = []
  adesivi.forEach((adesivo, indice) => {
    if (adesivo.posizione[orbita.asse] !== orbita.strato) return
    const arrivo = ruotaAdesivo(adesivo, orbita.asse, verso)
    coppie.push([indice, indiceDi(arrivo.posizione, arrivo.asse)])
  })
  return coppie
}

// Sposta tutti gli adesivi dello strato dell'orbita di un quarto di giro
export function ruota(cubo: Colore[], mossa: Mossa): Colore[] {
  const nuovo = [...cubo]
  for (const [da, a] of spostamenti(mossa)) nuovo[a] = cubo[da]
  return nuovo
}

export function mescola(cubo: Colore[], mosse = 25): Colore[] {
  let mescolato = cubo
  for (let i = 0; i < mosse; i++) {
    const orbita = orbite[Math.floor(Math.random() * orbite.length)]
    mescolato = ruota(mescolato, { orbita, direzione: Math.random() < 0.5 ? 1 : -1 })
  }
  return mescolato
}
