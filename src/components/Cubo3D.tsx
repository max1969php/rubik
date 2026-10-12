import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { CanvasTexture, type Group } from 'three'
import { colori } from '../constants/colori.ts'
import {
  adesivi,
  DURATA_MOSSA,
  nelloStrato,
  type Asse,
  type Colore,
  type Mossa,
  type Orbita,
  type Vettore,
} from '../modello/cubo.ts'

const NOMI_ASSI = ['x', 'y', 'z'] as const
const LATO_CUBETTO = 0.95
const LATO_ADESIVO = 0.84
const SPESSORE_ADESIVO = 0.02
const COLORE_ASSI = '#8c8a96' // leggibile sia su fondo chiaro sia scuro
const INIZIO_ASSE = 1.7
const FINE_ASSE = 2.5

// Colori degli adesivi fuori dallo strato evidenziato: quasi grigi
const GRIGIO = [140, 138, 150]
const coloriSpenti = Object.fromEntries(
  Object.entries(colori).map(([sigla, esadecimale]) => {
    const canali = [1, 3, 5].map((i) => parseInt(esadecimale.slice(i, i + 2), 16))
    const misti = canali.map((canale, i) => Math.round(canale * 0.18 + GRIGIO[i] * 0.82))
    return [sigla, `rgb(${misti.join(',')})`]
  }),
) as Record<Colore, string>

interface Cubetto {
  posizione: Vettore
  adesivi: number[]
}

const cubetti: Cubetto[] = []
adesivi.forEach(({ posizione }, indice) => {
  const cubetto = cubetti.find((c) => c.posizione.join() === posizione.join())
  if (cubetto) cubetto.adesivi.push(indice)
  else cubetti.push({ posizione, adesivi: [indice] })
})

interface AdesivoMeshProps {
  indice: number
  colore: Colore
  spento: boolean
  onDipingi?: (indice: number) => void
}

function AdesivoMesh({ indice, colore, spento, onDipingi }: AdesivoMeshProps) {
  const { posizione, asse } = adesivi[indice]
  const centro: Vettore = [0, 0, 0]
  centro[asse] = posizione[asse] * (LATO_CUBETTO / 2 + SPESSORE_ADESIVO / 4)
  const misure: Vettore = [LATO_ADESIVO, LATO_ADESIVO, LATO_ADESIVO]
  misure[asse] = SPESSORE_ADESIVO
  return (
    <mesh
      position={centro}
      onClick={
        onDipingi &&
        ((evento) => {
          evento.stopPropagation()
          // delta: pixel percorsi tra pressione e rilascio, per non dipingere mentre si ruota la vista
          if (evento.delta < 5) onDipingi(indice)
        })
      }
    >
      <boxGeometry args={misure} />
      <meshBasicMaterial color={spento ? coloriSpenti[colore] : colori[colore]} toneMapped={false} />
    </mesh>
  )
}

interface CubettiProps {
  cubo: Colore[]
  animazione: Mossa | null
  evidenziata: Orbita | null
  onFineMossa: () => void
  onDipingi?: (indice: number) => void
}

function Cubetti({ cubo, animazione, evidenziata, onFineMossa, onDipingi }: CubettiProps) {
  // Ogni cubetto ha un perno nell'origine: ruotando il perno gira attorno al centro del cubo
  const perni = useRef<(Group | null)[]>([])
  const inizio = useRef<number | null>(null)
  const conclusa = useRef(false)

  // I perni tornano a zero nello stesso commit in cui arrivano i colori aggiornati
  useLayoutEffect(() => {
    inizio.current = null
    conclusa.current = false
    for (const perno of perni.current) perno?.rotation.set(0, 0, 0)
  }, [animazione])

  useFrame(() => {
    if (!animazione || conclusa.current) return
    const { orbita, direzione } = animazione
    inizio.current ??= performance.now()
    const t = Math.min(1, (performance.now() - inizio.current) / DURATA_MOSSA)
    const angolo = t * t * (3 - 2 * t) * (Math.PI / 2) * orbita.verso * direzione
    cubetti.forEach((cubetto, i) => {
      if (cubetto.posizione[orbita.asse] !== orbita.strato) return
      const perno = perni.current[i]
      if (perno) perno.rotation[NOMI_ASSI[orbita.asse]] = angolo
    })
    if (t === 1) {
      conclusa.current = true
      onFineMossa()
    }
  })

  return cubetti.map((cubetto, i) => (
    <group
      key={cubetto.posizione.join()}
      ref={(perno) => {
        perni.current[i] = perno
      }}
    >
      <group position={cubetto.posizione}>
        <mesh>
          <boxGeometry args={[LATO_CUBETTO, LATO_CUBETTO, LATO_CUBETTO]} />
          <meshBasicMaterial color="#15151a" toneMapped={false} />
        </mesh>
        {cubetto.adesivi.map((indice) => (
          <AdesivoMesh
            key={indice}
            indice={indice}
            colore={cubo[indice]}
            spento={evidenziata !== null && !nelloStrato(indice, evidenziata)}
            onDipingi={onDipingi}
          />
        ))}
      </group>
    </group>
  ))
}

// Lettera disegnata su una tela, da usare come sprite sempre rivolto alla camera
function creaEtichetta(testo: string): CanvasTexture {
  const tela = document.createElement('canvas')
  tela.width = tela.height = 128
  const contesto = tela.getContext('2d')!
  contesto.font = '600 96px ui-monospace, Consolas, monospace'
  contesto.textAlign = 'center'
  contesto.textBaseline = 'middle'
  contesto.fillStyle = COLORE_ASSI
  contesto.fillText(testo, 64, 60)
  return new CanvasTexture(tela)
}

const etichette = NOMI_ASSI.map(creaEtichetta)

// Freccia con etichetta lungo il verso positivo di ogni asse
function Assi() {
  const lunghezza = FINE_ASSE - INIZIO_ASSE
  const rotazioni: Vettore[] = [
    [0, 0, -Math.PI / 2],
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
  ]
  return NOMI_ASSI.map((nome, asse) => {
    const lungo = (distanza: number): Vettore => {
      const punto: Vettore = [0, 0, 0]
      punto[asse as Asse] = distanza
      return punto
    }
    return (
      <group key={nome}>
        <mesh position={lungo(INIZIO_ASSE + lunghezza / 2)} rotation={rotazioni[asse]}>
          <cylinderGeometry args={[0.025, 0.025, lunghezza]} />
          <meshBasicMaterial color={COLORE_ASSI} toneMapped={false} />
        </mesh>
        <mesh position={lungo(FINE_ASSE)} rotation={rotazioni[asse]}>
          <coneGeometry args={[0.09, 0.28]} />
          <meshBasicMaterial color={COLORE_ASSI} toneMapped={false} />
        </mesh>
        <sprite position={lungo(FINE_ASSE + 0.4)} scale={0.5}>
          <spriteMaterial map={etichette[asse]} toneMapped={false} />
        </sprite>
      </group>
    )
  })
}

function Controlli({ onCamera }: { onCamera: (posizione: Vettore) => void }) {
  const camera = useThree((stato) => stato.camera)
  return (
    <OrbitControls
      enablePan={false}
      minDistance={6}
      maxDistance={16}
      onEnd={() => onCamera(camera.position.toArray())}
    />
  )
}

interface Cubo3DProps extends CubettiProps {
  cameraIniziale: Vettore
  onCamera: (posizione: Vettore) => void
}

export function Cubo3D({ cameraIniziale, onCamera, ...cubetti }: Cubo3DProps) {
  return (
    <Canvas camera={{ position: cameraIniziale, fov: 40 }}>
      <Cubetti {...cubetti} />
      <Assi />
      <Controlli onCamera={onCamera} />
    </Canvas>
  )
}
