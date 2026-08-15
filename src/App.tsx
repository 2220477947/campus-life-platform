import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import SchedulePage from './pages/SchedulePage'
import CanteenPage from './pages/CanteenPage'
import TradePage from './pages/TradePage'
import LostFoundPage from './pages/LostFoundPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/canteen" element={<CanteenPage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/lost-found" element={<LostFoundPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
