import { useRef } from 'react'
import type { Sequenza } from '../modello/sequenza.ts'

interface BarraSequenzeProps {
  sequenze: Sequenza[]
  bloccato: boolean
  onEsegui: (sequenza: Sequenza) => void
  onRollback: (sequenza: Sequenza) => void
  onRender: (sequenza: Sequenza) => void
  onRenderMovimenti: (sequenza: Sequenza) => void
  onRinomina: (id: string, nome: string) => void
  onElimina: (sequenza: Sequenza) => void
  onScarica: () => void
  onCarica: (file: File) => void
}

// Sequenze salvate: si eseguono passo passo, si scaricano in un file e si ricaricano
export function BarraSequenze({
  sequenze,
  bloccato,
  onEsegui,
  onRollback,
  onRender,
  onRenderMovimenti,
  onRinomina,
  onElimina,
  onScarica,
  onCarica,
}: BarraSequenzeProps) {
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="barra">
      <div className="soluzione-testa">
        <p>
          {sequenze.length === 0
            ? 'Nessuna sequenza salvata: premi «Registra» per crearne una, o carica un file.'
            : 'Sequenze salvate. «Esegui» parte dal cubo iniziale, «Rollback» da quello finale.'}
        </p>
        <div className="azioni">
          <button type="button" disabled={sequenze.length === 0} onClick={onScarica}>
            Scarica file
          </button>
          <button type="button" disabled={bloccato} onClick={() => file.current?.click()}>
            Carica file
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(evento) => {
              const scelto = evento.target.files?.[0]
              if (scelto) onCarica(scelto)
              evento.target.value = '' // così lo stesso file si può ricaricare
            }}
          />
        </div>
      </div>
      {sequenze.length > 0 && (
        <ul className="sequenze">
          {sequenze.map((sequenza) => (
            <li key={sequenza.id}>
              <input
                type="text"
                value={sequenza.nome}
                aria-label="Nome della sequenza"
                onChange={(evento) => onRinomina(sequenza.id, evento.target.value)}
              />
              <span className="nota">
                {sequenza.mosse.length} {sequenza.mosse.length === 1 ? 'mossa' : 'mosse'}
              </span>
              <button type="button" disabled={bloccato} onClick={() => onEsegui(sequenza)}>
                Esegui
              </button>
              <button type="button" disabled={bloccato} onClick={() => onRollback(sequenza)}>
                Rollback
              </button>
              <button type="button" disabled={bloccato} onClick={() => onRender(sequenza)}>
                Render sequenza
              </button>
              <button type="button" disabled={bloccato} onClick={() => onRenderMovimenti(sequenza)}>
                Render movimenti
              </button>
              <button type="button" disabled={bloccato} onClick={() => onElimina(sequenza)}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
