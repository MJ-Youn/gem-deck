import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { AdminDashboard } from './pages/AdminDashboard'

/**
 * 어플리케이션의 메인 라우팅을 담당하는 컴포넌트입니다.
 * 각 페이지별 라우트 설정 및 네비게이션 처리를 수행합니다.
 *
 * @returns JSX.Element 라우터 설정이 포함된 메인 컴포넌트
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
