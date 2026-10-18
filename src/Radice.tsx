import { useEffect, useState } from 'react'
import App from './App.tsx'
import { Studio } from './studio/Studio.tsx'

// Due pagine, scelte dall'ancora dell'indirizzo: #studio per le categorie, altrimenti il cubo
export function Radice() {
  const [ancora, setAncora] = useState(location.hash)
  useEffect(() => {
    const aggiorna = () => setAncora(location.hash)
    addEventListener('hashchange', aggiorna)
    return () => removeEventListener('hashchange', aggiorna)
  }, [])
  return ancora === '#studio' ? <Studio /> : <App />
}
