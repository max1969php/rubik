import { cuboOrdinato, ruota, type Colore } from '../modello/cubo.ts'
import { contaColori, daNotazione, inCaselle, orienta, type Passo } from './notazione.ts'
import type { Richiesta, Risposta } from './risolutore.worker.ts'

let worker: Worker | null = null
let interrompi: (() => void) | null = null

// Risolve con le mosse trovate, null se entro il massimo non ce ne sono o se la ricerca è stata fermata
function chiediAlWorker(richiesta: Richiesta, durata?: number): Promise<string | null> {
  worker ??= new Worker(new URL('./risolutore.worker.ts', import.meta.url), { type: 'module' })
  const attivo = worker
  return new Promise((risolvi, rifiuta) => {
    // cubejs non si può fermare a metà: si butta via il worker (le tabelle andranno ricalcolate)
    const ferma = () => {
      clearTimeout(scadenza)
      interrompi = null
      attivo.terminate()
      if (worker === attivo) worker = null
      risolvi(null)
    }
    const scadenza = durata === undefined ? undefined : setTimeout(ferma, durata)
    interrompi = ferma
    attivo.onmessage = ({ data }: MessageEvent<Risposta>) => {
      clearTimeout(scadenza)
      interrompi = null
      if ('errore' in data) rifiuta(new Error(data.errore))
      else risolvi('mosse' in data ? data.mosse : null)
    }
    attivo.onerror = () => {
      clearTimeout(scadenza)
      interrompi = null
      rifiuta(new Error('Il risolutore non è riuscito a partire.'))
    }
    attivo.postMessage(richiesta)
  })
}

// Giri dell'intero cubo che rimettono a posto i centri, e il cubo che ne risulta.
// Rifiuta con un messaggio leggibile se la disposizione non è quella di un cubo reale.
function preparaCubo(cubo: Colore[]): { giri: Passo[]; orientato: Colore[] } {
  if (Object.values(contaColori(cubo)).some((quanti) => quanti !== 9))
    throw new Error('Ogni colore deve comparire esattamente 9 volte.')
  const giri = orienta(cubo)
  if (!giri) throw new Error('I sei centri devono avere sei colori diversi, con gli opposti al loro posto.')
  return { giri, orientato: giri.flatMap((passo) => passo.mosse).reduce(ruota, cubo) }
}

const ordinato = (cubo: Colore[]) => cubo.every((colore, i) => colore === cuboOrdinato[i])

// Passi che riportano il cubo allo stato ordinato
export async function risolvi(cubo: Colore[]): Promise<Passo[]> {
  const { giri, orientato } = preparaCubo(cubo)
  if (ordinato(orientato)) return giri
  return [...giri, ...daNotazione((await chiediAlWorker({ caselle: inCaselle(orientato) }))!)]
}

// Chiede soluzioni con sempre meno mosse di faccia finché ne trova o finché non scade il tempo.
// Il risolutore non garantisce la più corta in assoluto, ma con più tempo ci va molto vicino.
export async function cercaPiuCorta(cubo: Colore[], attuale: Passo[], durata: number): Promise<Passo[]> {
  const { giri, orientato } = preparaCubo(cubo)
  const caselle = inCaselle(orientato)
  const fine = Date.now() + durata
  let migliore = attuale
  while (migliore.length - giri.length > 1) {
    const resto = fine - Date.now()
    if (resto <= 0) break
    const mosse = await chiediAlWorker({ caselle, massimo: migliore.length - giri.length - 1 }, resto)
    if (mosse === null) break
    migliore = [...giri, ...daNotazione(mosse)]
  }
  return migliore
}

// Ferma la ricerca in corso: cercaPiuCorta risponde con la migliore trovata fin lì
export function interrompiRicerca(): void {
  interrompi?.()
}
