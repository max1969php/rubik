import { colori } from '../constants/colori.ts'
import { cuboOrdinato, type Colore } from '../modello/cubo.ts'

export interface StatoConfronto {
  primo: Colore[]
  secondo: Colore[]
}

const CHIAVE = 'rubik-orbit-confronto'

function decodificaCubo(testo: unknown): Colore[] {
  const lettere = typeof testo === 'string' ? [...testo] : []
  const valido = lettere.length === cuboOrdinato.length && lettere.every((l) => l in colori)
  return valido ? (lettere as Colore[]) : cuboOrdinato
}

// I due cubi della pagina Confronto, come 54 lettere colore ciascuno
export function leggiConfronto(): StatoConfronto {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}')
    return { primo: decodificaCubo(dati.primo), secondo: decodificaCubo(dati.secondo) }
  } catch {
    return { primo: cuboOrdinato, secondo: cuboOrdinato }
  }
}

export function salvaConfronto({ primo, secondo }: StatoConfronto): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({ primo: primo.join(''), secondo: secondo.join('') }))
  } catch {
    // Senza spazio di archiviazione i cubi restano solo finché la pagina è aperta
  }
}
