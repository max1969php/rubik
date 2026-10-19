import { useEffect, useState } from 'react'
import App from './App.tsx'
import { Confronto } from './confronto/Confronto.tsx'
import { Studio } from './studio/Studio.tsx'

// Pagine scelte dall'ancora dell'indirizzo: #studio per le categorie, #confronto per i due cubi, altrimenti il cubo
export function Radice() {
  const [ancora, setAncora] = useState(location.hash)
  useEffect(() => {
    const aggiorna = () => setAncora(location.hash)
    addEventListener('hashchange', aggiorna)
    return () => removeEventListener('hashchange', aggiorna)
  }, [])
  if (ancora === '#studio') return <Studio />
  if (ancora === '#confronto') return <Confronto />
  return <App />
}
