import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import TestPage from './pages/TestPage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <Navbar />
      <Routes>
        <Route path="/"        element={<HomePage   />} />
        <Route path="/test"    element={<TestPage   />} />
        <Route path="/result"  element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  )
}
