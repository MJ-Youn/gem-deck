import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * 어플리케이션의 진입점(Entry Point)입니다.
 * React Root를 생성하고 App 컴포넌트를 렌더링합니다.
 *
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
