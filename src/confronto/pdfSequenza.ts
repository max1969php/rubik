import type { jsPDF } from 'jspdf'
import { colori } from '../constants/colori.ts'
import { adesivi, ruota, type Asse, type Colore, type Vettore } from '../modello/cubo.ts'
import type { Passo } from '../risolutore/notazione.ts'
import { quarti } from '../risolutore/risolvi.ts'

// Misure in mm su un A4 verticale
const LARGHEZZA = 210
const ALTEZZA = 297
const MARGINE = 14
const COLONNE = 2
const RIGHE = 4
const INIZIO_GRIGLIA = 34
const SCALA = 6.5 // mm per lato di cubetto
const LATO_ADESIVO = 0.84
const COLORE_CUBO = '#15151a'
const COLORE_ASSI = '#8c8a96'
const FINE_ASSE = 3.9
// Il disegno sporge più in alto (asse y) che in basso: lo si abbassa per centrarlo nella cella
const SPOSTAMENTO = ((FINE_ASSE + 0.6) * (2 / Math.sqrt(6)) * SCALA - 1.5 * Math.sqrt(6) * SCALA) / 2

// Vertice da cui si guarda: +1 quello dove si incontrano x, y e z positivi (si vedono destra, sopra e davanti),
// -1 quello opposto (sinistra, sotto e dietro). In entrambe le viste y sale sulla pagina.
export type Lato = 1 | -1

// Vista isometrica dal vertice `lato`: da +1, x scende verso destra e z verso sinistra, come nella vista 3D
export function proietta([x, y, z]: Vettore, lato: Lato): [number, number] {
  return [((lato * (x - z)) / Math.SQRT2) * SCALA, (-(-x + 2 * y - z) / Math.sqrt(6)) * SCALA]
}

function poligono(pdf: jsPDF, cx: number, cy: number, lato: Lato, punti: Vettore[], stile: 'F' | 'FD') {
  const piani = punti.map((punto) => proietta(punto, lato))
  const tratti = piani.slice(1).map(([u, v], i) => [u - piani[i][0], v - piani[i][1]])
  pdf.lines(tratti, cx + piani[0][0], cy + piani[0][1], [1, 1], stile, true)
}

const ASSI: Asse[] = [0, 1, 2]
export const S = 1.5 // metà del lato del cubo

// Quadrato sulla faccia `lato` di `asse`, centrato in `centro` (coordinate degli altri due assi), di lato 2·meta
function quadrato(asse: Asse, lato: Lato, centro: Vettore, meta: number): Vettore[] {
  const b = ((asse + 1) % 3) as Asse
  const c = ((asse + 2) % 3) as Asse
  return [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([db, dc]) => {
    const punto: Vettore = [...centro]
    punto[asse] = lato * S
    punto[b] += db * meta
    punto[c] += dc * meta
    return punto
  })
}

export function disegnaCubo(pdf: jsPDF, cubo: Colore[], cx: number, cy: number, lato: Lato) {
  // Il corpo nero: le tre facce visibili per intero
  pdf.setFillColor(COLORE_CUBO)
  for (const asse of ASSI) poligono(pdf, cx, cy, lato, quadrato(asse, lato, [0, 0, 0], S), 'F')

  pdf.setDrawColor(COLORE_CUBO)
  pdf.setLineWidth(0.2)
  adesivi.forEach(({ posizione, asse }, indice) => {
    if (posizione[asse] !== lato) return
    pdf.setFillColor(colori[cubo[indice]])
    poligono(pdf, cx, cy, lato, quadrato(asse, lato, posizione, LATO_ADESIVO / 2), 'FD')
  })

  // Assi positivi come nella vista 3D, con la lettera in fondo. Visti da un vertice puntano agli angoli del
  // contorno (a distanza 3 dal centro), quindi partono da lì per non finire sopra al cubo: dal vertice
  // opposto passano dietro al cubo e se ne vede solo la parte che sporge.
  pdf.setDrawColor(COLORE_ASSI)
  pdf.setFillColor(COLORE_ASSI)
  pdf.setTextColor(COLORE_ASSI)
  pdf.setLineWidth(0.3)
  pdf.setFontSize(8)
  for (const [asse, nome] of ['x', 'y', 'z'].entries()) {
    const lungo = (distanza: number) => {
      const punto: Vettore = [0, 0, 0]
      punto[asse] = distanza
      return proietta(punto, lato)
    }
    const [u1, v1] = lungo(3.2)
    const [u2, v2] = lungo(FINE_ASSE)
    const [u3, v3] = lungo(FINE_ASSE + 0.6)
    pdf.line(cx + u1, cy + v1, cx + u2, cy + v2)
    // Punta: un triangolo che prosegue la linea
    const lunghezza = Math.hypot(u2 - u1, v2 - v1)
    const [du, dv] = [(u2 - u1) / lunghezza, (v2 - v1) / lunghezza]
    const [pu, pv] = [cx + u2 + du * 2, cy + v2 + dv * 2]
    pdf.triangle(pu, pv, cx + u2 - dv * 0.8, cy + v2 + du * 0.8, cx + u2 + dv * 0.8, cy + v2 - du * 0.8, 'F')
    pdf.text(nome, cx + u3, cy + v3, { align: 'center', baseline: 'middle' })
  }
}

// I font standard del PDF non hanno le frecce circolari
export const inParole = (testo: string) => testo.replace('↻', 'orario').replace('↺', 'antiorario')

// Un PDF con la partenza e, per ogni passo, la mossa e il cubo come diventa dopo averla fatta,
// visto dai due vertici opposti
export async function creaPdfSequenza(
  partenza: Colore[],
  passi: Passo[],
  titolo = 'Dal secondo al primo',
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const larghezzaCella = (LARGHEZZA - 2 * MARGINE) / COLONNE
  const altezzaCella = (ALTEZZA - INIZIO_GRIGLIA - MARGINE) / RIGHE

  pdf.setTextColor('#000000')
  pdf.setFontSize(16)
  pdf.text(`Rubik Orbit · ${titolo}`, MARGINE, MARGINE + 4)
  pdf.setFontSize(10)
  pdf.text(
    `${passi.length} passi, ${quarti(passi)} quarti di giro sulle orbite. A sinistra il cubo visto dal vertice ` +
      'tra x, y e z positivi (destra, sopra, davanti), a destra dal vertice opposto (sinistra, sotto, dietro).',
    MARGINE,
    MARGINE + 11,
    { maxWidth: LARGHEZZA - 2 * MARGINE },
  )

  let cubo = partenza
  const celle = [
    { titolo: 'Partenza', cubo },
    ...passi.map((passo, i) => {
      cubo = passo.mosse.reduce(ruota, cubo)
      return { titolo: `${i + 1}. ${inParole(passo.testo)}`, cubo }
    }),
  ]
  celle.forEach(({ titolo: mossa, cubo }, i) => {
    const posto = i % (COLONNE * RIGHE)
    if (i > 0 && posto === 0) pdf.addPage()
    const inizio = i < COLONNE * RIGHE ? INIZIO_GRIGLIA : MARGINE
    const altezza = i < COLONNE * RIGHE ? altezzaCella : (ALTEZZA - 2 * MARGINE) / RIGHE
    const x = MARGINE + (posto % COLONNE) * larghezzaCella
    const y = inizio + Math.floor(posto / COLONNE) * altezza
    pdf.setTextColor('#000000')
    pdf.setFontSize(11)
    pdf.text(mossa, x + larghezzaCella / 2, y + 5, { align: 'center' })
    const centro = y + 8 + (altezza - 8) / 2 + SPOSTAMENTO
    disegnaCubo(pdf, cubo, x + larghezzaCella / 4, centro, 1)
    disegnaCubo(pdf, cubo, x + (larghezzaCella * 3) / 4, centro, -1)
  })

  return pdf
}

export async function scaricaPdfSequenza(partenza: Colore[], passi: Passo[], titolo?: string): Promise<void> {
  ;(await creaPdfSequenza(partenza, passi, titolo)).save('rubik-orbit-sequenza.pdf')
}
