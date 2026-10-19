import { orbite, spostamenti, type Colore, type Mossa, type Verso } from '../modello/cubo.ts'

// Ricerca esatta sulle 9 orbite (centrali comprese), contando i quarti di giro: trova sempre la soluzione
// più corta, ma solo per stati vicini. Da `arrivo` si tabellano tutti gli stati entro PROFONDITA_TABELLA
// quarti di giro; da `partenza` si scende in profondità finché si cade in uno stato tabellato.

const PROFONDITA_TABELLA = 4

interface Generatore {
  mossa: Mossa
  orbita: number // indice in `orbite`
  sorgente: number[] // il nuovo cubo ha in i l'adesivo che stava in sorgente[i]
}

const generatori: Generatore[] = orbite.flatMap((orbita, indice) =>
  ([1, -1] as Verso[]).map((direzione) => {
    const mossa = { orbita, direzione }
    const sorgente = Array.from({ length: 54 }, (_, i) => i)
    for (const [da, a] of spostamenti(mossa)) sorgente[a] = da
    return { mossa, orbita: indice, sorgente }
  }),
)
// Indice del generatore inverso: le direzioni +1 e -1 di ogni orbita sono vicine
const inverso = (g: number) => g ^ 1

function applica(stato: string, { sorgente }: Generatore): string {
  let nuovo = ''
  for (let i = 0; i < 54; i++) nuovo += stato[sorgente[i]]
  return nuovo
}

// Evita sequenze che di sicuro non sono le più corte: una mossa seguita dalla sua inversa, tre quarti
// di giro uguali di fila (basta uno all'indietro) e due orbite parallele in ordine decrescente
// (girano indipendenti, quindi conta una sola delle due sequenze)
function ammessa(g: number, prima: number | undefined, ancoraPrima: number | undefined): boolean {
  if (prima === undefined) return true
  if (g === inverso(prima)) return false
  if (g === prima && g === ancoraPrima) return false
  const orbita = generatori[g].orbita
  const orbitaPrima = generatori[prima].orbita
  return !(orbita !== orbitaPrima && orbite[orbita].famiglia === orbite[orbitaPrima].famiglia && orbita < orbitaPrima)
}

interface Voce {
  profondita: number // quarti di giro che servono per arrivare
  prossimo: number | null // generatore da applicare per avvicinarsi ad `arrivo`
}

// Tutti gli stati entro PROFONDITA_TABELLA quarti di giro da `arrivo`
function tabella(arrivo: string): Map<string, Voce> {
  const voci = new Map<string, Voce>([[arrivo, { profondita: 0, prossimo: null }]])
  let frontiera = [arrivo]
  for (let profondita = 1; profondita <= PROFONDITA_TABELLA; profondita++) {
    const prossima: string[] = []
    for (const stato of frontiera)
      generatori.forEach((generatore, g) => {
        const vicino = applica(stato, generatore)
        if (voci.has(vicino)) return
        // Da `vicino` si torna indietro con l'inversa di g
        voci.set(vicino, { profondita, prossimo: inverso(g) })
        prossima.push(vicino)
      })
    frontiera = prossima
  }
  return voci
}

// Mosse più corte da `partenza` ad `arrivo`, null se ne servono più di `massimo`
export function cercaEsatta(partenza: Colore[], arrivo: Colore[], massimo: number): Mossa[] | null {
  const voci = tabella(arrivo.join(''))
  const percorso: number[] = []

  // Dallo stato tabellato si arriva seguendo i generatori della tabella
  function completa(stato: string): Mossa[] {
    const mosse = percorso.map((g) => generatori[g].mossa)
    for (let g = voci.get(stato)!.prossimo; g !== null; g = voci.get(stato)!.prossimo) {
      mosse.push(generatori[g].mossa)
      stato = applica(stato, generatori[g])
    }
    return mosse
  }

  // Scende di `resto` mosse e cerca uno stato a esattamente `coda` mosse da `arrivo`
  function scendi(stato: string, resto: number, coda: number): Mossa[] | null {
    if (resto === 0) return voci.get(stato)?.profondita === coda ? completa(stato) : null
    const prima = percorso.at(-1)
    const ancoraPrima = percorso.at(-2)
    for (let g = 0; g < generatori.length; g++) {
      if (!ammessa(g, prima, ancoraPrima)) continue
      percorso.push(g)
      const trovate = scendi(applica(stato, generatori[g]), resto - 1, coda)
      percorso.pop()
      if (trovate) return trovate
    }
    return null
  }

  // Lunghezze crescenti: la prima soluzione trovata è la più corta
  const iniziale = partenza.join('')
  for (let lunghezza = 0; lunghezza <= massimo; lunghezza++) {
    const discesa = Math.max(0, lunghezza - PROFONDITA_TABELLA)
    const trovate = scendi(iniziale, discesa, lunghezza - discesa)
    if (trovate) return trovate
  }
  return null
}
