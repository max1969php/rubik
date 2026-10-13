import { colori } from '../constants/colori.ts'
import { cuboOrdinato, orbite, ruota, type Colore, type Mossa } from '../modello/cubo.ts'
import type { Sequenza } from '../modello/sequenza.ts'

const CHIAVE = 'rubik-orbit-sequenze'
const FORMATO = 'rubik-orbit-sequenze'
const VERSIONE = 1
const NOME_FILE = 'rubik-orbit-sequenze.json'

// Nel file i cubi sono 54 lettere colore e le mosse { orbita: 'y-left', direzione: 1 | -1 }
export function codifica(sequenze: Sequenza[]): string {
  const dati = {
    formato: FORMATO,
    versione: VERSIONE,
    sequenze: sequenze.map(({ id, nome, iniziale, finale, mosse }) => ({
      id,
      nome,
      iniziale: iniziale.join(''),
      finale: finale.join(''),
      mosse: mosse.map(({ orbita, direzione }) => ({ orbita: orbita.id, direzione })),
    })),
  }
  return JSON.stringify(dati, null, 2)
}

function decodificaCubo(testo: unknown): Colore[] {
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

function decodificaSequenza(dato: unknown): Sequenza {
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

// Rifiuta con un messaggio leggibile se il testo non è un file di sequenze
export function decodifica(testo: string): Sequenza[] {
  let dati: unknown
  try {
    dati = JSON.parse(testo)
  } catch {
    throw new Error('Il file non è un JSON valido.')
  }
  const { formato, sequenze } = (dati ?? {}) as Record<string, unknown>
  if (formato !== FORMATO || !Array.isArray(sequenze)) throw new Error('Il file non contiene sequenze di Rubik Orbit.')
  try {
    return sequenze.map(decodificaSequenza)
  } catch (problema) {
    throw new Error(`File di sequenze danneggiato: ${problema instanceof Error ? problema.message : problema}.`)
  }
}

export function leggiSequenze(): Sequenza[] {
  try {
    return decodifica(localStorage.getItem(CHIAVE) ?? '')
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

export function scaricaSequenze(sequenze: Sequenza[]): void {
  const indirizzo = URL.createObjectURL(new Blob([codifica(sequenze)], { type: 'application/json' }))
  const collegamento = document.createElement('a')
  collegamento.href = indirizzo
  collegamento.download = NOME_FILE
  collegamento.click()
  URL.revokeObjectURL(indirizzo)
}

// Le sequenze del file sostituiscono quelle con lo stesso id e si aggiungono alle altre
export function unisci(presenti: Sequenza[], caricate: Sequenza[]): Sequenza[] {
  const nuove = new Map(caricate.map((sequenza) => [sequenza.id, sequenza]))
  const aggiornate = presenti.map((sequenza) => {
    const sostituta = nuove.get(sequenza.id)
    nuove.delete(sequenza.id)
    return sostituta ?? sequenza
  })
  return [...aggiornate, ...nuove.values()]
}
