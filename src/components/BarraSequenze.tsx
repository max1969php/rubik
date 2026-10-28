import type { Sequenza } from '../modello/sequenza.ts'
import { PulsantiFile } from './PulsantiFile.tsx'

interface BarraSequenzeProps {
  sequenze: Sequenza[]
  bloccato: boolean
  onEsegui: (sequenza: Sequenza) => void
  onRollback: (sequenza: Sequenza) => void
  onRender: (sequenza: Sequenza) => void
  onRinomina: (id: string, nome: string) => void
  onElimina: (sequenza: Sequenza) => void
  vuoto: boolean
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
  onRinomina,
  onElimina,
  vuoto,
  onScarica,
  onCarica,
}: BarraSequenzeProps) {
  return (
    <div className="barra">
      <div className="soluzione-testa">
        <p>
          {sequenze.length === 0
            ? 'Nessuna sequenza salvata: premi «Registra» per crearne una, o carica un file.'
            : "Sequenze salvate. «Esegui» e «Rollback» partono dal cubo così com'è (per una disposizione salvata, prima «Usa»)."}
        </p>
        <div className="azioni">
          <PulsantiFile vuoto={vuoto} bloccato={bloccato} onScarica={onScarica} onCarica={onCarica} />
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
