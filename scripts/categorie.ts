// Genera src/studio/categorie.json: tutti gli stati raggiungibili con esattamente 5 mosse
// (quarti di giro di una delle 9 orbite; un mezzo giro conta 2 mosse), divisi in
// macro-categorie secondo il blocco intatto più grande che si riconosce sul cubo.
// Uso: node scripts/categorie.ts
import { writeFileSync } from 'node:fs'
import { adesivi, cuboOrdinato, indiceDi, orbite, spostamenti, type Mossa, type Verso } from '../src/modello/cubo.ts'

const MOSSE = 5
const ESEMPI = 3
const N = adesivi.length

type Mappa = number[] // nuovo[j] = vecchio[mappa[j]]
const identita: Mappa = Array.from({ length: N }, (_, i) => i)
const applica = (stato: Uint8Array, mappa: Mappa) => Uint8Array.from(mappa, (da) => stato[da])
const componi = (prima: Mappa, poi: Mappa): Mappa => poi.map((j) => prima[j])
const inversa = (mappa: Mappa): Mappa => { const q = new Array<number>(N); mappa.forEach((da, j) => (q[da] = j)); return q }
const chiave = (stato: Uint8Array) => Buffer.from(stato).toString('latin1')

function mappaDi(mossa: Mossa): Mappa {
  const mappa = [...identita]
  for (const [da, a] of spostamenti(mossa)) mappa[a] = da
  return mappa
}

const generatori = orbite.flatMap((orbita) => ([1, -1] as Verso[]).map((direzione) => mappaDi({ orbita, direzione })))

// Le 24 rotazioni dell'intero cubo, ottenute girando insieme i tre strati di una famiglia
const giro = (famiglia: string) =>
  orbite.filter((o) => o.famiglia === famiglia).map((orbita) => mappaDi({ orbita, direzione: 1 })).reduce(componi)
const rotazioni: Mappa[] = [identita]
for (let k = 0; k < rotazioni.length; k++)
  for (const famiglia of ['x', 'y', 'z']) {
    const nuova = componi(rotazioni[k], giro(famiglia))
    if (!rotazioni.some((r) => r.join() === nuova.join())) rotazioni.push(nuova)
  }

// Con le orbite centrali anche i centri si spostano: due stati che differiscono solo
// per come si tiene in mano il cubo sono lo stesso stato. Si sceglie la rotazione che rimette a posto i centri.
const centri = adesivi.flatMap((a, i) => (a.posizione.filter((v) => v !== 0).length === 1 ? [i] : []))
function orienta(stato: Uint8Array): Uint8Array {
  for (const r of rotazioni) {
    const girato = applica(stato, r)
    if (centri.every((c) => girato[c] === c)) return girato
  }
  throw new Error('centri impossibili')
}

// Simmetrie (24 rotazioni × specchio): stati che differiscono solo per asse, verso o colori sono uguali
const specchio = adesivi.map(({ posizione: [x, y, z], asse }) => indiceDi([-x, y, z], asse))
const simmetrie = rotazioni.map(inversa).flatMap((p) => [p, p.map((i) => specchio[i])])
function canonico(stato: Uint8Array): string {
  let minimo = ''
  for (const p of simmetrie) {
    const coniugato = new Uint8Array(N)
    for (let i = 0; i < N; i++) coniugato[p[i]] = p[stato[i]]
    const c = chiave(coniugato)
    if (minimo === '' || c < minimo) minimo = c
  }
  return minimo
}

// Tutti gli stati dopo esattamente MOSSE mosse (comprese le sequenze che in parte si annullano)
let livello = new Map([[chiave(Uint8Array.from(identita)), Uint8Array.from(identita)]])
for (let k = 1; k <= MOSSE; k++) {
  const prossimo = new Map<string, Uint8Array>()
  for (const stato of livello.values())
    for (const g of generatori) {
      const nuovo = orienta(applica(stato, g))
      prossimo.set(chiave(nuovo), nuovo)
    }
  livello = prossimo
}
console.log(`Stati dopo ${MOSSE} mosse: ${livello.size}`)

// Cubetti con adesivi (angoli, spigoli, centri) e blocchi allineati, dal più grande al più piccolo
const cubetti = new Map<string, number[]>()
adesivi.forEach((a, i) => cubetti.set(a.posizione.join(), [...(cubetti.get(a.posizione.join()) ?? []), i]))
const elencoCubetti = [...cubetti.values()].map((indici) => ({ indici, posizione: adesivi[indici[0]].posizione }))
const INTERVALLI = [[-1, 0, 1], [-1, 0], [0, 1], [-1], [0], [1]]
const forma = (r: number[][]) =>
  r.map((x) => (x.length === 1 && x[0] === 0 ? '1c' : String(x.length)))
    .sort((a, b) => parseInt(b) - parseInt(a) || a.localeCompare(b))
    .join('×')

interface Categoria { forma: string; nome: string; descrizione: string }
// In ordine di priorità: uno stato va nella prima categoria il cui blocco è intatto
const CATEGORIE: Categoria[] = [
  { forma: '3×3×3', nome: 'Cubo ordinato', descrizione: 'Le 5 mosse si annullano (per esempio un giro completo del cubo più una mossa e la sua inversa).' },
  { forma: '3×3×2', nome: 'Due strati intatti', descrizione: 'Tutto è in ordine tranne uno strato esterno, girato di un quarto.' },
  { forma: '3×2×2', nome: 'Blocco 2×2×3', descrizione: 'Un blocco di 2×2×3 cubetti (centri compresi) è intatto: manca solo un terzo del cubo, più lo strato che lo affianca.' },
  { forma: '3×3×1', nome: 'Una faccia esterna completa', descrizione: 'Uno strato esterno intero (9 cubetti) è al suo posto, anche sui lati.' },
  { forma: '3×3×1c', nome: 'Strato centrale completo', descrizione: 'La fascia centrale attorno a un asse (4 spigoli e 4 centri) è coerente.' },
  { forma: '2×2×2', nome: 'Blocco 2×2×2', descrizione: 'Un angolo con i suoi 3 spigoli e i 3 centri vicini forma un cubetto 2×2×2 intatto.' },
  { forma: '3×2×1', nome: 'Rettangolo 2×3 su una faccia', descrizione: 'Due righe di una faccia esterna sono coerenti: 2 angoli, 3 spigoli e il centro.' },
  { forma: '3×2×1c', nome: 'Rettangolo 2×3 nel piano centrale', descrizione: 'Mezza fascia centrale coerente: 3 centri e 2 spigoli.' },
  { forma: '2×2×1', nome: 'Quadrato 2×2 su una faccia', descrizione: 'Un angolo, i due spigoli accanto e il centro della faccia sono coerenti.' },
  { forma: '3×1×1', nome: 'Bordo angolo–spigolo–angolo', descrizione: 'Il blocco più grande è un bordo intero di 3 pezzi.' },
  { forma: '3×1×1c', nome: 'Riga spigolo–centro–spigolo', descrizione: 'Il blocco più grande è una riga che passa per il centro di una faccia.' },
  { forma: '2×2×1c', nome: 'Spigolo fra i suoi due centri', descrizione: 'Solo coppie isolate: uno spigolo sta fra i due centri giusti.' },
  { forma: '3×1c×1c', nome: 'Nessun blocco', descrizione: 'Nessuno spigolo né angolo è accanto ai centri giusti: restano coerenti solo i centri.' },
]

const blocchi = INTERVALLI.flatMap((a) => INTERVALLI.flatMap((b) => INTERVALLI.map((c) => [a, b, c])))
  .map((r) => {
    let maschera = 0
    elencoCubetti.forEach((c, j) => { if (c.posizione.every((v, k) => r[k].includes(v))) maschera |= 1 << j })
    return { forma: forma(r), maschera }
  })
  .filter((b) => CATEGORIE.some((c) => c.forma === b.forma))
  .sort((x, y) => CATEGORIE.findIndex((c) => c.forma === x.forma) - CATEGORIE.findIndex((c) => c.forma === y.forma))

// Categoria dello stato, e lo stato girato in modo che il suo blocco intatto abbia i colori di partenza
function classifica(stato: Uint8Array) {
  let migliore: { indice: number; girato: Uint8Array; maschera: number } | null = null
  for (const r of rotazioni) {
    const girato = applica(stato, r)
    let intatti = 0
    elencoCubetti.forEach((c, j) => { if (c.indici.every((i) => girato[i] === i)) intatti |= 1 << j })
    const blocco = blocchi.find((b) => (b.maschera & intatti) === b.maschera)
    const indice = CATEGORIE.findIndex((c) => c.forma === blocco?.forma)
    if (blocco && (!migliore || indice < migliore.indice)) migliore = { indice, girato, maschera: blocco.maschera }
  }
  return migliore!
}

const gruppi = CATEGORIE.map(() => ({ stati: 0, classi: new Map<string, { quanti: number; girato: Uint8Array; maschera: number }>() }))
for (const stato of livello.values()) {
  const { indice, girato, maschera } = classifica(stato)
  const gruppo = gruppi[indice]
  gruppo.stati++
  const c = canonico(stato)
  const classe = gruppo.classi.get(c)
  if (classe) classe.quanti++
  else gruppo.classi.set(c, { quanti: 1, girato, maschera })
}

// Esempi: le classi di simmetria più numerose della categoria, cioè gli schemi più tipici
const risultato = CATEGORIE.map((categoria, i) => ({
  ...categoria,
  stati: gruppi[i].stati,
  esempi: [...gruppi[i].classi.values()]
    .sort((a, b) => b.quanti - a.quanti)
    .slice(0, ESEMPI)
    .map(({ girato, maschera }) => ({
      cubo: Array.from(girato, (da) => cuboOrdinato[da]).join(''),
      blocco: elencoCubetti.flatMap((c, j) => (maschera & (1 << j) ? c.indici : [])),
    })),
}))

for (const r of risultato) console.log(String(r.stati).padStart(7), r.nome)
writeFileSync(
  new URL('../src/studio/categorie.json', import.meta.url),
  JSON.stringify({ mosse: MOSSE, stati: livello.size, categorie: risultato }) + '\n',
)
