import { colori } from '../constants/colori.ts'
import { cuboOrdinato, type Colore, type Vettore } from '../modello/cubo.ts'

export interface Scena {
  cubo: Colore[]
  camera: Vettore
}

const NOME = 'rubik-orbit'
const VERSIONE = '2'
const DURATA = 60 * 60 * 24 * 365 // secondi

export const CAMERA_PREDEFINITA: Vettore = [5, 4.5, 7]

// Formato: versione~54 lettere colore~x_y_z della camera.
// Solo caratteri ammessi nei cookie, quindi niente encodeURIComponent.
function codifica({ cubo, camera }: Scena): string {
  return [VERSIONE, cubo.join(''), camera.map((n) => n.toFixed(2)).join('_')].join('~')
}

function decodificaCubo(testo: string | undefined): Colore[] {
  const lettere = [...(testo ?? '')]
  const valido = lettere.length === cuboOrdinato.length && lettere.every((l) => l in colori)
  return valido ? (lettere as Colore[]) : cuboOrdinato
}

function decodificaCamera(testo: string | undefined): Vettore {
  const numeri = (testo ?? '').split('_').map(Number)
  const valida = numeri.length === 3 && numeri.every(Number.isFinite) && numeri.some((n) => n !== 0)
  return valida ? (numeri as Vettore) : CAMERA_PREDEFINITA
}

export function leggiScena(): Scena {
  const valore = document.cookie
    .split('; ')
    .find((voce) => voce.startsWith(`${NOME}=`))
    ?.slice(NOME.length + 1)
  const [versione, cubo, camera] = (valore ?? '').split('~')
  if (versione !== VERSIONE) return { cubo: cuboOrdinato, camera: CAMERA_PREDEFINITA }
  return { cubo: decodificaCubo(cubo), camera: decodificaCamera(camera) }
}

export function salvaScena(scena: Scena): void {
  document.cookie = `${NOME}=${codifica(scena)}; max-age=${DURATA}; path=/; SameSite=Lax`
}
