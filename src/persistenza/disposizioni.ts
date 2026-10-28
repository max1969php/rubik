import type { Colore } from '../modello/cubo.ts'
import { decodificaCubo } from './sequenze.ts'

// Una disposizione del cubo salvata con un nome, da usare come cubo di partenza
export interface Disposizione {
  id: string
  nome: string
  cubo: Colore[]
}

const CHIAVE = 'rubik-orbit-disposizioni'

// Il cubo è 54 lettere colore
export function disposizioneInDati({ id, nome, cubo }: Disposizione) {
  return { id, nome, cubo: cubo.join('') }
}

export function decodificaDisposizione(dato: unknown): Disposizione {
  const { id, nome, cubo } = (dato ?? {}) as Record<string, unknown>
  if (typeof id !== 'string' || typeof nome !== 'string') throw new Error('disposizione non valida')
  return { id, nome, cubo: decodificaCubo(cubo) }
}

// Le voci danneggiate si saltano
export function leggiDisposizioni(): Disposizione[] {
  try {
    const dati: unknown = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]')
    if (!Array.isArray(dati)) return []
    return dati.flatMap((dato) => {
      try {
        return [decodificaDisposizione(dato)]
      } catch {
        return []
      }
    })
  } catch {
    return []
  }
}

export function salvaDisposizioni(disposizioni: Disposizione[]): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(disposizioni.map(disposizioneInDati)))
  } catch {
    // Senza localStorage le disposizioni restano solo in memoria: c'è comunque il file da scaricare
  }
}
