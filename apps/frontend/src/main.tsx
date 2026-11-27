import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/reset.css'
import './styles/variables.css'
import './styles/global.css'
import './styles/theme.css'
import './styles/accessibility.css'
import App from './App.tsx'
import { AccessibilityProvider } from './accessibility/AccessibilityContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessibilityProvider>
      <App />
    </AccessibilityProvider>
  </StrictMode>,
)
