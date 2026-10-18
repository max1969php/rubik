import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Radice } from './Radice.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Radice />
  </StrictMode>,
)
