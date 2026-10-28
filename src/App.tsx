import { useEffect, useRef, useState } from 'react'
import './App.css'
import { BarraCopia } from './components/BarraCopia.tsx'
import { BarraRegistrazione } from './components/BarraRegistrazione.tsx'
import { BarraSequenze } from './components/BarraSequenze.tsx'
import { BarraSoluzione } from './components/BarraSoluzione.tsx'
import { Cubo3D } from './components/Cubo3D.tsx'
import { Orbite2D } from './components/Orbite2D.tsx'
import { OrbiteIntrecciate } from './components/OrbiteIntrecciate.tsx'
import { scaricaPdf } from './confronto/pdf.ts'
import {
  cuboOrdinato,
  mescola,
  pezziCambiati,
  ruota,
  type Colore,
  type Mossa,
  type Orbita,
  type Vettore,
} from './modello/cubo.ts'
import { creaSequenza, inPassi, rollback, type Sequenza } from './modello/sequenza.ts'
import { CAMERA_PREDEFINITA, leggiScena, salvaScena } from './persistenza/cookie.ts'
import { decodifica, leggiSequenze, salvaSequenze, scaricaSequenze, unisci } from './persistenza/sequenze.ts'
import { contaColori, type Passo } from './risolutore/notazione.ts'
import { cercaPiuCorta, interrompiRicerca, quarti, risolvi } from './risolutore/risolvi.ts'

const DURATA_RICERCA = 30_000 // ms
const MINIMA = 'È la soluzione più corta possibile.'

// "3 angoli e 1 spigolo": i pezzi cambiati, contati per tipo (2 adesivi spigolo, 3 angolo, 1 centro)
function descriviCambiati(cambiati: number[][]): string {
  if (cambiati.length === 0) return "Nessun pezzo è cambiato dall'inizio della sequenza."
  const nomi = [
    ['angolo', 'angoli', 3],
    ['spigolo', 'spigoli', 2],
    ['centro', 'centri', 1],
  ] as const
  const parti = nomi.flatMap(([uno, molti, adesivi]) => {
    const quanti = cambiati.filter((pezzo) => pezzo.length === adesivi).length
    return quanti === 0 ? [] : [`${quanti} ${quanti === 1 ? uno : molti}`]
  })
  const elenco = parti.length > 1 ? `${parti.slice(0, -1).join(', ')} e ${parti.at(-1)}` : parti[0]
  return cambiati.length === 1
    ? `Dall'inizio della sequenza è cambiato ${elenco}: è l'unico pezzo illuminato sul cubo 3D.`
    : `Dall'inizio della sequenza sono cambiati ${elenco}: sono i soli pezzi illuminati sul cubo 3D.`
}

// Seconda vista: dal vertice opposto a quello della vista predefinita, per vedere le tre facce nascoste
const CAMERA_OPPOSTA = CAMERA_PREDEFINITA.map((n) => -n) as Vettore
const nessunaAzione = () => {}

function App() {
  const [scenaIniziale] = useState(leggiScena)
  const [cubo, setCubo] = useState(scenaIniziale.cubo)
  const [animazione, setAnimazione] = useState<Mossa | null>(null)
  const [coda, setCoda] = useState<Mossa[]>([]) // mosse ancora da animare dopo quella in corso
  const [puntata, setPuntata] = useState<Orbita | null>(null)
  const [inCopia, setInCopia] = useState(false)
  const [pennello, setPennello] = useState<Colore>(cuboOrdinato[0])
  const [soluzione, setSoluzione] = useState<{
    passi: Passo[]
    fatti: number
    titolo?: string
    nota?: string
    minima?: boolean
  } | null>(
    null,
  )
  const [sequenze, setSequenze] = useState(leggiSequenze)
  const [elencoAperto, setElencoAperto] = useState(false)
  // Registrazione in corso: il cubo com'era all'avvio e le mosse fatte da allora
  const [registrazione, setRegistrazione] = useState<{ iniziale: Colore[]; mosse: Mossa[]; nome: string } | null>(
    null,
  )
  const [inCalcolo, setInCalcolo] = useState(false)
  const [inRicerca, setInRicerca] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inPdf, setInPdf] = useState(false)
  const camera = useRef(scenaIniziale.camera)
  // Il cubo com'era all'inizio dell'ultima registrazione o sequenza eseguita, per vedere cosa è cambiato
  const [riferimento, setRiferimento] = useState<Colore[] | null>(null)
  const [mostraCambiati, setMostraCambiati] = useState(false)

  // Orbita messa in risalto nelle tre viste: quella in movimento o quella sotto il mouse
  const evidenziata = inCopia ? null : (animazione?.orbita ?? puntata)
  const bloccato = animazione !== null || inCalcolo || inRicerca
  // Mentre si registra il cubo cambia solo con le mosse sulle orbite
  const occupato = bloccato || registrazione !== null
  const cambiati = riferimento && mostraCambiati ? pezziCambiati(riferimento, cubo) : null

  useEffect(() => {
    salvaScena({ cubo, camera: camera.current })
  }, [cubo])

  useEffect(() => {
    salvaSequenze(sequenze)
  }, [sequenze])

  function salvaCamera(posizione: Vettore) {
    camera.current = posizione
    salvaScena({ cubo, camera: posizione })
  }

  // Ogni modifica fatta a mano rende superata la soluzione calcolata
  function scartaSoluzione() {
    setSoluzione(null)
    setErrore(null)
  }

  // Un cubo cambiato a mano non si confronta più con l'inizio della sequenza
  function cambiaCubo(nuovo: Colore[]) {
    scartaSoluzione()
    setRiferimento(null)
    setCubo(nuovo)
  }

  function mossaManuale(mossa: Mossa) {
    if (bloccato) return
    scartaSoluzione()
    setAnimazione(mossa)
    if (registrazione) setRegistrazione({ ...registrazione, mosse: [...registrazione.mosse, mossa] })
  }

  function concludiMossa() {
    if (!animazione) return
    const [prossima, ...resto] = coda
    setCubo(ruota(cubo, animazione))
    setAnimazione(prossima ?? null)
    setCoda(resto)
  }

  function dipingi(indice: number) {
    cambiaCubo(cubo.map((colore, i) => (i === indice ? pennello : colore)))
  }

  function cambiaModalita() {
    scartaSoluzione()
    setInCopia(!inCopia)
  }

  async function calcolaSoluzione() {
    scartaSoluzione()
    setInCalcolo(true)
    try {
      const { passi, minima } = await risolvi(cubo)
      setSoluzione({ passi, fatti: 0, minima, nota: minima ? MINIMA : undefined })
    } catch (problema) {
      setErrore(problema instanceof Error ? problema.message : String(problema))
    } finally {
      setInCalcolo(false)
    }
  }

  async function cercaSoluzionePiuCorta() {
    if (!soluzione) return
    const prima = quarti(soluzione.passi)
    setErrore(null)
    setInRicerca(true)
    try {
      const { passi, minima } = await cercaPiuCorta(cubo, cuboOrdinato, soluzione.passi, DURATA_RICERCA)
      const dopo = quarti(passi)
      const nota = [
        dopo < prima
          ? `Trovata una soluzione più corta: da ${prima} a ${dopo} quarti di giro.`
          : 'Nessuna soluzione più corta trovata.',
        minima ? MINIMA : undefined,
      ]
        .filter(Boolean)
        .join(' ')
      setSoluzione({ passi, fatti: 0, minima, nota })
    } catch (problema) {
      setErrore(problema instanceof Error ? problema.message : String(problema))
    } finally {
      setInRicerca(false)
    }
  }

  function prossimoPasso() {
    if (!soluzione || bloccato) return
    const [prima, ...resto] = soluzione.passi[soluzione.fatti].mosse
    setSoluzione({ ...soluzione, fatti: soluzione.fatti + 1 })
    setAnimazione(prima)
    setCoda(resto)
  }

  function avviaRegistrazione() {
    scartaSoluzione()
    setRegistrazione({ iniziale: cubo, mosse: [], nome: '' })
    setRiferimento(cubo)
  }

  function salvaRegistrazione() {
    if (!registrazione) return
    const nome = registrazione.nome.trim() || `Sequenza ${sequenze.length + 1}`
    setSequenze([...sequenze, creaSequenza(nome, registrazione.iniziale, registrazione.mosse)])
    setRegistrazione(null)
    setElencoAperto(true)
  }

  // Come per la soluzione: il cubo va allo stato di partenza e le mosse si eseguono un passo alla volta
  function eseguiSequenza(titolo: string, partenza: Colore[], mosse: Mossa[]) {
    setErrore(null)
    setCubo(partenza)
    setRiferimento(partenza)
    setSoluzione({ passi: inPassi(mosse), fatti: 0, titolo })
  }

  async function renderSequenza(sequenza: Sequenza) {
    setErrore(null)
    setInPdf(true)
    try {
      await scaricaPdf(sequenza.iniziale, inPassi(sequenza.mosse), sequenza.nome)
    } catch (problema) {
      setErrore(problema instanceof Error ? problema.message : String(problema))
    } finally {
      setInPdf(false)
    }
  }

  function rinominaSequenza(id: string, nome: string) {
    setSequenze(sequenze.map((sequenza) => (sequenza.id === id ? { ...sequenza, nome } : sequenza)))
  }

  function eliminaSequenza({ id, nome }: Sequenza) {
    if (confirm(`Eliminare la sequenza «${nome}»?`)) setSequenze(sequenze.filter((sequenza) => sequenza.id !== id))
  }

  async function caricaSequenze(file: File) {
    try {
      const caricate = decodifica(await file.text())
      setSequenze((presenti) => unisci(presenti, caricate))
      setErrore(null)
    } catch (problema) {
      setErrore(problema instanceof Error ? problema.message : String(problema))
    }
  }

  const onDipingi = inCopia ? dipingi : undefined
  const anelli = {
    cubo,
    animazione,
    bloccato: bloccato || inCopia,
    evidenziata,
    onMossa: mossaManuale,
    onPunta: setPuntata,
    onDipingi,
  }

  const cubo3D = {
    cubo,
    animazione,
    evidenziata,
    accesi: cambiati ? new Set(cambiati.flat()) : undefined,
    onDipingi,
  }

  return (
    <>
      <header>
        <h1>Rubik Orbit</h1>
        <div className="azioni">
          <button type="button" disabled={occupato} aria-pressed={inCopia} onClick={cambiaModalita}>
            {inCopia ? 'Fine copia' : 'Copia cubo reale'}
          </button>
          <button type="button" disabled={occupato || inCopia} onClick={calcolaSoluzione}>
            Risolvi
          </button>
          <button type="button" disabled={occupato || inCopia} onClick={() => cambiaCubo(mescola(cubo))}>
            Mescola
          </button>
          <button type="button" disabled={occupato} onClick={() => cambiaCubo(cuboOrdinato)}>
            Ripristina
          </button>
          <button
            type="button"
            disabled={occupato || inCopia}
            aria-pressed={registrazione !== null}
            onClick={avviaRegistrazione}
          >
            Registra
          </button>
          <a className="pulsante" href="#confronto">
            Confronto
          </a>
          <button type="button" aria-pressed={elencoAperto} onClick={() => setElencoAperto(!elencoAperto)}>
            Sequenze ({sequenze.length})
          </button>
          <button
            type="button"
            disabled={!riferimento}
            aria-pressed={cambiati !== null}
            title="Illumina solo i pezzi diversi da com'erano all'inizio della registrazione o della sequenza"
            onClick={() => setMostraCambiati(!mostraCambiati)}
          >
            Pezzi cambiati
          </button>
        </div>
      </header>
      {inCopia && <BarraCopia pennello={pennello} conteggi={contaColori(cubo)} onPennello={setPennello} />}
      {inCalcolo && (
        <div className="barra" role="status">
          <p>Calcolo della soluzione… (la prima volta richiede qualche secondo)</p>
        </div>
      )}
      {cambiati && (
        <div className="barra" role="status">
          <p>{descriviCambiati(cambiati)}</p>
        </div>
      )}
      {errore && (
        <div className="barra errore" role="alert">
          <p>{errore}</p>
        </div>
      )}
      {registrazione && (
        <BarraRegistrazione
          mosse={registrazione.mosse}
          nome={registrazione.nome}
          bloccato={bloccato}
          onNome={(nome) => setRegistrazione({ ...registrazione, nome })}
          onSalva={salvaRegistrazione}
          onScarta={() => setRegistrazione(null)}
          onPunta={setPuntata}
        />
      )}
      {elencoAperto && (
        <BarraSequenze
          sequenze={sequenze}
          bloccato={occupato || inCopia || inPdf}
          onEsegui={({ nome, iniziale, mosse }) => eseguiSequenza(nome, iniziale, mosse)}
          onRollback={({ nome, finale, mosse }) => eseguiSequenza(`Rollback di ${nome}`, finale, rollback(mosse))}
          onRender={renderSequenza}
          onRinomina={rinominaSequenza}
          onElimina={eliminaSequenza}
          onScarica={() => scaricaSequenze(sequenze)}
          onCarica={caricaSequenze}
        />
      )}
      {soluzione && (
        <BarraSoluzione
          titolo={soluzione.titolo}
          nota={soluzione.nota}
          inRicerca={inRicerca}
          secondiRicerca={DURATA_RICERCA / 1000}
          onPiuCorta={
            soluzione.titolo === undefined && !soluzione.minima && soluzione.fatti === 0
              ? cercaSoluzionePiuCorta
              : undefined
          }
          onInterrompi={interrompiRicerca}
          passi={soluzione.passi}
          fatti={soluzione.fatti}
          bloccato={bloccato}
          onProssimo={prossimoPasso}
          onPunta={setPuntata}
        />
      )}
      <main>
        <section className="vista-orbite">
          <Orbite2D famiglia="y" {...anelli} />
          <Orbite2D famiglia="x" {...anelli} />
          <div className="vista-intreccio">
            <OrbiteIntrecciate
              cubo={cubo}
              animazione={animazione}
              evidenziata={evidenziata}
              onMossa={mossaManuale}
              onPunta={setPuntata}
              onDipingi={onDipingi}
            />
          </div>
          <Orbite2D famiglia="z" {...anelli} />
        </section>
        <section className="vista-3d">
          <div className="vista-3d-cubo">
            <Cubo3D {...cubo3D} onFineMossa={concludiMossa} cameraIniziale={scenaIniziale.camera} onCamera={salvaCamera} />
          </div>
          {/* Si anima insieme alla vista principale, ma è quella a far proseguire le mosse */}
          <div className="vista-3d-cubo vista-3d-opposta">
            <span className="nota">Dal vertice opposto</span>
            <Cubo3D {...cubo3D} onFineMossa={nessunaAzione} cameraIniziale={CAMERA_OPPOSTA} onCamera={nessunaAzione} />
          </div>
        </section>
      </main>
    </>
  )
}

export default App
