import { adesivi, cuboOrdinato, orbite, ruota, type Colore, type Mossa } from '../modello/cubo.ts'
import { testoMossa } from '../modello/sequenza.ts'
import { contaColori, daNotazione, inCaselle, orienta, type Passo } from './notazione.ts'
import type { RichiestaEsatta, RispostaEsatta } from './orbite.worker.ts'
import type { Richiesta, Risposta } from './risolutore.worker.ts'

// Oltre questi quarti di giro la ricerca esatta sulle orbite diventa troppo lenta
const MASSIMO_ESATTA = 9

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

let workerEsatta: Worker | null = null

// Mosse più corte sulle 9 orbite da `partenza` ad `arrivo`, null se ne servono più di `massimo`
function chiediEsatta(richiesta: RichiestaEsatta): Promise<Mossa[] | null> {
  workerEsatta ??= new Worker(new URL('./orbite.worker.ts', import.meta.url), { type: 'module' })
  const attivo = workerEsatta
  return new Promise((risolvi, rifiuta) => {
    attivo.onmessage = ({ data }: MessageEvent<RispostaEsatta>) =>
      risolvi(data && data.map(({ orbita, direzione }) => ({ orbita: orbite.find((o) => o.id === orbita)!, direzione })))
    attivo.onerror = () => rifiuta(new Error('La ricerca sulle orbite non è riuscita a partire.'))
    attivo.postMessage(richiesta)
  })
}

// Due quarti di giro uguali di fila diventano un solo passo ×2
function inPassiDoppi(mosse: Mossa[]): Passo[] {
  const passi: Passo[] = []
  for (const mossa of mosse) {
    const ultimo = passi.at(-1)
    const [prima] = ultimo?.mosse ?? []
    if (ultimo?.mosse.length === 1 && prima.orbita === mossa.orbita && prima.direzione === mossa.direzione) {
      ultimo.mosse.push(mossa)
      ultimo.testo += ' ×2'
    } else passi.push({ testo: testoMossa(mossa), mosse: [mossa] })
  }
  return passi
}

export const quarti = (passi: Passo[]) => passi.reduce((totale, passo) => totale + passo.mosse.length, 0)

// Il cubo da dare a cubejs: quello che va ordinato perché `partenza` arrivi in `arrivo`
const daOrdinare = (partenza: Colore[], arrivo: Colore[]) =>
  ordinato(arrivo) ? partenza : ricolora(partenza, arrivo)

// minima: nessuna soluzione ha meno quarti di giro sulle orbite
export interface Soluzione {
  passi: Passo[]
  minima: boolean
}

// Passi che portano `partenza` in `arrivo` (di solito il cubo ordinato). Se bastano pochi quarti di giro
// la ricerca esatta sulle orbite trova la più corta; altrimenti si usa cubejs, che gira solo le facce esterne.
export async function risolvi(partenza: Colore[], arrivo: Colore[] = cuboOrdinato): Promise<Soluzione> {
  const { giri, orientato } = preparaCubo(daOrdinare(partenza, arrivo))
  const esatta = await chiediEsatta({ partenza, arrivo, massimo: MASSIMO_ESATTA })
  if (esatta) return { passi: inPassiDoppi(esatta), minima: true }
  if (ordinato(orientato)) return { passi: giri, minima: false }
  return { passi: [...giri, ...daNotazione((await chiediAlWorker({ caselle: inCaselle(orientato) }))!)], minima: false }
}

// Prima la ricerca esatta sotto i quarti di giro attuali; se non basta, chiede a cubejs soluzioni con sempre
// meno mosse di faccia finché ne trova o finché non scade il tempo, e tiene quella con meno quarti di giro.
export async function cercaPiuCorta(
  partenza: Colore[],
  arrivo: Colore[],
  attuale: Passo[],
  durata: number,
): Promise<Soluzione> {
  const fine = Date.now() + durata
  const { giri, orientato } = preparaCubo(daOrdinare(partenza, arrivo))
  const massimo = Math.min(MASSIMO_ESATTA, quarti(attuale) - 1)
  const esatta = await chiediEsatta({ partenza, arrivo, massimo })
  if (esatta) return { passi: inPassiDoppi(esatta), minima: true }
  if (massimo < MASSIMO_ESATTA) return { passi: attuale, minima: true }
  const caselle = inCaselle(orientato)
  let migliore = attuale
  let candidata = attuale
  while (candidata.length - giri.length > 1) {
    const resto = fine - Date.now()
    if (resto <= 0) break
    const mosse = await chiediAlWorker({ caselle, massimo: candidata.length - giri.length - 1 }, resto)
    if (mosse === null) break
    candidata = [...giri, ...daNotazione(mosse)]
    if (quarti(candidata) < quarti(migliore)) migliore = candidata
  }
  return { passi: migliore, minima: false }
}

// Ferma la ricerca in corso: cercaPiuCorta risponde con la migliore trovata fin lì
export function interrompiRicerca(): void {
  interrompi?.()
}

// Pezzi del cubo: gli indici degli adesivi di ogni cubetto (1 centro, 2 spigolo, 3 angolo)
const cubetti = new Map<string, number[]>()
adesivi.forEach(({ posizione }, indice) => {
  const chiave = posizione.join()
  cubetti.set(chiave, [...(cubetti.get(chiave) ?? []), indice])
})
const pezzi = [...cubetti.values()]

const chiavePezzo = (cubo: Colore[], pezzo: number[]) =>
  pezzo
    .map((indice) => cubo[indice])
    .sort()
    .join('')

// Ricolora `partenza` in modo che `arrivo` diventi il cubo ordinato: ogni adesivo prende il colore che,
// a cubo ordinato, sta nella casella dove quello stesso adesivo si trova in `arrivo`.
// Le mosse che ordinano il cubo ricolorato portano quindi `partenza` in `arrivo`.
function ricolora(partenza: Colore[], arrivo: Colore[]): Colore[] {
  const IRREALE = 'Il primo cubo non è un cubo reale: ogni pezzo deve comparire una volta sola, con colori diversi.'
  if (Object.values(contaColori(arrivo)).some((quanti) => quanti !== 9))
    throw new Error('Primo cubo: ogni colore deve comparire esattamente 9 volte.')
  if (Object.values(contaColori(partenza)).some((quanti) => quanti !== 9))
    throw new Error('Secondo cubo: ogni colore deve comparire esattamente 9 volte.')
  const posti = new Map<string, number[]>()
  for (const pezzo of pezzi) {
    const chiave = chiavePezzo(arrivo, pezzo)
    if (posti.has(chiave) || new Set(chiave).size !== chiave.length) throw new Error(IRREALE)
    posti.set(chiave, pezzo)
  }
  const ricolorato = [...partenza]
  for (const pezzo of pezzi) {
    const posto = posti.get(chiavePezzo(partenza, pezzo))
    if (!posto) throw new Error('I due cubi non hanno gli stessi pezzi: controlla i colori copiati.')
    for (const indice of pezzo) {
      const corrispondente = posto.find((i) => arrivo[i] === partenza[indice])!
      ricolorato[indice] = cuboOrdinato[corrispondente]
    }
  }
  return ricolorato
}
