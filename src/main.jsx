import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TextRibbonApp from './TextRibbonApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TextRibbonApp />
  </StrictMode>,
)
