import type { Sequenza } from '../modello/sequenza.ts'
import { decodificaDisposizione, disposizioneInDati, type Disposizione } from './disposizioni.ts'
import { decodificaSequenza, FORMATO_SEQUENZE, sequenzaInDati } from './sequenze.ts'

// Un solo file con tutto quello che si salva: sequenze e disposizioni
export interface Archivio {
  sequenze: Sequenza[]
  disposizioni: Disposizione[]
}

const FORMATO = 'rubik-orbit'
const VERSIONE = 2
const NOME_FILE = 'rubik-orbit.json'

export function codifica({ sequenze, disposizioni }: Archivio): string {
  const dati = {
    formato: FORMATO,
    versione: VERSIONE,
    sequenze: sequenze.map(sequenzaInDati),
    disposizioni: disposizioni.map(disposizioneInDati),
  }
  return JSON.stringify(dati, null, 2)
}

// Rifiuta con un messaggio leggibile se il testo non è un file di Rubik Orbit.
// Legge anche i vecchi file con le sole sequenze.
export function decodifica(testo: string): Archivio {
  let dati: unknown
  try {
    dati = JSON.parse(testo)
  } catch {
    throw new Error('Il file non è un JSON valido.')
  }
  const { formato, sequenze, disposizioni = [] } = (dati ?? {}) as Record<string, unknown>
  if ((formato !== FORMATO && formato !== FORMATO_SEQUENZE) || !Array.isArray(sequenze) || !Array.isArray(disposizioni))
    throw new Error('Il file non è un file di Rubik Orbit.')
  try {
    return { sequenze: sequenze.map(decodificaSequenza), disposizioni: disposizioni.map(decodificaDisposizione) }
  } catch (problema) {
    throw new Error(`File danneggiato: ${problema instanceof Error ? problema.message : problema}.`)
  }
}

export function scarica(archivio: Archivio): void {
  const indirizzo = URL.createObjectURL(new Blob([codifica(archivio)], { type: 'application/json' }))
  const collegamento = document.createElement('a')
  collegamento.href = indirizzo
  collegamento.download = NOME_FILE
  collegamento.click()
  URL.revokeObjectURL(indirizzo)
}

// Le voci del file sostituiscono quelle con lo stesso id e si aggiungono alle altre
export function unisci<T extends { id: string }>(presenti: T[], caricate: T[]): T[] {
  const nuove = new Map(caricate.map((voce) => [voce.id, voce]))
  const aggiornate = presenti.map((voce) => {
    const sostituta = nuove.get(voce.id)
    nuove.delete(voce.id)
    return sostituta ?? voce
  })
  return [...aggiornate, ...nuove.values()]
}
