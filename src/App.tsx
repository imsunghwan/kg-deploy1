import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import ObjectPage from './pages/ObjectPage'
import Showcase from './pages/Showcase'
import Me from './pages/Me'

export default function App() {
  const { pathname } = useLocation()
  // /showcase/2026 → 'showcase'. 같은 섹션 안의 이동(연도 탭)은 스크롤을 유지
  const section = pathname.split('/')[1]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [section])

  return (
    <div key={section} className="page-enter">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/object" element={<ObjectPage />} />
        <Route path="/showcase/:year?" element={<Showcase />} />
        <Route path="/team" element={<Navigate to="/me" replace />} />
        <Route path="/me" element={<Me />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}
