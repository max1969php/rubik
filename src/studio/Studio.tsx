import { useMemo, useState } from 'react'
import { Cubo3D } from '../components/Cubo3D.tsx'
import type { Colore } from '../modello/cubo.ts'
import { CAMERA_PREDEFINITA, leggiScena, salvaScena } from '../persistenza/cookie.ts'
import dati from './categorie.json'
import { Sviluppo } from './Sviluppo.tsx'

// Generato da scripts/categorie.ts
const categorie = dati.categorie.map((categoria) => ({
  ...categoria,
  esempi: categoria.esempi.map(({ cubo, blocco }) => ({ cubo: [...cubo] as Colore[], blocco: new Set(blocco) })),
}))

const numero = new Intl.NumberFormat('it-IT')
function percentuale(stati: number): string {
  const valore = (stati / dati.stati) * 100
  return valore < 0.1 ? '< 0,1%' : `${valore.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`
}

const nessunaAzione = () => {}

// Le macro-categorie degli stati a 5 mosse dal cubo ordinato, ognuna con qualche esempio da girare in 3D
export function Studio() {
  const [scelta, setScelta] = useState(0)
  const [esempio, setEsempio] = useState(0)
  const [evidenzia, setEvidenzia] = useState(true)
  const categoria = categorie[scelta]
  const { cubo, blocco } = categoria.esempi[Math.min(esempio, categoria.esempi.length - 1)]
  const accesi = evidenzia ? blocco : undefined
  const anteprime = useMemo(() => categorie.map((c) => c.esempi[0]), [])

  // La pagina principale legge il cubo dal cookie quando si apre: basta salvarlo e tornarci
  function portaNelCubo() {
    salvaScena({ cubo, camera: leggiScena().camera })
    location.hash = ''
  }

  function scegli(indice: number) {
    setScelta(indice)
    setEsempio(0)
  }

  return (
    <>
      <header>
        <h1>Rubik Orbit · Studio</h1>
        <div className="azioni">
          <a className="pulsante" href="#">
            Torna al cubo
          </a>
        </div>
      </header>
      <div className="barra">
        <p>
          Tutti i {numero.format(dati.stati)} stati che si ottengono con esattamente {dati.mosse} mosse (quarti di giro
          di una delle 9 orbite, centrali comprese; un mezzo giro conta 2), divisi in {categorie.length} categorie secondo
          il blocco intatto più grande che si riconosce sul cubo, in qualsiasi orientamento. Ogni stato sta in una sola
          categoria: la prima, dall'alto, il cui blocco è presente.
        </p>
      </div>
      <main className="studio">
        <ol className="categorie">
          {categorie.map((c, i) => (
            <li key={c.forma}>
              <button type="button" aria-pressed={i === scelta} onClick={() => scegli(i)}>
                <Sviluppo cubo={anteprime[i].cubo} accesi={evidenzia ? anteprime[i].blocco : undefined} />
                <span className="categoria-testo">
                  <strong>{c.nome}</strong>
                  <span className="nota">
                    {numero.format(c.stati)} {c.stati === 1 ? 'stato' : 'stati'} · {percentuale(c.stati)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <section className="studio-dettaglio">
          <div className="studio-testa">
            <h2>{categoria.nome}</h2>
            <p>{categoria.descrizione}</p>
            <div className="azioni">
              {categoria.esempi.length > 1 &&
                categoria.esempi.map((_, i) => (
                  <button key={i} type="button" aria-pressed={i === esempio} onClick={() => setEsempio(i)}>
                    Esempio {i + 1}
                  </button>
                ))}
              <button type="button" aria-pressed={evidenzia} onClick={() => setEvidenzia(!evidenzia)}>
                Evidenzia blocco intatto
              </button>
              <button type="button" onClick={portaNelCubo}>
                Porta nel cubo
              </button>
            </div>
          </div>
          <div className="studio-cubo">
            <Cubo3D
              cubo={cubo}
              animazione={null}
              evidenziata={null}
              accesi={accesi}
              onFineMossa={nessunaAzione}
              cameraIniziale={CAMERA_PREDEFINITA}
              onCamera={nessunaAzione}
            />
          </div>
          <Sviluppo cubo={cubo} accesi={accesi} />
        </section>
      </main>
    </>
  )
}
