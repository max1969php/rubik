import { colori } from '../constants/colori.ts'
import { cuboOrdinato, type Colore } from '../modello/cubo.ts'

// Una disposizione del cubo salvata con un nome, da usare come cubo di partenza
export interface Disposizione {
  id: string
  nome: string
  cubo: Colore[]
}

const CHIAVE = 'rubik-orbit-disposizioni'

function decodificaCubo(testo: unknown): Colore[] | null {
  const lettere = typeof testo === 'string' ? [...testo] : []
  const valido = lettere.length === cuboOrdinato.length && lettere.every((l) => l in colori)
  return valido ? (lettere as Colore[]) : null
}

// Nel localStorage i cubi sono 54 lettere colore; le voci danneggiate si saltano
export function leggiDisposizioni(): Disposizione[] {
  try {
    const dati: unknown = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]')
    if (!Array.isArray(dati)) return []
    return dati.flatMap((dato) => {
      const { id, nome, cubo } = (dato ?? {}) as Record<string, unknown>
      const decodificato = decodificaCubo(cubo)
      return typeof id === 'string' && typeof nome === 'string' && decodificato
        ? [{ id, nome, cubo: decodificato }]
        : []
    })
  } catch {
    return []
  }
}

export function salvaDisposizioni(disposizioni: Disposizione[]): void {
  try {
    localStorage.setItem(
      CHIAVE,
      JSON.stringify(disposizioni.map(({ id, nome, cubo }) => ({ id, nome, cubo: cubo.join('') }))),
    )
  } catch {
    // Senza spazio di archiviazione le disposizioni restano solo finché la pagina è aperta
  }
}
