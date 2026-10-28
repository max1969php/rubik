import { useRef } from 'react'

interface PulsantiFileProps {
  vuoto: boolean // niente da scaricare
  bloccato: boolean
  onScarica: () => void
  onCarica: (file: File) => void
}

// Lo stesso file, con sequenze e disposizioni insieme, si scarica e si ricarica da entrambe le barre
export function PulsantiFile({ vuoto, bloccato, onScarica, onCarica }: PulsantiFileProps) {
  const file = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" disabled={vuoto} onClick={onScarica} title="Sequenze e disposizioni in un solo file">
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
    </>
  )
}
