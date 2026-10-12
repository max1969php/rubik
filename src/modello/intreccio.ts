import { adesivi, orbite, spostamenti, type Asse, type Mossa, type Orbita } from './cubo.ts'

// Disposizione piana del cubo: ogni orbita è un cerchio e ogni adesivo è
// l'incrocio delle sue due orbite. Le tre famiglie hanno i centri ai vertici
// di un triangolo; le facce davanti/sopra/destra cadono sui tre centri,
// quelle opposte all'esterno.

export type Punto = [number, number]

const DISTANZA_CENTRI = 100 // dal centro del disegno
const RAGGIO_MEDIO = DISTANZA_CENTRI * Math.sqrt(3) // il cerchio centrale passa per gli altri due centri
const PASSO_RAGGIO = 30

export const SEMILATO_DISEGNO = 340
export const RAGGIO_ADESIVO = 11

// Centro dei cerchi per asse di rotazione (y dello schermo verso il basso)
const CENTRI: Punto[] = [
  [0, -DISTANZA_CENTRI], // asse x (famiglia y): in alto
  [-DISTANZA_CENTRI * Math.cos(Math.PI / 6), DISTANZA_CENTRI / 2], // asse y (famiglia x): in basso a sinistra
  [DISTANZA_CENTRI * Math.cos(Math.PI / 6), DISTANZA_CENTRI / 2], // asse z (famiglia z): in basso a destra
]

export const centroOrbita = (orbita: Orbita): Punto => CENTRI[orbita.asse]

// Lo strato +1 è il cerchio più interno
const raggioStrato = (strato: number) => RAGGIO_MEDIO - strato * PASSO_RAGGIO
export const raggioOrbita = (orbita: Orbita) => raggioStrato(orbita.strato)

// Nome di ogni famiglia, appena fuori dal suo cerchio più grande
const DISTANZA_ETICHETTA = DISTANZA_CENTRI + raggioStrato(-1) + 18
export const etichetteFamiglie = orbite
  .filter((orbita) => orbita.strato === 0)
  .map((orbita) => ({
    famiglia: orbita.famiglia,
    punto: CENTRI[orbita.asse].map((v) => (v / DISTANZA_CENTRI) * DISTANZA_ETICHETTA) as Punto,
  }))

const distanza = (p: Punto, q: Punto) => Math.hypot(p[0] - q[0], p[1] - q[1])
const angolo = (p: Punto, centro: Punto) => Math.atan2(p[1] - centro[1], p[0] - centro[0])
const polare = (centro: Punto, raggio: number, a: number): Punto => [
  centro[0] + raggio * Math.cos(a),
  centro[1] + raggio * Math.sin(a),
]
const GIRO = 2 * Math.PI
const positivo = (a: number) => ((a % GIRO) + GIRO) % GIRO

function incroci(c1: Punto, r1: number, c2: Punto, r2: number): [Punto, Punto] {
  const d = distanza(c1, c2)
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(r1 * r1 - a * a)
  const ux = (c2[0] - c1[0]) / d
  const uy = (c2[1] - c1[1]) / d
  const mx = c1[0] + a * ux
  const my = c1[1] + a * uy
  return [
    [mx - h * uy, my + h * ux],
    [mx + h * uy, my - h * ux],
  ]
}

// Posizione a riposo di ogni adesivo
export const punti: Punto[] = adesivi.map(({ posizione, asse }) => {
  const b = ((asse + 1) % 3) as Asse
  const c = ((asse + 2) % 3) as Asse
  const [p, q] = incroci(CENTRI[b], raggioStrato(posizione[b]), CENTRI[c], raggioStrato(posizione[c]))
  const pVicino = distanza(p, CENTRI[asse]) < distanza(q, CENTRI[asse])
  // Lato positivo della faccia: l'incrocio vicino al centro della terza famiglia
  return pVicino === posizione[asse] > 0 ? p : q
})

// Senso (+1 = angoli crescenti) in cui le caselle avanzano lungo il cerchio
const sensi = new Map<Orbita, 1 | -1>(
  orbite.map((orbita) => {
    const centro = centroOrbita(orbita)
    const [a0, a3, a6] = [0, 3, 6].map((k) => angolo(punti[orbita.caselle[k]], centro))
    return [orbita, positivo(a3 - a0) + positivo(a6 - a3) < GIRO ? 1 : -1]
  }),
)

// Centro di una faccia esterna: il punto dell'adesivo centrale
function centroFaccia(asse: Asse, strato: number): Punto {
  const indice = adesivi.findIndex(
    (a) => a.asse === asse && a.posizione.every((v, i) => (i === asse ? v === strato : v === 0)),
  )
  return punti[indice]
}

// Posizioni durante una mossa: avanzamento t da 0 a 1
export function puntiInMossa(mossa: Mossa, t: number): Punto[] {
  const { orbita, direzione } = mossa
  const centro = centroOrbita(orbita)
  const senso = sensi.get(orbita)! * direzione
  const correnti = [...punti]
  for (const [da, a] of spostamenti(mossa)) {
    if (da === a) continue
    if (adesivi[da].asse !== orbita.asse) {
      // Adesivo sul cerchio dell'orbita: scorre lungo il cerchio
      const partenza = angolo(punti[da], centro)
      const arco = positivo(senso * (angolo(punti[a], centro) - partenza))
      correnti[da] = polare(centro, raggioOrbita(orbita), partenza + senso * arco * t)
    } else {
      // Adesivo della faccia esterna: gira attorno al centro della faccia
      const perno = centroFaccia(orbita.asse, orbita.strato)
      const partenza = angolo(punti[da], perno)
      let arco = positivo(angolo(punti[a], perno) - partenza)
      if (arco > Math.PI) arco -= GIRO
      const raggio = distanza(punti[da], perno) * (1 - t) + distanza(punti[a], perno) * t
      correnti[da] = polare(perno, raggio, partenza + arco * t)
    }
  }
  return correnti
}
