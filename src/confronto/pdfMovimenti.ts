import type { jsPDF } from 'jspdf'
import { adesivi, orbite, pezzi, ruota, type Colore, type Mossa, type Vettore } from '../modello/cubo.ts'
import { testoMossa } from '../modello/sequenza.ts'
import { disegnaCubo, inParole, proietta, S, type Lato } from './pdfSequenza.ts'

// Misure in mm su un A4 verticale
const LARGHEZZA = 210
const ALTEZZA = 297
const MARGINE = 14
const SCALA_TRASPARENTE = 21 // mm per lato di cubetto nel cubo trasparente
const COLORI_FRECCE = ['#d32f2f', '#1976d2', '#f57c00', '#388e3c', '#7b1fa2', '#00838f', '#c2185b', '#5d4037']
const coloreFreccia = (i: number) => COLORI_FRECCE[i % COLORI_FRECCE.length]

type Punto = [number, number]

// Un pezzo che la sequenza sposta o ruota: da quale posto a quale (indici degli adesivi del cubetto)
interface Movimento {
  da: number[]
  a: number[]
}

// Si fanno girare gli indici degli adesivi al posto dei colori, così si sa da dove viene ogni adesivo
function movimenti(mosse: Mossa[]): Movimento[] {
  const indici = adesivi.map((_, i) => i) as unknown as Colore[]
  const finale = mosse.reduce(ruota, indici) as unknown as number[]
  return pezzi
    .filter((posto) => posto.some((indice) => finale[indice] !== indice))
    .map((posto) => ({ da: pezzi.find((pezzo) => pezzo.includes(finale[posto[0]]))!, a: posto }))
}

const posizione = (pezzo: number[]) => adesivi[pezzo[0]].posizione
const uguale = (p: Vettore, q: Vettore) => p.every((v, i) => v === q[i])

function cerchietto(pdf: jsPDF, x: number, y: number, raggio: number, colore: string, testo: string) {
  pdf.setFillColor('#ffffff')
  pdf.setDrawColor(colore)
  pdf.setLineWidth(0.6)
  pdf.circle(x, y, raggio, 'FD')
  pdf.setTextColor(colore)
  pdf.setFontSize(raggio * 3.2)
  pdf.text(testo, x, y, { align: 'center', baseline: 'middle' })
}

// Il cubo dal vertice `lato`, con il numero di ogni pezzo su un suo adesivo visibile (se da lì non se ne vede
// nessuno, niente numero)
function vistaNumerata(pdf: jsPDF, cubo: Colore[], cx: number, cy: number, lato: Lato, posti: number[][]) {
  disegnaCubo(pdf, cubo, cx, cy, lato)
  posti.forEach((posto, i) => {
    const visibile = posto.find((indice) => adesivi[indice].posizione[adesivi[indice].asse] === lato)
    if (visibile === undefined) return
    const { posizione, asse } = adesivi[visibile]
    const centro: Vettore = [...posizione]
    centro[asse] = lato * S
    const [u, v] = proietta(centro, lato)
    cerchietto(pdf, cx + u, cy + v, 2, coloreFreccia(i), String(i + 1))
  })
}

// Cubo trasparente in proiezione ortogonale dalla direzione della vista 3D predefinita: non esattamente
// dal vertice, così nessuno dei 26 posti ne copre un altro
const normalizza = (v: number[]) => v.map((c) => c / Math.hypot(...v)) as Vettore
const VERSO = normalizza([5, 4.5, 7])
const DESTRA = normalizza([VERSO[2], 0, -VERSO[0]])
const SU = normalizza([0, 1, 0].map((c, i) => c - VERSO[1] * VERSO[i]))
const scalare = (p: Vettore, d: Vettore) => p[0] * d[0] + p[1] * d[1] + p[2] * d[2]

function freccia(pdf: jsPDF, da: Punto, a: Punto, colore: string, raggio: number) {
  const [dx, dy] = [a[0] - da[0], a[1] - da[1]]
  // Curva verso sinistra del verso di percorrenza, così le frecce di un ciclo non si sovrappongono
  const q: Punto = [(da[0] + a[0]) / 2 - dy * 0.22, (da[1] + a[1]) / 2 + dx * 0.22]
  // Parte e arriva sul bordo dei cerchietti
  const accorcia = (p: Punto): Punto => {
    const n = Math.hypot(q[0] - p[0], q[1] - p[1])
    return [p[0] + ((q[0] - p[0]) / n) * raggio, p[1] + ((q[1] - p[1]) / n) * raggio]
  }
  const inizio = accorcia(da)
  const fine = accorcia(a)
  // Bezier quadratica scritta come cubica, l'unica che jsPDF disegna
  const c1: Punto = [inizio[0] + (2 / 3) * (q[0] - inizio[0]), inizio[1] + (2 / 3) * (q[1] - inizio[1])]
  const c2: Punto = [fine[0] + (2 / 3) * (q[0] - fine[0]), fine[1] + (2 / 3) * (q[1] - fine[1])]
  pdf.setDrawColor(colore)
  pdf.setFillColor(colore)
  pdf.setLineWidth(0.7)
  const relativo = ([u, v]: Punto) => [u - inizio[0], v - inizio[1]]
  pdf.lines([[...relativo(c1), ...relativo(c2), ...relativo(fine)]], inizio[0], inizio[1], [1, 1], 'S')
  // Punta lungo la tangente finale
  const n = Math.hypot(fine[0] - c2[0], fine[1] - c2[1])
  const [tx, ty] = [(fine[0] - c2[0]) / n, (fine[1] - c2[1]) / n]
  const base: Punto = [fine[0] - tx * 3, fine[1] - ty * 3]
  pdf.triangle(fine[0], fine[1], base[0] - ty * 1.3, base[1] + tx * 1.3, base[0] + ty * 1.3, base[1] - tx * 1.3, 'F')
}

function cuboTrasparente(pdf: jsPDF, cx: number, cy: number, spostati: Movimento[]) {
  const P = (p: Vettore): Punto => [
    cx + scalare(p, DESTRA) * SCALA_TRASPARENTE,
    cy - scalare(p, SU) * SCALA_TRASPARENTE,
  ]
  // I 12 spigoli del contorno: tratteggiati quelli fra due facce rivolte all'indietro
  const avanti = (asse: number, segno: number) => segno * VERSO[asse] > 0
  for (const a of [0, 1, 2])
    for (const sb of [-1, 1])
      for (const sc of [-1, 1]) {
        const [b, c] = [(a + 1) % 3, (a + 2) % 3]
        const p1: Vettore = [0, 0, 0]
        const p2: Vettore = [0, 0, 0]
        p1[a] = -S
        p2[a] = S
        p1[b] = p2[b] = sb * S
        p1[c] = p2[c] = sc * S
        const nascosto = !avanti(b, sb) && !avanti(c, sc)
        pdf.setDrawColor(nascosto ? '#b0aeb8' : '#55535e')
        pdf.setLineWidth(nascosto ? 0.25 : 0.4)
        pdf.setLineDashPattern(nascosto ? [1.2, 1.2] : [], 0)
        pdf.line(...P(p1), ...P(p2))
      }
  pdf.setLineDashPattern([], 0)
  // I 26 posti dei pezzi, più chiari quelli dietro
  for (const pezzo of pezzi) {
    const p = posizione(pezzo)
    pdf.setFillColor(scalare(p, VERSO) > 0 ? '#8c8a96' : '#d0ced6')
    pdf.circle(...P(p), 0.9, 'F')
  }
  spostati.forEach(({ da, a }, i) => {
    if (!uguale(posizione(da), posizione(a))) freccia(pdf, P(posizione(da)), P(posizione(a)), coloreFreccia(i), 3.6)
  })
  spostati.forEach(({ da }, i) => cerchietto(pdf, ...P(posizione(da)), 3, coloreFreccia(i), String(i + 1)))
}

function nomePosto([x, y, z]: Vettore): string {
  return [
    y === 1 ? 'sopra' : y === -1 ? 'sotto' : '',
    z === 1 ? 'davanti' : z === -1 ? 'dietro' : '',
    x === 1 ? 'destra' : x === -1 ? 'sinistra' : '',
  ]
    .filter(Boolean)
    .join('-')
}

const TIPI = ['', 'centro', 'spigolo', 'angolo']

// Dove finisce il cubetto in `p` dopo la mossa (conta solo la posizione)
function giraPosto(p: Vettore, { orbita, direzione }: Mossa): Vettore {
  if (p[orbita.asse] !== orbita.strato) return p
  const [b, c] = [(orbita.asse + 1) % 3, (orbita.asse + 2) % 3]
  const verso = orbita.verso * direzione
  const girato: Vettore = [...p]
  girato[b] = -verso * p[c]
  girato[c] = verso * p[b]
  return girato
}

// I giri di un'orbita: 90° nei due versi e 180°
const giri = orbite.flatMap((orbita) => {
  const orario: Mossa = { orbita, direzione: orbita.orario }
  const antiorario: Mossa = { orbita, direzione: -orbita.orario as Mossa['direzione'] }
  return [
    { orbita, mosse: [orario], testo: inParole(testoMossa(orario)) },
    { orbita, mosse: [antiorario], testo: inParole(testoMossa(antiorario)) },
    { orbita, mosse: [orario, orario], testo: `${orbita.famiglia} ${orbita.nome} 180°` },
  ]
})

// Il modo più semplice per portare un posto nell'altro: il giro di un'orbita, o di due
function percorso(da: Vettore, a: Vettore): string | null {
  const gira = (p: Vettore, mosse: Mossa[]) => mosse.reduce(giraPosto, p)
  const uno = giri.find(({ mosse }) => uguale(gira(da, mosse), a))
  if (uno) return uno.testo
  for (const primo of giri)
    for (const secondo of giri)
      if (primo.orbita !== secondo.orbita && uguale(gira(gira(da, primo.mosse), secondo.mosse), a))
        return `${primo.testo}, poi ${secondo.testo}`
  return null
}

function descrivi({ da, a }: Movimento): string {
  const [partenza, arrivo] = [posizione(da), posizione(a)]
  const pezzo = `${TIPI[da.length]} ${nomePosto(partenza) || 'interno'}`
  if (uguale(partenza, arrivo)) return `${pezzo} resta al suo posto ma ruotato su se stesso`
  const come = percorso(partenza, arrivo)
  return `${pezzo} va in ${nomePosto(arrivo)}${come ? `   (come con ${come})` : ''}`
}

// Da una pagina nuova: la partenza e l'arrivo della sequenza dai due vertici e, su un cubo trasparente,
// una freccia per ogni pezzo che cambia posto
export function disegnaMovimenti(pdf: jsPDF, partenza: Colore[], mosse: Mossa[], titolo: string): void {
  const larghezza = LARGHEZZA - 2 * MARGINE
  const spostati = movimenti(mosse)

  let y = MARGINE + 4
  pdf.setTextColor('#000000')
  pdf.setFontSize(16)
  pdf.text(`Rubik Orbit · ${titolo}`, MARGINE, y)
  y += 7
  pdf.setFontSize(9.5)
  const elenco = pdf.splitTextToSize(
    `Sequenza (${mosse.length} quarti di giro): ` +
      mosse.map((mossa, i) => `${i + 1}. ${inParole(testoMossa(mossa))}`).join(', ') +
      '.',
    larghezza,
  ) as string[]
  pdf.text(elenco, MARGINE, y)
  y += elenco.length * 4 + 8

  // Partenza e arrivo dai due vertici: lo stesso numero segue lo stesso pezzo
  const colonna = larghezza / 4
  pdf.setFontSize(11)
  pdf.text('Partenza', MARGINE + colonna, y, { align: 'center' })
  pdf.text('Arrivo', MARGINE + 3 * colonna, y, { align: 'center' })
  pdf.setFontSize(8)
  pdf.setTextColor('#666666')
  for (let k = 0; k < 4; k++)
    pdf.text(k % 2 ? 'dal vertice opposto' : 'dal vertice x, y, z', MARGINE + colonna * (k + 0.5), y + 5, {
      align: 'center',
    })
  const cy = y + 33
  const arrivo = mosse.reduce(ruota, partenza)
  const da = spostati.map((movimento) => movimento.da)
  const a = spostati.map((movimento) => movimento.a)
  vistaNumerata(pdf, partenza, MARGINE + colonna * 0.5, cy, 1, da)
  vistaNumerata(pdf, partenza, MARGINE + colonna * 1.5, cy, -1, da)
  vistaNumerata(pdf, arrivo, MARGINE + colonna * 2.5, cy, 1, a)
  vistaNumerata(pdf, arrivo, MARGINE + colonna * 3.5, cy, -1, a)
  pdf.setDrawColor('#cccccc')
  pdf.setLineWidth(0.3)
  pdf.line(LARGHEZZA / 2, y - 4, LARGHEZZA / 2, cy + 24)

  y = cy + 34
  pdf.setTextColor('#000000')
  pdf.setFontSize(11)
  if (spostati.length === 0) {
    pdf.text("La sequenza non cambia nessun pezzo: il cubo torna com'era.", MARGINE, y)
    return
  }
  pdf.text('Dove va ogni pezzo (cubo trasparente: i punti sono i 26 posti, più chiari quelli dietro)', MARGINE, y)
  cuboTrasparente(pdf, LARGHEZZA / 2, y + 48, spostati)

  y += 100
  pdf.setFontSize(10)
  spostati.forEach((movimento, i) => {
    if (y > ALTEZZA - MARGINE) {
      pdf.addPage()
      y = MARGINE + 4
    }
    pdf.setTextColor(coloreFreccia(i))
    pdf.text(`${i + 1}.`, MARGINE, y)
    pdf.setTextColor('#000000')
    pdf.text(descrivi(movimento), MARGINE + 7, y, { maxWidth: larghezza - 7 })
    y += 6
  })
  pdf.setFontSize(8.5)
  pdf.setTextColor('#666666')
  pdf.text(
    'Il giro fra parentesi dice solo dove arriva il pezzo, non la sua rotazione: la sequenza intera lo porta lì ' +
      'lasciando a posto tutto il resto.',
    MARGINE,
    Math.min(y + 2, ALTEZZA - MARGINE),
    { maxWidth: larghezza },
  )
}
