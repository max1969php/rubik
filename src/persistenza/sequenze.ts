import { colori } from '../constants/colori.ts'
import { cuboOrdinato, orbite, ruota, type Colore, type Mossa } from '../modello/cubo.ts'
import type { Sequenza } from '../modello/sequenza.ts'

const CHIAVE = 'rubik-orbit-sequenze'
// Formato del localStorage, e dei vecchi file che contenevano solo le sequenze
export const FORMATO_SEQUENZE = 'rubik-orbit-sequenze'
const VERSIONE = 1

// I cubi sono 54 lettere colore e le mosse { orbita: 'y-left', direzione: 1 | -1 }
export function sequenzaInDati({ id, nome, iniziale, finale, mosse }: Sequenza) {
  return {
    id,
    nome,
    iniziale: iniziale.join(''),
    finale: finale.join(''),
    mosse: mosse.map(({ orbita, direzione }) => ({ orbita: orbita.id, direzione })),
  }
}

function codifica(sequenze: Sequenza[]): string {
  return JSON.stringify({ formato: FORMATO_SEQUENZE, versione: VERSIONE, sequenze: sequenze.map(sequenzaInDati) })
}

export function decodificaCubo(testo: unknown): Colore[] {
  const lettere = typeof testo === 'string' ? [...testo] : []
  if (lettere.length !== cuboOrdinato.length || !lettere.every((l) => l in colori))
    throw new Error('stato del cubo non valido')
  return lettere as Colore[]
}

function decodificaMossa(dato: unknown): Mossa {
  const { orbita: id, direzione } = (dato ?? {}) as Record<string, unknown>
  const orbita = orbite.find((o) => o.id === id)
  if (!orbita || (direzione !== 1 && direzione !== -1)) throw new Error('mossa non valida')
  return { orbita, direzione }
}

export function decodificaSequenza(dato: unknown): Sequenza {
  const { id, nome, iniziale, finale, mosse } = (dato ?? {}) as Record<string, unknown>
  if (typeof id !== 'string' || typeof nome !== 'string' || !Array.isArray(mosse))
    throw new Error('sequenza non valida')
  const sequenza = {
    id,
    nome,
    iniziale: decodificaCubo(iniziale),
    finale: decodificaCubo(finale),
    mosse: mosse.map(decodificaMossa),
  }
  const arrivo = sequenza.mosse.reduce(ruota, sequenza.iniziale)
  if (arrivo.some((colore, i) => colore !== sequenza.finale[i]))
    throw new Error(`le mosse di «${nome}» non portano allo stato finale indicato`)
  return sequenza
}

export function leggiSequenze(): Sequenza[] {
  try {
    const { formato, sequenze } = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}')
    return formato === FORMATO_SEQUENZE && Array.isArray(sequenze) ? sequenze.map(decodificaSequenza) : []
  } catch {
    return []
  }
}

export function salvaSequenze(sequenze: Sequenza[]): void {
  try {
    localStorage.setItem(CHIAVE, codifica(sequenze))
  } catch {
    // Senza localStorage le sequenze restano solo in memoria: c'è comunque il file da scaricare
  }
}
