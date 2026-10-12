import { cuboOrdinato, ruota, type Colore } from '../modello/cubo.ts'
import { contaColori, daNotazione, inCaselle, orienta, type Passo } from './notazione.ts'
import type { Risposta } from './risolutore.worker.ts'

let worker: Worker | null = null

function chiediAlWorker(caselle: string): Promise<string> {
  worker ??= new Worker(new URL('./risolutore.worker.ts', import.meta.url), { type: 'module' })
  const attivo = worker
  return new Promise((risolvi, rifiuta) => {
    attivo.onmessage = ({ data }: MessageEvent<Risposta>) => {
      if ('errore' in data) rifiuta(new Error(data.errore))
      else risolvi(data.mosse)
    }
    attivo.onerror = () => rifiuta(new Error('Il risolutore non è riuscito a partire.'))
    attivo.postMessage(caselle)
  })
}

// Passi che riportano il cubo allo stato ordinato. Rifiuta con un messaggio
// leggibile se la disposizione non è quella di un cubo reale.
export async function risolvi(cubo: Colore[]): Promise<Passo[]> {
  if (Object.values(contaColori(cubo)).some((quanti) => quanti !== 9))
    throw new Error('Ogni colore deve comparire esattamente 9 volte.')
  const giri = orienta(cubo)
  if (!giri) throw new Error('I sei centri devono avere sei colori diversi, con gli opposti al loro posto.')
  const orientato = giri.flatMap((passo) => passo.mosse).reduce(ruota, cubo)
  if (orientato.every((colore, i) => colore === cuboOrdinato[i])) return giri
  return [...giri, ...daNotazione(await chiediAlWorker(inCaselle(orientato)))]
}
