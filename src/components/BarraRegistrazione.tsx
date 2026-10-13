import { useEffect, useRef } from 'react'
import type { Mossa, Orbita } from '../modello/cubo.ts'
import { inversa, testoMossa } from '../modello/sequenza.ts'

interface BarraRegistrazioneProps {
  mosse: Mossa[]
  nome: string
  bloccato: boolean
  onNome: (nome: string) => void
  onSalva: () => void
  onScarta: () => void
  onPunta: (orbita: Orbita | null) => void
}

// Mosse registrate finora, ognuna con di fianco la mossa che la annulla
export function BarraRegistrazione({ mosse, nome, bloccato, onNome, onSalva, onScarta, onPunta }: BarraRegistrazioneProps) {
  const elenco = useRef<HTMLDivElement>(null)

  // L'ultima mossa inserita resta sempre in vista
  useEffect(() => {
    elenco.current?.scrollTo({ top: elenco.current.scrollHeight })
  }, [mosse.length])

  return (
    <div className="barra">
      <div className="soluzione-testa">
        <p>
          <span className="in-registrazione" aria-hidden="true" /> Registrazione: {mosse.length}{' '}
          {mosse.length === 1 ? 'mossa' : 'mosse'}. Ruota le orbite per aggiungerne.
        </p>
        <div className="azioni">
          <input
            type="text"
            value={nome}
            placeholder="Nome (facoltativo)"
            aria-label="Nome della sequenza"
            onChange={(evento) => onNome(evento.target.value)}
          />
          <button type="button" disabled={bloccato || mosse.length === 0} onClick={onSalva}>
            Salva sequenza
          </button>
          <button type="button" disabled={bloccato} onClick={onScarta}>
            Scarta
          </button>
        </div>
      </div>
      {mosse.length > 0 && (
        <div className="tabella-mosse" ref={elenco}>
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Mossa</th>
                <th scope="col">Rollback</th>
              </tr>
            </thead>
            <tbody>
              {mosse.map((mossa, i) => (
                <tr key={i} onPointerEnter={() => onPunta(mossa.orbita)} onPointerLeave={() => onPunta(null)}>
                  <td>{i + 1}</td>
                  <td>{testoMossa(mossa)}</td>
                  <td>{testoMossa(inversa(mossa))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mosse.length > 1 && <p className="nota">Il rollback si esegue dal basso verso l'alto.</p>}
    </div>
  )
}
