import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// Wangyu 학생 케어 Token(--color-*)을 먼저, Suyeon Admin Shell 전역 Style(--lh-*, body)을 나중에 둔다. (Shell 전역 규칙이 Host)
import './app/theme.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
