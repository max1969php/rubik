import type { Passo } from '../risolutore/notazione.ts'
import { freccia, ruota, type Colore, type Mossa, type Verso } from './cubo.ts'

// Mosse registrate a mano, con il cubo com'era prima e com'è dopo
export interface Sequenza {
  id: string
  nome: string
  iniziale: Colore[]
  finale: Colore[]
  mosse: Mossa[]
}

export function creaSequenza(nome: string, iniziale: Colore[], mosse: Mossa[]): Sequenza {
  return { id: crypto.randomUUID(), nome, iniziale, finale: mosse.reduce(ruota, iniziale), mosse }
}

export function inversa({ orbita, direzione }: Mossa): Mossa {
  return { orbita, direzione: -direzione as Verso }
}

// Mosse che riportano il cubo dallo stato finale a quello iniziale
export function rollback(mosse: Mossa[]): Mossa[] {
  return mosse.map(inversa).reverse()
}

export function testoMossa(mossa: Mossa): string {
  return `${mossa.orbita.famiglia} ${mossa.orbita.nome} ${freccia(mossa)}`
}

export function inPassi(mosse: Mossa[]): Passo[] {
  return mosse.map((mossa) => ({ testo: testoMossa(mossa), mosse: [mossa] }))
}
