import { useEffect, useRef, useState } from 'react'
import './App.css'
import { BarraCopia } from './components/BarraCopia.tsx'
import { BarraSoluzione } from './components/BarraSoluzione.tsx'
import { Cubo3D } from './components/Cubo3D.tsx'
import { Orbite2D } from './components/Orbite2D.tsx'
import { OrbiteIntrecciate } from './components/OrbiteIntrecciate.tsx'
import {
  cuboOrdinato,
  mescola,
  ruota,
  type Colore,
  type Mossa,
  type Orbita,
  type Vettore,
} from './modello/cubo.ts'
import { leggiScena, salvaScena } from './persistenza/cookie.ts'
import { contaColori, type Passo } from './risolutore/notazione.ts'
import { risolvi } from './risolutore/risolvi.ts'

function App() {
  const [scenaIniziale] = useState(leggiScena)
  const [cubo, setCubo] = useState(scenaIniziale.cubo)
  const [animazione, setAnimazione] = useState<Mossa | null>(null)
  const [coda, setCoda] = useState<Mossa[]>([]) // mosse ancora da animare dopo quella in corso
  const [puntata, setPuntata] = useState<Orbita | null>(null)
  const [inCopia, setInCopia] = useState(false)
  const [pennello, setPennello] = useState<Colore>(cuboOrdinato[0])
  const [soluzione, setSoluzione] = useState<{ passi: Passo[]; fatti: number } | null>(null)
  const [inCalcolo, setInCalcolo] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const camera = useRef(scenaIniziale.camera)

  // Orbita messa in risalto nelle tre viste: quella in movimento o quella sotto il mouse
  const evidenziata = inCopia ? null : (animazione?.orbita ?? puntata)
  const bloccato = animazione !== null || inCalcolo

  useEffect(() => {
    salvaScena({ cubo, camera: camera.current })
  }, [cubo])

  function salvaCamera(posizione: Vettore) {
    camera.current = posizione
    salvaScena({ cubo, camera: posizione })
  }

  // Ogni modifica fatta a mano rende superata la soluzione calcolata
  function scartaSoluzione() {
    setSoluzione(null)
    setErrore(null)
  }

  function cambiaCubo(nuovo: Colore[]) {
    scartaSoluzione()
    setCubo(nuovo)
  }

  function mossaManuale(mossa: Mossa) {
    scartaSoluzione()
    setAnimazione(mossa)
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
      setSoluzione({ passi: await risolvi(cubo), fatti: 0 })
    } catch (problema) {
      setErrore(problema instanceof Error ? problema.message : String(problema))
    } finally {
      setInCalcolo(false)
    }
  }

  function prossimoPasso() {
    if (!soluzione || bloccato) return
    const [prima, ...resto] = soluzione.passi[soluzione.fatti].mosse
    setSoluzione({ ...soluzione, fatti: soluzione.fatti + 1 })
    setAnimazione(prima)
    setCoda(resto)
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

  return (
    <>
      <header>
        <h1>Rubik Orbit</h1>
        <div className="azioni">
          <button type="button" disabled={bloccato} aria-pressed={inCopia} onClick={cambiaModalita}>
            {inCopia ? 'Fine copia' : 'Copia cubo reale'}
          </button>
          <button type="button" disabled={bloccato || inCopia} onClick={calcolaSoluzione}>
            Risolvi
          </button>
          <button type="button" disabled={bloccato || inCopia} onClick={() => cambiaCubo(mescola(cubo))}>
            Mescola
          </button>
          <button type="button" disabled={bloccato} onClick={() => cambiaCubo(cuboOrdinato)}>
            Ripristina
          </button>
        </div>
      </header>
      {inCopia && <BarraCopia pennello={pennello} conteggi={contaColori(cubo)} onPennello={setPennello} />}
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
          <Cubo3D
            cubo={cubo}
            animazione={animazione}
            evidenziata={evidenziata}
            onFineMossa={concludiMossa}
            cameraIniziale={scenaIniziale.camera}
            onCamera={salvaCamera}
            onDipingi={onDipingi}
          />
        </section>
      </main>
    </>
  )
}

export default App
