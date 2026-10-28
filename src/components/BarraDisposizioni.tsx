import { useState } from 'react'
import type { Disposizione } from '../persistenza/disposizioni.ts'
import { Sviluppo } from './Sviluppo.tsx'

interface BarraDisposizioniProps {
  disposizioni: Disposizione[]
  bloccato: boolean
  onSalva: (nome: string) => void
  onUsa: (disposizione: Disposizione) => void
  onRinomina: (id: string, nome: string) => void
  onElimina: (disposizione: Disposizione) => void
}

// Disposizioni salvate del cubo (per esempio copiate dal cubo reale): «Usa» le rimette sul cubo,
// come «Ripristina» fa con il cubo ordinato, così una registrazione può partire da lì
export function BarraDisposizioni({
  disposizioni,
  bloccato,
  onSalva,
  onUsa,
  onRinomina,
  onElimina,
}: BarraDisposizioniProps) {
  const [nome, setNome] = useState('')
  return (
    <div className="barra">
      <div className="soluzione-testa">
        <p>
          {disposizioni.length === 0
            ? 'Nessuna disposizione salvata: copia il cubo reale e salvalo qui per ripartire da lì.'
            : 'Disposizioni salvate. «Usa» mette il cubo in quello stato, pronto per registrare.'}
        </p>
        <div className="azioni">
          <input
            type="text"
            value={nome}
            placeholder="Nome (facoltativo)"
            aria-label="Nome della disposizione"
            onChange={(evento) => setNome(evento.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              onSalva(nome)
              setNome('')
            }}
          >
            Salva il cubo attuale
          </button>
        </div>
      </div>
      {disposizioni.length > 0 && (
        <ul className="sequenze disposizioni">
          {disposizioni.map((disposizione) => (
            <li key={disposizione.id}>
              <Sviluppo cubo={disposizione.cubo} />
              <input
                type="text"
                value={disposizione.nome}
                aria-label="Nome della disposizione"
                onChange={(evento) => onRinomina(disposizione.id, evento.target.value)}
              />
              <button type="button" disabled={bloccato} onClick={() => onUsa(disposizione)}>
                Usa
              </button>
              <button type="button" onClick={() => onElimina(disposizione)}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
