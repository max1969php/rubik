import { useEffect, useState } from 'react'
import { BarraCopia } from '../components/BarraCopia.tsx'
import { BarraSoluzione } from '../components/BarraSoluzione.tsx'
import { Cubo3D } from '../components/Cubo3D.tsx'
import { cuboOrdinato, mescola, ruota, type Colore, type Mossa, type Orbita } from '../modello/cubo.ts'
import { leggiConfronto, salvaConfronto } from '../persistenza/confronto.ts'
import { CAMERA_PREDEFINITA, leggiScena } from '../persistenza/cookie.ts'
import { contaColori, type Passo } from '../risolutore/notazione.ts'
import { cercaPiuCorta, interrompiRicerca, quarti, risolvi } from '../risolutore/risolvi.ts'
import { Sviluppo } from '../studio/Sviluppo.tsx'
import { scaricaPdfSequenza } from './pdfSequenza.ts'

const DURATA_RICERCA = 30_000 // ms
const MINIMA = 'È la soluzione più corta possibile.'

type Quale = 'primo' | 'secondo'

const nessunaAzione = () => {}

// Due cubi: la soluzione porta il secondo nello stato del primo, e i passi si eseguono sul secondo
export function Confronto() {
  const [iniziale] = useState(leggiConfronto)
  const [primo, setPrimo] = useState(iniziale.primo)
  const [secondo, setSecondo] = useState(iniziale.secondo)
  const [inPittura, setInPittura] = useState<Quale | null>(null)
  const [pennello, setPennello] = useState<Colore>(cuboOrdinato[0])
  const [animazione, setAnimazione] = useState<Mossa | null>(null)
  const [coda, setCoda] = useState<Mossa[]>([])
  const [puntata, setPuntata] = useState<Orbita | null>(null)
  const [soluzione, setSoluzione] = useState<{
    passi: Passo[]
    partenza: Colore[] // il secondo cubo prima di eseguire i passi
    fatti: number
    nota?: string
    minima?: boolean
  } | null>(null)
  const [inCalcolo, setInCalcolo] = useState(false)
  const [inRicerca, setInRicerca] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inPdf, setInPdf] = useState(false)

  const bloccato = animazione !== null || inCalcolo || inRicerca
  const cubi = { primo, secondo }
  const imposta = { primo: setPrimo, secondo: setSecondo }

  useEffect(() => {
    salvaConfronto({ primo, secondo })
  }, [primo, secondo])

  function scartaSoluzione() {
    setSoluzione(null)
    setErrore(null)
  }

  function cambia(quale: Quale, nuovo: Colore[]) {
    scartaSoluzione()
    imposta[quale](nuovo)
  }

  function dipingi(quale: Quale, indice: number) {
    cambia(quale, cubi[quale].map((colore, i) => (i === indice ? pennello : colore)))
  }

  function scambia() {
    scartaSoluzione()
    setPrimo(secondo)
    setSecondo(primo)
  }

  async function calcolaSoluzione() {
    scartaSoluzione()
    setInPittura(null)
    setInCalcolo(true)
    try {
      const { passi, minima } = await risolvi(secondo, primo)
      setSoluzione({ passi, partenza: secondo, fatti: 0, minima, nota: minima ? MINIMA : undefined })
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
      const { passi, minima } = await cercaPiuCorta(secondo, primo, soluzione.passi, DURATA_RICERCA)
      const dopo = quarti(passi)
      const nota = [
        dopo < prima
          ? `Trovata una soluzione più corta: da ${prima} a ${dopo} quarti di giro.`
          : 'Nessuna soluzione più corta trovata.',
        minima ? MINIMA : undefined,
      ]
        .filter(Boolean)
        .join(' ')
      setSoluzione({ passi, partenza: secondo, fatti: 0, minima, nota })
    } catch (problema) {
      setErrore(problema instanceof Error ? problema.message : String(problema))
    } finally {
      setInRicerca(false)
    }
  }

  async function renderSequenza() {
    if (!soluzione) return
    setInPdf(true)
    try {
      await scaricaPdfSequenza(soluzione.partenza, soluzione.passi)
    } catch (problema) {
      setErrore(problema instanceof Error ? problema.message : String(problema))
    } finally {
      setInPdf(false)
    }
  }

  function prossimoPasso() {
    if (!soluzione || bloccato) return
    const [prima, ...resto] = soluzione.passi[soluzione.fatti].mosse
    setSoluzione({ ...soluzione, fatti: soluzione.fatti + 1 })
    setAnimazione(prima)
    setCoda(resto)
  }

  function concludiMossa() {
    if (!animazione) return
    const [prossima, ...resto] = coda
    setSecondo(ruota(secondo, animazione))
    setAnimazione(prossima ?? null)
    setCoda(resto)
  }

  function pannello(quale: Quale, titolo: string, descrizione: string) {
    const cubo = cubi[quale]
    const occupato = bloccato || (inPittura !== null && inPittura !== quale)
    return (
      <section className="confronto-cubo">
        <div className="studio-testa">
          <h2>{titolo}</h2>
          <p className="nota">{descrizione}</p>
          <div className="azioni">
            <button type="button" disabled={occupato} onClick={() => cambia(quale, leggiScena().cubo)}>
              Copia dal cubo
            </button>
            <button
              type="button"
              disabled={occupato}
              aria-pressed={inPittura === quale}
              onClick={() => setInPittura(inPittura === quale ? null : quale)}
            >
              {inPittura === quale ? 'Fine copia' : 'Copia cubo reale'}
            </button>
            <button type="button" disabled={occupato} onClick={() => cambia(quale, mescola(cubo))}>
              Mescola
            </button>
            <button type="button" disabled={occupato} onClick={() => cambia(quale, cuboOrdinato)}>
              Ripristina
            </button>
          </div>
        </div>
        <div className="studio-cubo">
          <Cubo3D
            cubo={cubo}
            animazione={quale === 'secondo' ? animazione : null}
            evidenziata={quale === 'secondo' ? (animazione?.orbita ?? puntata) : null}
            onFineMossa={quale === 'secondo' ? concludiMossa : nessunaAzione}
            cameraIniziale={CAMERA_PREDEFINITA}
            onCamera={nessunaAzione}
            onDipingi={inPittura === quale ? (indice) => dipingi(quale, indice) : undefined}
          />
        </div>
        <Sviluppo cubo={cubo} />
      </section>
    )
  }

  const pittura = inPittura && cubi[inPittura]

  return (
    <>
      <header>
        <h1>Rubik Orbit · Confronto</h1>
        <div className="azioni">
          <button type="button" disabled={bloccato || inPittura !== null} onClick={scambia}>
            Scambia i cubi
          </button>
          <button type="button" disabled={bloccato || inPittura !== null} onClick={calcolaSoluzione}>
            Dal secondo al primo
          </button>
          <button
            type="button"
            disabled={!soluzione || soluzione.passi.length === 0 || inRicerca || inPdf}
            onClick={renderSequenza}
          >
            Render sequenza
          </button>
          <a className="pulsante" href="#">
            Torna al cubo
          </a>
        </div>
      </header>
      {pittura && <BarraCopia pennello={pennello} conteggi={contaColori(pittura)} onPennello={setPennello} />}
      {inCalcolo && (
        <div className="barra" role="status">
          <p>Calcolo della soluzione… (la prima volta richiede qualche secondo)</p>
        </div>
      )}
      {errore && (
        <div className="barra errore" role="alert">
          <p>{errore}</p>
        </div>
      )}
      {soluzione && (
        <BarraSoluzione
          titolo="Dal secondo al primo"
          nota={soluzione.nota}
          inRicerca={inRicerca}
          secondiRicerca={DURATA_RICERCA / 1000}
          onPiuCorta={!soluzione.minima && soluzione.fatti === 0 ? cercaSoluzionePiuCorta : undefined}
          onInterrompi={interrompiRicerca}
          passi={soluzione.passi}
          fatti={soluzione.fatti}
          bloccato={bloccato}
          onProssimo={prossimoPasso}
          onPunta={setPuntata}
          giaUguali="I due cubi sono già nello stesso stato."
        />
      )}
      <main className="confronto">
        {pannello('primo', 'Primo cubo', "Lo stato d'arrivo.")}
        {pannello('secondo', 'Secondo cubo', 'Lo stato di partenza: i passi della soluzione si eseguono qui.')}
      </main>
    </>
  )
}
