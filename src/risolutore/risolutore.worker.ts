import type CubeTipo from 'cubejs'
import sorgenteCubo from 'cubejs/lib/cube.js?raw'
import sorgenteRisolutore from 'cubejs/lib/solve.js?raw'

// cubejs si aggancia al `this` globale, che in un modulo ES non esiste: il
// bundler lo lascia undefined e la libreria non parte. I due file vengono
// quindi eseguiti così come sono, con un oggetto nostro al posto di `this`.
const ambito = {} as { Cube: typeof CubeTipo }
new Function(sorgenteCubo).call(ambito)
new Function(sorgenteRisolutore).call(ambito)
const Cube = ambito.Cube
type Cube = CubeTipo

// Con `massimo` si chiede una soluzione di al più tante mosse di faccia
export interface Richiesta {
  caselle: string
  massimo?: number
}

export type Risposta = { mosse: string } | { nessuna: true } | { errore: string }

const IMPOSSIBILE = 'Questa disposizione non esiste su un cubo reale: controlla i colori copiati.'

const somma = (valori: number[]) => valori.reduce((a, b) => a + b, 0)

function scambiPari(permutazione: number[]): boolean {
  let inversioni = 0
  for (let i = 0; i < permutazione.length; i++)
    for (let j = i + 1; j < permutazione.length; j++) if (permutazione[i] > permutazione[j]) inversioni++
  return inversioni % 2 === 0
}

// Un cubo smontato e rimontato male ha i pezzi giusti ma non è risolvibile
function risolvibile(cubo: Cube): boolean {
  return somma(cubo.co) % 3 === 0 && somma(cubo.eo) % 2 === 0 && scambiPari(cubo.cp) === scambiPari(cubo.ep)
}

// cubejs, se entro il massimo non trova nulla, si interrompe con un errore
function cerca(cubo: Cube, massimo?: number): Risposta {
  if (massimo === undefined) return { mosse: cubo.solveUpright() }
  try {
    return { mosse: cubo.solveUpright(massimo) }
  } catch {
    return { nessuna: true }
  }
}

let tabellePronte = false

self.onmessage = ({ data: { caselle, massimo } }: MessageEvent<Richiesta>) => {
  let risposta: Risposta
  try {
    const cubo = Cube.fromString(caselle)
    // Se rileggendolo non torna uguale, qualche pezzo non esiste (es. spigolo con due colori opposti)
    if (cubo.asString() !== caselle || !risolvibile(cubo)) {
      risposta = { errore: IMPOSSIBILE }
    } else {
      if (!tabellePronte) {
        Cube.initSolver()
        tabellePronte = true
      }
      risposta = cerca(cubo, massimo)
    }
  } catch {
    risposta = { errore: IMPOSSIBILE }
  }
  self.postMessage(risposta)
}
