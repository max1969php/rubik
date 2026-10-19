import type { Colore } from '../modello/cubo.ts'
import { cercaEsatta } from './orbite.ts'

export interface RichiestaEsatta {
  partenza: Colore[]
  arrivo: Colore[]
  massimo: number
}

// Le mosse tornano come { orbita: id, direzione }: le orbite non sopravvivono al passaggio fra thread
export type RispostaEsatta = { orbita: string; direzione: 1 | -1 }[] | null

self.onmessage = ({ data: { partenza, arrivo, massimo } }: MessageEvent<RichiestaEsatta>) => {
  const mosse = cercaEsatta(partenza, arrivo, massimo)
  const risposta: RispostaEsatta = mosse && mosse.map(({ orbita, direzione }) => ({ orbita: orbita.id, direzione }))
  self.postMessage(risposta)
}
