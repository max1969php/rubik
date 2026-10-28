import { useEffect, useState } from 'react'
import App from './App.tsx'
import { Confronto } from './confronto/Confronto.tsx'

// Pagine scelte dall'ancora dell'indirizzo: #confronto per i due cubi, altrimenti il cubo
export function Radice() {
  const [ancora, setAncora] = useState(location.hash)
  useEffect(() => {
    const aggiorna = () => setAncora(location.hash)
    addEventListener('hashchange', aggiorna)
    return () => removeEventListener('hashchange', aggiorna)
  }, [])
  if (ancora === '#confronto') return <Confronto />
  return <App />
}
